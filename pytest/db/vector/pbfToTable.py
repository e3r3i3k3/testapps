"""
OSM PBF Table Creation
Loads .osm.pbf files and creates PostGIS-enabled tables with OSM data.
Uses pyosmium library (install with: pip install osmium)
"""
import json
import os
import glob
import sys

import osmium

# Add point directory to path to import postGisConnect
point_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'point')
sys.path.append(point_dir)
from postGisConnect import get_db_connection, enable_postgis, create_spatial_index

# Configuration
# Get the directory where this script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
PBF_DIR = os.path.join(script_dir, "..", "testinput")
TABLE_NAME = "osm_features"
filenamePattern = "*.osm.pbf"

maxItems = 10000

# Country code mapping (filename prefix to ISO3 code)
COUNTRY_CODES = {
    'malawi': 'MWI',
    'uganda': 'UGA',
    'senegal': 'SEN',
    'sudan': 'SDN',
    'djibouti': 'DJI',
}


def get_country_code_from_filename(filename):
    """
    Extract country code from OSM PBF filename.
    
    Args:
        filename: Name of the PBF file (e.g., malawi-260217.osm.pbf)
        
    Returns:
        ISO3 country code
    """
    basename = os.path.basename(filename).lower()
    for key, code in COUNTRY_CODES.items():
        if basename.startswith(key):
            return code
    # Default: use first 3 chars uppercased
    return basename.split('-')[0][:3].upper()


class OSMHandler(osmium.SimpleHandler):
    """
    Handler for processing OSM data with pyosmium.
    Collects ways and relations (polygons/multipolygons).
    """
    def __init__(self, max_features=None):
        super(OSMHandler, self).__init__()
        self.features = []
        self.node_cache = {}
        self.max_features = max_features
        self.skipped_count = 0
    
    def node(self, n):
        """Cache node locations for building geometries."""
        if n.location.valid():
            self.node_cache[n.id] = (n.location.lon, n.location.lat)
    
    def way(self, w):
        """Process OSM ways (roads, buildings, etc.)."""
        # Stop if we've reached the max features limit
        if self.max_features and len(self.features) >= self.max_features:
            return
        
        # Skip ways without tags or without enough nodes
        if not w.tags or len(w.nodes) < 2:
            self.skipped_count += 1
            return
        
        # Check if it's a closed way (polygon)
        is_closed = w.is_closed()
        
        # Get coordinates
        coords = []
        for node in w.nodes:
            if node.ref in self.node_cache:
                coords.append(self.node_cache[node.ref])
        
        if len(coords) < 2:
            self.skipped_count += 1
            return
        
        # Build feature
        geom_type = "Polygon" if is_closed and len(coords) >= 3 else "LineString"
        
        if geom_type == "Polygon":
            # Close the ring if not already closed
            if coords[0] != coords[-1]:
                coords.append(coords[0])
            coordinates = [coords]  # Polygon requires array of rings
        else:
            coordinates = coords
        
        feature = {
            'osm_id': str(w.id),
            'osm_way_id': str(w.id),
            'name': w.tags.get('name'),
            'type': w.tags.get('building') or w.tags.get('highway') or w.tags.get('landuse') or w.tags.get('amenity'),
            'tags': dict(w.tags),
            'geometry': {
                'type': geom_type,
                'coordinates': coordinates
            }
        }
        
        self.features.append(feature)
    
    def area(self, a):
        """Process OSM areas (relations that form polygons)."""
        # Stop if we've reached the max features limit
        if self.max_features and len(self.features) >= self.max_features:
            return
        
        if not a.tags:
            self.skipped_count += 1
            return
        
        try:
            # Get the geometry as WKB
            wkb = osmium.geom.WKBFactory().create_multipolygon(a)
            
            # Validate WKB data - should be bytes and have valid endian flag
            if not isinstance(wkb, bytes) or len(wkb) < 5:
                self.skipped_count += 1
                return
            
            # Check endian flag (first byte should be 0 or 1)
            if wkb[0] not in (0, 1):
                self.skipped_count += 1
                return
            
            feature = {
                'osm_id': str(a.id),
                'osm_way_id': str(a.id),
                'name': a.tags.get('name'),
                'type': a.tags.get('building') or a.tags.get('landuse') or a.tags.get('amenity'),
                'tags': dict(a.tags),
                'geometry_wkb': bytes(wkb)  # Ensure it's proper bytes
            }
            
            self.features.append(feature)
        except Exception as e:
            # Skip areas that can't be converted to geometry
            self.skipped_count += 1
            pass


