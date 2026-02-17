import shutil
from pathlib import Path

def push_to_map(config):
    print("Pushing data to map...")
    
    processing_dir = Path(__file__).parent.parent
    
    dirs_to_check = [
        processing_dir / config['environment']['processed_data_dir']
    ]

    dest_dir = Path(config['environment']['map_data_dir'])
    dest_path = (processing_dir / dest_dir).resolve()
    
    if not dest_path.exists():
        print(f"Creating destination directory: {dest_path}")
        dest_path.mkdir(parents=True, exist_ok=True)
    else:
        print(f"Clearing old GeoJSON files from {dest_path}...")
        for old_file in dest_path.glob("*.geojson"):
            old_file.unlink()

    count = 0
    for source_dir in dirs_to_check:
        print(f"DEBUG: Checking {source_dir.resolve()}")
        if not source_dir.exists():
            print(f"DEBUG: {source_dir} does not exist!")
            continue
            
        print(f"Scanning {source_dir.name}...")
        files = list(source_dir.glob("*.geojson")) + list(source_dir.glob("*.png")) + list(source_dir.glob("*.json"))
        for file in files:
            shutil.copy(file, dest_path / file.name)
            print(f"Copied {file.name}")
            count += 1
            
    print(f"Pushed {count} files to map.")