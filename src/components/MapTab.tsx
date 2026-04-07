import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Attraction } from '../data';

// Fix leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const normalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const plannedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MapTabProps {
  activeCity: 'Londen' | 'Oxford';
  itinerary: Record<string, Attraction[]>;
  attractions: Attraction[];
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
}

export default function MapTab({
  activeCity,
  itinerary,
  attractions,
  setSelectedAttraction,
  setCurrentImageIndex
}: MapTabProps) {
  const center = activeCity === 'Londen' ? [51.5074, -0.1278] : [51.7520, -1.2577];
  const plannedIds = Object.values(itinerary).flat().map(a => a.id);
  const cityAttractions = attractions.filter(a => a.city === activeCity);

  return (
    <div className="h-full w-full relative bg-slate-900 isolate z-0">
      <div className="absolute top-4 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">
        <h1 className="text-2xl font-bold text-white drop-shadow-md">Kaartoverzicht</h1>
      </div>

      <MapContainer center={center as any} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {cityAttractions.map((attraction) => {
          const isPlanned = plannedIds.includes(attraction.id);
          return (
            <Marker
              key={attraction.id}
              position={[attraction.lat, attraction.lng]}
              icon={isPlanned ? plannedIcon : normalIcon}
            >
              <Popup className="custom-popup">
                <div className="text-center">
                  <h3 className="font-bold text-slate-900 text-sm mb-1">{attraction.name}</h3>
                  <button
                    onClick={() => {
                      setSelectedAttraction(attraction);
                      setCurrentImageIndex(0);
                    }}
                    className="text-blue-600 underline text-xs font-medium"
                  >
                    Bekijk details
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
