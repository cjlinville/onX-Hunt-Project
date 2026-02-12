import { useState } from 'react';
import { Map, Layers, Settings, User, Map as MapIcon } from 'lucide-react';

interface SidebarProps {
    showLocalDistricts: boolean;
    setShowLocalDistricts: (show: boolean) => void;
}

export function Sidebar({ showLocalDistricts, setShowLocalDistricts }: SidebarProps) {
    const [activeTab, setActiveTab] = useState('Layers');

    return (
        <div className="h-full w-16 md:w-80 bg-slate-900 border-r border-slate-700 flex flex-col text-slate-300 transition-all duration-300 ease-in-out">
            <div className="p-4 flex items-center justify-center md:justify-start border-b border-slate-700 shrink-0">
                <Map className="w-8 h-8 text-blue-500 shrink-0" />
                <span className="ml-3 font-bold text-xl text-white hidden md:block truncate">HuntMap</span>
            </div>

            <nav className="flex-1 py-4 flex flex-col gap-2 overflow-y-auto">
                <SidebarItem
                    icon={<Layers />}
                    label="Layers"
                    active={activeTab === 'Layers'}
                    onClick={() => setActiveTab('Layers')}
                />

                {activeTab === 'Layers' && (
                    <div className="px-4 py-2 hidden md:block">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Overlays</h3>
                            <label className={`flex items-center p-2 rounded cursor-pointer border ${showLocalDistricts ? 'bg-slate-800 border-red-500' : 'border-transparent hover:bg-slate-800'}`}>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={showLocalDistricts}
                                    onChange={(e) => setShowLocalDistricts(e.target.checked)}
                                />
                                <MapIcon className="w-4 h-4 text-red-500 mr-2" />
                                <span className="text-sm">Hunting Districts</span>
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
