import geopandas as gpd
import os

# Read the GeoJSON file
gdf = gpd.read_file('TestData/MWI_adm1.json')

# Simplify the geometries (tolerance in degrees, adjust as needed)
gdf['geometry'] = gdf.geometry.simplify(tolerance=0.01)

# Create output directory if it doesn't exist
os.makedirs('out', exist_ok=True)

# Save in GeoJSON format
gdf.to_file('out/simplified.geojson', driver='GeoJSON')

# Save in GeoPackage format
gdf.to_file('out/simplified.gpkg', driver='GPKG')

# Save in CSV format (geometry will be WKT)
gdf.to_csv('out/simplified.csv', index=False)

print("Files save to out/.")
