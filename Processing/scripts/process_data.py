from pathlib import Path
import geopandas as gpd
import json
import rasterio
from rasterio.merge import merge
from rasterio.features import shapes
import numpy as np
import math
from shapely.geometry import shape

from scripts import geometry_ops
from scripts import habitat_suitability_index


def standardize_data(file, gdf, mapping_config):
    """
    Step 1: Standardize Data
    - Renames columns based on field_mappings.json
    - Applies value mappings
    """
    if file.name not in mapping_config:
        print(f"  Note: No field mappings found for {file.name}")
        return gdf

    rules = mapping_config[file.name]
    field_map = rules.get('field_map', {})
    value_maps = rules.get('value_maps', {})

    print(f"  Standardizing fields for {file.name}...")

    # Case-insensitive rename map
    actual_columns = {col.lower(): col for col in gdf.columns}
    rename_dict = {}
    
    for src_col, dest_col in field_map.items():
        if src_col.lower() in actual_columns:
            real_src = actual_columns[src_col.lower()]
            rename_dict[real_src] = dest_col
    
    if rename_dict:
        gdf = gdf.rename(columns=rename_dict)

    # Apply value mappings
    for col, mapping in value_maps.items():
        if col in gdf.columns:
            # Map values, keeping original if not found in mapping
            gdf[col] = gdf[col].map(mapping).fillna(gdf[col])

    return gdf


def enforce_schema(file, gdf, schema_config):
    """
    Step 2: Enforce Schema
    - Reprojects to target CRS
    - Filters columns to valid fields only
    - Casts types (simple implementation)
    """
    if file.name not in schema_config:
        print(f"  Note: No validation schema found for {file.name}")
        return gdf

    schema = schema_config[file.name]
    target_crs = schema.get('crs')
    target_fields = schema.get('fields', {})
    
    print(f"  Enforcing schema for {file.name}...")

    # 1. Reproject
    if target_crs and gdf.crs != target_crs:
        print(f"    Reprojecting to {target_crs}...")
        gdf = gdf.to_crs(target_crs)

    # 2. Filter and Validate Fields
    valid_cols = ['geometry']
    for field, field_type in target_fields.items():
        if field in gdf.columns:
            valid_cols.append(field)
            # Optional: Basic type casting could go here
            # if field_type == 'int': gdf[field] = gdf[field].astype(int)
        else:
            print(f"    WARNING: Schema field '{field}' missing in data")

    # Drop undefined columns
    gdf = gdf[valid_cols]
    
    return gdf


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


