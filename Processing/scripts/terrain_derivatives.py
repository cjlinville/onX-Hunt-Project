import os

proj_dir = r"..\\Processing\venv\Lib\site-packages\pyproj\proj_dir\share\proj"
os.environ["PROJ_LIB"] = str(proj_dir)



from pathlib import Path
import math

import numpy as np
import rasterio
from rasterio.merge import merge
from rasterio.features import shapes
from rasterio.warp import calculate_default_transform, reproject, Resampling
import requests
import geopandas as gpd
from shapely.geometry import shape



# Use the working hostname
TNM_PRODUCTS_URL = "https://tnmaccess.nationalmap.gov/api/v1/products"

# ~10m DEM dataset name
DATASET_NAME = "National Elevation Dataset (NED) 1/3 arc-second"
PRODUCT_FORMAT = "GeoTIFF"

# paging size
MAX_ITEMS = 200

PROJECTED_CRS = "EPSG:3857"


# -----------------------------
# TNM HELPERS
# -----------------------------
def tnm_search_dem_tiles(bbox):
    """
    Returns a list of download URLs for DEM tiles that intersect the bbox.
    bbox: (min_lon, min_lat, max_lon, max_lat) in WGS84
    """
    bbox_str = ",".join(str(v) for v in bbox)

    urls = []
    offset = 0

    while True:
        params = {
            "datasets": DATASET_NAME,
            "prodFormats": PRODUCT_FORMAT,
            "bbox": bbox_str,
            "outputFormat": "JSON",
            "max": str(MAX_ITEMS),
            "offset": str(offset),
        }

        r = requests.get(TNM_PRODUCTS_URL, params=params, timeout=120)
        r.raise_for_status()
        data = r.json()

        items = data.get("items", [])
        if not items:
            break

        for item in items:
            url = item.get("downloadURL")
            if url:
                urls.append(url)

        if len(items) < MAX_ITEMS:
            break

        offset += MAX_ITEMS

    return urls


