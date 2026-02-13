import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapComponent } from './components/Map';

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

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar
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
        showNAIP={showNAIP}
        setShowNAIP={setShowNAIP}
        naipYear={naipYear}
        setNaipYear={setNaipYear}
        showBHS={showBHS}
        setShowBHS={setShowBHS}
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
          showNAIP={showNAIP}
          naipYear={naipYear}
          showBHS={showBHS}
        />
      </main>
    </div>
  );
}

export default App;
