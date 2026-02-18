import csv
import json
import os
import glob
import psycopg
from psycopg import sql

#db connection info
POSTGRES_HOST = "localhost"
POSTGRES_DB = "postgres"
POSTGRES_USER = "admin"
POSTGRES_PASSWORD = "eee"
POSTGRES_PORT = 5432

# Set the directory where CSV files are located
csv_dir = "/Users/ehill/repos/IBF-system/services/API-service/src/scripts/git-lfs/point-layers/"

# Find all files starting with red_cross_branches_
csv_pattern = os.path.join(csv_dir, "red_cross_branches_*.csv")
csv_files = glob.glob(csv_pattern)

print(f"Found {len(csv_files)} CSV files:")
for f in csv_files:
    print(f"  - {os.path.basename(f)}")
print("\n" + "="*50 + "\n")

# Load CSV files and convert to JSON
all_data = []
for csv_file in csv_files:
    # Extract country code from filename (e.g., red_cross_branches_SDN.csv -> SDN)
    basename = os.path.basename(csv_file)
    country_code = basename.replace("red_cross_branches_", "").replace(".csv", "")
    
    print(f"Loading {basename} (country: {country_code})...")
    
    with open(csv_file, 'r') as csvfile:
        csv_reader = csv.DictReader(csvfile)
        file_data = []
        for row in csv_reader:
            row['country'] = country_code  # Add country column from filename
            all_data.append(row)
            file_data.append(row)
        print(f"  Loaded {len(file_data)} records")

print(f"\nTotal records loaded: {len(all_data)}")
print("\n" + "="*50 + "\n")

# Connect to database
with psycopg.connect(
    host=POSTGRES_HOST,
    dbname=POSTGRES_DB,
    user=POSTGRES_USER,
    password=POSTGRES_PASSWORD,
    port=POSTGRES_PORT
) as conn:
    with conn.cursor() as cur:
        # Enable PostGIS extension
        cur.execute("CREATE EXTENSION IF NOT EXISTS postgis;")
        conn.commit()
        print("PostGIS extension enabled!")
        
        # Create table
        cur.execute("""
            DROP TABLE IF EXISTS red_cross_branches;
            CREATE TABLE red_cross_branches (
                id SERIAL PRIMARY KEY,
                branchName VARCHAR(255),
                lat DOUBLE PRECISION,
                lon DOUBLE PRECISION,
                numberOfVolunteers INTEGER,
                contactPerson VARCHAR(255),
                contactNumber VARCHAR(100),
                contactAddress VARCHAR(255),
                country VARCHAR(3),
                geom GEOMETRY(Point, 4326)
            );
        """)
        conn.commit()
        print("Table 'red_cross_branches' created successfully!")

        # Insert data
        for row in all_data:
            # Round lat/lon to 5 decimal places
            lat_value = round(float(row['lat']), 5) if row['lat'] else None
            lon_value = round(float(row['lon']), 5) if row['lon'] else None
            
            cur.execute("""
                INSERT INTO red_cross_branches 
                (branchName, lat, lon, numberOfVolunteers, contactPerson, contactNumber, contactAddress, country, geom)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, ST_SetSRID(ST_MakePoint(%s, %s), 4326))
            """, (
                row['branchName'],
                lat_value,
                lon_value,
                int(row['numberOfVolunteers']) if row['numberOfVolunteers'] else None,
                row['contactPerson'] if row['contactPerson'] else None,
                row['contactNumber'] if row['contactNumber'] else None,
                row['contactAddress'] if row['contactAddress'] else None,
                row['country'],
                lon_value,
                lat_value
            ))
        conn.commit()
        print(f"Inserted {len(all_data)} records into the table!")
        
        # Create spatial index
        cur.execute("CREATE INDEX red_cross_branches_geom_idx ON red_cross_branches USING GIST (geom);")
        conn.commit()
        print("Spatial index created!")

        # Query and print a sample record to verify connection
        cur.execute("SELECT id, branchName, lat, lon, country, ST_AsText(geom) as geometry FROM red_cross_branches LIMIT 3;")
        records = cur.fetchall()
        print("\nSample records from the database:")
        for record in records:
            print(record)

print("\nDatabase connection closed.")
print("\n" + "="*50)
print("Your data is now available in pg-featureserv!")
print("Access it at:")
print("  Collection: http://localhost:9000/collections/public.red_cross_branches")
print("  Items: http://localhost:9000/collections/public.red_cross_branches/items")
print("  Web UI: http://localhost:9000/index.html")
print("="*50)

