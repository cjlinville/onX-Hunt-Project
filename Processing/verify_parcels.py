import yaml
import sys
from pathlib import Path

# Add scripts dir to path to import get_data
sys.path.append(str(Path(__file__).parent / "scripts"))
import get_data

def verify_parcels():
    config_path = Path(__file__).parent / "config.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    
    # Override URLS to only fetch Parcels to save time/bandwidth
    parcels_config = None
    for service in config['URLS']['Feature_Services']:
        if service['name'] == 'Parcels':
            parcels_config = service
            break
            
    if not parcels_config:
        print("Error: Parcels configuration not found in config.yaml")
        return

    # Create a minimal config for the test
    test_config = config.copy()
    test_config['URLS']['Feature_Services'] = [parcels_config]
    
    print("Testing Parcels download...")
    
    # We need the district GDF to clip against
    print(f"Fetching Hunting District {config['unit']['District_ID']} for clipping...")
    district_gdf = get_data.get_hunting_district(config)
    
    print("Fetching Parcels...")
    gdf = get_data.fetch_arcgis_features(parcels_config['url'], district_gdf, "Parcels")
    
    if not gdf.empty:
        output_dir = Path(__file__).parent / config['environment']['raw_data_dir']
        output_dir.mkdir(parents=True, exist_ok=True)
        out_path = output_dir / "Parcels.geojson"
        gdf.to_file(out_path, driver="GeoJSON")
        print(f"Success! Saved Parcels to {out_path}")
        print(f"Feature count: {len(gdf)}")
    else:
        print("Warning: No Parcels data found in this area.")

if __name__ == "__main__":
    verify_parcels()