def process_topography(config, schema_config):
    """
    Clips DEM to hunting district and calculates/saves slope and ruggedness derivatives.
    Also handles DEM merging and vector generation (elevation bands, slope mask).
    """
    raw_dir = Path(config['environment']['raw_data_dir'])
    processed_dir = Path(config['environment']['processed_data_dir'])
    
    dem_path = raw_dir.joinpath("dem_merged.tif")
    dem_tiles_dir = raw_dir.joinpath("dem_tiles")
    hunting_district_path = raw_dir.joinpath("hunting_district.geojson")
    
    print("\nProcessing topography...")

    # 1. Merge DEM tiles if needed
    if not dem_path.exists():
        print(f"{dem_path} not found. Checking for tiles in {dem_tiles_dir}...")
        if dem_tiles_dir.exists():
            tif_paths = list(dem_tiles_dir.glob("*.tif"))
            if tif_paths:
                print(f"Found {len(tif_paths)} tiles. Merging...")
                merge_geotiffs(tif_paths, dem_path)
                print(f"Created {dem_path}")
            else:
                print("No tiles found. Cannot proceed with topography processing.")
                raise FileNotFoundError("Missing DEM tiles and merged DEM.")
        else:
            raise FileNotFoundError(f"Missing DEM directory: {dem_tiles_dir}")
    
    # Read DEM CRS to project unit boundary
    with rasterio.open(dem_path) as src:
        dem_crs = src.crs
        dem_nodata = src.nodata
        if dem_crs is None:
            raise ValueError("DEM has no CRS.")

    # Load and clip
    unit = habitat_suitability_index.load_unit_boundary(str(hunting_district_path), dem_crs)
    dem, profile, transform, _, res_x, res_y = habitat_suitability_index.read_and_clip_dem(str(dem_path), unit)

    # Save clipped DEM
    habitat_suitability_index.write_geotiff(
        str(processed_dir / "dem_clipped.tif"), 
        dem.filled(np.nan), 
        profile
    )
    print(f"Saved {processed_dir}/dem_clipped.tif")

    # Calculate Slope
    print("\nCalculating slope...")
    slope_deg = habitat_suitability_index.compute_slope_degrees(dem, res_x, res_y)
    habitat_suitability_index.write_geotiff(
        str(processed_dir / "slope_degrees.tif"), 
        slope_deg, 
        profile
    )
    print(f"Saved {processed_dir}/slope_degrees.tif")

    # Calculate Slope Raster Mask (> 45 degrees)
    slope_mask = (slope_deg > 45.0).astype("float32")
    slope_mask[np.isnan(slope_deg)] = np.nan
    habitat_suitability_index.write_geotiff(
        str(processed_dir / "slope_mask.tif"), 
        slope_mask, 
        profile
    )
    print(f"Saved {processed_dir}/slope_mask.tif")

    # ---------------------------------------------------------
    # Vector Generation (Elevation Bands & Slope Mask GeoJSON)
    # ---------------------------------------------------------
    
    # Elevation Bands
    min_elev = float(np.min(dem[~np.isnan(dem)]))
    max_elev = float(np.max(dem[~np.isnan(dem)]))
    print(f"Elevation range: {min_elev:.1f} - {max_elev:.1f} m")

    interval_m = 1000.0 * 0.3048
    start_m = math.floor(min_elev / interval_m) * interval_m
    end_m = math.ceil(max_elev / interval_m) * interval_m
    elev_edges = np.arange(start_m, end_m + interval_m, interval_m).astype(float)
    
    elev_classes = classify_bands(dem, elev_edges, dem_nodata)

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
    elev_gdf = vectorize_raster(elev_classes, transform, dem_crs, "band_id", elev_props)
    # Clip to unit
    elev_gdf = gpd.clip(elev_gdf, unit)
    
    # Apply Schema Validation/Projection
    elev_name = "elevation_bands.geojson"
    elev_gdf = enforce_schema(type('obj', (object,), {'name': elev_name}), elev_gdf, schema_config)
            
    elev_gdf.to_file(processed_dir / elev_name, driver="GeoJSON")
    print(f"Saved {processed_dir}/{elev_name}")

    # Slope Mask Vector (> 45 degrees)
    # Re-use slope_deg but handle NaNs for classification
    slope_for_vec = slope_deg.copy()
    slope_for_vec[np.isnan(slope_for_vec)] = -9999
    
    slope_mask_class = np.zeros(slope_for_vec.shape, dtype=np.uint8)
    slope_mask_class[slope_for_vec > 45] = 1
    
    def slope_props(val):
        return {"label": "> 45 degrees", "min_deg": 45}

    print("Vectorizing slope mask...")
    slope_vec_gdf = vectorize_raster(slope_mask_class, transform, dem_crs, "slope_class", slope_props)
    slope_vec_gdf = gpd.clip(slope_vec_gdf, unit)
    
    # Apply Schema Validation/Projection
    slope_name = "slope_mask.geojson"
    slope_vec_gdf = enforce_schema(type('obj', (object,), {'name': slope_name}), slope_vec_gdf, schema_config)

    slope_vec_gdf.to_file(processed_dir / slope_name, driver="GeoJSON")
    print(f"Saved {processed_dir}/{slope_name}")


