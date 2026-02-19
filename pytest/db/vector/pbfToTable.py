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
PBF_DIR = "../input/"
TABLE_NAME = "osm_features"
filenamePattern = "*.osm.pbf"

# Country code mapping (filename prefix to ISO3 code)
COUNTRY_CODES = {
    'malawi': 'MWI',
    'uganda': 'UGA',
    'senegal': 'SEN',
    'sudan': 'SDN',
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
    def __init__(self):
        super(OSMHandler, self).__init__()
        self.features = []
        self.node_cache = {}
    
    def node(self, n):
        """Cache node locations for building geometries."""
        self.node_cache[n.id] = (n.location.lon, n.location.lat)
    
    def way(self, w):
        """Process OSM ways (roads, buildings, etc.)."""
        # Skip ways without tags or without enough nodes for a polygon
        if not w.tags or len(w.nodes) < 3:
            return
        
        # Check if it's a closed way (polygon)
        is_closed = w.is_closed()
        
        # Get coordinates
        coords = []
        for node in w.nodes:
            if node.ref in self.node_cache:
                coords.append(self.node_cache[node.ref])
        
        if len(coords) < 3:
            return
        
        # Build feature
        geom_type = "Polygon" if is_closed else "LineString"
        
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
        if not a.tags:
            return
        
        try:
            # Get the geometry as WKB and convert to coordinates
            wkb = osmium.geom.WKBFactory().create_multipolygon(a)
            
            feature = {
                'osm_id': str(a.id),
                'osm_way_id': str(a.id),
                'name': a.tags.get('name'),
                'type': a.tags.get('building') or a.tags.get('landuse') or a.tags.get('amenity'),
                'tags': dict(a.tags),
                'geometry_wkb': wkb
            }
            
            self.features.append(feature)
        except Exception as e:
            # Skip areas that can't be converted to geometry
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


def parse_pbf_file(pbf_file):
    """
    Parse OSM PBF file using pyosmium.
    
    Args:
        pbf_file: Path to the PBF file
        
    Returns:
        List of feature dictionaries
    """
    print(f"Parsing {os.path.basename(pbf_file)} with pyosmium...")
    
    handler = OSMHandler()
    handler.apply_file(pbf_file, locations=True)
    
    print(f"  Extracted {len(handler.features)} features")
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
        for feature in features:
            try:
                # Handle WKB geometry (from areas) or GeoJSON geometry (from ways)
                if 'geometry_wkb' in feature:
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
                        feature['geometry_wkb']
                    ))
                else:
                    # Convert GeoJSON to geometry
                    geom = feature.get('geometry', {})
                    if not geom:
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
                
                inserted += 1
            except Exception as e:
                # Skip features that fail to insert
                continue
        
        conn.commit()
    
    return inserted


def verify_data(conn):
    """
    Query and print sample records to verify the data was inserted correctly.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT id, country, osm_id, name, type, 
                   ST_GeometryType(geom) as geom_type
            FROM {TABLE_NAME} 
            LIMIT 5;
        """)
        records = cur.fetchall()
        print("\nSample records from the database:")
        for record in records:
            print(record)
        
        # Count by country
        cur.execute(f"SELECT country, COUNT(*) FROM {TABLE_NAME} GROUP BY country;")
        counts = cur.fetchall()
        print("\nRecords by country:")
        for country, count in counts:
            print(f"  {country}: {count}")


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
            
            # Parse PBF file
            features = parse_pbf_file(pbf_file)
            
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

