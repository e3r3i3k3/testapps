import rasterio
from rasterio.plot import reshape_as_image
from rasterio.warp import calculate_default_transform, reproject, Resampling, transform_bounds
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
        
        # Calculate bounds from the actual transform used (ensures pixel-perfect alignment)
        # bounds = (left, bottom, right, top)
        left = transform[2]
        top = transform[5]
        right = left + (width * transform[0])
        bottom = top + (height * transform[4])
        
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
                'left': left,
                'bottom': bottom,
                'right': right,
                'top': top
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
        if band_count == 1:
            # Single band - grayscale
            img_array = data[0]
            # Normalize to 0-255 range
            if img_array.dtype != np.uint8:
                img_min, img_max = np.nanmin(img_array), np.nanmax(img_array)
                if img_min != img_max:
                    img_array = ((img_array - img_min) / (img_max - img_min) * 255).astype(np.uint8)
                else:
                    img_array = np.zeros_like(img_array, dtype=np.uint8)
            # Handle nodata values
            if src.nodata is not None:
                mask = data[0] == src.nodata
                img_array[mask] = 0
            img = Image.fromarray(img_array, mode='L')
        elif band_count >= 3:
            # Multi-band - assume RGB or RGBA
            img_array = reshape_as_image(data)
            # Take first 3 bands for RGB
            if band_count > 3:
                img_array = img_array[:, :, :3]
            # Normalize if needed
            if img_array.dtype != np.uint8:
                img_min, img_max = np.nanmin(img_array), np.nanmax(img_array)
                if img_min != img_max:
                    img_array = ((img_array - img_min) / (img_max - img_min) * 255).astype(np.uint8)
                else:
                    img_array = np.zeros_like(img_array, dtype=np.uint8)
            img = Image.fromarray(img_array, mode='RGB')
        else:
            raise ValueError(f"Unsupported band count: {band_count}")
        
        compress_level = 0

        # Generate output filenames
        base_name = os.path.splitext(os.path.basename(tif_path))[0]
        png_path = os.path.join(output_dir, f"{base_name}_c{compress_level}_c3857.png")
        json_path = os.path.join(output_dir, f"{base_name}_metadata_c3857.json")
        
        # Save PNG with highest quality settings
        # compress_level=0 means no compression (highest quality, largest file)
        # optimize=False skips optimization passes
        img.save(png_path, compress_level, optimize=False)
        print(f"\nPNG saved to: {png_path}")
        
        # Save geo data as JSON
        with open(json_path, 'w') as f:
            json.dump(geo_data, f, indent=2)
        print(f"Metadata saved to: {json_path}")


if __name__ == "__main__":
    # Process the specified GeoTIFF
    tif_file = "TestData/eth_pd_2020_1km_UNadj.tif"
    
    if os.path.exists(tif_file):
        tif_to_png_with_metadata(tif_file)
    else:
        print(f"Error: File '{tif_file}' not found in current directory")
        print(f"Current directory: {os.getcwd()}")
