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
    const defaultLat = lat || -23.5505;
    const defaultLng = lng || -46.6333;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Create marker icon
    const markerIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

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
    if (mapRef.current && markerRef.current && lat && lng) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng], mapRef.current.getZoom());
    } else if (mapRef.current && lat && lng && !markerRef.current) {
      // Create marker if it doesn't exist
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #3b82f6; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.4); cursor: pointer;"></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: markerIcon, draggable: true })
        .addTo(mapRef.current)
        .bindPopup('Localização selecionada');

      markerRef.current = marker;

      marker.on('dragend', (e) => {
        const position = e.target.getLatLng();
        onLocationSelect(position.lat, position.lng);
      });
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
