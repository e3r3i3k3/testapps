"""
Glofas Stations Table Creation
Loads glofas_stations_*.csv files and creates a PostGIS-enabled table.
"""
import csv
import os
import glob
from postGisConnect import get_db_connection, enable_postgis, create_spatial_table, create_spatial_index


# Example data in CSV
# stationCode,stationName,lat,lon,fid
# G4730,Gambie A Gouloumbo,13.4667,-13.7333,G4730
# G4752,Senegal A Matam -Donnee Reconstituee-,15.65,-13.25,G4752
# G4877,Faleme A Fadougou Drague -Donnee Reconstituee-,12.5167,-11.3833,G4877
# G4729,Koulountou A Missirah-Gonasse,13.2,-13.6167,G4729

# Configuration
CSV_DIR = "/Users/ehill/repos/IBF-system/services/API-service/src/scripts/git-lfs/point-layers/"
TABLE_NAME = "glofas_stations"
filenamePattern = "glofas_stations_*.csv"


def load_glofas_data(csv_dir):
    """
    Load all glofas_stations_*.csv files from the specified directory.
    
    Args:
        csv_dir: Directory containing the CSV files
        
    Returns:
        List of dictionaries containing the data with country codes
    """
    csv_pattern = os.path.join(csv_dir, filenamePattern)
    csv_files = glob.glob(csv_pattern)
    
    print(f"Found {len(csv_files)} CSV files:")
    for f in csv_files:
        print(f"  - {os.path.basename(f)}")
    print("\n" + "="*50 + "\n")
    
    all_data = []
    for csv_file in csv_files:
        # Extract country code from filename (e.g., glofas_stations_SEN.csv -> SEN)
        basename = os.path.basename(csv_file)
        country_code = basename.replace("glofas_stations_", "").replace(".csv", "")
        
        print(f"Loading {basename} (country: {country_code})...")
        
        with open(csv_file, 'r') as csvfile:
            csv_reader = csv.DictReader(csvfile)
            file_data = []
            for row in csv_reader:
                row['country'] = country_code
                all_data.append(row)
                file_data.append(row)
            print(f"  Loaded {len(file_data)} records")
    
    print(f"\nTotal records loaded: {len(all_data)}")
    print("\n" + "="*50 + "\n")
    
    return all_data


def create_glofas_table(conn):
    """
    Create the glofas_stations table with spatial capabilities.
    
    Args:
        conn: Database connection object
    """
    columns = {
        'id': 'SERIAL PRIMARY KEY',
        'fid': 'VARCHAR(50)',
        'stationCode': 'VARCHAR(50)',
        'stationName': 'VARCHAR(255)',
        'lat': 'DOUBLE PRECISION',
        'lon': 'DOUBLE PRECISION',
        'country': 'VARCHAR(3)',
        'geom': 'GEOMETRY(Point, 4326)'
    }
    
    create_spatial_table(conn, TABLE_NAME, columns, drop_if_exists=True)


def insert_glofas_data(conn, data):
    """
    Insert glofas station data into the table.
    
    Args:
        conn: Database connection object
        data: List of dictionaries containing the data
    """
    with conn.cursor() as cur:
        for row in data:
            # Round lat/lon to 5 decimal places
            lat_value = round(float(row['lat']), 5) if row['lat'] else None
            lon_value = round(float(row['lon']), 5) if row['lon'] else None
            
            cur.execute("""
                INSERT INTO glofas_stations 
                (fid, stationCode, stationName, lat, lon, country, geom)
                VALUES (%s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            """, (
                row['fid'],
                row['stationCode'],
                row['stationName'],
                lat_value,
                lon_value,
                row['country'],
                lon_value,
                lat_value
            ))
        conn.commit()
    print(f"Inserted {len(data)} records into the table!")



def verify_data(conn):
    """
    Query and print sample records to verify the data was inserted correctly.
    
    Args:
        conn: Database connection object
    """
    with conn.cursor() as cur:
        cur.execute(f"SELECT id, fid, stationCode, stationName, lat, lon, country, ST_AsText(geom) as geometry FROM {TABLE_NAME} LIMIT 3;")
        records = cur.fetchall()
        print("\nSample records from the database:")
        for record in records:
            print(record)


def create_glofas_stations_table():
    """
    Main function to create the glofas_stations table.
    Loads CSV data, creates table, inserts data, and creates spatial index.
    """
    print("="*50)
    print("Creating Glofas Stations Table")
    print("="*50 + "\n")
    
    # Load data from CSV files
    data = load_glofas_data(CSV_DIR)
    
    # Connect to database and create table
    with get_db_connection() as conn:
        # Enable PostGIS
        enable_postgis(conn)
        
        # Create table
        create_glofas_table(conn)
        
        # Insert data
        insert_glofas_data(conn, data)
        
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
    create_glofas_stations_table()