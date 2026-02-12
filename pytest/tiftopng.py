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
        
        # Only grey scale images are supported currently
        if src.count != 1:
            raise ValueError(f"Unsupported band count: {src.count}")
        
        img_array = data[0]

        # Print lowest value above 0
        values_above_zero = img_array[img_array > 0]
        if len(values_above_zero) > 0:
            print(f"Lowest value above 0: {np.min(values_above_zero)}")
        else:
            print("No values above 0 found")
        
        # TODO: fix this so that the top outliers don't force us to use a
        # very large range.
        # Probably cap the max at the top 5th percentile.

        # How many steps in the color gradation for the output.
        stepFactor = 12
        newMinimum = (255 / stepFactor) + 1 # add 1 to prevent rounding to 0
        minVal = 0
        # This is used to increase the range of the steps to use the full range
        mult = round(255 / stepFactor)

        # To prevent low values from rounding to zero, step up all values by one increment.
        # This works as long as the NoData value is less than the step factor.
        if src.nodata is not None and src.nodata + newMinimum > 0:
            raise ValueError(f"Step factor of {stepFactor} is too large for the NoData value of {src.nodata}.")
        img_array = img_array + newMinimum

        # NoData values are any value below zero. Set all to zero.
        if src.nodata is not None:
            img_array = np.where(img_array < 0, 0, img_array)

        valueRange = np.nanmax(img_array)
        print(f"Band 1 min: {minVal}, max: {valueRange}. Actual min: {np.nanmin(img_array)}")

        # Normalize to 0 to 1, then multiply by the step factor
        # cast as int for rounding
        img_array = ((img_array / valueRange) * stepFactor).astype(np.uint8)
        print(f"First pass. Should be <= than {stepFactor}. max: {np.nanmax(img_array)}, min: {np.nanmin(img_array)}")

        # expand to 0-255 range, and cast again as uint8
        #img_array = (img_array * mult).astype(np.uint8)
        img_array = (img_array).astype(np.uint8)
        print(f"Second pass. Should be <= 255. max: {np.nanmax(img_array)}, min: {np.nanmin(img_array)}")

        # check value distribution
        counts = np.bincount(img_array.flatten(), minlength=256)
        print("Pixel value distribution (value: count):")
        for value in range(256):
            if counts[value] > 0:
                print(f"  {value}: {counts[value]}")
        

        # Create an image with L mode (0-255 gray scale)
        img = Image.fromarray(img_array, mode='L')                

        # Generate output filenames
        base_name = os.path.splitext(os.path.basename(tif_path))[0]
        png_path = os.path.join(output_dir, f"{base_name}_f{stepFactor}.png")
        jpg_path = os.path.join(output_dir, f"{base_name}_f{stepFactor}.jpg")
        json_path = os.path.join(output_dir, f"{base_name}_metadata.json")
        
        # Save as PNG (lossless)
        # optimize=True gets the best compression.
        img.save(png_path, optimize=True)
        print(f"\nPNG saved to: {png_path}")

        # For debug and comparison, save a jpg on low quality (1 to 100 scale)
        img.save(jpg_path, optimize=False, quality=10)
        
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
