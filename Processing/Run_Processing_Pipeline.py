import yaml
import shutil
from pathlib import Path

from scripts import get_data, process_data, push_to_map


def clear_folder(folder_path: Path):
    """Clear all contents of a folder if it exists."""
    if folder_path.exists():
        for item in folder_path.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
        print(f"Cleared folder: {folder_path}")
    else:
        folder_path.mkdir(parents=True, exist_ok=True)
        print(f"Created folder: {folder_path}")


def main(config):
    print("Starting data processing pipeline...")
    
    base_path = Path(__file__).parent
    
    # 1. Fetch District Boundary, Features (Trails, Roads, Lands) and NHD Data
    if config['steps']['get_data']:
        # Clear Raw folder before fetching new data
        raw_folder = base_path / "Data" / "Raw"
        clear_folder(raw_folder)
        
        print(50*"-")
        print("Running aquisition pipeline...\n")
        get_data.main(config)

    

    # 3. Process Data
    if config['steps']['process_data']:
        # Clear Processed folder before processing
        processed_folder = base_path / "Data" / "Processed"
        clear_folder(processed_folder)
        
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


    