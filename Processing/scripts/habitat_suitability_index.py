from __future__ import annotations

from pathlib import Path

import geopandas as gpd
import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.mask import mask
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


def compute_ruggedness_tri(dem: np.ma.MaskedArray) -> np.ndarray:
    z = dem.filled(np.nan).astype("float32")

    def tri_window(values: np.ndarray) -> float:
        center = values[4]
        if np.isnan(center):
            return np.nan
        neighbors = np.delete(values, 4)
        neighbors = neighbors[~np.isnan(neighbors)]
        if neighbors.size == 0:
            return np.nan
        return float(np.mean(np.abs(neighbors - center)))

    tri = generic_filter(z, tri_window, size=3, mode="nearest")
    return tri.astype("float32")


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


def score_slope(slope_deg: np.ndarray, good_min: float = 30.0, good_max: float = 55.0) -> np.ndarray:
    return clamp01((slope_deg - good_min) / (good_max - good_min))


def score_ruggedness(tri: np.ndarray, good_min: float = 2.0, good_max: float = 12.0) -> np.ndarray:
    return clamp01((tri - good_min) / (good_max - good_min))


def score_distance_to_water(dist_m: np.ndarray, best_within_m: float = 1500.0) -> np.ndarray:
    return clamp01(1.0 - (dist_m / best_within_m))


def score_distance_from_roads(dist_m: np.ndarray, good_far_m: float = 2500.0) -> np.ndarray:
    return clamp01(dist_m / good_far_m)


def build_suitability(
    dem: np.ma.MaskedArray,
    slope_deg: np.ndarray,
    tri: np.ndarray,
    dist_water_m: np.ndarray,
    dist_roads_m: np.ndarray,
    weight_slope: float = 0.40,
    weight_rugged: float = 0.25,
    weight_water: float = 0.20,
    weight_roads: float = 0.15,
) -> np.ndarray:
    s_slope = score_slope(slope_deg)
    s_rug = score_ruggedness(tri)
    s_water = score_distance_to_water(dist_water_m)
    s_roads = score_distance_from_roads(dist_roads_m)

    total_w = weight_slope + weight_rugged + weight_water + weight_roads
    suitability_01 = (
        weight_slope * s_slope
        + weight_rugged * s_rug
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
    )

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(out_path, "w", **out_profile) as dst:
        dst.write(arr.astype("float32"), 1)


def main(config: dict) -> Path:
    raw_dir = Path(config["environment"]["raw_data_dir"])
    processed_dir = Path(config["environment"]["processed_data_dir"])

    unit_path = raw_dir / "hunting_district.geojson"
    roads_path = raw_dir / "mt_roads.geojson"
    waterbody_path = raw_dir / "nhd_waterbody.geojson"
    flowline_path = raw_dir / "nhd_flowline.geojson"

    # Pre-calculated rasters
    dem_clipped_path = processed_dir / "dem_clipped.tif"
    slope_degrees_path = processed_dir / "slope_degrees.tif"

    out_path = None
    if "outputs" in config and "suitability" in config["outputs"]:
        out_path = Path(config["outputs"]["suitability"])
    else:
        out_path = processed_dir / "habitat_suitability.tif"

    # Load clipped DEM to get profile, transform, crs
    with rasterio.open(dem_clipped_path) as src:
        dem = src.read(1, masked=True)
        profile = src.profile
        transform = src.transform
        crs = src.crs
        res_x = abs(transform.a)
        res_y = abs(transform.e)

    # Load pre-calculated slope
    with rasterio.open(slope_degrees_path) as src:
        slope_deg = src.read(1, masked=True)

    # Load unit for vector clipping
    unit = load_unit_boundary(str(unit_path), crs)
    tri = compute_ruggedness_tri(dem)

    roads_gdf = load_and_reproject_vector(str(roads_path), crs)
    waterbody_gdf = load_and_reproject_vector(str(waterbody_path), crs)
    flowline_gdf = load_and_reproject_vector(str(flowline_path), crs)

    roads_gdf = clip_vector_to_unit(roads_gdf, unit)
    waterbody_gdf = clip_vector_to_unit(waterbody_gdf, unit)
    flowline_gdf = clip_vector_to_unit(flowline_gdf, unit)

    # Combine water sources (polygons + lines) into a single “water” layer
    water_gdf = gpd.GeoDataFrame(
        geometry=np.concatenate([waterbody_gdf.geometry.values, flowline_gdf.geometry.values]),
        crs=crs,
    )
    water_gdf = water_gdf[water_gdf.geometry.notna()].copy()

    out_shape = dem.shape
    roads_r = rasterize_to_match(roads_gdf, out_shape=out_shape, transform=transform)
    water_r = rasterize_to_match(water_gdf, out_shape=out_shape, transform=transform)

    dist_roads_m = distance_in_meters(roads_r, res_x=res_x, res_y=res_y)
    dist_water_m = distance_in_meters(water_r, res_x=res_x, res_y=res_y)

    suitability = build_suitability(
        dem=dem,
        slope_deg=slope_deg,
        tri=tri,
        dist_water_m=dist_water_m,
        dist_roads_m=dist_roads_m,
    )

    write_geotiff(str(out_path), suitability, profile)
    print(f"Wrote: {out_path}")

    return out_path
