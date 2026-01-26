path = '../../IBF-system/services/API-service/geoserver-volume/raster-files/input/cropland'
filename = 'uga_cropland_original.tif'
filename2 = 'uga_grassland_original.tif'

path3 = '../../IBF-system/services/API-service/geoserver-volume/raster-files/input/population'
filename3 = 'hrsl_uga_pop_resized_100.tif'
changed_filename = 'uga_cropland_aablend.tif'

import rasterio
from rasterio.warp import reproject, Resampling
import numpy as np
import os

# Construct full paths
input_path = os.path.join(path, filename)
input_path2 = os.path.join(path, filename2)
input_path3 = os.path.join(path3, filename3)
output_path = os.path.join(path, changed_filename)

# Open the source files
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

with rasterio.open(input_path2) as src2:
    # Read the first band of the second source image
    band_data2 = src2.read(1)

with rasterio.open(input_path3) as src3:
    # Reproject filename3 to match dimensions of filename
    #band_data3 = np.empty((band_data.shape[0], band_data.shape[1]), dtype=band_data.dtype)
    band_data3 = src3.read(1)
    
    reproject(
        source=rasterio.band(src3, 1),
        destination=band_data3,
        src_transform=src3.transform,
        src_crs=src3.crs,
        dst_transform=src.transform,
        dst_crs=src.crs,
        resampling=Resampling.nearest
    )
    
    rgb_data = np.zeros((3, band_data.shape[0], band_data.shape[1]), dtype=band_data.dtype)
    
    rgb_data[0] = np.where(band_data != 0, band_data, 0)
    rgb_data[1] = np.where(band_data2 != 0, band_data2, 0)
    rgb_data[2] = np.where(band_data3 != 0, band_data3, 0)
    
    # Write the RGB image
    with rasterio.open(output_path, 'w', **meta) as dst:
        dst.write(rgb_data)
        # Set color interpretation for each band
        dst.colorinterp = [
            rasterio.enums.ColorInterp.red,
            rasterio.enums.ColorInterp.green,
            rasterio.enums.ColorInterp.blue
        ]

print(f"Blended to {changed_filename}")

