from __future__ import annotations

"""Build an on-disk pyramid of the flood map using GDAL."""

import shutil
from pathlib import Path

from osgeo import gdal
from osgeo_utils import gdal_retile


ROOT = Path(__file__).parent
SRC_RASTER = ROOT / "TestData" / "flood_map_ZMB_RP20.tif"
PYRAMID_DIR = ROOT / "out" / "pyramid"
TILE_SIZE = 512


def _compute_levels(width: int, height: int) -> list[int]:
	"""Return overview levels doubling until the shortest side collapses."""

	shortest = min(width, height)
	levels = []
	factor = 2
	while shortest // factor >= 1:
		levels.append(factor)
		factor *= 2
	return levels or [2]


def build_pyramid() -> None:
	"""Generate a GeoServer-compatible tile pyramid inside out/pyramid."""

	gdal.UseExceptions()

	if not SRC_RASTER.exists():
		raise FileNotFoundError(f"Missing source raster: {SRC_RASTER}")

	if PYRAMID_DIR.exists():
		shutil.rmtree(PYRAMID_DIR)
	PYRAMID_DIR.mkdir(parents=True, exist_ok=True)

	dataset = gdal.Open(str(SRC_RASTER))
	if dataset is None:
		raise RuntimeError("Failed to open source raster for pyramid metadata.")
	levels = _compute_levels(dataset.RasterXSize, dataset.RasterYSize)
	dataset = None

	args = [
		"gdal_retile.py",
		"-targetDir",
		str(PYRAMID_DIR),
		"-of",
		"GTiff",
		"-ps",
		str(TILE_SIZE),
		str(TILE_SIZE),
		"-levels",
		str(len(levels)),
		"-co",
		"TILED=YES",
		"-co",
		"COMPRESS=LZW",
		str(SRC_RASTER),
	]

	gdal_retile.main(args)


if __name__ == "__main__":
	build_pyramid()