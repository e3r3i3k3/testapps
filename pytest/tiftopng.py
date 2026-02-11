import rasterio
from rasterio.plot import reshape_as_image
import numpy as np
from PIL import Image
import json
import os

def tif_to_png_with_metadata(tif_path, output_dir='out'):
    """
    Open a GeoTIFF, print its geo data, convert to PNG, and save metadata as JSON.
    
    Args:
        tif_path: Path to the input GeoTIFF file
        output_dir: Directory to save output files (default: 'out')
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Open the GeoTIFF
    with rasterio.open(tif_path) as src:
        # Extract geo data
        geo_data = {
            'driver': src.driver,
            'dtype': str(src.dtypes[0]),
            'nodata': src.nodata,
            'width': src.width,
            'height': src.height,
            'count': src.count,
            'crs': str(src.crs),
            'transform': list(src.transform),
            'bounds': {
                'left': src.bounds.left,
                'bottom': src.bounds.bottom,
                'right': src.bounds.right,
                'top': src.bounds.top
            },
            'res': src.res,
            'indexes': list(src.indexes),
            'colorinterp': [str(ci) for ci in src.colorinterp],
            'units': src.units,
            'descriptions': src.descriptions,
            'nodatavals': src.nodatavals,
            'scales': src.scales,
            'offsets': src.offsets
        }
        
        # Print all geo data
        print("=" * 60)
        print("GeoTIFF Metadata:")
        print("=" * 60)
        for key, value in geo_data.items():
            print(f"{key}: {value}")
        print("=" * 60)
        
        # Read the raster data
        data = src.read()
        
        # Handle different band counts
        if src.count != 1:
            raise ValueError(f"Unsupported band count: {src.count}")
        
        # Single band - grayscale
        img_array = data[0]

        # Zero will be no data. Since everything is done in steps based on the factor, all data
        # must then start at the first step
        stepFactor = 6
        img_array = img_array + stepFactor * 2

        # Convert nodata values to 0
        if src.nodata is not None:
            img_array = np.where(img_array < 0, 0, img_array)
        
        # This is used to increase the range of the steps to use the full range
        mult = round(255 / stepFactor)
        # Normalize to the given factor
        if img_array.dtype != np.uint8:
            img_min = 0
            img_max = np.nanmax(img_array)
            print(f"Band 1 min: {img_min}, max: {img_max}. Actual min: {np.nanmin(img_array)}")

            # Normalize to 0 to 1, then multiply by the step factor
            # cast as int for rounding
            img_array = ((img_array) / (img_max) * stepFactor).astype(np.uint8)
            print(f"First pass. Should be <= than {stepFactor}. max: {np.nanmax(img_array)}, min: {np.nanmin(img_array)}")

            # expand to 0-255 range
            img_array = (img_array * mult).astype(np.uint8)
            print(f"Second pass. Should be <= 255. max: {np.nanmax(img_array)}, min: {np.nanmin(img_array)}")


        # Mask for no data values
        # Is this needed or helping?
        if src.nodata is not None:
            mask = data[0] == 0
            img_array[mask] = 0
        img = Image.fromarray(img_array, mode='L')
                

        # Generate output filenames
        base_name = os.path.splitext(os.path.basename(tif_path))[0]
        png_path = os.path.join(output_dir, f"{base_name}_f{stepFactor}.png")
        jpg_path = os.path.join(output_dir, f"{base_name}.jpg")
        json_path = os.path.join(output_dir, f"{base_name}_metadata.json")
        
        # Save PNG
        # optimize=False skips optimization passes
        img.save(png_path, optimize=True)
        img.save(jpg_path, optimize=False, quality=10)
        print(f"\nPNG saved to: {png_path}")
        
        # Save geo data as JSON
        with open(json_path, 'w') as f:
            json.dump(geo_data, f, indent=2)
        print(f"Metadata saved to: {json_path}")


if __name__ == "__main__":
    # Process the specified GeoTIFF
    # flood_map_ZMB_RP20.tif
    # eth_cropland.tif
    tif_file = "TestData/flood_map_ZMB_RP20.tif"
    
    if os.path.exists(tif_file):
        tif_to_png_with_metadata(tif_file)
    else:
        print(f"Error: File '{tif_file}' not found in current directory")
        print(f"Current directory: {os.getcwd()}")