def load_osm_pbf_data(pbf_dir):
    """
    Load all .osm.pbf files from the specified directory.
    
    Args:
        pbf_dir: Directory containing the PBF files
        
    Returns:
        List of tuples: (pbf_file_path, country_code)
    """
    pbf_pattern = os.path.join(pbf_dir, filenamePattern)
    pbf_files = glob.glob(pbf_pattern)
    
    if not pbf_files:
        print(f"No PBF files found matching pattern: {pbf_pattern}")
        return []
    
    print(f"Found {len(pbf_files)} PBF files:")
    
    file_data = []
    for pbf_file in pbf_files:
        country_code = get_country_code_from_filename(pbf_file)
        print(f"  - {os.path.basename(pbf_file)} (country: {country_code})")
        file_data.append((pbf_file, country_code))
    
    print("\n" + "="*50 + "\n")
    return file_data


def parse_pbf_file(pbf_file, max_features=maxItems):
    """
    Parse OSM PBF file using pyosmium.
    
    Args:
        pbf_file: Path to the PBF file
        max_features: Maximum number of features to extract (None for all)
        
    Returns:
        List of feature dictionaries
    """
    print(f"Parsing {os.path.basename(pbf_file)} with pyosmium...")
    print(f"  Limiting to first {max_features} features for debug..." if max_features else "  Extracting all features...")
    
    handler = OSMHandler(max_features=max_features)
    handler.apply_file(pbf_file, locations=True)
    
    print(f"  Extracted {len(handler.features)} features")
    print(f"  Skipped {handler.skipped_count} items (no tags, invalid geometry, etc.)")
    return handler.features


