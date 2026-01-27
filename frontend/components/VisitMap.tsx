'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface VisitMapProps {
  visitLat: number;
  visitLng: number;
  storeLat?: number | null;
  storeLng?: number | null;
  storeRadius?: number | null;
}

export default function VisitMap({ visitLat, visitLng, storeLat, storeLng, storeRadius }: VisitMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([visitLat, visitLng], 15);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Add visit location marker (red)
    const visitIcon = L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    L.marker([visitLat, visitLng], { icon: visitIcon })
      .addTo(map)
      .bindPopup('Localização da Visita');

    // Add store location marker and radius circle (blue) if available
    if (storeLat && storeLng) {
      const storeIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #3b82f6; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      L.marker([storeLat, storeLng], { icon: storeIcon })
        .addTo(map)
        .bindPopup('Localização da Loja');

      // Add radius circle if radius is provided
      if (storeRadius) {
        L.circle([storeLat, storeLng], {
          radius: storeRadius,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.1,
          weight: 2
        }).addTo(map);
      }
    }

    // Fit map to show both markers
    if (storeLat && storeLng) {
      const bounds = L.latLngBounds(
        [[visitLat, visitLng], [storeLat, storeLng]]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [visitLat, visitLng, storeLat, storeLng, storeRadius]);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden border border-gray-300 relative">
      <div ref={mapContainerRef} className="w-full h-full" />
      <style jsx global>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
}
