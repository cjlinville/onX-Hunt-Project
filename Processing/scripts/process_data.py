from pathlib import Path
import geopandas as gpd
import json


def standardize_schema(file,field_mappings):
    #rename fields first
    field_map = field_mappings[file.name]['field_map']
    keep_cols = field_mappings[file.name]['field_map'].values()
    print(keep_cols)
    gdf = gpd.read_file(file)
    gdf = gdf.rename(columns=field_map)

    #Drop any cols not defined in field map
    gdf = gdf[keep_cols]
    
    #map values
    value_map = field_mappings[file.name]['value_maps']
    for col, mapping in value_map.items():
        gdf[col] = gdf[col].map(mapping)
    print(gdf.head())
    
                
    return gdf
    



    

def main(config):
    data_dir = Path(config['environment']['raw_data_dir'])
    dest_dir = Path(config['environment']['processed_data_dir'])
    field_mappings = 'field_mappings.json'
    field_mappings = json.load(open(field_mappings))

    files = list(Path(data_dir).glob("**/*.geojson"))
    for file in files[:1]:
        gdf = standardize_schema(file, field_mappings)
      

if __name__ == "__main__":
    import yaml
    config = yaml.safe_load(open("P:\\0_Projects\\onX\\onX-Hunt-Project\\Processing\\config.yaml"))
    main(config)