def create_osm_table(conn):
    """
    Create the osm_features table with spatial capabilities.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        cur.execute(f"""
            DROP TABLE IF EXISTS {TABLE_NAME};
            CREATE TABLE {TABLE_NAME} (
                id SERIAL PRIMARY KEY,
                country VARCHAR(3),
                osm_id VARCHAR(50),
                osm_way_id VARCHAR(50),
                name VARCHAR(255),
                type VARCHAR(100),
                other_tags JSONB,
                geom GEOMETRY(Geometry, 4326)
            );
        """)
        conn.commit()
    print(f"Table '{TABLE_NAME}' created successfully!")


def insert_osm_data(conn, features, country_code):
    """
    Insert OSM feature data into the table.
    
    Args:
        conn: Database connection object
        features: List of feature dictionaries
        country_code: ISO3 country code
    """
    with conn.cursor() as cur:
        inserted = 0
        failed = 0
        
        for i, feature in enumerate(features):
            # Use same savepoint name (reused for each insert)
            savepoint_name = "sp"
            try:
                cur.execute(f"SAVEPOINT {savepoint_name}")
                
                # Handle WKB geometry (from areas) or GeoJSON geometry (from ways)
                if 'geometry_wkb' in feature:
                    # Validate WKB before inserting
                    wkb = feature['geometry_wkb']
                    if not isinstance(wkb, bytes) or len(wkb) < 5 or wkb[0] not in (0, 1):
                        print(f"    Feature {i+1}: Skipped - invalid WKB data")
                        cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                        failed += 1
                        continue
                    
                    # Use WKB directly
                    cur.execute(f"""
                        INSERT INTO {TABLE_NAME} 
                        (country, osm_id, osm_way_id, name, type, other_tags, geom)
                        VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromWKB(%s), 4326))
                    """, (
                        country_code,
                        feature.get('osm_id'),
                        feature.get('osm_way_id'),
                        feature.get('name'),
                        feature.get('type'),
                        json.dumps(feature.get('tags', {})),
                        wkb
                    ))
                else:
                    # Convert GeoJSON to geometry
                    geom = feature.get('geometry', {})
                    if not geom:
                        print(f"    Feature {i+1}: Skipped - no geometry")
                        cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                        failed += 1
                        continue
                    
                    geom_json = json.dumps(geom)
                    tags = feature.get('tags', {})
                    
                    cur.execute(f"""
                        INSERT INTO {TABLE_NAME} 
                        (country, osm_id, osm_way_id, name, type, other_tags, geom)
                        VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
                    """, (
                        country_code,
                        feature.get('osm_id'),
                        feature.get('osm_way_id'),
                        feature.get('name'),
                        feature.get('type'),
                        json.dumps(tags),
                        geom_json
                    ))
                
                # Release savepoint if successful
                cur.execute(f"RELEASE SAVEPOINT {savepoint_name}")
                inserted += 1
                
                # Show progress for first 10 and every 100th thereafter
                if inserted <= 10 or inserted % (maxItems //100) == 0:
                    print(f"    Inserted feature {inserted}: {feature.get('name', 'unnamed')} ({feature.get('type', 'unknown type')})")
                    
            except Exception as e:
                # Rollback to savepoint to recover from error without aborting transaction
                cur.execute(f"ROLLBACK TO SAVEPOINT {savepoint_name}")
                failed += 1
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
        print(f"\n{'='*60}")
        print(f"Total records in table: {total_count}")
        print(f"{'='*60}\n")
        
        # Count by country
        cur.execute(f"SELECT country, COUNT(*) FROM {TABLE_NAME} GROUP BY country ORDER BY country;")
        counts = cur.fetchall()
        print("Records by country:")
        for country, count in counts:
            print(f"  {country}: {count:,}")
        
        # Count by type
        cur.execute(f"""
            SELECT type, COUNT(*) as cnt 
            FROM {TABLE_NAME} 
            WHERE type IS NOT NULL 
            GROUP BY type 
            ORDER BY cnt DESC 
            LIMIT 10;
        """)
        type_counts = cur.fetchall()
        print("\nTop 10 feature types:")
        for ftype, count in type_counts:
            print(f"  {ftype}: {count:,}")
        
        # Sample records with details
        cur.execute(f"""
            SELECT id, country, osm_id, name, type, other_tags,
                   ST_GeometryType(geom) as geom_type,
                   ST_NPoints(geom) as num_points,
                   ST_AsText(ST_Centroid(geom)) as centroid
            FROM {TABLE_NAME} 
            WHERE name IS NOT NULL
            LIMIT 5;
        """)
        records = cur.fetchall()
        
        print(f"\n{'='*60}")
        print("Sample records with details:")
        print(f"{'='*60}")
        for i, record in enumerate(records, 1):
            print(f"\nRecord {i}:")
            print(f"  ID: {record[0]}")
            print(f"  Country: {record[1]}")
            print(f"  OSM ID: {record[2]}")
            print(f"  Name: {record[3]}")
            print(f"  Type: {record[4]}")
            if record[5]:  # other_tags
                tags = json.loads(record[5]) if isinstance(record[5], str) else record[5]
                print(f"  Tags: {list(tags.keys())[:5]}")  # Show first 5 tag keys
            print(f"  Geometry Type: {record[6]}")
            print(f"  Number of Points: {record[7]}")
            print(f"  Centroid: {record[8]}")
        
        print(f"\n{'='*60}\n")


def create_osm_features_table():
    """
    Main function to create the OSM features table.
    Loads PBF data, parses with pyosmium, creates table, and inserts data.
    """
    print("="*50)
    print("Creating OSM Features Table")
    print("="*50 + "\n")
    
    # Load PBF file list
    pbf_files = load_osm_pbf_data(PBF_DIR)
    
    if not pbf_files:
        print("No PBF files found. Please check the directory path.")
        print(f"Current path: {PBF_DIR}")
        return
    
    # Connect to database
    with get_db_connection() as conn:
        # Enable PostGIS
        enable_postgis(conn)
        
        # Create table
        create_osm_table(conn)
        
        total_inserted = 0
        
        # Process each PBF file
        for pbf_file, country_code in pbf_files:
            print(f"\nProcessing {os.path.basename(pbf_file)}...")
            
            # Parse PBF file (limited to 100 features for debug)
            features = parse_pbf_file(pbf_file, max_features=maxItems)
            
            if not features:
                print(f"  No features extracted from {os.path.basename(pbf_file)}")
                continue
            
            # Insert data
            inserted = insert_osm_data(conn, features, country_code)
            print(f"  Inserted {inserted} features from {os.path.basename(pbf_file)}")
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
    create_osm_features_table()

