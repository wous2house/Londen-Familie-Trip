import React, { useState } from 'react';
import { Calendar, Plus, MapPin, Trash2, ArrowRightLeft } from 'lucide-react';
import { Attraction } from '../data';

interface ItineraryTabProps {
  itinerary: Record<string, Attraction[]>;
  setActiveTab: (tab: 'discover' | 'map' | 'itinerary' | 'saved') => void;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
  imageDictionary: Record<string, string>;
  removeFromItinerary: (day: string, attraction: Attraction) => void;
  moveItineraryItem: (fromDay: string, toDay: string, attraction: Attraction) => void;
}

export default function ItineraryTab({
  itinerary,
  setActiveTab,
  setSelectedAttraction,
  setCurrentImageIndex,
  imageDictionary,
  removeFromItinerary,
  moveItineraryItem
}: ItineraryTabProps) {
  const [moveModalItem, setMoveModalItem] = useState<{ attraction: Attraction, fromDay: string } | null>(null);

  return (
    <div className="p-4 pb-24 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 pt-4">Jullie Planning</h1>

      {moveModalItem && (
        <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Verplaats naar dag</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(itinerary).map(d => (
                <button
                  key={d}
                  onClick={() => {
                    moveItineraryItem(moveModalItem.fromDay, d, moveModalItem.attraction);
                    setMoveModalItem(null);
                  }}
                  className={`py-3 rounded-xl font-medium transition-colors border ${d === moveModalItem.fromDay ? 'bg-blue-600 text-slate-900 dark:text-white border-blue-500 cursor-not-allowed opacity-50' : 'bg-gray-100 dark:bg-slate-700 hover:bg-blue-600 text-slate-900 dark:text-white border-gray-300 dark:border-slate-600 hover:border-blue-500'}`}
                  disabled={d === moveModalItem.fromDay}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={() => setMoveModalItem(null)}
              className="mt-6 w-full bg-gray-50 dark:bg-slate-900 hover:bg-gray-200 dark:bg-slate-950 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold transition-colors border border-gray-200 dark:border-slate-800"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {Object.entries(itinerary).map(([day, items]) => (
        <div key={day} className="mb-8">
          <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> {day}
          </h2>

          {items.length === 0 ? (
            <div className="bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700 rounded-3xl p-8 text-center border border-dashed">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">Nog geen activiteiten gepland.</p>
              <button
                onClick={() => setActiveTab('discover')}
                className="inline-flex items-center justify-center bg-white dark:bg-slate-800 text-blue-400 font-bold text-sm px-6 py-3 rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-100 dark:bg-slate-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" /> Voeg iets toe
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, idx) => {
                const displayImage = imageDictionary[item.id] || item.imageUrls?.[0] || item.imageUrl;

                return (
                  <div key={`${item.id}-${idx}`} className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-md border border-slate-200 dark:border-slate-700 flex items-center hover:border-slate-300 dark:border-slate-600 transition-colors">

                    <div className="shrink-0 cursor-pointer" onClick={() => { setSelectedAttraction(item); setCurrentImageIndex(0); }}>
                      {displayImage ? (
                        <img src={displayImage} alt={item.name} className="w-20 h-20 rounded-2xl object-cover mr-4" />
                      ) : (
                        <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-slate-700 animate-pulse mr-4"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setSelectedAttraction(item); setCurrentImageIndex(0); }}>
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{item.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-2 truncate">
                        <MapPin className="w-3 h-3 mr-1 shrink-0" /> <span className="truncate">{item.location?.split(',')[0] || 'Unknown location'}</span>
                      </p>
                    </div>
                    <div className="flex flex-col space-y-2 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMoveModalItem({ attraction: item, fromDay: day }); }}
                        className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-blue-600 rounded-full transition-colors text-slate-900 dark:text-white"
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFromItinerary(day, item); }}
                        className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-red-600 rounded-full transition-colors text-slate-900 dark:text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
