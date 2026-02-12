import { useState } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Mountain, Satellite } from 'lucide-react';
import { STYLE_TERRAIN, STYLE_SATELLITE } from '../App';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const LOCAL_DISTRICTS_URL = '/data/BHS-HuntingDistricts.geojson';

const localDistrictsLineLayer = {
    id: 'local-districts-line',
    type: 'line' as const,
    paint: {
        'line-color': '#ef4444', // Red-500
        'line-width': 3
    }
};

const localDistrictsLabelLayer: any = {
    id: 'local-districts-label',
    type: 'symbol' as const,
    minzoom: 8,
    layout: {
        'text-field': ['get', 'DISTRICT'] as const,
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'] as const,
        'text-size': 20,
        'text-offset': [0, 0] as const,
        'text-anchor': 'center' as const
    },
    paint: {
        'text-color': '#ffffff',
        'text-halo-color': '#000000',
        'text-halo-width': 1
    }
};

interface MapComponentProps {
    mapStyle: string;
    setMapStyle: (style: string) => void;
    showLocalDistricts: boolean;
}

export function MapComponent({ mapStyle, setMapStyle, showLocalDistricts }: MapComponentProps) {
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);

    const toggleMapStyle = () => {
        setMapStyle(mapStyle === STYLE_TERRAIN ? STYLE_SATELLITE : STYLE_TERRAIN);
    };

    return (
        <div className="h-full w-full relative">
            <Map
                initialViewState={{
                    longitude: -114.85,
                    latitude: 48.86,
                    zoom: 10
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
                mapboxAccessToken={MAPBOX_TOKEN}
                onMouseMove={(e) => setCursorCoords(e.lngLat)}
            >
                <NavigationControl position="top-right" />

                {showLocalDistricts && (
                    <Source id="local-districts" type="geojson" data={LOCAL_DISTRICTS_URL}>
                        <Layer {...localDistrictsLineLayer} />
                        <Layer {...localDistrictsLabelLayer} />
                    </Source>
                )}
            </Map>

            {/* Coordinates Display */}
            <div className="absolute bottom-6 left-4 bg-white/90 px-3 py-1.5 rounded-md shadow-sm border border-slate-200 text-xs font-mono text-slate-600 pointer-events-none z-10">
                {cursorCoords
                    ? `${cursorCoords.lat.toFixed(4)}, ${cursorCoords.lng.toFixed(4)}`
                    : '--, --'}
            </div>

            {/* Basemap Toggle Button */}
            <button
                onClick={toggleMapStyle}
                className="absolute bottom-6 right-4 bg-white text-slate-700 hover:bg-slate-50 p-2 rounded-lg shadow-lg border border-slate-200 flex items-center gap-2 transition-all font-medium text-sm"
                title={mapStyle === STYLE_TERRAIN ? "Switch to Satellite" : "Switch to Terrain"}
            >
                {mapStyle === STYLE_TERRAIN ? (
                    <>
                        <Satellite className="w-5 h-5 text-blue-600" />
                        <span>Satellite</span>
                    </>
                ) : (
                    <>
                        <Mountain className="w-5 h-5 text-green-600" />
                        <span>Terrain</span>
                    </>
                )}
            </button>
        </div>
    );
}
