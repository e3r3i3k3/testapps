path = '../../IBF-system/services/API-service/geoserver-volume/raster-files/input/cropland'
filename = 'uga_cropland_original.tif'
filename2 = 'uga_grassland_original.tif'

path3 = '../../IBF-system/services/API-service/geoserver-volume/raster-files/input/population'
filename3 = 'hrsl_uga_pop_resized_100.tif'
changed_filename = 'uga_cropland_3blend.tif'

import rasterio
import numpy as np
import cv2
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
    nodata = src.nodata if src.nodata is not None else 0
    
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
    # Read the third source image
    raw_data3 = src3.read(1)
    
    # Resize to match dimensions of filename using cv2
    band_data3 = cv2.resize(raw_data3, (band_data.shape[1], band_data.shape[0]), 
                            interpolation=cv2.INTER_NEAREST).astype(band_data.dtype)
    
    rgb_data = np.zeros((3, band_data.shape[0], band_data.shape[1]), dtype=band_data.dtype)
    
    # Compare band_data (band 1) and band_data3 (band 3)
    print("\nComparing Band 1 and Band 3 - First 20 values where both are not 0 or null:")
    print(f"{'Index':<15} {'Band 1':<15} {'Band 3':<15}")
    print("-" * 45)
    
    count = 0
    for i in range(band_data.shape[0]):
        for j in range(band_data.shape[1]):
            val1 = band_data[i, j]
            val3 = band_data3[i, j]
            if val1 != 0 and val3 != 0 and not np.isnan(val1) and not np.isnan(val3):
                print(f"[{i},{j}]{' ':<8} {val1:<15} :: {val3:<15}")
                count += 1
                if count >= 20:
                    break
        if count >= 20:
            break
    print()

    rgb_data[0] = np.where(band_data != 0, band_data, 0)
    rgb_data[1] = np.where(band_data2 != 0, band_data2, 0)
    ## NOTE: the next line uses data from band 1 since band 3 is using a different data range
    ## This means it only shows overlapped areas now
    rgb_data[2] = np.where(band_data3 != 0, band_data , 0)
    
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

