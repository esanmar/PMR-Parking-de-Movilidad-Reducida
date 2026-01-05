
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { ParkingSpot } from '../types';
import { MAP_CENTER_DEFAULT, MAP_ZOOM_DEFAULT, TILE_LAYER_URL, TILE_LAYER_ATTR } from '../constants';

interface MapComponentProps {
  spots: ParkingSpot[];
  selectedSpot: ParkingSpot | null;
  onSpotSelect: (spot: ParkingSpot) => void;
  isSidebarOpen: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({ spots, selectedSpot, onSpotSelect, isSidebarOpen }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false 
    }).setView(MAP_CENTER_DEFAULT, MAP_ZOOM_DEFAULT);
    
    L.control.zoom({ position: 'topright' }).addTo(map);
    L.tileLayer(TILE_LAYER_URL, { attribution: TILE_LAYER_ATTR, maxZoom: 19 }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapInstanceRef.current) {
      // Forzar recalcular tamaño cuando el sidebar se mueve para centrar bien el mapa
      setTimeout(() => { mapInstanceRef.current?.invalidateSize(); }, 350); 
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    const markers: L.Marker[] = [];

    spots.forEach((spot) => {
      const isSelected = selectedSpot?.id === spot.id;
      // Siempre usar el icono PMR (♿) por petición del usuario
      const emoji = '♿';
      const colorClass = isSelected ? 'border-blue-800 bg-blue-50' : 'border-blue-500 bg-white';
      
      const iconHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125 z-[1001]' : 'hover:scale-110 z-10'}">
           <div class="w-9 h-9 rounded-full shadow-xl border-2 ${colorClass} flex items-center justify-center overflow-hidden">
             <span class="text-xl leading-none font-sans" style="margin-top: -1px;">${emoji}</span>
           </div>
           ${isSelected ? `<div class="absolute -bottom-1 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-800"></div>` : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'bg-transparent border-none',
        html: iconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(spot.coordinates, { icon });
      marker.on('click', () => onSpotSelect(spot));
      marker.addTo(layerGroup);
      markers.push(marker);
    });

    // Si hay muchos puntos y ninguno seleccionado, encuadrar mapa
    if (markers.length > 0 && !selectedSpot) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
    }
  }, [spots, selectedSpot, onSpotSelect]);

  useEffect(() => {
    if (selectedSpot && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(selectedSpot.coordinates, 18, { duration: 1.5 });
    }
  }, [selectedSpot]);

  return <div ref={mapContainerRef} className="h-full w-full outline-none z-0" />;
};

export default MapComponent;