def download_file(url, out_path):
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if out_path.exists() and out_path.stat().st_size > 0:
        return out_path

    with requests.get(url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(out_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)

    return out_path


# -----------------------------
# RASTER HELPERS
# -----------------------------
def merge_geotiffs(tif_paths, out_tif):
    """Merges multiple GeoTIFFs into one and writes out_tif."""
    srcs = [rasterio.open(p) for p in tif_paths]
    try:
        mosaic, out_transform = merge(srcs)
        dem = mosaic[0]

        profile = srcs[0].profile.copy()
        profile.update(
            {
                "height": dem.shape[0],
                "width": dem.shape[1],
                "transform": out_transform,
                "count": 1,
                "compress": "lzw",
                "tiled": True,
                "blockxsize": 256,
                "blockysize": 256,
            }
        )

        out_tif.parent.mkdir(parents=True, exist_ok=True)
        with rasterio.open(out_tif, "w", **profile) as dst:
            dst.write(dem, 1)

    finally:
        for s in srcs:
            s.close()


def compute_slope_degrees(dem, transform, nodata_value):
    """
    Computes slope (degrees) using finite differences.
    Handles WGS84 input by estimating meters/degree based on center latitude.
    """
    dem = dem.astype(np.float32)

    if nodata_value is not None:
        dem_mask = dem == nodata_value
    else:
        dem_mask = np.zeros(dem.shape, dtype=bool)

    # Determine resolution in meters
    # If using WGS84 (degrees), scale x/y to meters
    if transform.a < 1.0: # simplistic check for degrees vs meters
        height, width = dem.shape
        # Center lat
        center_x, center_y = transform * (width / 2, height / 2)
        lat_rad = math.radians(center_y)
        
        # Approximate conversions
        # 1 deg lat ~= 111132 m
        # 1 deg lon ~= 111132 * cos(lat) m
        m_per_deg_lat = 111132.0
        m_per_deg_lon = 111132.0 * math.cos(lat_rad)
        
        xres = transform.a * m_per_deg_lon
        yres = abs(transform.e) * m_per_deg_lat
    else:
        # Assumed projected meters
        xres = transform.a
        yres = abs(transform.e)

    dz_dy, dz_dx = np.gradient(dem, yres, xres)
    slope_rad = np.arctan(np.sqrt(dz_dx * dz_dx + dz_dy * dz_dy))
    slope_deg = slope_rad * (180.0 / math.pi)

    slope_deg = slope_deg.astype(np.float32)
    slope_deg[dem_mask] = np.nan
    return slope_deg


# -----------------------------
# CLASSIFICATION + VECTORIZATION
# -----------------------------
def classify_bands(data, edges, nodata_value):
    """
    Classifies continuous data into discrete bands using np.digitize.
    Returns uint8 array with class IDs:
      0 = nodata / invalid
      1..N = bins
    """
    edges = np.array(sorted(edges), dtype=np.float32)
    out = np.zeros(data.shape, dtype=np.uint8)

    if np.issubdtype(data.dtype, np.floating):
        valid = ~np.isnan(data)
        if nodata_value is not None:
            valid = valid & (data != nodata_value)
    else:
        valid = np.ones(data.shape, dtype=bool)
        if nodata_value is not None:
            valid = data != nodata_value

    inds = np.digitize(data[valid].astype(np.float32), edges)
    out[valid] = inds.astype(np.uint8)
    out[~valid] = 0
    return out


def vectorize_raster(class_raster, transform, crs, field_name, props_func=None):
    """
    Vectorizes a classified raster into polygons.
    Only values > 0 are kept.
    props_func(val:int) -> dict of extra attributes
    """
    mask = class_raster > 0
    feats = []

    for geom, val in shapes(class_raster, mask=mask, transform=transform):
        val = int(val)
        props = {field_name: val}
        if props_func:
            props.update(props_func(val))
        feats.append({"geometry": shape(geom), "properties": props})

    if not feats:
        return gpd.GeoDataFrame(columns=["geometry"], crs=crs)

    return gpd.GeoDataFrame.from_features(feats, crs=crs)


# -----------------------------
# MAIN
# -----------------------------
def main(config):
    print("Running Terrain Derivatives...")

    processing_dir = Path(__file__).parent.parent
    raw_root = processing_dir / config["environment"]["raw_data_dir"]
    processed_root = processing_dir / config["environment"]["processed_data_dir"]

    dem_raw_dir = raw_root / "dem_tiles"
    dem_raw_dir.mkdir(parents=True, exist_ok=True)
    processed_root.mkdir(parents=True, exist_ok=True)

    # Read hunting district
    dist_path = raw_root / "hunting_district.geojson"
    if not dist_path.exists():
        print(f"Error: {dist_path} not found. Try Hunting_District.geojson...")
        dist_path = raw_root / "Hunting_District.geojson"
        
    if not dist_path.exists():
        print(f"Error: {dist_path} not found. Run get_data step first.")
        return

    dist_gdf = gpd.read_file(dist_path)
    if dist_gdf.empty:
        print("Error: Hunting_District.geojson is empty.")
        return
    if dist_gdf.crs is None:
        print("Error: Hunting_District.geojson has no CRS.")
        return

    
    buffer_miles = float(config["unit"].get("buffer_distance_miles", 1.0))
    # 1 deg ~= 69 miles. 
    buffer_deg = buffer_miles / 69.0
    
    dist_wgs84 = dist_gdf.to_crs("EPSG:4326")
    # Buffer in degrees (approx)
    buffered_geom = dist_wgs84.geometry.unary_union.buffer(buffer_deg)
    
    minx, miny, maxx, maxy = buffered_geom.bounds
    bbox = (minx, miny, maxx, maxy)

    print(f"Buffer: {buffer_miles} miles (~{buffer_deg:.4f} deg)")
    print(f"TNM bbox (WGS84): {bbox}")

    # TNM query + download
    print("Searching TNM for DEM tiles...")
    try:
        urls = tnm_search_dem_tiles(bbox)
    except Exception as e:
        print(f"Error searching TNM: {e}")
        return

    if not urls:
        print("No DEM tiles found for bbox.")
        return

    print(f"Found {len(urls)} tiles. Downloading...")
    tif_paths = []
    for url in urls:
        fname = url.split("/")[-1].split("?")[0]
        if not fname.lower().endswith((".tif", ".tiff")):
            fname += ".tif"
        out_path = dem_raw_dir / fname
        download_file(url, out_path)
        tif_paths.append(out_path)

    # Merge
    merged_wgs84 = raw_root / "dem_merged.tif"
    print("Merging tiles...")
    merge_geotiffs(tif_paths, merged_wgs84)

    # SKIP REPROJECTION 
    # Use merged_wgs84 directly
    
    # Read DEM
    with rasterio.open(merged_wgs84) as src:
        dem = src.read(1)
        transform = src.transform
        nodata = src.nodata
        crs = src.crs

    # Elevation stats (ignore nodata)
    if nodata is not None:
        valid_mask = dem != nodata
    else:
        valid_mask = np.ones(dem.shape, dtype=bool)

    if not np.any(valid_mask):
        print("Error: DEM has no valid cells.")
        return

    min_elev = float(np.min(dem[valid_mask]))
    max_elev = float(np.max(dem[valid_mask]))
    print(f"Elevation range (m): {min_elev:.2f} - {max_elev:.2f}")

    # Elevation bands: 1000 ft increments
    interval_m = 1000.0 * 0.3048
    start_m = math.floor(min_elev / interval_m) * interval_m
    end_m = math.ceil(max_elev / interval_m) * interval_m
    elev_edges = np.arange(start_m, end_m + interval_m, interval_m).astype(float)

    print(f"Elevation band edges (m): {elev_edges}")
    elev_classes = classify_bands(dem.astype(np.float32), elev_edges, nodata)

    def elev_props(val):
        idx = val - 1
        if idx < 0 or idx + 1 >= len(elev_edges):
            return {}
        low = float(elev_edges[idx])
        high = float(elev_edges[idx + 1])
        low_ft = int(round(low / 0.3048))
        high_ft = int(round(high / 0.3048))
        return {"label": f"{low_ft}-{high_ft} ft", "min_m": low, "max_m": high}

    print("Vectorizing elevation bands...")
    elev_gdf = vectorize_raster(elev_classes, transform, crs, "band_id", elev_props)

    # Clip to buffered AOI
    clip_gdf = gpd.GeoDataFrame(geometry=[buffered_geom], crs="EPSG:4326")
    elev_gdf = gpd.clip(elev_gdf, clip_gdf)

    out_elev = raw_root / "elevation_bands.geojson"
    elev_gdf.to_file(out_elev, driver="GeoJSON")
    print(f"Saved: {out_elev}")

    # Slope mask (> 45 degrees)
    print("Computing slope (Geodesic)...")
    slope = compute_slope_degrees(dem, transform, nodata)

    print("Creating slope mask > 45 degrees...")
    slope_mask = np.zeros(slope.shape, dtype=np.uint8)
    
    # Handle NaNs in slope (where DEM was nodata)
    valid_slope = ~np.isnan(slope)
    # Set pixels > 45 to 1
    slope_mask[valid_slope & (slope > 45)] = 1

    def slope_props(val):
        return {"label": "> 45 degrees", "min_deg": 45}

    print("Vectorizing slope mask...")
    slope_gdf = vectorize_raster(slope_mask, transform, crs, "slope_class", slope_props)
    
    # Clip
    clip_gdf = gpd.GeoDataFrame(geometry=[buffered_geom], crs="EPSG:4326")
    slope_gdf = gpd.clip(slope_gdf, clip_gdf)
    

    out_slope = raw_root / "slope_mask.geojson"
    slope_gdf.to_file(out_slope, driver="GeoJSON")
    print(f"Saved: {out_slope}")

    print("Terrain Derivatives complete.")


if __name__ == "__main__":
    import yaml

    config_path = Path(__file__).parent.parent.parent / "config.yaml"
    if not config_path.exists():
        config_path = Path("Processing/config.yaml")

    if config_path.exists():
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
        main(config)
    else:
        print("Config not found.")
