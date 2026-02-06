import geopandas as gpd
import os

# Read the GeoJSON file
fname = "MWI_adm1"
gdf = gpd.read_file(f'TestData/{fname}.json')

# 0.1 to 0.01 seems like a good range for close up, to far away.
#Factor 0.2 seems reasonable for overlaying event data.
#Higher resolutions (lower factor) are not needed since they don't quite line up with the base map in any case.
# For more details see:
#   https://dev.azure.com/redcrossnl/IBF/_workitems/edit/40496 
zoomLevels = {
    '4' : 0.01,
    '3' : 0.025,
    '2' : 0.05, 
    '1' : 0.075,
    '0' : 0.1,
}

# Create output directory if it doesn't exist
os.makedirs('out', exist_ok=True)

# Process each zoom level
for zoom_key, tolerance in zoomLevels.items():
    # Create a copy of the original GeoDataFrame
    gdf_simplified = gdf.copy()
    
    # Simplify the geometries with the tolerance for this zoom level
    gdf_simplified['geometry'] = gdf_simplified.geometry.simplify(tolerance=tolerance)
    
    # Save in GeoJSON format for Maptiler
    gdf_simplified.to_file(f'out/{fname}_geoJson_{zoom_key}.geojson', driver='GeoJSON')
    
    # Save in GeoPackage format for GeoServer
    gdf_simplified.to_file(f'out/{fname}_gpkg_{zoom_key}.gpkg', driver='GPKG')
    
    print(f"Saved files for zoom level {zoom_key} with tolerance {tolerance}")

print("All files saved to out/.")
