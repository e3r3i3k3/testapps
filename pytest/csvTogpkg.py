import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import os

# Read the CSV file
fname = "red_cross_branches_SDN"
df = pd.read_csv(f'TestData/{fname}.csv')

# Handle missing values - replace empty strings and 'NA' with None
df = df.replace(['', 'NA'], None)

# Create geometry from lat/lon columns
geometry = [Point(xy) for xy in zip(df.lon, df.lat)]

# Create GeoDataFrame
gdf = gpd.GeoDataFrame(df, geometry=geometry)

# Set the CRS to WGS84 (EPSG:4326) for lat/lon data
gdf.set_crs(epsg=4326, inplace=True)

# Create output directory
os.makedirs('out', exist_ok=True)

# Save to GeoPackage with a descriptive layer name
gdf.to_file(f'out/{fname}_csvtogpkg.gpkg', driver='GPKG', layer=f"{fname}_test")

print("File saved to out/")