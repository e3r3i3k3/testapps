"""
Admin Boundaries Table Creation
Loads UGA_*.json files and creates a PostGIS-enabled table with MultiPolygon geometries.
"""
import json
import os
import glob
import sys

# Add point directory to path to import postGisConnect
point_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'point')
sys.path.append(point_dir)
from postGisConnect import get_db_connection, enable_postgis, create_spatial_table, create_spatial_index

# Configuration
JSON_DIR = "/Users/ehill/repos/IBF-system/services/API-service/src/scripts/git-lfs/admin-boundaries/"
TABLE_NAME = "admin_boundaries"
filenamePattern = "UGA_*.json"


def load_admin_boundaries_data(json_dir):
    """
    Load all UGA_*.json GeoJSON files from the specified directory.
    
    Args:
        json_dir: Directory containing the JSON files
        
    Returns:
        List of dictionaries containing the feature data with country codes
    """
    json_pattern = os.path.join(json_dir, filenamePattern)
    json_files = glob.glob(json_pattern)
    
    print(f"Found {len(json_files)} JSON files:")
    for f in json_files:
        print(f"  - {os.path.basename(f)}")
    print("\n" + "="*50 + "\n")
    
    all_features = []
    for json_file in json_files:
        # Extract country code from filename (e.g., UGA_adm3.json -> UGA)
        basename = os.path.basename(json_file)
        country_code = basename.split('_')[0]
        admin_level = basename.replace(country_code + '_', '').replace('.json', '')
        
        print(f"Loading {basename} (country: {country_code}, level: {admin_level})...")
        
        with open(json_file, 'r') as f:
            geojson_data = json.load(f)
            
            if geojson_data.get('type') != 'FeatureCollection':
                print(f"  WARNING: {basename} is not a FeatureCollection, skipping...")
                continue
            
            features = geojson_data.get('features', [])
            file_count = 0
            
            for feature in features:
                # Add country code and admin level to properties
                feature_data = {
                    'country': country_code,
                    'admin_level': admin_level,
                    'properties': feature.get('properties', {}),
                    'geometry': feature.get('geometry', {})
                }
                all_features.append(feature_data)
                file_count += 1
            
            print(f"  Loaded {file_count} features")
    
    print(f"\nTotal features loaded: {len(all_features)}")
    print("\n" + "="*50 + "\n")
    
    return all_features


def create_admin_boundaries_table(conn):
    """
    Create the admin_boundaries table with spatial capabilities.
    
    Args:
        conn: Database connection object
    """
    columns = {
        'id': 'SERIAL PRIMARY KEY',
        'country': 'VARCHAR(3)',
        'admin_level': 'VARCHAR(50)',
        'adm0_en': 'VARCHAR(255)',
        'adm0_pcode': 'VARCHAR(50)',
        'adm1_en': 'VARCHAR(255)',
        'adm1_pcode': 'VARCHAR(50)',
        'adm2_en': 'VARCHAR(255)',
        'adm2_pcode': 'VARCHAR(50)',
        'adm3_en': 'VARCHAR(255)',
        'adm3_pcode': 'VARCHAR(50)',
        'date': 'VARCHAR(50)',
        'geom': 'GEOMETRY(MultiPolygon, 4326)'
    }
    
    create_spatial_table(conn, TABLE_NAME, columns, drop_if_exists=True)


def insert_admin_boundaries_data(conn, features):
    """
    Insert admin boundary feature data into the table.
    
    Args:
        conn: Database connection object
        features: List of feature dictionaries containing the data
    """
    with conn.cursor() as cur:
        for feature in features:
            props = feature['properties']
            geom = feature['geometry']
            
            # Convert geometry to GeoJSON string
            geom_json = json.dumps(geom)
            
            cur.execute("""
                INSERT INTO admin_boundaries 
                (country, admin_level, adm0_en, adm0_pcode, adm1_en, adm1_pcode, 
                 adm2_en, adm2_pcode, adm3_en, adm3_pcode, date, geom)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            """, (
                feature['country'],
                feature['admin_level'],
                props.get('ADM0_EN'),
                props.get('ADM0_PCODE'),
                props.get('ADM1_EN'),
                props.get('ADM1_PCODE'),
                props.get('ADM2_EN'),
                props.get('ADM2_PCODE'),
                props.get('ADM3_EN'),
                props.get('ADM3_PCODE'),
                props.get('date'),
                geom_json
            ))
        conn.commit()
    print(f"Inserted {len(features)} features into the table!")


def verify_data(conn):
    """
    Query and print sample records to verify the data was inserted correctly.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT id, country, admin_level, adm3_en, adm3_pcode, 
                   ST_GeometryType(geom) as geom_type, ST_NumGeometries(geom) as num_geoms
            FROM {TABLE_NAME} 
            LIMIT 3;
        """)
        records = cur.fetchall()
        print("\nSample records from the database:")
        for record in records:
            print(record)


def create_admin_boundaries_tables():
    """
    Main function to create the admin_boundaries table.
    Loads GeoJSON data, creates table, inserts data, and creates spatial index.
    """
    print("="*50)
    print("Creating Admin Boundaries Table")
    print("="*50 + "\n")
    
    # Load data from JSON files
    features = load_admin_boundaries_data(JSON_DIR)
    
    if not features:
        print("No features loaded. Exiting.")
        return
    
    # Connect to database and create table
    with get_db_connection() as conn:
        # Enable PostGIS
        enable_postgis(conn)
        
        # Create table
        create_admin_boundaries_table(conn)
        
        # Insert data
        insert_admin_boundaries_data(conn, features)
        
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
    create_admin_boundaries_tables()



