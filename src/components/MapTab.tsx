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
  savedAttractionsData: Attraction[];
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
}

export default function MapTab({
  activeCity,
  itinerary,
  attractions,
  savedAttractionsData,
  setSelectedAttraction,
  setCurrentImageIndex
}: MapTabProps) {
  const center = [51.63, -0.69];
  const plannedAttractions = Object.values(itinerary).flat();
  const plannedIds = plannedAttractions.map(a => a.id);

  // Combine saved attractions and planned attractions, remove duplicates by id
  const allAttractionsMap = new Map<string, Attraction>();
  savedAttractionsData.forEach(a => allAttractionsMap.set(a.id, a));
  plannedAttractions.forEach(a => allAttractionsMap.set(a.id, a));

  const mapAttractions = Array.from(allAttractionsMap.values());

  return (
    <div className="h-full w-full relative bg-gray-50 dark:bg-slate-900 isolate z-0">

      <div className="absolute top-4 left-4 right-4 z-[500] flex items-center justify-between pointer-events-none">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white drop-shadow-md">Kaartoverzicht</h1>
      </div>

      {/* Floating Legend */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-[500] bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 pointer-events-auto flex gap-4 text-xs font-medium">
        <div className="flex items-center gap-2">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png" alt="Blue pin" className="h-5" />
          <span className="text-slate-700 dark:text-slate-300">Opgeslagen</span>
        </div>
        <div className="flex items-center gap-2">
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" alt="Green pin" className="h-5" />
          <span className="text-slate-700 dark:text-slate-300">In planning</span>
        </div>
      </div>


      <MapContainer center={center as any} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        {mapAttractions.map((attraction) => {
          const isPlanned = plannedIds.includes(attraction.id);
          return (
            <Marker
              key={attraction.id}
              position={[attraction.lat, attraction.lng]}
              icon={isPlanned ? plannedIcon : normalIcon}
            >
              <Popup className="custom-popup">
                <div className="text-center">
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{attraction.name}</h3>
                  <button
                    onClick={() => {
                      setSelectedAttraction(attraction);
                      setCurrentImageIndex(0);
                    }}
                    className="text-blue-600 dark:text-blue-400 underline text-xs font-medium"
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
