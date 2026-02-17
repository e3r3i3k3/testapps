
import rasterio
from rasterio.plot import reshape_as_image
from rasterio.warp import calculate_default_transform, reproject, Resampling
from rasterio.transform import array_bounds
from rasterio.crs import CRS
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
        # Define target CRS (EPSG:3857)
        dst_crs = CRS.from_epsg(3857)
        
        # Calculate transform for reprojection
        transform, width, height = calculate_default_transform(
            src.crs, dst_crs, src.width, src.height, *src.bounds
        )
        
        # Set up reprojected data array
        reprojected_data = np.empty((src.count, height, width), dtype=src.dtypes[0])
        
        # Reproject each band
        for i in range(1, src.count + 1):
            reproject(
                source=rasterio.band(src, i),
                destination=reprojected_data[i-1],
                src_transform=src.transform,
                src_crs=src.crs,
                dst_transform=transform,
                dst_crs=dst_crs,
                resampling=Resampling.bilinear
            )
        
        # Calculate bounds from the transform matrix and raster dimensions
        # This ensures bounds match the actual pixel grid
        new_bounds = array_bounds(height, width, transform)
        
        # Extract geo data with updated projection
        geo_data = {
            'driver': src.driver,
            'dtype': str(src.dtypes[0]),
            'nodata': src.nodata,
            'width': width,
            'height': height,
            'count': src.count,
            'crs': str(dst_crs),
            'transform': list(transform),
            'bounds': {
                'left': new_bounds[0],
                'bottom': new_bounds[1],
                'right': new_bounds[2],
                'top': new_bounds[3]
            },
            'res': (transform[0], -transform[4]),
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
        
        # Use reprojected data
        data = reprojected_data
        
        # Handle different band counts
        band_count = data.shape[0]
        if band_count != 1:

            raise ValueError(f"Unsupported band count: {band_count}")
        
        # Single band - grayscale
        img_array = data[0]
        # Set all nodata values to -2
        img_array[img_array == src.nodata] = -1
        # add 1 to make nodata the new zero
        img_array += 1

        # log scale the data
        img_array = np.log1p(img_array)

        # set values below zero to zero
        img_array[img_array < 0] = 0

        # Normalize to 0-1 range for color interpolation
        img_max = np.nanmax(img_array)
        if img_max != 0:
            normalized = img_array  / img_max 

        # make bw array for output to png
        img_array_bw = (normalized * 255).astype(np.uint8)
        
        # Create RGBA array - lerp between yellow (255, 255, 0) and red (255, 0, 0)
        height, width = img_array.shape
        img_array_rgba = np.zeros((height, width, 4), dtype=np.uint8)
        img_array_rgba[:, :, 0] = 255  # R channel: constant 255
        img_array_rgba[:, :, 1] = ((1 - normalized) * 255).astype(np.uint8)  # G channel: 255 to 0
        img_array_rgba[:, :, 2] = 0  # B channel: constant 0
        
        # Set alpha: 0 for pixels with value 0, 255 for all others
        img_array_rgba[:, :, 3] = np.where(img_array == 0, 0, 255)
        

        # Generate output filenames
        base_name = os.path.splitext(os.path.basename(tif_path))[0]
        png_path = os.path.join(output_dir, f"{base_name}_3857.png")
        png_path_bw = os.path.join(output_dir, f"{base_name}_bw_3857.png")
        json_path = os.path.join(output_dir, f"{base_name}_metadata_b3857.json")
        
        # Create PIL Image from RGBA array
        img = Image.fromarray(img_array_rgba, mode='RGBA')
        img_bw = Image.fromarray(img_array_bw, mode='L')
        
        # Save PNG with highest quality settings
        # compress_level=0 means no compression (highest quality, largest file)
        # optimize=False skips optimization passes
        img.save(png_path, optimize=True)
        img_bw.save(png_path_bw, optimize=True)
        print(f"\nPNG saved to: {png_path}")
        
        # Save geo data as JSON
        with open(json_path, 'w') as f:
            json.dump(geo_data, f, indent=2)
        print(f"Metadata saved to: {json_path}")


if __name__ == "__main__":
    # Process the specified GeoTIFF
    tif_file = "TestData/flood_map_ZMB_RP20.tif"
    #tif_file = "TestData/eth_pd_2020_1km_UNadj.tif"
    
    if os.path.exists(tif_file):
        tif_to_png_with_metadata(tif_file)
    else:
        print(f"Error: File '{tif_file}' not found in current directory")
        print(f"Current directory: {os.getcwd()}")
