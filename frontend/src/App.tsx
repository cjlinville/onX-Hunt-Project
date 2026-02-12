import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { MapComponent } from './components/Map';

export const STYLE_TERRAIN = 'mapbox://styles/mapbox/outdoors-v12';
export const STYLE_SATELLITE = 'mapbox://styles/mapbox/satellite-streets-v12';

function App() {
  const [mapStyle, setMapStyle] = useState(STYLE_TERRAIN);
  const [showLocalDistricts, setShowLocalDistricts] = useState(true);

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      <Sidebar
        showLocalDistricts={showLocalDistricts}
        setShowLocalDistricts={setShowLocalDistricts}
      />
      <main className="flex-1 h-full relative">
        <MapComponent
          mapStyle={mapStyle}
          setMapStyle={setMapStyle}
          showLocalDistricts={showLocalDistricts}
        />
      </main>
    </div>
  );
}

export default App;
