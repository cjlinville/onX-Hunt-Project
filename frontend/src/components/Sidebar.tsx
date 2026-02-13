import { useState } from 'react';
import { Map, Layers, Settings, User, Map as MapIcon, Mountain, Trees, Info, ChevronDown, ChevronRight, Car, Camera, PawPrint } from 'lucide-react';

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
    showNAIP: boolean;
    setShowNAIP: (show: boolean) => void;
    naipYear: string;
    setNaipYear: (year: string) => void;
    showBHS: boolean;
    setShowBHS: (show: boolean) => void;
}

export function Sidebar({
    showLocalDistricts, setShowLocalDistricts,
    showNHD, setShowNHD,
    showMTRoads, setShowMTRoads,
    showTrails, setShowTrails,
    showPublicLands, setShowPublicLands,
    showNAIP, setShowNAIP,
    naipYear, setNaipYear,
    showBHS, setShowBHS
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

                            {/* FS Trails */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showTrails ? 'bg-slate-800 border-orange-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showTrails}
                                    onChange={(e) => setShowTrails(e.target.checked)}
                                />
                                <Mountain className="w-4 h-4 text-orange-400 mr-3" />
                                <span className="text-sm">Forest Service Trails</span>
                            </label>



                            {/* Public Lands */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showPublicLands ? 'bg-slate-800 border-violet-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showPublicLands}
                                    onChange={(e) => setShowPublicLands(e.target.checked)}
                                />
                                <Trees className="w-4 h-4 text-violet-400 mr-3" />
                                <span className="text-sm">Public Lands</span>
                            </label>

                            {/* MT Highway/Roads */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showMTRoads ? 'bg-slate-800 border-emerald-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showMTRoads}
                                    onChange={(e) => setShowMTRoads(e.target.checked)}
                                />
                                <Car className="w-4 h-4 text-emerald-400 mr-3" />
                                <span className="text-sm">MT Highway/Roads</span>
                            </label>

                            {/* NAIP Imagery */}
                            <div className={`p-2 rounded border transition-colors ${showNAIP ? 'bg-slate-800 border-indigo-500/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <label className="flex items-center cursor-pointer mb-2">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500 mr-3"
                                        checked={showNAIP}
                                        onChange={(e) => setShowNAIP(e.target.checked)}
                                    />
                                    <Camera className="w-4 h-4 text-indigo-400 mr-2" />
                                    <span className="text-sm font-medium">NAIP Imagery</span>
                                </label>
                                {showNAIP && (
                                    <div className="ml-7 space-y-2">
                                        <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Select Year</p>
                                        <select
                                            value={naipYear}
                                            onChange={(e) => setNaipYear(e.target.value)}
                                            className="bg-slate-900 text-xs text-indigo-300 border border-indigo-500/30 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500/60 w-full cursor-pointer"
                                        >
                                            {['2023', '2021', '2019', '2017', '2015', '2013', '2011', '2009', '2005'].map(year => (
                                                <option key={year} value={year}>{year} Imagery</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Bighorn Sheep Distribution */}
                            <label className={`flex items-center p-2 rounded cursor-pointer border transition-colors ${showBHS ? 'bg-slate-800 border-yellow-600/50 text-white' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showBHS}
                                    onChange={(e) => setShowBHS(e.target.checked)}
                                />
                                <PawPrint className="w-4 h-4 text-yellow-500 mr-3" />
                                <span className="text-sm">Bighorn Sheep</span>
                            </label>
                        </div>
                    </div>
                )}

                <SidebarItem
                    icon={<Settings />}
                    label="Settings"
                    active={activeTab === 'Settings'}
                    onClick={() => setActiveTab('Settings')}
                />
            </nav>

            <div className="p-4 border-t border-slate-700 shrink-0">
                <div className="flex items-center justify-center md:justify-start gap-3 cursor-pointer hover:text-white transition-colors">
                    <User className="w-6 h-6 shrink-0" />
                    <span className="hidden md:block font-medium truncate">Profile</span>
                </div>
            </div>
        </div>
    );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
    return (
        <div
            onClick={onClick}
            className={`
        flex items-center justify-center md:justify-start px-4 py-3 cursor-pointer transition-colors
        ${active ? 'bg-slate-800 text-blue-400 border-r-2 border-blue-500' : 'hover:bg-slate-800 hover:text-white'}
      `}
        >
            {icon}
            <span className="ml-3 hidden md:block">{label}</span>
        </div>
    );
}
