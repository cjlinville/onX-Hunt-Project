import requests
import geopandas as gpd
from shapely.geometry import shape, box
import os
from pathlib import Path

def get_hunting_district(config):
    url = config['URLS']['Hunting_Districts']
    query = f"NAME = '{config['unit']['District_ID']}'"
    
    query_url = f"{url}/query"

    params = {
        "where": query,
        "outFields": "*",
        "returnGeometry": "true",
        "f": "geojson",
        "outSR": 4326
    }

    response = requests.get(query_url, params=params)
    response.raise_for_status()
    data = response.json()

    if not data.get("features"):
        raise ValueError(f"No features found for District_ID: {config['unit']['District_ID']}")

    gdf = gpd.read_file(requests.compat.json.dumps(data))
    gdf.crs = "EPSG:4326"
    return gdf

def download_nhd_layer(config, layer_id, bbox):
    """Downloads NHD data for a specific layer within a bounding box."""
    base_url = config['URLS']['NHD_MAPSERVER']
    query_url = f"{base_url}/{layer_id}/query"
    
    west, south, east, north = bbox
    
    all_features = []
    result_offset = 0
    page_size = 2000

    while True:
        params = {
            "f": "geojson",
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "geometry": f"{west},{south},{east},{north}",
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "inSR": 4326,
            "outSR": 4326,
            "resultOffset": result_offset,
            "resultRecordCount": page_size,
        }

        resp = requests.get(query_url, params=params, timeout=120)
        resp.raise_for_status()
        gj = resp.json()

        features = gj.get("features", [])
        if not features:
            break

        all_features.extend(features)

        if len(features) < page_size:
            break

        result_offset += page_size

    if not all_features:
        return gpd.GeoDataFrame(columns=['geometry'], crs="EPSG:4326")

    gdf = gpd.GeoDataFrame.from_features(
        {"type": "FeatureCollection", "features": all_features},
        crs="EPSG:4326",
    )
    return gdf

def get_nhd_data(config, district_gdf):
    """Fetches NHD data for Flowlines, Areas, and Waterbodies and clips them."""
    # Get bounding box of the district
    bbox = district_gdf.total_bounds
    district_geom = district_gdf.unary_union
    
    # Layer IDs: 6 (Flowline), 9 (Area), 12 (Waterbody)
    layers = {
        "Flowline": 6,
        "Area": 9,
        "Waterbody": 12
    }
    
    nhd_results = {}
    
    for layer_name, layer_id in layers.items():
        print(f"Downloading NHD {layer_name}...")
        layer_gdf = download_nhd_layer(config, layer_id, bbox)
        
        if not layer_gdf.empty:
            print(f"Clipping {layer_name} to district boundary...")
            # Clip to the exact district geometry
            clipped_gdf = gpd.clip(layer_gdf, district_geom)
            nhd_results[layer_name] = clipped_gdf
        else:
            nhd_results[layer_name] = layer_gdf
            
    return nhd_results

def fetch_arcgis_features(service_url, district_gdf, layer_name):
    """Generic fetcher for ArcGIS Feature/Map Services with spatial query and clipping."""
    bbox = district_gdf.total_bounds
    district_geom = district_gdf.unary_union
    
    query_url = f"{service_url}/query"
    west, south, east, north = bbox
    
    print(f"Downloading {layer_name}...")
    all_features = []
    result_offset = 0
    page_size = 2000

    while True:
        params = {
            "f": "geojson",
            "where": "1=1",
            "outFields": "*",
            "returnGeometry": "true",
            "geometry": f"{west},{south},{east},{north}",
            "geometryType": "esriGeometryEnvelope",
            "spatialRel": "esriSpatialRelIntersects",
            "inSR": 4326,
            "outSR": 4326,
            "resultOffset": result_offset,
            "resultRecordCount": page_size,
        }

        resp = requests.get(query_url, params=params, timeout=120)
        resp.raise_for_status()
        gj = resp.json()

        features = gj.get("features", [])
        if not features:
            break

        all_features.extend(features)

        if len(features) < page_size:
            break

        result_offset += page_size

    if not all_features:
        return gpd.GeoDataFrame(columns=['geometry'], crs="EPSG:4326")

    layer_gdf = gpd.GeoDataFrame.from_features(
        {"type": "FeatureCollection", "features": all_features},
        crs="EPSG:4326",
    )
    
    print(f"Clipping {layer_name} to district boundary...")
    clipped_gdf = gpd.clip(layer_gdf, district_geom)
    return clipped_gdf

def main(config):
    # Ensure output directory exists
    # If the path is relative, resolve it relative to the config file (i.e., Processing dir)
    config_dir = Path(__file__).parent.parent
    raw_data_dir = config_dir / config['environment']['raw_data_dir']
    raw_data_dir.mkdir(parents=True, exist_ok=True)

    print(f"Fetching Hunting District {config['unit']['District_ID']}...")
    district_gdf = get_hunting_district(config)
    dist_path = raw_data_dir / "Hunting_District.geojson"
    district_gdf.to_file(dist_path, driver="GeoJSON")
    print(f"Saved district to {dist_path}")

    # Process generic feature services
    if 'Feature_Services' in config['URLS']:
        for service in config['URLS']['Feature_Services']:
            name = service['name']
            url = service['url']
            
            gdf = fetch_arcgis_features(url, district_gdf, name)
            
            if not gdf.empty:
                out_path = raw_data_dir / f"{name}.geojson"
                gdf.to_file(out_path, driver="GeoJSON")
                print(f"Saved {name} to {out_path}")
            else:
                print(f"No {name} data found in this area.")

    # NHD Data (special case with multiple layers)
    nhd_data = get_nhd_data(config, district_gdf)
    
    for layer_name, gdf in nhd_data.items():
        if not gdf.empty:
            out_path = raw_data_dir / f"NHD_{layer_name}.geojson"
            gdf.to_file(out_path, driver="GeoJSON")
            print(f"Saved {layer_name} to {out_path}")
        else:
            print(f"No {layer_name} data found in this area.")

if __name__ == "__main__":
    import yaml
    # Load config for standalone execution if needed, 
    # but usually main is called from elsewhere.
    # For testing, we'll try to find Processing/config.yaml
    config_path = Path(__file__).parent.parent.parent / "config.yaml"
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)
    main(config)
