path = '../IBF-system/services/API-service/geoserver-volume/raster-files/input/cropland'
filename = 'uga_cropland_original.tif'
changed_filename = 'uga_cropland_changed_A.tif'

import rasterio
import numpy as np
import os

# Construct full paths
input_path = os.path.join(path, filename)
output_path = os.path.join(path, changed_filename)

# Open the source file
with rasterio.open(input_path) as src:
    # Read the first band of the source image
    band_data = src.read(1)
    
    # Get metadata and update for RGBA output
    meta = src.meta.copy()
    
    # Remove any existing photometric interpretation that might conflict
    if 'photometric' in meta:
        del meta['photometric']
    
    meta.update({
        'count': 4,  # RGBA has 4 bands
        'dtype': band_data.dtype,
        'compress': 'deflate'
    })
    
    # Add TIFF tag for proper RGBA interpretation
    if meta.get('driver') == 'GTiff':
        meta['PHOTOMETRIC'] = 'RGB'
        meta['ALPHA'] = 'YES'
    
    # Create RGBA image with source data on red channel
    # Green and blue channels are set to zero, alpha always 1
    rgba_data = np.zeros((4, band_data.shape[0], band_data.shape[1]), dtype=band_data.dtype)
    rgba_data[0] = band_data  # Red channel
    rgba_data[1] = 0  # Green channel
    rgba_data[2] = 0  # Blue channel
    rgba_data[3] = 1  # Alpha channel (always 1)
    
    # Write the RGBA image
    with rasterio.open(output_path, 'w', **meta) as dst:
        dst.write(rgba_data)
        # Set color interpretation for each band
        dst.colorinterp = [
            rasterio.enums.ColorInterp.red,
            rasterio.enums.ColorInterp.green,
            rasterio.enums.ColorInterp.blue,
            rasterio.enums.ColorInterp.alpha
        ]

print(f"Converted {filename} to RGB and saved as {changed_filename}")

