import os
import subprocess
from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio

# Fix for PROJ initialization error and OSGeo4W path
PROJ_PATH = r"C:\OSGEO4W\share\proj"
os.environ["PROJ_LIB"] = PROJ_PATH
os.environ["PROJ_DATA"] = PROJ_PATH
os.environ["PATH"] = r"C:\OSGEO4W\bin;" + os.environ["PATH"]

def run_command(cmd_list):
    """Runs a shell command and raises an error if it fails."""
    print(f"Running: {' '.join(cmd_list)}")
    result = subprocess.run(cmd_list, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"STDOUT: {result.stdout}")
        print(f"STDERR: {result.stderr}")
        raise RuntimeError(f"Command failed: {cmd_list[0]}")
    return result.stdout

from rasterio.features import rasterize
from rasterio.mask import mask
from rasterio.warp import Resampling, calculate_default_transform, reproject
from scipy.ndimage import distance_transform_edt, generic_filter


def load_unit_boundary(unit_geojson: str, target_crs) -> gpd.GeoDataFrame:
    unit = gpd.read_file(unit_geojson)
    unit = unit[unit.geometry.notna()].copy()
    if unit.empty:
        raise ValueError("Unit boundary is empty.")
    if unit.crs is None:
        raise ValueError("Unit boundary has no CRS.")
    if unit.crs != target_crs:
        unit = unit.to_crs(target_crs)

    unit = unit[unit.geometry.type.isin(["Polygon", "MultiPolygon"])].copy()
    if unit.empty:
        raise ValueError("Unit boundary must contain Polygon or MultiPolygon geometry.")

    return unit


def read_and_clip_dem(dem_path: str, unit: gpd.GeoDataFrame):
    with rasterio.open(dem_path) as src:
        if src.crs is None:
            raise ValueError("DEM has no CRS. Use a projected CRS (meters recommended).")

        geoms = [geom for geom in unit.geometry if geom is not None]
        clipped, clipped_transform = mask(src, geoms, crop=True, filled=True)

        dem = clipped[0].astype("float32")
        dem_nodata = src.nodata

        if dem_nodata is not None:
            dem = np.ma.masked_equal(dem, dem_nodata)
        else:
            dem = np.ma.masked_invalid(dem)

        profile = src.profile.copy()
        profile.update(
            height=dem.shape[0],
            width=dem.shape[1],
            transform=clipped_transform,
        )

        res_x = abs(clipped_transform.a)
        res_y = abs(clipped_transform.e)

        return dem, profile, clipped_transform, src.crs, res_x, res_y


def compute_slope_degrees(dem: np.ma.MaskedArray, res_x: float, res_y: float) -> np.ndarray:
    z = dem.filled(np.nan).astype("float32")
    dz_dy, dz_dx = np.gradient(z, res_y, res_x)
    slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
    return np.degrees(slope_rad).astype("float32")


def reproject_raster_gdal(src_path: Path, dst_path: Path, dst_crs: str = "EPSG:3857"):
    """Reprojects a raster file using gdalwarp."""
    run_command(["gdalwarp", "-t_srs", dst_crs, "-r", "bilinear", "-overwrite", str(src_path), str(dst_path)])


def calculate_slope_gdal(src_path: Path, dst_path: Path):
    """Calculates slope in degrees using gdaldem."""
    run_command(["gdaldem", "slope", str(src_path), str(dst_path), "-compute_edges"])


def load_and_reproject_vector(vector_path: str, target_crs) -> gpd.GeoDataFrame:
    gdf = gpd.read_file(vector_path)
    gdf = gdf[gdf.geometry.notna()].copy()
    if gdf.empty:
        return gdf

    if gdf.crs is None:
        raise ValueError(f"Vector has no CRS: {vector_path}")

    if gdf.crs != target_crs:
        gdf = gdf.to_crs(target_crs)

    return gdf


