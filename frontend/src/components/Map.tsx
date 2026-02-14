import { useState, useCallback, useMemo } from 'react';
import Map, { NavigationControl, Source, Layer, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Mountain, Satellite, X } from 'lucide-react';
import { STYLE_TERRAIN, STYLE_SATELLITE } from '../App';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const HUNTING_DISTRICT_URL = '/data/hunting_district.geojson';
const NHD_WATERBODY_URL = '/data/nhd_waterbody.geojson';
const NHD_FLOWLINE_URL = '/data/nhd_flowline.geojson';
const MT_ROADS_URL = '/data/mt_roads.geojson';
const FS_TRAILS_URL = '/data/fs_trails.geojson';
const PUBLIC_LANDS_URL = '/data/public_lands.geojson';
const PARCELS_URL = '/data/parcels.geojson';
const BHS_DISTRIBUTION_URL = '/data/distribution.geojson';
const ELEVATION_BANDS_URL = '/data/elevation_bands.geojson';
const SLOPE_MASK_URL = '/data/slope_mask.geojson';

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

const parcelsLayer = {
    id: 'parcels',
    type: 'fill' as const,
    paint: {
        'fill-color': 'transparent',
        'fill-outline-color': '#94a3b8' // Slate-400
    }
};

const parcelsLabelLayer: any = {
    id: 'parcels-labels',
    type: 'symbol' as const,
    layout: {
        'text-field': ['get', 'Owner'],
        'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
        'text-size': 9,
        'text-anchor': 'center',
        'text-allow-overlap': false
    },
    paint: {
        'text-color': '#334155', // Slate-700
        'text-halo-color': '#ffffff',
        'text-halo-width': 1.5
    },
    minzoom: 15
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

const elevationBandsLayer: any = {
    id: 'elevation-bands',
    type: 'fill' as const,
    paint: {
        'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'band_id'],
            1, '#1a4301', // Dark Green
            5, '#4d7c0f', // Lime-700
            10, '#fef3c7', // Amber-100
            15, '#d4d4d8', // Zinc-300
            20, '#ffffff'  // White
        ] as any,
        'fill-opacity': 0.5
    }
};

const slopeMaskLayer: any = {
    id: 'slope-mask',
    type: 'fill' as const,
    paint: {
        'fill-color': '#dc2626', // Red-600
        'fill-opacity': 0.4
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
    showParcels: boolean;
    showNAIP: boolean;
    naipYear: string;
    showBHS: boolean;
    showElevationBands: boolean;
    showSlopeMask: boolean;
}

export function MapComponent({
    mapStyle, setMapStyle,
    showLocalDistricts, showNHD, showMTRoads, showTrails, showPublicLands, showParcels,
    showNAIP, naipYear, showBHS, showElevationBands, showSlopeMask
}: MapComponentProps) {
    const [cursorCoords, setCursorCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [popupInfo, setPopupInfo] = useState<{ feature: any; lngLat: { lng: number; lat: number } } | null>(null);
    const [cursor, setCursor] = useState<string>('auto');

    const toggleMapStyle = () => {
        setMapStyle(mapStyle === STYLE_TERRAIN ? STYLE_SATELLITE : STYLE_TERRAIN);
    };

    const interactiveLayerIds = useMemo(() => {
        const ids = [];
        if (showElevationBands) ids.push('elevation-bands');
        if (showSlopeMask) ids.push('slope-mask');
        if (showPublicLands) ids.push('public-lands');
        if (showParcels) ids.push('parcels');
        if (showBHS) ids.push('bhs-distribution');
        if (showMTRoads) ids.push('mt-roads');
        if (showNHD) {
            ids.push('nhd-waterbody-fill');
            ids.push('nhd-flowline');
        }
        if (showTrails) ids.push('fs-trails');
        if (showLocalDistricts) ids.push('hunting-district-line');
        return ids;
    }, [showElevationBands, showSlopeMask, showPublicLands, showBHS, showMTRoads, showNHD, showTrails, showLocalDistricts]);

    const onMouseEnter = useCallback(() => setCursor('pointer'), []);
    const onMouseLeave = useCallback(() => setCursor('auto'), []);

    const onClick = useCallback((event: any) => {
        const feature = event.features && event.features[0];
        if (feature) {
            setPopupInfo({
                feature,
                lngLat: event.lngLat
            });
        } else {
            setPopupInfo(null);
        }
    }, []);

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
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                onClick={onClick}
                cursor={cursor}
                interactiveLayerIds={interactiveLayerIds}
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

                        />
                    </Source>
                )}

                {showElevationBands && (
                    <Source id="elevation-bands" type="geojson" data={ELEVATION_BANDS_URL}>
                        <Layer {...elevationBandsLayer} />
                    </Source>
                )}

                {showSlopeMask && (
                    <Source id="slope-mask" type="geojson" data={SLOPE_MASK_URL}>
                        <Layer {...slopeMaskLayer} />
                    </Source>
                )}

                {showPublicLands && (
                    <Source id="public-lands" type="geojson" data={PUBLIC_LANDS_URL}>
                        <Layer {...publicLandsLayer} />
                    </Source>
                )}

                {showParcels && (
                    <Source id="parcels" type="geojson" data={PARCELS_URL}>
                        <Layer {...parcelsLayer} />
                        <Layer {...parcelsLabelLayer} />
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

                {popupInfo && (
                    <Popup
                        longitude={popupInfo.lngLat.lng}
                        latitude={popupInfo.lngLat.lat}
                        anchor="bottom"
                        onClose={() => setPopupInfo(null)}
                        closeButton={false}
                        maxWidth="320px"
                        className="feature-popup"
                    >
                        <div className="bg-slate-900 text-slate-100 rounded-lg overflow-hidden shadow-2xl border border-slate-700">
                            <div className="flex items-center justify-between px-3 py-2 bg-slate-800 border-b border-slate-700">
                                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                                    {popupInfo.feature.layer.id.replace(/-/g, ' ')}
                                </span>
                                <button
                                    onClick={() => setPopupInfo(null)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto p-3 custom-scrollbar">
                                <table className="w-full text-[11px] border-collapse">
                                    <tbody>
                                        {Object.entries(popupInfo.feature.properties).map(([key, value]) => (
                                            <tr key={key} className="border-b border-slate-800/50 last:border-0 hover:bg-slate-800/30 transition-colors">
                                                <td className="py-1.5 pr-4 font-semibold text-slate-400 align-top whitespace-nowrap">{key}</td>
                                                <td className="py-1.5 text-slate-200 break-words">{String(value)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Popup>
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
