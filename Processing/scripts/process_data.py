from pathlib import Path
import geopandas as gpd
import json

from scripts import geometry_ops

def standardize_schema(file, field_mappings):
    if file.name not in field_mappings:
        print(f"Skipping {file.name}: not in field mappings")
        return None

    # rename fields first
    field_map = field_mappings[file.name]['field_map']
    keep_cols = list(field_mappings[file.name]['field_map'].values())
    
    print(f"Standardizing {file.name}...")
    gdf = gpd.read_file(file)
    
    # case-insensitive rename
    actual_columns = {col.lower(): col for col in gdf.columns}
    rename_map = {}
    for source_col, dest_col in field_map.items():
        if source_col.lower() in actual_columns:
            rename_map[actual_columns[source_col.lower()]] = dest_col
    
    gdf = gdf.rename(columns=rename_map)
    
    # Ensure geometry is preserved and only keep requested columns
    cols_to_keep = [c for c in keep_cols if c in gdf.columns]
    gdf = gdf[cols_to_keep + ['geometry']]

    # map values
    value_map = field_mappings[file.name].get('value_maps', {})
    for col, mapping in value_map.items():
        if col in gdf.columns:
            # fillna(gdf[col]) keeps values not in mapping unchanged
            gdf[col] = gdf[col].map(mapping).fillna(gdf[col])
            
    return gdf


    
    

def main(config):
    data_dir = Path(config['environment']['raw_data_dir'])
    dest_dir = Path(config['environment']['processed_data_dir'])
    dest_dir.mkdir(parents=True, exist_ok=True)
    
    field_mappings_path = Path("field_mappings.json")
    if not field_mappings_path.exists():
        print("Error: field_mappings.json not found")
        return

    with open(field_mappings_path) as f:
        field_mappings = json.load(f)

    files = list(data_dir.glob("*.geojson"))
    for file in files:
        gdf = standardize_schema(file, field_mappings)
        gdf = geometry_ops.main(file,gdf,field_mappings)
        if gdf is not None:
            out_path = dest_dir / file.name
            gdf.to_file(out_path, driver="GeoJSON")
            print(f"Saved processed file to {out_path}")

if __name__ == "__main__":
    import yaml
    config = yaml.safe_load(open("P:\\0_Projects\\onX\\onX-Hunt-Project\\Processing\\config.yaml"))
    main(config)