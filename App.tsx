
import React, { useState, useEffect, useCallback } from 'react';
import { AppView, GeoJsonData, ParkingSpot, DataSource } from './types';
import MapComponent from './components/MapComponent';
import Sidebar from './components/Sidebar';
import { Menu, Loader2 } from 'lucide-react';
import proj4 from 'proj4';

// Define Vitoria-Gasteiz Projection (ETRS89 / UTM zone 30N)
const UTM_30N = "+proj=utm +zone=30 +ellps=GRS80 +units=m +no_defs";
const WGS84 = "+proj=longlat +datum=WGS84 +no_defs";
const LOCAL_STORAGE_KEY = 'parking_pmr_data_cache';

const App: React.FC = () => {
  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [dataSource, setDataSource] = useState<DataSource>('loading');
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Helper to get a center point [Lat, Lng] from any geometry
  const getCenterAndConvert = useCallback((geometry: any): [number, number] | null => {
    if (!geometry) return null;
    
    let rawPoint: number[] = [0, 0];

    try {
      if (geometry.type === 'Point') {
        rawPoint = geometry.coordinates;
      } else if (geometry.type === 'Polygon') {
        if (geometry.coordinates?.[0]?.[0]) {
          rawPoint = geometry.coordinates[0][0]; 
        }
      } else if (geometry.type === 'MultiPolygon') {
        if (geometry.coordinates?.[0]?.[0]?.[0]) {
          rawPoint = geometry.coordinates[0][0][0];
        }
      }

      if (!rawPoint || rawPoint.length < 2) return null;

      // Check Projection: UTM coordinates in Vitoria are usually X > 500,000
      const isUTM = Math.abs(rawPoint[0]) > 180 || Math.abs(rawPoint[1]) > 90;

      let finalCoords: [number, number]; 

      if (isUTM) {
        const p4 = (proj4 as any).default || proj4;
        const converted = p4(UTM_30N, WGS84, rawPoint);
        finalCoords = [converted[0], converted[1]];
      } else {
        finalCoords = [rawPoint[0], rawPoint[1]];
      }

      return [finalCoords[1], finalCoords[0]]; // Return [Lat, Lng] for Leaflet
    } catch (e) {
      console.error("Error converting coordinates:", geometry, e);
      return null;
    }
  }, []);

  const processGeoJson = useCallback((data: GeoJsonData, source: DataSource) => {
    try {
      if (!data || (!data.features && !Array.isArray(data))) throw new Error("Formato GeoJSON inválido");

      const features = Array.isArray(data) ? data : data.features;

      const parsedSpots: ParkingSpot[] = features.map((feature: any, index: number) => {
        if (!feature.geometry) return null;
        const coords = getCenterAndConvert(feature.geometry);
        if (!coords) return null;

        const props = feature.properties || {};
        
        // Priority list for Street Names + Number
        const street = 
          props.CALLE || props.Calle || props.calle ||
          props.DIRECCION || props.Direccion || props.direccion ||
          props.NOMBRE || props.Nombre || props.name || "Calle desconocida";
        
        const num = props.NUMERO || props.Numero || props.numero || props.Nº || "";
        const fullName = num ? `${street}, ${num}` : street;

        return {
          id: `spot-${index}-${source}`,
          name: fullName.toString().trim(),
          coordinates: coords,
          properties: props
        };
      }).filter((s): s is ParkingSpot => s !== null);

      setSpots(parsedSpots);
      setDataSource(source);
      setIsInitialLoading(false);
    } catch (e) {
      console.error("Error processing GeoJSON:", e);
      setDataSource('sample');
      setIsInitialLoading(false);
    }
  }, [getCenterAndConvert]);

  // Initial Load Strategy
  useEffect(() => {
    const loadData = async () => {
      // Priority 1: Fetch the file we just created
      try {
        const response = await fetch('aparcamientos_motocicletas.geojson');
        if (response.ok) {
          const data = await response.json();
          processGeoJson(data, 'server');
          return;
        } else {
            console.warn("Fetch failed with status:", response.status);
        }
      } catch (e) {
        console.warn("Error fetching the geojson file directly:", e);
      }

      // Priority 2: Cache
      try {
        const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          processGeoJson(data, 'local');
          return;
        }
      } catch (e) {
        console.error("Error reading cache", e);
      }

      // Final fallback: stop loading even if no data
      setIsInitialLoading(false);
      setDataSource('sample');
    };

    loadData();
  }, [processGeoJson]);

  const handleSpotSelect = (spot: ParkingSpot) => {
    setSelectedSpot(spot);
    setIsSidebarOpen(true);
  };

  const handleUploadFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const json = JSON.parse(text);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json));
          processGeoJson(json, 'local');
          setIsSidebarOpen(true);
        }
      } catch (err) {
        alert("Error al procesar el archivo. Asegúrate de que sea un GeoJSON válido.");
      }
    };
    reader.readAsText(file);
  };

  const handleClearCache = () => {
    if (confirm("¿Estás seguro de que quieres borrar los datos guardados?")) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      window.location.reload();
    }
  };

  if (isInitialLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-900 text-white">
        <Loader2 className="animate-spin mb-4 text-blue-500" size={48} />
        <h1 className="text-xl font-bold text-center px-4">Iniciando Mapa PMR Vitoria...</h1>
        <p className="text-slate-400 text-sm mt-2">Buscando aparcamientos_motocicletas.geojson</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-gray-100 font-sans flex flex-row">
      {!isSidebarOpen && (
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-4 left-4 z-10 bg-white p-3 rounded-full shadow-lg hover:bg-gray-50 transition-all text-slate-800 border border-gray-200"
          aria-label="Abrir menú"
        >
          <Menu size={24} />
        </button>
      )}

      <div className={`absolute inset-y-0 left-0 h-full w-full md:w-96 z-20 transform transition-transform duration-300 shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
         <Sidebar 
            selectedSpot={selectedSpot} 
            allSpots={spots}
            onClose={() => setIsSidebarOpen(false)}
            onSelectSpot={handleSpotSelect}
            onUploadFile={handleUploadFile}
            dataSource={dataSource}
            onClearCache={handleClearCache}
         />
      </div>

      <div className={`h-full w-full transition-all duration-300 ${isSidebarOpen ? 'md:pl-96' : ''}`}>
        <MapComponent 
          spots={spots} 
          selectedSpot={selectedSpot} 
          onSpotSelect={handleSpotSelect}
          isSidebarOpen={isSidebarOpen}
        />
      </div>
    </div>
  );
};

export default App;
