import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapComponent } from './components/Map';
import { Menu } from 'lucide-react';

export const STYLE_TERRAIN = 'mapbox://styles/mapbox/outdoors-v12';
export const STYLE_SATELLITE = 'mapbox://styles/cjlinville/cmljzr1ps004l01sp15xj9941';

function App() {
  const [mapStyle, setMapStyle] = useState(STYLE_TERRAIN);
  const [showLocalDistricts, setShowLocalDistricts] = useState(true);
  const [showNHD, setShowNHD] = useState(true);
  const [showMTRoads, setShowMTRoads] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showPublicLands, setShowPublicLands] = useState(true);
  const [showNAIP, setShowNAIP] = useState(false);
  const [naipYear, setNaipYear] = useState('2023');
  const [showBHS, setShowBHS] = useState(false);
  const [showElevationBands, setShowElevationBands] = useState(false);
  const [showSlopeMask, setShowSlopeMask] = useState(false);
  const [showParcels, setShowParcels] = useState(false);
  const [showHabitatSuitability, setShowHabitatSuitability] = useState(false);

  // Mobile Support State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden relative">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-40 md:hidden transition-opacity animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 p-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 md:hidden hover:bg-slate-800 active:scale-95 transition-all"
        title="Open Settings"
      >
        <Menu className="w-6 h-6" />
      </button>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        showLocalDistricts={showLocalDistricts}
        setShowLocalDistricts={setShowLocalDistricts}
        showNHD={showNHD}
        setShowNHD={setShowNHD}
        showMTRoads={showMTRoads}
        setShowMTRoads={setShowMTRoads}
        showTrails={showTrails}
        setShowTrails={setShowTrails}
        showPublicLands={showPublicLands}
        setShowPublicLands={setShowPublicLands}
        showParcels={showParcels}
        setShowParcels={setShowParcels}
        showNAIP={showNAIP}
        setShowNAIP={setShowNAIP}
        naipYear={naipYear}
        setNaipYear={setNaipYear}
        showBHS={showBHS}
        setShowBHS={setShowBHS}
        showElevationBands={showElevationBands}
        setShowElevationBands={setShowElevationBands}
        showSlopeMask={showSlopeMask}
        setShowSlopeMask={setShowSlopeMask}
        showHabitatSuitability={showHabitatSuitability}
        setShowHabitatSuitability={setShowHabitatSuitability}
      />
      <main className="flex-1 h-full relative">
        <MapComponent
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          showLocalDistricts={showLocalDistricts}
          showNHD={showNHD}
          showMTRoads={showMTRoads}
          showTrails={showTrails}
          showPublicLands={showPublicLands}
          showParcels={showParcels}
          showNAIP={showNAIP}
          naipYear={naipYear}
          showBHS={showBHS}
          showElevationBands={showElevationBands}
          showSlopeMask={showSlopeMask}
          showHabitatSuitability={showHabitatSuitability}
        />
      </main>
    </div>
  );
}

export default App;
