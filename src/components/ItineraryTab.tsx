import React from 'react';
import { Calendar, Plus, MapPin } from 'lucide-react';
import { Attraction } from '../data';

interface ItineraryTabProps {
  itinerary: Record<string, Attraction[]>;
  setActiveTab: (tab: 'discover' | 'map' | 'itinerary' | 'saved') => void;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
}

export default function ItineraryTab({
  itinerary,
  setActiveTab,
  setSelectedAttraction,
  setCurrentImageIndex
}: ItineraryTabProps) {
  return (
    <div className="p-4 pb-24 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6 pt-4">Jullie Planning</h1>

      {Object.entries(itinerary).map(([day, items]) => (
        <div key={day} className="mb-8">
          <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> {day}
          </h2>

          {items.length === 0 ? (
            <div className="bg-slate-800/50 rounded-3xl p-8 text-center border border-dashed border-slate-700">
              <p className="text-slate-400 text-sm mb-4">Nog geen activiteiten gepland.</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center justify-center bg-slate-800 text-blue-400 font-bold text-sm px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" /> Voeg iets toe
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={`${item.id}-${idx}`} className="bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-700 flex items-center cursor-pointer hover:border-slate-600 transition-colors" onClick={() => { setSelectedAttraction(item); setCurrentImageIndex(0); }}>
                  <img src={item.imageUrls?.[0] || item.imageUrl} alt={item.name} className="w-20 h-20 rounded-2xl object-cover mr-4" />
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-lg">{item.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center mt-2">
                      <MapPin className="w-3 h-3 mr-1" /> {item.location.split(',')[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
