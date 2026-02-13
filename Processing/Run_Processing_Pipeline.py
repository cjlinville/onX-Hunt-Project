import yaml
from pathlib import Path

from scripts import get_data


def main(config):
    print("Starting data processing pipeline...")
    
    # 1. Fetch Distict Boundary, Features (Trails, Roads, Lands) and NHD Data
    get_data.main(config)



if __name__ == "__main__":
    with open ("config.yaml") as f:
        config = yaml.safe_load(f
        )

    main(config)


    