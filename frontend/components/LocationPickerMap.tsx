'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LocationPickerMapProps {
  lat: number | null;
  lng: number | null;
  onLocationSelect: (lat: number, lng: number) => void;
  height?: string;
}

export default function LocationPickerMap({ lat, lng, onLocationSelect, height = '400px' }: LocationPickerMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default to São Paulo, Brazil if no coordinates provided
    const defaultLat = (lat !== null && !isNaN(lat)) ? lat : -23.5505;
    const defaultLng = (lng !== null && !isNaN(lng)) ? lng : -46.6333;
    const initialZoom = (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) ? 15 : 13;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], initialZoom);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Create PIN marker icon
    const createPinIcon = () => {
      return L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position: relative; cursor: pointer;">
            <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0C10.477 0 6 4.477 6 10C6 17 16 30 16 30C16 30 26 17 26 10C26 4.477 21.523 0 16 0Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
              <circle cx="16" cy="10" r="4" fill="white"/>
            </svg>
          </div>
        `,
        iconSize: [32, 40],
        iconAnchor: [16, 40],
        popupAnchor: [0, -40]
      });
    };
    
    const markerIcon = createPinIcon();

    // Add initial marker if coordinates are provided
    if (lat && lng) {
      const marker = L.marker([lat, lng], { icon: markerIcon, draggable: true })
        .addTo(map)
        .bindPopup('Localização selecionada');
      
      markerRef.current = marker;

      // Update coordinates when marker is dragged
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });
    }

    // Handle map click to add/update marker
    map.on('click', (e) => {
      const { lat, lng } = e.latlng;

      // Remove existing marker if any
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
      }

      // Add new marker at clicked location
      const marker = L.marker([lat, lng], { icon: markerIcon, draggable: true })
        .addTo(map)
        .bindPopup('Localização selecionada')
        .openPopup();

      markerRef.current = marker;

      // Update coordinates
      onLocationSelect(lat, lng);

      // Update coordinates when marker is dragged
      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markerRef.current = null;
    };
  }, []); // Only run once on mount

  // Update marker position when lat/lng change externally
  useEffect(() => {
    if (!mapRef.current) return;

    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      // Center map on new location with smooth animation
      // Use zoom 13 for cities (broader view), 15 for specific addresses
      const zoom = 13;
      mapRef.current.setView([lat, lng], zoom, { animate: true, duration: 0.5 });

      if (markerRef.current) {
        // Update existing marker position
        markerRef.current.setLatLng([lat, lng]);
        markerRef.current.openPopup();
      } else {
        // Create marker if it doesn't exist
        const createPinIcon = () => {
          return L.divIcon({
            className: 'custom-marker',
            html: `
              <div style="position: relative; cursor: pointer;">
                <svg width="32" height="40" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 0C10.477 0 6 4.477 6 10C6 17 16 30 16 30C16 30 26 17 26 10C26 4.477 21.523 0 16 0Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
                  <circle cx="16" cy="10" r="4" fill="white"/>
                </svg>
              </div>
            `,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40]
          });
        };
        
        const markerIcon = createPinIcon();

        const marker = L.marker([lat, lng], { icon: markerIcon, draggable: true })
          .addTo(mapRef.current)
          .bindPopup('Localização selecionada')
          .openPopup();

        markerRef.current = marker;

        marker.on('dragend', (e) => {
          const position = e.target.getLatLng();
          onLocationSelect(position.lat, position.lng);
        });
      }
    }
  }, [lat, lng, onLocationSelect]);

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300 relative" style={{ height }}>
      <div ref={mapContainerRef} className="w-full h-full" />
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
      `}</style>
    </div>
  );
}