def clip_vector_to_unit(gdf: gpd.GeoDataFrame, unit: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if gdf.empty:
        return gdf
    return gpd.clip(gdf, unit)


def rasterize_to_match(gdf: gpd.GeoDataFrame, out_shape: tuple[int, int], transform) -> np.ndarray:
    if gdf.empty:
        return np.zeros(out_shape, dtype="uint8")

    shapes = [(geom, 1) for geom in gdf.geometry if geom is not None]
    if not shapes:
        return np.zeros(out_shape, dtype="uint8")

    return rasterize(
        shapes=shapes,
        out_shape=out_shape,
        transform=transform,
        fill=0,
        dtype="uint8",
        all_touched=True,
    )


def distance_in_meters(binary_raster: np.ndarray, res_x: float, res_y: float) -> np.ndarray:
    sampling = (res_y, res_x)  # (row, col)
    return distance_transform_edt(binary_raster == 0, sampling=sampling).astype("float32")


def clamp01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def score_slope(slope_deg: np.ndarray) -> np.ndarray:
    """
    Score slope based on bighorn sheep habitat preferences.
    0-20°: 0.3 (low suitability - too flat)
    20-30°: 0.6 (moderate suitability)
    30°+: 1.0 (high suitability - preferred steep terrain)
    """
    score = np.zeros_like(slope_deg, dtype=np.float32)
    
    # 0-20 degrees: score = 0.3
    mask_flat = slope_deg < 20.0
    score[mask_flat] = 0.3
    
    # 20-30 degrees: score = 0.6
    mask_moderate = (slope_deg >= 20.0) & (slope_deg < 30.0)
    score[mask_moderate] = 0.6
    
    # 30+ degrees: score = 1.0
    mask_steep = slope_deg >= 30.0
    score[mask_steep] = 1.0
    
    return score


def score_distance_to_water(dist_m: np.ndarray, best_within_m: float = 1500.0) -> np.ndarray:
    return clamp01(1.0 - (dist_m / best_within_m))


def score_distance_from_roads(dist_m: np.ndarray, good_far_m: float = 1000.0) -> np.ndarray:
    return clamp01(dist_m / good_far_m)


def build_suitability(
    dem: np.ma.MaskedArray,
    slope_deg: np.ndarray,
    dist_water_m: np.ndarray,
    dist_roads_m: np.ndarray,
    weight_slope: float = 1.5,
    weight_water: float = 1.5,
    weight_roads: float = 1,
) -> np.ndarray:
    s_slope = score_slope(slope_deg)
    s_water = score_distance_to_water(dist_water_m)
    s_roads = score_distance_from_roads(dist_roads_m)

    total_w = weight_slope + weight_water + weight_roads
    suitability_01 = (
        weight_slope * s_slope
        + weight_water * s_water
        + weight_roads * s_roads
    ) / total_w

    out = (suitability_01 * 100.0).astype("float32")
    out[np.ma.getmaskarray(dem)] = np.nan
    return out


def write_geotiff(out_path: str, arr: np.ndarray, profile: dict):
    out_profile = profile.copy()
    out_profile.update(
        dtype="float32",
        count=1,
        nodata=np.nan,
        compress="deflate",
        predictor=2,
        tiled=True,
        blockxsize=256,
        blockysize=256,
    )

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(out_path, "w", **out_profile) as dst:
        dst.write(arr.astype("float32"), 1)


def main(config: dict, write_debug_rasters: bool = False) -> Path:
    with rasterio.env.Env(PROJ_LIB=PROJ_PATH, PROJ_DATA=PROJ_PATH):
        print("Building Habitat Suitability Index")

        raw_dir = Path(config["environment"]["raw_data_dir"])
        processed_dir = Path(config["environment"]["processed_data_dir"])

        unit_path = raw_dir / "hunting_district.geojson"
        roads_path = raw_dir / "mt_roads.geojson"
        waterbody_path = raw_dir / "nhd_waterbody.geojson"
        flowline_path = raw_dir / "nhd_flowline.geojson"

        # Pre-calculated rasters
        dem_clipped_path = processed_dir / "dem_clipped.tif"
        dem_3857_path = processed_dir / "dem_3857.tif"
        slope_3857_path = processed_dir / "slope_3857.tif"

        out_path = None
        if "outputs" in config and "suitability" in config["outputs"]:
            out_path = Path(config["outputs"]["suitability"])
        else:
            out_path = processed_dir / "habitat_suitability.tif"

        # 1. Reproject DEM to Web Mercator (EPSG:3857) for metric processing using GDAL
        print("Reprojecting DEM to Web Mercator (EPSG:3857) via GDAL...")
        reproject_raster_gdal(dem_clipped_path, dem_3857_path, "EPSG:3857")
        
        # 2. Calculate Slope in 3857 via GDAL
        print("Calculating slope via GDAL...")
        calculate_slope_gdal(dem_3857_path, slope_3857_path)

        # Load results
        with rasterio.open(dem_3857_path) as src:
            dem = src.read(1, masked=True)
            transform_3857 = src.transform
            res_x = abs(transform_3857.a)
            res_y = abs(transform_3857.e)
            profile_3857 = src.profile
            crs_3857 = src.crs

        with rasterio.open(slope_3857_path) as src:
            slope_deg = src.read(1, masked=True)

        # Load unit for clipping (reprojected to 3857)
        unit = load_unit_boundary(str(unit_path), crs_3857)

        roads_gdf = load_and_reproject_vector(str(roads_path), crs_3857)
        waterbody_gdf = load_and_reproject_vector(str(waterbody_path), crs_3857)
        flowline_gdf = load_and_reproject_vector(str(flowline_path), crs_3857)

        # Combine water sources (polygons + lines) into a single “water” layer
        water_gdf = gpd.GeoDataFrame(
            geometry=np.concatenate([waterbody_gdf.geometry.values, flowline_gdf.geometry.values]),
            crs=crs_3857,
        )
        water_gdf = water_gdf[water_gdf.geometry.notna()].copy()

        out_shape = dem.shape
        roads_r = rasterize_to_match(roads_gdf, out_shape=out_shape, transform=transform_3857)
        water_r = rasterize_to_match(water_gdf, out_shape=out_shape, transform=transform_3857)

        dist_roads_m = distance_in_meters(roads_r, res_x=res_x, res_y=res_y)
        dist_water_m = distance_in_meters(water_r, res_x=res_x, res_y=res_y)

        if write_debug_rasters:
            print("Writing debug rasters (EPSG:3857)...")
            write_geotiff(str(processed_dir / "debug_dist_roads.tif"), dist_roads_m, profile_3857)
            write_geotiff(str(processed_dir / "debug_dist_water.tif"), dist_water_m, profile_3857)
            
            # Ensure we can call filled() safely
            slope_for_debug = slope_deg.filled(np.nan) if hasattr(slope_deg, "filled") else slope_deg
            write_geotiff(str(processed_dir / "debug_slope.tif"), slope_for_debug, profile_3857)

        suitability_3857 = build_suitability(
            dem=dem,
            slope_deg=slope_deg.filled(np.nan) if hasattr(slope_deg, "filled") else slope_deg,
            dist_water_m=dist_water_m,
            dist_roads_m=dist_roads_m,
        )

        # Write temp suitability in 3857
        suitability_3857_path = processed_dir / "suitability_3857.tif"
        write_geotiff(str(suitability_3857_path), suitability_3857, profile_3857)

        # 3. Reproject Suitability back to EPSG:4326 for Mapbox via GDAL
        print("Reprojecting Suitability back to EPSG:4326 via GDAL...")
        reproject_raster_gdal(suitability_3857_path, out_path, "EPSG:4326")
        
        print(f"Wrote: {out_path}")

        return out_path


if __name__ == "__main__":
    # for testing purposes
    import yaml

    config_path = Path(__file__).parent.parent / "config.yaml"
    config = yaml.safe_load(open(config_path))
    main(config, write_debug_rasters=True)
