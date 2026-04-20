import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Loader2, Heart, Clock, Navigation, Sun, Moon, Ticket } from 'lucide-react';
import { Attraction } from '../data';
import { pb } from '../lib/pocketbase';

interface DiscoverTabProps {
  APP_VERSION: string;
  activeCity: 'Londen' | 'Oxford';
  setActiveCity: (city: 'Londen' | 'Oxford') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: any[]) => void;
  handleSearch: (e: React.FormEvent) => Promise<void>;
  displayedAttractions: Attraction[];
  isSearching: boolean;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  setCurrentImageIndex: (index: number) => void;
  savedAttractions: string[];
  toggleSavedAttraction: (attraction: Attraction) => void;
  attractionsCache: Record<string, any>;
  imageDictionary: Record<string, string>;
  isDarkMode: boolean;
  setIsDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

export default function DiscoverTab({
  APP_VERSION,
  activeCity,
  setActiveCity,
  searchQuery,
  setSearchQuery,
  setSearchResults,
  handleSearch,
  displayedAttractions,
  isSearching,
  setSelectedAttraction,
  setCurrentImageIndex,
  savedAttractions,
  toggleSavedAttraction,
  attractionsCache,
  imageDictionary,
  isDarkMode,
  setIsDarkMode
}: DiscoverTabProps) {
  const [recentSearches, setRecentSearches] = useState<Attraction[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchRecent = async () => {
      try {
        const records = await pb.collection('search_cache').getList(1, 10, {
          sort: '-created',
          filter: `query ~ "${activeCity}"`
        });

        let extracted: Attraction[] = [];
        for (const record of records.items) {
          if (record.results && Array.isArray(record.results)) {
            for (const r of record.results) {
              if (extracted.length >= 5) break;

              const id = `search-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
              if (!extracted.some(a => a.id === id)) {
                extracted.push({
                  id,
                  name: r.name,
                  shortDescription: r.shortDescription || r.address || '',
                  fullDescription: r.shortDescription || 'Geen uitgebreide beschrijving beschikbaar.',
                  imageUrl: '',
                  location: r.address || activeCity,
                  lat: r.lat || 0,
                  lng: r.lng || 0,
                  ticketRequired: !!r.ticketRequired,
                  timeSlotRequired: false,
                  openingHours: 'Check website voor actuele tijden',
                  highlights: [],
                  familyTip: 'Leuk voor de hele familie!',
                  city: activeCity,
                  bookingUrl: r.bookingUrl
                });
              }
            }
          }
          if (extracted.length >= 5) break;
        }

        if (isMounted) {
          setRecentSearches(extracted);
        }
      } catch (e) {
        console.error("Failed to load recent searches", e);
      }
    };

    if (!isSearching && searchQuery === '') {
      fetchRecent();
    }

    return () => {
      isMounted = false;
    };
  }, [activeCity, isSearching, searchQuery]);

  const finalAttractions = useMemo(() => {
    if (isSearching || searchQuery !== '') {
      return displayedAttractions;
    }

    const combined = [...recentSearches];
    for (const attr of displayedAttractions) {
      if (!combined.some(a => a.id === attr.id)) {
        combined.push(attr);
      }
    }
    return combined;
  }, [displayedAttractions, recentSearches, isSearching, searchQuery]);

  return (
    <div className="p-4 pb-24">
      <div className="flex justify-between items-center mb-6 pt-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Londen & Oxford Trip</h1>
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{APP_VERSION}</span>
        </div>
        <button
          onClick={() => setIsDarkMode(prev => !prev)}
          className="p-3 bg-white dark:bg-slate-800 rounded-full border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:text-white transition-colors shadow-md"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex bg-white dark:bg-slate-800 p-1 rounded-2xl mb-6">
        <button
          onClick={() => { setActiveCity('Londen'); setSearchQuery(''); setSearchResults([]); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeCity === 'Londen' ? 'bg-blue-600 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
        >
          Londen
        </button>
        <button
          onClick={() => { setActiveCity('Oxford'); setSearchQuery(''); setSearchResults([]); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeCity === 'Oxford' ? 'bg-blue-600 text-slate-900 dark:text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}
        >
          Oxford
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <input
          type="text"
          placeholder={`Zoek in ${activeCity}...`}
          className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 dark:placeholder-slate-400 shadow-sm border border-gray-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-slate-500 dark:text-slate-400 w-5 h-5" />
        {isSearching && <Loader2 className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 w-5 h-5 animate-spin" />}
        <button type="submit" className="sr-only">Zoek</button>
      </form>



      <div className="grid gap-4">
        {finalAttractions.map((attraction) => {
          let displayImage = imageDictionary[attraction.id] || attraction.imageUrl;

          return (
            <div
              key={attraction.id}
              className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-gray-200 dark:border-slate-700 cursor-pointer hover:border-gray-300 dark:border-slate-600 transition-colors"
              onClick={() => {
                setSelectedAttraction(attraction);
                setCurrentImageIndex(0);
              }}
            >
              <div className="h-56 overflow-hidden relative">
                {displayImage ? (
                  <img src={displayImage} alt={attraction.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-100 dark:bg-slate-700 animate-pulse"></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              <div
                className="absolute top-4 right-4 bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md p-2 rounded-full border border-white/10 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSavedAttraction(attraction);
                }}
              >
                <Heart className={`w-5 h-5 ${savedAttractions.includes(attraction.id) ? 'fill-red-500 text-red-500' : 'text-slate-600 dark:text-slate-300'}`} />
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 drop-shadow-md">{attraction.name}</h3>
                <div className="flex items-center text-xs text-slate-600 dark:text-slate-300 space-x-3">
                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {attraction.openingHours}</span>
                  {attraction.ticketRequired && <span className="flex items-center text-blue-400"><Ticket className="w-3 h-3 mr-1" /> Tickets</span>}
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{attraction.shortDescription}</p>
            </div>
          </div>
          );
        })}
        {isSearching && <p className="text-center text-slate-500 dark:text-slate-400 py-4">Zoeken via Google Maps...</p>}
      </div>
    </div>
  );
}
