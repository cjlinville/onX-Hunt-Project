import yaml
from pathlib import Path

from scripts import get_data, process_data, terrain_derivatives, push_to_map


def main(config):
    print("Starting data processing pipeline...")
    
    # 1. Fetch Distict Boundary, Features (Trails, Roads, Lands) and NHD Data
    if config['steps']['get_data']:
        print(50*"-")
        print("Running aquisition pipeline...\n")
        get_data.main(config)

    
    # 2. Terrain Derivatives
    if config['steps']['terrain_derivatives']:
        print(50*"-")
        print("Running terrain derivatives pipeline...\n")
        terrain_derivatives.main(config)

    # 3. Process Data
    if config['steps']['process_data']:
        print(50*"-")
        print("Running processing pipeline...\n")
        process_data.main(config)

    # 4. Push to Map
    if config['steps']['push_to_map']:
        print(50*"-")
        print("Running map pipeline...\n")
        push_to_map.push_to_map(config)



if __name__ == "__main__":
    config_path = Path(__file__).parent / "config.yaml"
    with open (config_path) as f:
        config = yaml.safe_load(f
        )

    main(config)


    