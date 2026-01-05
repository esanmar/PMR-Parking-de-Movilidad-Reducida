
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, GeoJsonData, ParkingSpot, DataSource } from './types';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import { Menu, Loader2, AlertCircle } from 'lucide-react';
import proj4 from 'proj4';

// Proyecciones comunes en España / Vitoria
const ETRS89_UTM30N = "+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs";
const ED50_UTM30N = "+proj=utm +zone=30 +ellps=intl +units=m +no_defs +towgs84=-131,-100.3,-163.4,-1.244,-0.020,-1.144,9.39";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";

const LOCAL_STORAGE_KEY = 'parking_data_cache_vitoria';
const GITHUB_GEOJSON_URL = 'https://raw.githubusercontent.com/esanmar/PMR-Parking-de-Movilidad-Reducida/main/public/aparcamientos_motocicletas.geojson';

const App: React.FC = () => {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const getCenterAndConvert = useCallback((geometry: any): [number, number] | null => {
    if (!geometry) return null;
    let rawCoords: number[] = [];

    try {
      if (geometry.type === 'Point') {
        rawCoords = geometry.coordinates;
      } else if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        const firstRing = geometry.type === 'Polygon' ? geometry.coordinates[0] : geometry.coordinates[0][0];
        rawCoords = firstRing[0];
      }

      if (!rawCoords || rawCoords.length < 2) return null;

      const isUTM = Math.abs(rawCoords[0]) > 1000;
      let finalCoords: [number, number]; 

      if (isUTM) {
        const [lng, lat] = proj4(ETRS89_UTM30N, WGS84, [rawCoords[0], rawCoords[1]]);
        finalCoords = [lat, lng];
      } else {
        finalCoords = [rawCoords[1], rawCoords[0]];
      }

      if (finalCoords[0] < 42 || finalCoords[0] > 44 || finalCoords[1] > -1 || finalCoords[1] < -4) {
         if (isUTM) {
            const [lng2, lat2] = proj4(ED50_UTM30N, WGS84, [rawCoords[0], rawCoords[1]]);
            if (lat2 > 42 && lat2 < 43) return [lat2, lng2];
         }
         return null; 
      }

      return finalCoords; 
    } catch (e) {
      return null;
    }
  }, []);

  const processGeoJson = useCallback((data: any, source: DataSource, fileName?: string) => {
    try {
      const features = data.features || (Array.isArray(data) ? data : null);
      if (!features) throw new Error("Formato GeoJSON no reconocido");

      const isMoto = fileName?.toLowerCase().includes('moto') || 
                    source === 'server' || 
                    JSON.stringify(data).toLowerCase().includes('moto');

      const parsedSpots: ParkingSpot[] = features.map((feature: any, index: number) => {
        const coords = getCenterAndConvert(feature.geometry);
        if (!coords) return null;

        const p = feature.properties || {};
        const name = p.CALLE || p.Calle || p.DIRECCION || p.Direccion || p.NOMBRE || p.Nombre || `Plaza ${index + 1}`;
        
        return {
          id: `spot-${index}-${source}-${Math.random().toString(36).substr(2, 4)}`,
          name: name.toString().trim(),
          coordinates: coords,
          properties: p,
          type: isMoto ? 'moto' : 'pmr'
        };
      }).filter((s): s is ParkingSpot => s !== null);

      if (parsedSpots.length > 0) {
        setSpots(parsedSpots);
        setDataSource(source);
        setLoadError(null);
        setIsInitialLoading(false);
        return true;
      } else {
        throw new Error("No se encontraron puntos válidos.");
      }
    } catch (e: any) {
      return false;
    }
  }, [getCenterAndConvert]);

  useEffect(() => {
    const loadData = async () => {
      // Intentar GitHub
      try {
        const res = await fetch(GITHUB_GEOJSON_URL);
        if (res.ok) {
          const data = await res.json();
          if (processGeoJson(data, 'server')) return;
        }
      } catch (e) {}

      // Intentar locales si GitHub falla
      const localFiles = ['aparcamientos_motocicletas.geojson', 'aparcamientos_pmr.geojson'];
      for (const f of localFiles) {
        try {
          const res = await fetch(f);
          if (res.ok) {
            const data = await res.json();
            if (processGeoJson(data, 'server', f)) return;
          }
        } catch (e) {}
      }

      // Intentar caché
      const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (cached) {
        try {
          if (processGeoJson(JSON.parse(cached), 'local')) return;
        } catch (e) {}
      }

      setLoadError("No se pudieron cargar los datos.");
      setDataSource('sample');
      setIsInitialLoading(false);
    };

    loadData();
  }, [processGeoJson]);

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (processGeoJson(json, 'local', file.name)) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json));
        } else {
          alert("Sin datos válidos en Vitoria-Gasteiz.");
        }
      } catch (err) {
        alert("JSON inválido.");
      }
    };
    reader.readAsText(file);
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
        <h1 className="text-xl font-bold">Cargando Mapa de Vitoria...</h1>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-100 flex flex-row">
      {/* Botón flotante para reabrir el panel si se cierra */}
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-[1050] bg-white p-3 rounded-full shadow-2xl hover:bg-gray-50 transition-all text-slate-800 border border-gray-200"
        >
          <Menu size={24} />
        </button>
      )}

      {/* Panel Lateral con Z-INDEX superior al mapa de Leaflet (que usa hasta 1000) */}
      <div className={`absolute inset-y-0 left-0 h-full w-full md:w-96 z-[1100] transform transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar 
            selectedSpot={selectedSpot} 
            allSpots={spots}
            onClose={() => setIsSidebarOpen(false)}
            onSelectSpot={(s) => { setSelectedSpot(s); setIsSidebarOpen(true); }}
            onUploadFile={handleUploadFile}
            dataSource={dataSource}
            onClearCache={() => { localStorage.removeItem(LOCAL_STORAGE_KEY); window.location.reload(); }}
         />
      </div>

      {/* Contenedor del Mapa con desplazamiento dinámico */}
      <div className={`h-full w-full transition-all duration-300 ${isSidebarOpen ? 'md:pl-96' : ''}`}>
        {dataSource === 'sample' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1050] bg-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm">
            <AlertCircle size={16} />
            Datos de respaldo cargados.
          </div>
        )}
        <MapComponent 
          spots={spots} 
          selectedSpot={selectedSpot} 
          onSpotSelect={(s) => { setSelectedSpot(s); }}
          isSidebarOpen={isSidebarOpen}
        />
      </div>
    </div>
  );
};

export default App;
