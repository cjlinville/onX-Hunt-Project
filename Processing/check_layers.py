import requests
import json

url = "https://gisservicemt.gov/arcgis/rest/services/MSDI_Framework/Parcels/MapServer?f=json"

try:
    response = requests.get(url)
    response.raise_for_status()
    data = response.json()
    
    print("Layers:")
    for layer in data.get('layers', []):
        print(f"ID: {layer['id']}, Name: {layer['name']}")
        
except Exception as e:
    print(f"Error: {e}")
