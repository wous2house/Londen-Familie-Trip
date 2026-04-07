import React from 'react';
import { Search, Heart } from 'lucide-react';
import { Attraction } from '../data';

interface SavedTabProps {
  attractions: Attraction[];
  savedAttractions: string[];
  setActiveTab: (tab: 'discover' | 'map' | 'itinerary' | 'saved') => void;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
  setSavedAttractions: React.Dispatch<React.SetStateAction<string[]>>;
}

export default function SavedTab({
  attractions,
  savedAttractions,
  setActiveTab,
  setSelectedAttraction,
  setCurrentImageIndex,
  setSavedAttractions
}: SavedTabProps) {
  const saved = attractions.filter(a => savedAttractions.includes(a.id));

  return (
    <div className="p-4 pb-24 h-full overflow-y-auto">
      <h1 className="text-2xl font-bold text-white mb-6 pt-4">Opgeslagen</h1>

      {saved.length === 0 ? (
        <div className="bg-slate-800/50 rounded-3xl p-8 text-center border border-dashed border-slate-700">
          <p className="text-slate-400 text-sm mb-4">Je hebt nog geen bezienswaardigheden opgeslagen.</p>
          <button
            onClick={() => setActiveTab('discover')}
            className="inline-flex items-center justify-center bg-slate-800 text-blue-400 font-bold text-sm px-6 py-3 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            <Search className="w-4 h-4 mr-2" /> Ontdekken
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {saved.map((attraction) => (
            <div
              key={attraction.id}
              className="bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
              onClick={() => {
                setSelectedAttraction(attraction);
                setCurrentImageIndex(0);
              }}
            >
              <div className="h-40 overflow-hidden relative">
                <img src={attraction.imageUrl} alt={attraction.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                <div
                  className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur-md p-2 rounded-full border border-white/10 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSavedAttractions(prev => prev.filter(id => id !== attraction.id));
                  }}
                >
                  <Heart className="w-5 h-5 fill-red-500 text-red-500" />
                </div>
                <div className="absolute bottom-4 left-4 right-4">
                  <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">{attraction.name}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
