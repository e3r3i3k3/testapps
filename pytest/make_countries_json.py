## open shp file data in ../db/testinput/countries/ directory
## files are named as ne_110m_admin_0_countries.*

## simplify the data with geopandas simplify as 5 different factors:
## 0.2, 0.1, 0.01, 0.001, 0.000001

## save the results as geojson files in the out/ dir,
## name the files countries_simplified_A,B,C,D,E

import geopandas as gpd
import os

# Define paths
script_dir = os.path.dirname(os.path.abspath(__file__))
input_shp = os.path.join(script_dir, "db/testinput/countries/ne_110m_admin_0_countries.shp")
output_dir = os.path.join(script_dir, "out")

# Create output directory if it doesn't exist
os.makedirs(output_dir, exist_ok=True)

# Read the shapefile
gdf = gpd.read_file(input_shp)

# Define simplification factors and output names
simplify_factors = [0.5, 0.2, 0.1, 0.01, 0.000001]
output_names = ['A', 'B', 'C', 'D', 'E']

# Apply simplification and save as GeoJSON
for factor, name in zip(simplify_factors, output_names):
    simplified = gdf.copy()
    simplified['geometry'] = simplified['geometry'].simplify(factor)
    output_path = os.path.join(output_dir, f"countries_simplified_{name}.geojson")
    simplified.to_file(output_path, driver='GeoJSON')
    print(f"Saved {output_path} (simplified with factor {factor})")