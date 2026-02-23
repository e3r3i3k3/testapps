"""
Shapefile Table Creation
Loads .shp files from subdirectories and creates PostGIS-enabled tables.
Uses fiona library (install with: pip install fiona)
"""
import json
import os
import glob
import sys

try:
    import fiona
    from shapely.geometry import shape
    from shapely import wkb
except ImportError:
    print("Error: Required libraries not installed.")
    print("Please install with: pip install fiona shapely")
    sys.exit(1)

# Add point directory to path to import postGisConnect
point_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'point')
sys.path.append(point_dir)
from postGisConnect import get_db_connection, enable_postgis, create_spatial_index

# Configuration
# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
SHP_DIR = os.path.join(script_dir, "..", "testinput", "shp")
TABLE_NAME = "shp_features"
MAX_ITEMS = 1000000  # Debug limit

# Country code mapping (directory name to ISO3 code)
COUNTRY_CODES = {
    'malawi': 'MWI',
    'uganda': 'UGA',
    'senegal': 'SEN',
    'sudan': 'SDN',
    'djibouti': 'DJI',
}


def get_country_code_from_path(path):
    """
    Extract country code from shapefile path.
    
    Args:
        path: Path to the shapefile directory
        
    Returns:
        ISO3 country code
    """
    dirname = os.path.basename(os.path.dirname(path)).lower()
    for key, code in COUNTRY_CODES.items():
        if key in dirname:
            return code
    # Default fallback
    return 'UNK'


def find_shapefiles(base_dir):
    """
    Find all .shp files in subdirectories.
    
    Args:
        base_dir: Base directory to search for shapefiles
        
    Returns:
        List of tuples: (shapefile_path, country_code, layer_name)
    """
    shp_pattern = os.path.join(base_dir, "**", "*.shp")
    shp_files = glob.glob(shp_pattern, recursive=True)
    
    if not shp_files:
        print(f"No shapefiles found in: {base_dir}")
        return []
    
    print(f"Found {len(shp_files)} shapefiles:")
    
    file_data = []
    for shp_file in shp_files:
        country_code = get_country_code_from_path(shp_file)
        layer_name = os.path.splitext(os.path.basename(shp_file))[0]
        print(f"  - {os.path.basename(shp_file)} (country: {country_code}, layer: {layer_name})")
        file_data.append((shp_file, country_code, layer_name))
    
    print("\n" + "="*50 + "\n")
    return file_data


