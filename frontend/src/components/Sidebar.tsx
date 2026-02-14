import { useState } from 'react';
import { Map, Layers, Map as MapIcon, Mountain, Trees, Info, Car, Camera, PawPrint, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';

interface SidebarProps {
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
}

export function Sidebar({
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
    showSlopeMask, setShowSlopeMask
}: SidebarProps) {
    const [activeTab, setActiveTab] = useState('Layers');

    return (
        <div className="h-full w-16 md:w-80 bg-slate-900 border-r border-slate-700 flex flex-col text-slate-300 transition-all duration-300 ease-in-out">
            <div className="p-4 flex items-center justify-center md:justify-start border-b border-slate-700 shrink-0">
                <Map className="w-8 h-8 text-blue-500 shrink-0" />
                <span className="ml-3 font-bold text-xl text-white hidden md:block truncate">HuntMap</span>
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto">
                <SidebarItem
                    icon={<Info />}
                    label="About"
                    active={activeTab === 'About'}
                    onClick={() => setActiveTab('About')}
                />

                {activeTab === 'About' && (
                    <div className="px-6 py-4 hidden md:block border-b border-slate-800 pb-6 text-xs text-slate-400 leading-relaxed space-y-4">
                        <p>
                            This map integrates multiple data sources to provide a comprehensive view of the hunting unit.
                        </p>
                        <ul className="list-disc list-inside space-y-2">
                            <li><span className="text-slate-300 font-semibold">NHD</span>: Hydrography data from USGS.</li>
                            <li><span className="text-slate-300 font-semibold">USFS</span>: Official FS roads and trails.</li>
                            <li><span className="text-slate-300 font-semibold">Public Lands</span>: MT FWP parcel boundaries.</li>
                        </ul>
                        <p>
                            All data is automatically clipped to the hunting district boundary for precision.
                        </p>
                    </div>
                )}

                <SidebarItem
                    icon={<Layers />}
                    label="Layers"
                    active={activeTab === 'Layers'}
                    onClick={() => setActiveTab('Layers')}
                />

                {activeTab === 'Layers' && (
                    <div className="px-4 py-2 hidden md:block border-b border-slate-800 pb-4">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Data Layers</h3>
                        <div className="space-y-1">
                            {/* Hunting Districts */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showLocalDistricts ? 'bg-slate-800 border-red-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showLocalDistricts}
                                    onChange={(e) => setShowLocalDistricts(e.target.checked)}
                                />
                                <MapIcon className="w-4 h-4 text-red-500 mr-3" />
                                <span className="text-sm">Hunting Districts</span>
                            </label>

                            {/* NHD Hydrography */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showNHD ? 'bg-slate-800 border-blue-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showNHD}
                                    onChange={(e) => setShowNHD(e.target.checked)}
                                />
                                <Layers className="w-4 h-4 text-blue-400 mr-3" />
                                <span className="text-sm">NHD Hydrography</span>
                            </label>

                            {/* Access Group */}
                            <CollapsibleSection title="Access" icon={<Car className="w-4 h-4 text-emerald-400" />}>
                                <div className="space-y-1 pt-1">
                                    <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showMTRoads ? 'bg-slate-800/80 border-emerald-500/30 text-white shadow-sm' : 'border-transparent hover:bg-slate-800/30'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={showMTRoads}
                                            onChange={(e) => setShowMTRoads(e.target.checked)}
                                        />
                                        <Car className="w-3.5 h-3.5 text-emerald-500/70 mr-3" />
                                        <span className="text-xs">MT Highway/Roads</span>
                                    </label>

                                    <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showTrails ? 'bg-slate-800/80 border-orange-500/30 text-white shadow-sm' : 'border-transparent hover:bg-slate-800/30'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={showTrails}
                                            onChange={(e) => setShowTrails(e.target.checked)}
                                        />
                                        <Mountain className="w-3.5 h-3.5 text-orange-500/70 mr-3" />
                                        <span className="text-xs">Forest Service Trails</span>
                                    </label>

                                    <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showParcels ? 'bg-slate-800/80 border-slate-500/30 text-white shadow-sm' : 'border-transparent hover:bg-slate-800/30'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={showParcels}
                                            onChange={(e) => setShowParcels(e.target.checked)}
                                        />
                                        <Layers className="w-3.5 h-3.5 text-slate-400 mr-3" />
                                        <span className="text-xs">MT Parcels</span>
                                    </label>
                                </div>
                            </CollapsibleSection>

                            {/* Public Lands */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showPublicLands ? 'bg-slate-800 border-violet-500/50 text-white shadow-sm' : 'border-transparent hover:bg-slate-800/50 hover:text-slate-200'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showPublicLands}
                                    onChange={(e) => setShowPublicLands(e.target.checked)}
                                />
                                <Trees className="w-4 h-4 text-violet-400 mr-3" />
                                <span className="text-sm">Public Lands</span>
                            </label>

                            {/* Bighorn Sheep Distribution */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showBHS ? 'bg-slate-800 border-yellow-600/50 text-white shadow-sm' : 'border-transparent hover:bg-slate-800/50 hover:text-slate-200'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showBHS}
                                    onChange={(e) => setShowBHS(e.target.checked)}
                                />
                                <PawPrint className="w-4 h-4 text-yellow-500 mr-3" />
                                <span className="text-sm">Bighorn Sheep</span>
                            </label>

                            {/* Elevation Derivatives */}
                            <CollapsibleSection title="Elevation Derivatives" icon={<Mountain className="w-4 h-4 text-lime-400" />}>
                                <div className="space-y-1 pt-1">
                                    <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showElevationBands ? 'bg-slate-800/80 border-lime-500/30 text-white' : 'border-transparent hover:bg-slate-800/30'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={showElevationBands}
                                            onChange={(e) => setShowElevationBands(e.target.checked)}
                                        />
                                        <Layers className="w-3.5 h-3.5 text-lime-500/70 mr-3" />
                                        <span className="text-xs">Elevation Bands</span>
                                    </label>

                                    <label className={`flex items-center p-2 rounded cursor-pointer border transition-all duration-200 ${showSlopeMask ? 'bg-slate-800/80 border-red-600/30 text-white' : 'border-transparent hover:bg-slate-800/30'}`}>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={showSlopeMask}
                                            onChange={(e) => setShowSlopeMask(e.target.checked)}
                                        />
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 mr-3" />
                                        <span className="text-xs">Steep Slope ({'>'}45°)</span>
                                    </label>
                                </div>
                            </CollapsibleSection>

                            <div className="pt-2">
                                <div className="h-px bg-slate-800 mx-2 mb-3" />
                            </div>

                            {/* NAIP Imagery */}
                            <div className={`p-3 rounded border transition-all duration-200 ${showNAIP ? 'bg-slate-800 border-indigo-500/50 text-white shadow-md' : 'border-transparent hover:bg-slate-800/50'}`}>
                                <label className="flex items-center cursor-pointer mb-3">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 mr-3"
                                        checked={showNAIP}
                                        onChange={(e) => setShowNAIP(e.target.checked)}
                                    />
                                    <Camera className="w-4 h-4 text-indigo-400 mr-2" />
                                    <span className="text-sm font-semibold">NAIP Imagery</span>
                                </label>
                                {showNAIP && (
                                    <div className="ml-7 space-y-2">
                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Select Year</p>
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
        flex items-center justify-center md:justify-start px-4 py-3 cursor-pointer transition-colors
        ${active ? 'bg-slate-800 text-blue-400 border-r-2 border-blue-500 shadow-inner' : 'hover:bg-slate-800 hover:text-white'}
      `}
        >
            {icon}
            <span className="ml-3 hidden md:block font-medium">{label}</span>
        </div>
    );
}

function CollapsibleSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

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
                <div className="px-2 pb-2 bg-slate-900/50">
                    {children}
                </div>
            )}
        </div>
    );
}