def main(config):
    data_dir = Path(config['environment']['raw_data_dir'])
    dest_dir = Path(config['environment']['processed_data_dir'])
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    # Load separate config files
    mapping_path = Path("field_mappings.json")
    schema_path = Path("layer_schema.json")
    
    if not mapping_path.exists() or not schema_path.exists():
        print("Error: field_mappings.json or layer_schema.json not found")
        return

    with open(mapping_path) as f:
        mapping_config = json.load(f)
        
    with open(schema_path) as f:
        schema_config = json.load(f)

    print("\n--- Starting Standardize & Validate Pipeline ---\n")
    
    files = list(data_dir.glob("*.geojson"))
    for file in files:
        print(f"Processing {file.name}...")
        gdf = gpd.read_file(file)
        
        # Step 1: Standardize (Keys, Values)
        gdf = standardize_data(file, gdf, mapping_config)
        
        # Intermediate: Geometry Ops
        if gdf is not None:
             gdf = geometry_ops.main(file, gdf)
        
        # Step 2: Enforce Schema (CRS, Filter Columns, Types)
        gdf = enforce_schema(file, gdf, schema_config)
        
        if gdf is not None:
            out_path = dest_dir / file.name
            gdf.to_file(out_path, driver="GeoJSON")
            print(f"  Saved to {out_path}\n")

    # Process topography
    process_topography(config, schema_config)

    # Calculate habitat suitability index
    suitability_tif = habitat_suitability_index.main(config)
    suitability_tif = Path(config['environment']['processed_data_dir']) / "habitat_suitability.tif"
    
    if suitability_tif.exists():
        print("\nExporting habitat suitability to PNG...")
        import matplotlib.pyplot as plt
        from PIL import Image
        from pyproj import Transformer

        with rasterio.open(suitability_tif) as src:
            data = src.read(1)
            bounds = src.bounds
            crs = src.crs

            # Normalize 0-100 to 0-1
            mask = ~np.isnan(data)
            norm_data = np.zeros_like(data)
            norm_data[mask] = data[mask] / 100.0

            # Apply colormap with power normalization to enhance extreme values
            # gamma < 1 stretches the color range at both ends
            from matplotlib.colors import PowerNorm
            norm = PowerNorm(gamma=0.7, vmin=0, vmax=1)
            sm = plt.cm.ScalarMappable(cmap='YlGn', norm=norm)
            rgba = sm.to_rgba(norm_data)
            
            # Set alpha for NaNs
            rgba[~mask, 3] = 0
            
            # Convert to 8-bit
            rgba_8bit = (rgba * 255).astype(np.uint8)
            
            # Save as PNG
            img = Image.fromarray(rgba_8bit)
            png_path = dest_dir / "habitat_suitability.png"
            img.save(png_path)
            print(f"Saved {png_path}")

            # Calculate bounds in 4326 for Mapbox
            # Mapbox ImageSource needs: [topleft, topright, bottomright, bottomleft]
            # rasterio bounds: (left, bottom, right, top)
            
            transformer = Transformer.from_crs(crs, "EPSG:4326", always_xy=True)
            
            # nw, ne, se, sw
            nw = transformer.transform(bounds.left, bounds.top)
            ne = transformer.transform(bounds.right, bounds.top)
            se = transformer.transform(bounds.right, bounds.bottom)
            sw = transformer.transform(bounds.left, bounds.bottom)
            
            coords = [
                [float(nw[0]), float(nw[1])],
                [float(ne[0]), float(ne[1])],
                [float(se[0]), float(se[1])],
                [float(sw[0]), float(sw[1])]
            ]

            metadata = {
                "bounds": coords,
                "url": "/data/habitat_suitability.png"
            }
            
            meta_path = dest_dir / "habitat_suitability.json"
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            print(f"Saved {meta_path}")

if __name__ == "__main__":
    import yaml
    config = yaml.safe_load(open("config.yaml"))
    main(config)
