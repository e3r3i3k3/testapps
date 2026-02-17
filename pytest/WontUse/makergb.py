path = '../IBF-system/services/API-service/geoserver-volume/raster-files/input/cropland'
filename = 'uga_cropland_original.tif'
changed_filename = 'uga_cropland_changed.tif'

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
    
    # Get metadata and update for RGB output
    meta = src.meta.copy()
    meta.update({
        'count': 3,  # RGB has 3 bands
        'dtype': band_data.dtype,
        'photometric': 'RGB'
    })
    
    # Create RGB image with source data on red channel
    # Green and blue channels are set to zero
    rgb_data = np.zeros((3, band_data.shape[0], band_data.shape[1]), dtype=band_data.dtype)
    
    # Set red channel to band_data, but keep 0 where original image has no color (0 values)
    rgb_data[0] = np.where(band_data != 0, band_data, 0)
    rgb_data[1] = 0
    rgb_data[2] = 0
    
    # Write the RGB image
    with rasterio.open(output_path, 'w', **meta) as dst:
        dst.write(rgb_data)
        # Set color interpretation for each band
        dst.colorinterp = [
            rasterio.enums.ColorInterp.red,
            rasterio.enums.ColorInterp.green,
            rasterio.enums.ColorInterp.blue
        ]

print(f"Converted {filename} to RGB and saved as {changed_filename}")

