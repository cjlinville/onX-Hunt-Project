import { useState } from 'react';
import { Layers, Map as MapIcon, Mountain, Trees, Info, Car, Camera, PawPrint, AlertTriangle, ChevronDown, ChevronRight, X } from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    showLocalDistricts: boolean;
    setShowLocalDistricts: (show: boolean) => void;
    showNHD: boolean;
    setShowNHD: (show: boolean) => void;
    showMTRoads: boolean;
    setShowMTRoads: (show: boolean) => void;
    showTrails: boolean;
    setShowTrails: (show: boolean) => void;
    showPublicLands: boolean;
    setShowPublicLands: (show: boolean) => void;
    showParcels: boolean;
    setShowParcels: (show: boolean) => void;
    showNAIP: boolean;
    setShowNAIP: (show: boolean) => void;
    naipYear: string;
    setNaipYear: (year: string) => void;
    showBHS: boolean;
    setShowBHS: (show: boolean) => void;
    showElevationBands: boolean;
    setShowElevationBands: (show: boolean) => void;
    showSlopeMask: boolean;
    setShowSlopeMask: (show: boolean) => void;
    showHabitatSuitability: boolean;
    setShowHabitatSuitability: (show: boolean) => void;
}

const LAYER_METADATA: Record<string, { description: string; source: string }> = {
    'Hunting Districts': {
        description: 'Official management unit boundaries defined by Montana FWP. All map data is automatically clipped to a buffer of this boundary.',
        source: 'MT FWP'
    },
    'Public Lands': {
        description: 'Dataset identifying land ownership including State, USFS, BLM, and National Park Service parcels.',
        source: 'MT FWP'
    },
    'MT Parcels': {
        description: 'Detailed cadastral data showing property boundaries and ownership information from the Montana State Digital Infrastructure.',
        source: 'MT MSDI'
    },
    'MT Highway/Roads': {
        description: 'Major transportation network including federal, state, and local roads with surface and access status.',
        source: 'MT MSDI'
    },
    'Forest Service Trails': {
        description: 'Official USFS trail network.',
        source: 'USFS'
    },
    'NHD Hydrography': {
        description: 'Comprehensive water dataset showing streams, rivers, lakes, and ponds.',
        source: 'USGS NHD'
    },
    'Bighorn Sheep Distribution': {
        description: 'Habitat distribution ranges for bighorn sheep.',
        source: 'MT FWP'
    },
    'Elevation Bands': {
        description: 'Visual classification of terrain elevation, helping identify peaks, basins, and plateaus.',
        source: 'Calculated (DEM)'
    },
    'Steep Slope (>45°)': {
        description: 'Identification of extremely steep terrain (over 45 degrees) that may impact movement or animal behavior.',
        source: 'Calculated (DEM)'
    },
    'Habitat Suitability Index': {
        description: 'Calculated suitability model weighting slope (1.5x), water distance (1.5x), and road distance (proxy for pressure) (1.0x).',
        source: 'Analysis Model'
    },
    'NAIP Imagery': {
        description: 'High-resolution aerial photography from the National Agriculture Imagery Program. Available for multiple years.',
        source: 'USDA'
    }
};