def create_shp_table(conn):
    """
    Create table for shapefile data with PostGIS geometry column.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        # Drop existing table if it exists
        cur.execute(f"DROP TABLE IF EXISTS {TABLE_NAME} CASCADE;")
        
        # Create new table with flexible schema
        cur.execute(f"""
            CREATE TABLE {TABLE_NAME} (
                id SERIAL PRIMARY KEY,
                country VARCHAR(3),
                layer_name VARCHAR(100),
                fid BIGINT,
                osm_id VARCHAR(50),
                code SMALLINT,
                name VARCHAR(255),
                type VARCHAR(100),
                fclass VARCHAR(100),
                other_tags JSONB,
                geom GEOMETRY(Geometry, 4326)
            );
        """)
        
        conn.commit()
    
    print(f"Table '{TABLE_NAME}' created successfully!")


def parse_shapefile(shp_file, max_items=MAX_ITEMS):
    """
    Parse shapefile and extract features.
    
    Args:
        shp_file: Path to shapefile
        max_items: Maximum number of features to extract
        
    Returns:
        List of feature dictionaries
    """
    features = []
    print(f"Reading {os.path.basename(shp_file)}...")
    
    try:
        with fiona.open(shp_file, 'r') as src:
            print(f"  CRS: {src.crs}")
            print(f"  Total features: {len(src)}")
            print(f"  Schema: {list(src.schema['properties'].keys())[:10]}")
            
            count = 0
            for feature in src:
                if max_items and count >= max_items:
                    print(f"  Limiting to first {max_items} features for debug...")
                    break
                
                try:
                    # Extract properties
                    props = feature['properties']
                    
                    # Get geometry
                    geom = feature['geometry']
                    if not geom:
                        continue
                    
                    # Convert to shapely geometry and then to WKB
                    geom_shape = shape(geom)
                    if not geom_shape.is_valid:
                        continue
                    
                    geom_wkb = wkb.dumps(geom_shape)
                    
                    # Build feature dict
                    feature_dict = {
                        'fid': props.get('osm_id') or props.get('fid'),
                        'osm_id': props.get('osm_id'),
                        'code': props.get('code'),
                        'name': props.get('name'),
                        'type': props.get('type'),
                        'fclass': props.get('fclass'),
                        'geometry_wkb': geom_wkb,
                        'other_tags': {k: v for k, v in props.items() 
                                      if k not in ['osm_id', 'code', 'name', 'type', 'fclass', 'fid'] 
                                      and v is not None}
                    }
                    
                    features.append(feature_dict)
                    count += 1
                    
                except Exception as e:
                    # Skip features that can't be processed
                    continue
            
            print(f"  Extracted {len(features)} features")
            
    except Exception as e:
        print(f"  Error reading shapefile: {str(e)}")
        return []
    
    return features


def insert_shp_data(conn, features, country_code, layer_name):
    """
    Insert shapefile features into the database.
    
    Args:
        conn: Database connection object
        features: List of feature dictionaries
        country_code: ISO3 country code
        layer_name: Name of the shapefile layer
        
    Returns:
        Number of features inserted
    """
    if not features:
        return 0
    
    inserted = 0
    failed = 0
    
    with conn.cursor() as cur:
        for i, feature in enumerate(features):
            # Use same savepoint name (reused for each insert)
            savepoint_name = "sp"
            try:
                cur.execute(f"SAVEPOINT {savepoint_name}")
                
                # Validate WKB
                wkb_data = feature['geometry_wkb']
                if not isinstance(wkb_data, bytes) or len(wkb_data) < 5:
                    cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                    failed += 1
                    continue
                
                # Insert feature
                cur.execute(f"""
                    INSERT INTO {TABLE_NAME} 
                    (country, layer_name, fid, osm_id, code, name, type, fclass, other_tags, geom)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromWKB(%s), 4326))
                """, (
                    country_code,
                    layer_name,
                    feature.get('fid'),
                    feature.get('osm_id'),
                    feature.get('code'),
                    feature.get('name'),
                    feature.get('type'),
                    feature.get('fclass'),
                    json.dumps(feature.get('other_tags', {})),
                    wkb_data
                ))
                
                # Release savepoint if successful
                cur.execute(f"RELEASE SAVEPOINT {savepoint_name}")
                inserted += 1
                
                # Show progress for first 10 and every 100th thereafter
                if inserted <= 10 or inserted % 100 == 0:
                    print(f"    Inserted feature {inserted}: {feature.get('name', 'unnamed')} ({feature.get('fclass', 'unknown')})")
                    
            except Exception as e:
                # Rollback to savepoint to recover from error
                cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                failed += 1
                if failed <= 5:  # Only show first few errors
                    print(f"    Feature {i+1}: Failed to insert - {str(e)[:100]}")
                continue
        
        conn.commit()
    
    print(f"  Successfully inserted: {inserted}, Failed: {failed}")
    return inserted


def verify_data(conn):
    """
    Query and print sample records to verify the data was inserted correctly.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        # Get total count
        cur.execute(f"SELECT COUNT(*) FROM {TABLE_NAME};")
        total_count = cur.fetchone()[0]
        
        print("\n" + "="*60)
        print(f"Total records in table: {total_count}")
        print("="*60 + "\n")
        
        # Get count by country
        cur.execute(f"""
            SELECT country, COUNT(*) as cnt 
            FROM {TABLE_NAME} 
            GROUP BY country 
            ORDER BY cnt DESC;
        """)
        
        print("Records by country:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}")
        
        # Get count by layer
        cur.execute(f"""
            SELECT layer_name, COUNT(*) as cnt 
            FROM {TABLE_NAME} 
            GROUP BY layer_name 
            ORDER BY cnt DESC
            LIMIT 10;
        """)
        
        print("\nTop 10 layers by feature count:")
        for row in cur.fetchall():
            print(f"  {row[0]}: {row[1]}")
        
        # Get sample records with geometry details
        cur.execute(f"""
            SELECT 
                id, country, layer_name, osm_id, name, fclass,
                ST_GeometryType(geom) as geom_type,
                ST_NPoints(geom) as num_points,
                ST_AsText(ST_Centroid(geom)) as centroid
            FROM {TABLE_NAME}
            WHERE name IS NOT NULL
            ORDER BY id
            LIMIT 5;
        """)
        
        print("\n" + "="*60)
        print("Sample records with details:")
        print("="*60 + "\n")
        
        for i, record in enumerate(cur.fetchall(), 1):
            print(f"Record {i}:")
            print(f"  ID: {record[0]}")
            print(f"  Country: {record[1]}")
            print(f"  Layer: {record[2]}")
            print(f"  OSM ID: {record[3]}")
            print(f"  Name: {record[4]}")
            print(f"  Class: {record[5]}")
            print(f"  Geometry Type: {record[6]}")
            print(f"  Number of Points: {record[7]}")
            print(f"  Centroid: {record[8]}")
            print()
        
        print("="*60 + "\n")


def create_shp_features_table():
    """
    Main function to create the shapefile features table.
    Finds shapefiles, parses them, creates table, and inserts data.
    """
    print("="*50)
    print("Creating Shapefile Features Table")
    print("="*50 + "\n")
    
    # Find shapefiles
    shp_files = find_shapefiles(SHP_DIR)
    
    if not shp_files:
        print("No shapefiles found. Please check the directory path.")
        print(f"Current path: {SHP_DIR}")
        return
    
    # Connect to database
    with get_db_connection() as conn:
        # Enable PostGIS
        enable_postgis(conn)
        
        # Create table
        create_shp_table(conn)
        
        total_inserted = 0
        
        # Process each shapefile
        for shp_file, country_code, layer_name in shp_files:
            print(f"\nProcessing {os.path.basename(shp_file)}...")
            
            # Parse shapefile (limited to MAX_ITEMS for debug)
            features = parse_shapefile(shp_file, max_items=MAX_ITEMS)
            
            if not features:
                print(f"  No features extracted from {os.path.basename(shp_file)}")
                continue
            
            # Insert data
            inserted = insert_shp_data(conn, features, country_code, layer_name)
            print(f"  Inserted {inserted} features from {os.path.basename(shp_file)}")
            total_inserted += inserted
        
        print(f"\nTotal features inserted: {total_inserted}")
        
        if total_inserted > 0:
            # Create spatial index
            create_spatial_index(conn, TABLE_NAME)
            
            # Verify data
            verify_data(conn)
    
    print("\nDatabase connection closed.")
    print("\n" + "="*50)
    print("Your data is now available in pg-featureserv!")
    print("Access it at:")
    print(f"  Collection: http://localhost:9000/collections/public.{TABLE_NAME}")
    print(f"  Items: http://localhost:9000/collections/public.{TABLE_NAME}/items")
    print("  Web UI: http://localhost:9000/index.html")
    print("="*50)


if __name__ == "__main__":
    create_shp_features_table()
