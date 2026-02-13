import { useState } from 'react';
import Map, { NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Mountain, Satellite } from 'lucide-react';
import { STYLE_TERRAIN, STYLE_SATELLITE } from '../App';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const HUNTING_DISTRICT_URL = '/data/Hunting_District.geojson';
const NHD_WATERBODY_URL = '/data/NHD_Waterbody.geojson';
const NHD_FLOWLINE_URL = '/data/NHD_Flowline.geojson';
const MT_ROADS_URL = '/data/MT_Roads.geojson';
const FS_TRAILS_URL = '/data/FS_Trails.geojson';
const PUBLIC_LANDS_URL = '/data/Public_Lands.geojson';
const BHS_DISTRIBUTION_URL = '/data/BHS_Distribution.geojson';

const bhsLayer = {
    id: 'bhs-distribution',
    type: 'fill' as const,
    paint: {
        'fill-color': '#eab308', // Yellow-500
        'fill-opacity': 0.4,
        'fill-outline-color': '#a16207' // Yellow-700
    }
};

const huntingDistrictLineLayer = {
    id: 'hunting-district-line',
    type: 'line' as const,
    paint: {
        'line-color': '#ef4444', // Red-500
        'line-width': 3
    }
};

const mtRoadsLayer = {
    id: 'mt-roads',
    type: 'line' as const,
    paint: {
        'line-color': '#1e293b', // Slate-800
        'line-width': 1.2
    }
};

const fsTrailsLayer = {
    id: 'fs-trails',
    type: 'line' as const,
    paint: {
        'line-color': '#f97316', // Orange-500
        'line-width': 2,
        'line-dasharray': [2, 1]
    }
};


const publicLandsLayer = {
    id: 'public-lands',
    type: 'fill' as const,
    paint: {
        'fill-color': '#8b5cf6', // Violet-500
        'fill-opacity': 0.4,
        'fill-outline-color': '#6d28d9' // Violet-700
    }
};

const nhdWaterbodyFillLayer = {
    id: 'nhd-waterbody-fill',
    type: 'fill' as const,
    paint: {
        'fill-color': '#3b82f6', // Blue-500
        'fill-opacity': 0.4
    }
};

const nhdWaterbodyOutlineLayer = {
    id: 'nhd-waterbody-outline',
    type: 'line' as const,
    paint: {
        'line-color': '#2563eb', // Blue-600
        'line-width': 1
    }
};

const nhdFlowlineLayer = {
    id: 'nhd-flowline',
    type: 'line' as const,
    paint: {
        'line-color': '#3b82f6', // Blue-500
        'line-width': 1.5
    }
};

interface MapComponentProps {
    mapStyle: string;
    setMapStyle: (style: string) => void;
    showLocalDistricts: boolean;
    showNHD: boolean;
    showMTRoads: boolean;
    showTrails: boolean;
    showPublicLands: boolean;
    showNAIP: boolean;
    naipYear: string;
    showBHS: boolean;
}

export function MapComponent({
    mapStyle, setMapStyle,
    showLocalDistricts, showNHD, showMTRoads, showTrails, showPublicLands,
    showNAIP, naipYear, showBHS
}: MapComponentProps) {
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
                    zoom: 11
                }}
                style={{ width: '100%', height: '100%' }}
                mapStyle={mapStyle}
                mapboxAccessToken={MAPBOX_TOKEN}
                onMouseMove={(e) => setCursorCoords(e.lngLat)}
            >
                <NavigationControl position="top-right" />

                {showNAIP && (
                    <Source
                        key={naipYear}
                        id={`naip-${naipYear}`}
                        type="raster"
                        tiles={[`https://gisservicemt.gov/arcgis/rest/services/MSDI_Framework/NAIP_${naipYear}/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256,256&format=png&transparent=true&f=image`]}
                        tileSize={256}
                    >
                        <Layer
                            id={`naip-layer-${naipYear}`}
                            type="raster"
                            paint={{ 'raster-opacity': 1.0 }}
                            beforeId={
                                showPublicLands ? 'public-lands' :
                                    showBHS ? 'bhs-distribution' :
                                        showMTRoads ? 'mt-roads' :
                                            showNHD ? 'nhd-waterbody-fill' :
                                                showTrails ? 'fs-trails' :
                                                    showLocalDistricts ? 'hunting-district-line' :
                                                        undefined
                            }
                        />
                    </Source>
                )}

                {showPublicLands && (
                    <Source id="public-lands" type="geojson" data={PUBLIC_LANDS_URL}>
                        <Layer {...publicLandsLayer} />
                    </Source>
                )}

                {showBHS && (
                    <Source id="bhs-distribution" type="geojson" data={BHS_DISTRIBUTION_URL}>
                        <Layer {...bhsLayer} />
                    </Source>
                )}

                {showMTRoads && (
                    <Source id="mt-roads" type="geojson" data={MT_ROADS_URL}>
                        <Layer {...mtRoadsLayer} />
                    </Source>
                )}

                {showNHD && (
                    <>
                        <Source id="nhd-waterbodies" type="geojson" data={NHD_WATERBODY_URL}>
                            <Layer {...nhdWaterbodyFillLayer} />
                            <Layer {...nhdWaterbodyOutlineLayer} />
                        </Source>
                        <Source id="nhd-flowlines" type="geojson" data={NHD_FLOWLINE_URL}>
                            <Layer {...nhdFlowlineLayer} />
                        </Source>
                    </>
                )}

                {showTrails && (
                    <Source id="fs-trails" type="geojson" data={FS_TRAILS_URL}>
                        <Layer {...fsTrailsLayer} />
                    </Source>
                )}

                {showLocalDistricts && (
                    <Source id="hunting-district" type="geojson" data={HUNTING_DISTRICT_URL}>
                        <Layer {...huntingDistrictLineLayer} />
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