export function Sidebar({
    isOpen, onClose,
    showLocalDistricts, setShowLocalDistricts,
    showNHD, setShowNHD,
    showMTRoads, setShowMTRoads,
    showTrails, setShowTrails,
    showPublicLands, setShowPublicLands,
    showParcels, setShowParcels,
    showNAIP, setShowNAIP,
    naipYear, setNaipYear,
    showBHS, setShowBHS,
    showElevationBands, setShowElevationBands,
    showSlopeMask, setShowSlopeMask,
    showHabitatSuitability, setShowHabitatSuitability
}: SidebarProps) {
    const [activeTab, setActiveTab] = useState<'Layers' | 'About'>('Layers');
    const [showInfoTab, setShowInfoTab] = useState<string | null>(null);

    return (
        <div className={`
            fixed inset-y-0 left-0 z-50 w-80 bg-slate-900 border-r border-slate-700 flex flex-col text-slate-300 transform transition-transform duration-300 ease-in-out
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0 md:w-80 shrink-0
        `}>
            <div className="p-4 flex items-center justify-between border-b border-slate-700 shrink-0">
                <div className="flex items-center">
                    <MapIcon className="w-8 h-8 text-blue-500 shrink-0" />
                    <span className="ml-3 font-bold text-xl text-white truncate">Hunt Map</span>
                </div>
                <button
                    onClick={onClose}
                    className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto">
                <SidebarItem
                    icon={<Info className="w-5 h-5" />}
                    label="About"
                    active={activeTab === 'About'}
                    onClick={() => setActiveTab('About')}
                />

                {activeTab === 'About' && (
                    <div className="px-6 py-4 border-b border-slate-800 pb-6 text-sm text-slate-400 leading-relaxed">
                        <p className="mb-4 text-slate-300 font-medium">
                            Supporting hunting planning and in-field use for bighorn sheep hunting.
                        </p>
                        <p className="text-xs text-slate-500">
                            This tool integrates high-resolution imagery, ownership data, terrain derivatives, and custom habitat models to provide actionable insights for your hunt.
                        </p>
                    </div>
                )}

                <SidebarItem
                    icon={<Layers className="w-5 h-5" />}
                    label="Layers"
                    active={activeTab === 'Layers'}
                    onClick={() => setActiveTab('Layers')}
                />

                {activeTab === 'Layers' && (
                    <div className="px-4 py-2 border-b border-slate-800 pb-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Data Layers</h3>
                        <div className="space-y-2">
                            {/* Regulation and Land Group */}
                            <CollapsibleSection title="Regulation and Land" icon={<MapIcon className="w-4 h-4 text-red-400" />}>
                                <div className="space-y-1">
                                    <LayerToggle
                                        label="Hunting Districts"
                                        icon={<MapIcon className="w-4 h-4 text-red-500" />}
                                        checked={showLocalDistricts}
                                        onChange={setShowLocalDistricts}
                                        activeColor="border-red-500/50"
                                    />
                                    <LayerToggle
                                        label="Public Lands"
                                        icon={<Trees className="w-4 h-4 text-violet-400" />}
                                        checked={showPublicLands}
                                        onChange={setShowPublicLands}
                                        activeColor="border-violet-500/50"
                                    />
                                    <LayerToggle
                                        label="MT Parcels"
                                        icon={<Layers className="w-3.5 h-3.5 text-slate-400" />}
                                        checked={showParcels}
                                        onChange={setShowParcels}
                                        activeColor="border-slate-500/30"
                                    />
                                </div>
                            </CollapsibleSection>

                            {/* Access Group */}
                            <CollapsibleSection title="Access" icon={<Car className="w-4 h-4 text-emerald-400" />}>
                                <div className="space-y-1">
                                    <LayerToggle
                                        label="MT Highway/Roads"
                                        icon={<Car className="w-3.5 h-3.5 text-emerald-500/70" />}
                                        checked={showMTRoads}
                                        onChange={setShowMTRoads}
                                        activeColor="border-emerald-500/30"
                                    />
                                    <LayerToggle
                                        label="Forest Service Trails"
                                        icon={<Mountain className="w-3.5 h-3.5 text-orange-500/70" />}
                                        checked={showTrails}
                                        onChange={setShowTrails}
                                        activeColor="border-orange-500/30"
                                    />
                                </div>
                            </CollapsibleSection>

                            {/* Habitat Group */}
                            <CollapsibleSection title="Habitat" icon={<Trees className="w-4 h-4 text-green-400" />}>
                                <div className="space-y-1">
                                    <LayerToggle
                                        label="NHD Hydrography"
                                        icon={<Layers className="w-4 h-4 text-blue-400" />}
                                        checked={showNHD}
                                        onChange={setShowNHD}
                                        activeColor="border-blue-500/50"
                                    />
                                    <LayerToggle
                                        label="Bighorn Sheep Distribution"
                                        icon={<PawPrint className="w-4 h-4 text-yellow-500" />}
                                        checked={showBHS}
                                        onChange={setShowBHS}
                                        activeColor="border-yellow-600/50"
                                    />
                                    <LayerToggle
                                        label="Elevation Bands"
                                        icon={<Layers className="w-3.5 h-3.5 text-lime-500/70" />}
                                        checked={showElevationBands}
                                        onChange={setShowElevationBands}
                                        activeColor="border-lime-500/30"
                                    />
                                    <LayerToggle
                                        label="Steep Slope (>45°)"
                                        icon={<AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
                                        checked={showSlopeMask}
                                        onChange={setShowSlopeMask}
                                        activeColor="border-red-600/30"
                                    />
                                    <LayerToggle
                                        label="Habitat Suitability Index"
                                        icon={<Trees className="w-4 h-4 text-green-500" />}
                                        checked={showHabitatSuitability}
                                        onChange={setShowHabitatSuitability}
                                        activeColor="border-green-600/50"
                                    />
                                </div>
                            </CollapsibleSection>

                            {/* NAIP Imagery */}
                            <div className={`p-2 rounded border transition-all duration-200 ${showNAIP ? 'bg-slate-800 border-indigo-500/50 text-white shadow-md' : 'border-transparent hover:bg-slate-800/50'}`}>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 mr-3"
                                            checked={showNAIP}
                                            onChange={(e) => setShowNAIP(e.target.checked)}
                                        />
                                        <Camera className="w-4 h-4 text-indigo-400 mr-2" />
                                        <span className="text-sm font-semibold">NAIP Imagery</span>
                                    </label>
                                    <button
                                        onClick={() => setShowInfoTab(showInfoTab === 'NAIP Imagery' ? null : 'NAIP Imagery')}
                                        className={`p-1 rounded-full transition-colors ${showInfoTab === 'NAIP Imagery' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        <Info className="w-3.5 h-3.5" />
                                    </button>
                                </div>

                                {showInfoTab === 'NAIP Imagery' && (
                                    <div className="mx-2 mb-3 p-2 bg-slate-950/50 rounded text-[10px] text-slate-400 border-l border-indigo-500/50 animate-in slide-in-from-top-1 duration-200">
                                        <p>{LAYER_METADATA['NAIP Imagery'].description}</p>
                                        <div className="mt-1.5 flex items-center justify-between text-[9px] uppercase tracking-tighter opacity-60">
                                            <span>Source: {LAYER_METADATA['NAIP Imagery'].source}</span>
                                        </div>
                                    </div>
                                )}

                                {showNAIP && (
                                    <div className="ml-7 space-y-2">
                                        <select
                                            value={naipYear}
                                            onChange={(e) => setNaipYear(e.target.value)}
                                            className="bg-slate-900 text-xs text-indigo-300 border border-indigo-500/30 rounded px-2.5 py-2 focus:outline-none focus:border-indigo-500/60 w-full cursor-pointer hover:bg-slate-950 transition-colors"
                                        >
                                            {['2023', '2021', '2019', '2017', '2015', '2013', '2011', '2009', '2005'].map(year => (
                                                <option key={year} value={year}>{year} Imagery</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`
        flex items-center px-4 py-3 cursor-pointer transition-colors
        ${active ? 'bg-slate-800 text-blue-400 border-r-2 border-blue-500 shadow-inner' : 'hover:bg-slate-800 hover:text-white'}
      `}
        >
            {icon}
            <span className="ml-3 font-medium">{label}</span>
        </div>
    );
}

function CollapsibleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="border border-slate-800 rounded overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-800 transition-colors text-slate-300"
            >
                <div className="flex items-center">
                    {icon}
                    <span className="ml-3 text-sm font-medium">{title}</span>
                </div>
                {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
            {isOpen && (
                <div className="pl-6 pr-2 pb-2 bg-slate-900/50 space-y-1">
                    {children}
                </div>
            )}
        </div>
    );
}

function LayerToggle({ label, icon, checked, onChange, activeColor }: {
    label: string,
    icon: React.ReactNode,
    checked: boolean,
    onChange: (checked: boolean) => void,
    activeColor: string
}) {
    const [isInfoExpanded, setIsInfoExpanded] = useState(false);
    const metadata = LAYER_METADATA[label];

    return (
        <div className="flex flex-col gap-0.5">
            <div className={`flex items-center justify-between p-2 rounded border transition-all duration-200 ${checked ? `bg-slate-800 ${activeColor} text-white shadow-sm` : 'border-transparent hover:bg-slate-800/30'}`}>
                <label className="flex items-center flex-1 cursor-pointer">
                    <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                    />
                    <div className="mr-3">{icon}</div>
                    <span className="text-sm truncate pr-2">{label}</span>
                </label>
                <button
                    onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                    className={`p-1 rounded-full transition-colors ${isInfoExpanded ? 'bg-slate-700 text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    title="Layer Information"
                >
                    <Info className="w-3.5 h-3.5" />
                </button>
            </div>
            {isInfoExpanded && metadata && (
                <div className="mx-2 mb-1 p-2 bg-slate-950/50 rounded text-[10px] text-slate-400 border-l border-blue-500/40 animate-in slide-in-from-top-1 duration-200">
                    <p className="leading-relaxed">{metadata.description}</p>
                    <div className="mt-1.5 flex items-center justify-between text-[9px] uppercase tracking-tighter opacity-60">
                        <span>Source: {metadata.source}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
