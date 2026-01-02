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

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false 
    }).setView(MAP_CENTER_DEFAULT, MAP_ZOOM_DEFAULT);
    
    L.control.zoom({ position: 'topright' }).addTo(map);

    L.tileLayer(TILE_LAYER_URL, {
      attribution: TILE_LAYER_ATTR,
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Handle Resize when Sidebar toggles
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 300); 
    }
  }, [isSidebarOpen]);

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    const markers: L.Marker[] = [];

    spots.forEach((spot) => {
      const isSelected = selectedSpot?.id === spot.id;
      
      // Accessibility Icon (PMR)
      // Using Blue color scheme
      const iconHtml = `
        <div class="relative flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110 z-10'}">
           <div class="w-8 h-8 bg-white rounded-full shadow-lg border-2 ${isSelected ? 'border-blue-800' : 'border-blue-600'} flex items-center justify-center overflow-hidden">
             <span class="text-lg leading-none" style="color: ${isSelected ? '#1e40af' : '#2563eb'}; margin-top: -2px;">♿</span>
           </div>
           ${isSelected ? '<div class="absolute -bottom-2 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-4 border-t-blue-800"></div>' : ''}
        </div>
      `;

      const icon = L.divIcon({
        className: 'bg-transparent border-none',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(spot.coordinates, { icon });
      
      marker.on('click', () => {
        onSpotSelect(spot);
        map.flyTo(spot.coordinates, 18, { duration: 1 });
      });

      marker.addTo(layerGroup);
      markers.push(marker);
    });

    // Auto-fit bounds on load
    if (markers.length > 0 && !selectedSpot) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 16 });
    }

  }, [spots, selectedSpot, onSpotSelect]);

  // Fly to selected
  useEffect(() => {
    if (selectedSpot && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(selectedSpot.coordinates, 18, { duration: 1.5 });
    }
  }, [selectedSpot]);

  return <div ref={mapContainerRef} className="h-full w-full outline-none" />;
};

export default MapComponent;