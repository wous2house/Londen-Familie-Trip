import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Compass, MessageCircle, X, Search, Plus, Navigation, Clock, Ticket, Info, Star, Bookmark, Heart, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import { attractions, Attraction } from './data';
import { chatWithAssistant, searchAttractions, getRouteSteps } from './gemini';
import Markdown from 'react-markdown';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

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

type Tab = 'discover' | 'map' | 'itinerary' | 'saved';
type City = 'Londen' | 'Oxford';

const APP_VERSION = 'v1.5.0';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [activeCity, setActiveCity] = useState<City>('Londen');
  const [selectedAttraction, setSelectedAttraction] = useState<Attraction | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [dynamicImages, setDynamicImages] = useState<string[]>([]);
  const [routeSteps, setRouteSteps] = useState<string[] | null>(null);
  const [isFetchingRoute, setIsFetchingRoute] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const [savedAttractions, setSavedAttractions] = useState<string[]>([]);
  const [showDaySelector, setShowDaySelector] = useState<Attraction | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{summary?: string, rating?: number, reviews?: number} | null>(null);
  
  // Itinerary state: 8 days
  const initialItinerary = Array.from({ length: 8 }, (_, i) => `Dag ${i + 1}`).reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as Record<string, Attraction[]>);
  
  const [itinerary, setItinerary] = useState<Record<string, Attraction[]>>(initialItinerary);

  const [chatHistory, setChatHistory] = useState<{role: 'user'|'model', parts: {text: string}[]}[]>([
    { role: 'model', parts: [{ text: 'Hallo! Ik ben je reisassistent. Hoe kan ik je familie vandaag helpen?' }] }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  useEffect(() => {
    if (selectedAttraction) {
      setDynamicImages([]);
      setCurrentImageIndex(0);
      setRouteSteps(null);
      setIsFetchingRoute(false);
      setPlaceDetails(null);
      
      const fetchImages = async () => {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
        
        if (apiKey) {
          try {
            const query = `${selectedAttraction.name} ${selectedAttraction.city}`;
            const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.photos,places.editorialSummary,places.rating,places.userRatingCount'
              },
              body: JSON.stringify({ textQuery: query })
            });
            const data = await response.json();
            
            if (data.places && data.places.length > 0) {
              const place = data.places[0];
              
              if (place.photos) {
                const photos = place.photos.slice(0, 5);
                const urls = photos.map((photo: any) => 
                  `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`
                );
                setDynamicImages(urls);
              }
              
              setPlaceDetails({
                summary: place.editorialSummary?.text,
                rating: place.rating,
                reviews: place.userRatingCount
              });
              
              return; // Exit if Google Places API succeeds
            }
          } catch (e) {
            console.error("Failed to fetch Google Places data", e);
          }
        }

        // Fallback to Wikimedia Commons
        try {
          const query = `${selectedAttraction.name} ${selectedAttraction.city}`;
          const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&format=json&origin=*`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.query && data.query.pages) {
            const urls = Object.values(data.query.pages)
              .map((page: any) => page.imageinfo?.[0]?.url)
              .filter((url: string) => url && !url.toLowerCase().endsWith('.svg') && !url.toLowerCase().endsWith('.pdf'));
            
            if (urls.length > 0) {
              setDynamicImages(urls as string[]);
            }
          }
        } catch (e) {
          console.error("Failed to fetch real images", e);
        }
      };
      
      fetchImages();
    }
  }, [selectedAttraction]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    // Local search first
    const local = attractions.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) && a.city === activeCity);
    if (local.length > 0) {
      setSearchResults(local);
      setIsSearching(false);
    } else {
      // Fallback to Gemini Maps search
      const results = await searchAttractions(`${searchQuery} in ${activeCity}`);
      setSearchResults(results.map((r: any, i: number) => ({
        id: `search-${i}`,
        name: r.name,
        shortDescription: r.shortDescription || r.address,
        fullDescription: r.shortDescription || 'Geen uitgebreide beschrijving beschikbaar.',
        imageUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1000', // placeholder
        location: r.address,
        lat: r.lat,
        lng: r.lng,
        ticketRequired: r.ticketRequired || false,
        timeSlotRequired: false,
        openingHours: 'Onbekend',
        highlights: [],
        familyTip: '',
        city: activeCity,
        bookingUrl: r.bookingUrl
      })));
      setIsSearching(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const newMessage = chatInput;
    setChatInput('');
    
    const newHistory = [...chatHistory, { role: 'user' as const, parts: [{ text: newMessage }] }];
    setChatHistory(newHistory);
    setIsChatLoading(true);

    const responseText = await chatWithAssistant(newHistory, newMessage);
    
    setChatHistory([...newHistory, { role: 'model' as const, parts: [{ text: responseText || 'Er ging iets mis.' }] }]);
    setIsChatLoading(false);
  };

  const addToItinerary = (day: string, attraction: Attraction) => {
    setItinerary(prev => ({
      ...prev,
      [day]: [...prev[day], attraction]
    }));
    alert(`${attraction.name} is toegevoegd aan ${day}!`);
  };

  const openRoute = (attraction: Attraction) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          window.open(`https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${attraction.lat},${attraction.lng}`, '_blank');
        },
        () => {
          // Fallback if location denied
          window.open(`https://www.google.com/maps/search/?api=1&query=${attraction.lat},${attraction.lng}`, '_blank');
        }
      );
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${attraction.lat},${attraction.lng}`, '_blank');
    }
  };

  const fetchRouteSteps = (attraction: Attraction) => {
    setIsFetchingRoute(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const steps = await getRouteSteps(attraction.name, attraction.city, position.coords.latitude, position.coords.longitude);
          setRouteSteps(steps);
          setIsFetchingRoute(false);
        },
        async () => {
          const steps = await getRouteSteps(attraction.name, attraction.city);
          setRouteSteps(steps);
          setIsFetchingRoute(false);
        }
      );
    } else {
      getRouteSteps(attraction.name, attraction.city).then(steps => {
        setRouteSteps(steps);
        setIsFetchingRoute(false);
      });
    }
  };

  const displayedAttractions = searchQuery && searchResults.length > 0 
    ? searchResults 
    : attractions.filter(a => a.city === activeCity);

  const renderDiscover = () => (
    <div className="p-4 pb-24">
      <div className="flex flex-col items-center justify-center mb-6 pt-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Londen & Oxford Trip</h1>
        <span className="text-xs font-medium text-slate-400 mt-1">{APP_VERSION}</span>
      </div>

      <div className="flex bg-slate-800 p-1 rounded-2xl mb-6">
        <button 
          onClick={() => { setActiveCity('Londen'); setSearchQuery(''); setSearchResults([]); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeCity === 'Londen' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Londen
        </button>
        <button 
          onClick={() => { setActiveCity('Oxford'); setSearchQuery(''); setSearchResults([]); }}
          className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${activeCity === 'Oxford' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
        >
          Oxford
        </button>
      </div>

      <form onSubmit={handleSearch} className="relative mb-8">
        <input
          type="text"
          placeholder={`Zoek in ${activeCity}...`}
          className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800 text-white placeholder-slate-400 shadow-sm border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="absolute left-4 top-4 text-slate-400 w-5 h-5" />
        <button type="submit" className="sr-only">Zoek</button>
      </form>

      <h2 className="text-xl font-bold text-white mb-4">Aanbevolen in {activeCity}</h2>
      
      <div className="grid gap-4">
        {displayedAttractions.map((attraction) => (
          <div 
            key={attraction.id} 
            className="bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-slate-700 cursor-pointer hover:border-slate-600 transition-colors"
            onClick={() => {
              setSelectedAttraction(attraction);
              setCurrentImageIndex(0);
            }}
          >
            <div className="h-56 overflow-hidden relative">
              <img src={attraction.imageUrl} alt={attraction.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
              <div 
                className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur-md p-2 rounded-full border border-white/10 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSavedAttractions(prev => 
                    prev.includes(attraction.id) 
                      ? prev.filter(id => id !== attraction.id)
                      : [...prev, attraction.id]
                  );
                }}
              >
                <Heart className={`w-5 h-5 ${savedAttractions.includes(attraction.id) ? 'fill-red-500 text-red-500' : 'text-slate-300'}`} />
              </div>
              <div className="absolute bottom-4 left-4 right-4">
                <h3 className="text-xl font-bold text-white mb-1 drop-shadow-md">{attraction.name}</h3>
                <div className="flex items-center text-xs text-slate-300 space-x-3">
                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {attraction.openingHours}</span>
                  {attraction.ticketRequired && <span className="flex items-center text-blue-400"><Ticket className="w-3 h-3 mr-1" /> Tickets</span>}
                </div>
              </div>
            </div>
            <div className="p-5">
              <p className="text-slate-400 text-sm leading-relaxed">{attraction.shortDescription}</p>
            </div>
          </div>
        ))}
        {isSearching && <p className="text-center text-slate-400 py-4">Zoeken via Google Maps...</p>}
      </div>
    </div>
  );

  const renderMap = () => {
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
  };

  const renderSaved = () => {
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
  };

  const renderItinerary = () => (
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

  const renderAttractionDetail = () => {
    if (!selectedAttraction) return null;
    const a = selectedAttraction;
    
    // Gebruik de dynamisch ingeladen Wikimedia beelden, of val terug op de placeholders
    const images = dynamicImages.length > 0 ? dynamicImages : (a.imageUrls && a.imageUrls.length > 0 ? a.imageUrls : [a.imageUrl]);

    return (
      <div className="fixed inset-0 bg-slate-900 z-[1000] overflow-y-auto pb-24">
        <div className="relative h-80">
          <img src={images[currentImageIndex]} alt={a.name} className="w-full h-full object-cover transition-opacity duration-300" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
          
          {images.length > 1 && (
            <>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur-sm transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-20 left-0 right-0 flex justify-center space-x-2">
                {images.map((_, idx) => (
                  <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`} />
                ))}
              </div>
            </>
          )}
          
          <button 
            onClick={() => setSelectedAttraction(null)}
            className="absolute top-6 left-4 bg-slate-900/60 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/10"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <div className="absolute -bottom-8 left-4 right-4 bg-slate-800 rounded-3xl p-5 shadow-xl border border-slate-700 flex justify-between items-center">
            <div>
              <div className="flex items-center text-sm font-medium text-slate-400 mb-1">
                <Clock className="w-4 h-4 mr-1 text-blue-400" /> Openingstijden
              </div>
              <div className="font-bold text-white text-lg">{a.openingHours}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 mb-1">Status</div>
              <div className="text-sm font-bold text-green-400 flex items-center justify-end">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-1.5 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span> Nu Open
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 pt-16 pb-6">
          <div className="flex items-center space-x-2 mb-2">
            <span className="bg-blue-900/50 text-blue-300 text-xs font-bold px-3 py-1 rounded-full border border-blue-800/50">{a.city}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">{a.name}</h1>
          
          {/* Rating from Google Maps */}
          {placeDetails?.rating && (
            <div className="flex items-center text-yellow-500 mb-2">
              <Star className="w-5 h-5 fill-current" />
              <span className="ml-1 font-bold text-white">{placeDetails.rating}</span>
              <span className="ml-1 text-slate-400 text-sm">({placeDetails.reviews} reviews) - Google Maps</span>
            </div>
          )}

          <p className="text-slate-400 flex items-start mb-8 text-sm">
            <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0 text-slate-500" />
            {a.location}
          </p>

          {/* Editorial Summary from Google Maps */}
          {placeDetails?.summary && (
            <div className="bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-700 mb-8">
              <h3 className="font-bold text-white text-xl mb-4 flex items-center">
                <Info className="w-5 h-5 text-blue-400 mr-2" /> Google Maps Info
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">{placeDetails.summary}</p>
            </div>
          )}

          {a.ticketRequired && (
            <div className="bg-blue-900/20 rounded-3xl p-6 mb-8 border border-blue-800/30">
              <div className="flex items-center mb-3">
                <Ticket className="w-6 h-6 text-blue-400 mr-3" />
                <h3 className="font-bold text-blue-100 text-lg">Tickets & Tijdsloten</h3>
              </div>
              <p className="text-blue-200/70 text-sm mb-5 leading-relaxed">
                Vergeet niet om je tickets vooraf online te reserveren! {a.timeSlotRequired && 'Een tijdslot is verplicht.'}
              </p>
              {a.bookingUrl ? (
                <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-center bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors shadow-lg shadow-blue-900/20">
                  Boek via Officiële Website
                </a>
              ) : (
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors shadow-lg shadow-blue-900/20">
                  Boek een Tijdslot
                </button>
              )}
            </div>
          )}

          <div className="bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-700 mb-8">
            <h3 className="font-bold text-white text-xl mb-4">Over deze locatie</h3>
            <p className="text-slate-300 text-sm leading-relaxed">{a.fullDescription}</p>
          </div>

          <div className="bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-700 mb-8">
            <h3 className="font-bold text-white text-xl mb-4 flex items-center">
              <Map className="w-5 h-5 text-blue-400 mr-2" /> Locatie op de kaart
            </h3>
            <div className="w-full h-64 mt-4 rounded-2xl overflow-hidden border border-slate-700">
              <iframe 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                loading="lazy" 
                allowFullScreen 
                referrerPolicy="no-referrer-when-downgrade" 
                src={`https://maps.google.com/maps?q=${a.lat},${a.lng}&z=15&output=embed`}
              ></iframe>
            </div>
          </div>

          <div className="bg-slate-800 rounded-3xl p-6 shadow-lg border border-slate-700 mb-8">
            <h3 className="font-bold text-white text-xl mb-4 flex items-center">
              <Navigation className="w-5 h-5 text-blue-400 mr-2" /> Routebeschrijving
            </h3>
            
            {!routeSteps && !isFetchingRoute && (
              <button 
                onClick={() => fetchRouteSteps(a)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors"
              >
                Haal stapsgewijze route op
              </button>
            )}
            
            {isFetchingRoute && (
              <div className="flex items-center justify-center py-4 text-slate-400">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                Route berekenen...
              </div>
            )}
            
            {routeSteps && (
              <div className="space-y-3 mt-4">
                {routeSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start">
                    <div className="bg-blue-900/50 text-blue-400 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold mr-3 mt-0.5">
                      {idx + 1}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {a.highlights && a.highlights.length > 0 && (
            <div className="mb-8">
              <h3 className="font-bold text-white text-xl mb-5 flex items-center">
                <Star className="w-5 h-5 text-yellow-500 mr-2" /> Hoogtepunten
              </h3>
              <div className="space-y-4">
                {a.highlights.map((h, i) => (
                  <div key={i} className="bg-slate-800 rounded-3xl p-5 shadow-lg border border-slate-700">
                    <h4 className="font-bold text-white mb-2 text-lg">{h.title}</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">{h.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {a.familyTip && (
            <div className="bg-green-900/20 rounded-3xl p-6 mb-8 border border-green-800/30">
              <div className="flex items-center mb-3">
                <Info className="w-6 h-6 text-green-400 mr-3" />
                <h3 className="font-bold text-green-100 text-lg">Familietip</h3>
              </div>
              <p className="text-green-200/80 text-sm leading-relaxed">{a.familyTip}</p>
            </div>
          )}

          <div className="flex space-x-4 mt-10">
            <button 
              onClick={() => setShowDaySelector(a)}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-bold flex items-center justify-center shadow-lg shadow-blue-900/20 transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" /> Toevoegen
            </button>
            <button 
              onClick={() => openRoute(a)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center shadow-lg transition-colors border border-slate-600"
            >
              <Navigation className="w-5 h-5 mr-2" /> Route
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderChat = () => (
    <div className={`fixed inset-0 bg-slate-900 z-[1000] flex flex-col transition-transform duration-300 ${isChatOpen ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-slate-800 border-b border-slate-700 text-white p-5 flex items-center justify-between shadow-md pt-safe">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Reisassistent</h2>
            <p className="text-xs text-slate-400">Altijd online</p>
          </div>
        </div>
        <button onClick={() => setIsChatOpen(false)} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-900">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm shadow-lg shadow-blue-900/20' : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm shadow-md'}`}>
              {msg.role === 'model' ? (
                <div className="markdown-body text-sm prose prose-invert prose-sm max-w-none">
                  <Markdown>{msg.parts[0].text}</Markdown>
                </div>
              ) : (
                <p className="text-sm">{msg.parts[0].text}</p>
              )}
            </div>
          </div>
        ))}
        {isChatLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-3xl rounded-tl-sm shadow-md flex space-x-2 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-slate-800 border-t border-slate-700 pb-safe">
        <div className="flex items-center bg-slate-900 rounded-full p-1.5 pr-2 border border-slate-700 shadow-inner">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Vraag iets over Londen of Oxford..."
            className="flex-1 bg-transparent px-4 py-3 text-white placeholder-slate-500 focus:outline-none text-sm"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatLoading}
            className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full disabled:opacity-50 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Navigation className="w-5 h-5 transform rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-slate-900 flex flex-col font-sans overflow-hidden text-slate-200 selection:bg-blue-500/30">
      
      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'discover' && renderDiscover()}
        {activeTab === 'map' && renderMap()}
        {activeTab === 'itinerary' && renderItinerary()}
        {activeTab === 'saved' && renderSaved()}
      </div>

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-24 right-5 bg-blue-600 text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] shadow-blue-900/50 hover:bg-blue-500 transition-all z-[900] flex items-center justify-center border border-blue-500/50"
        >
          <MessageCircle className="w-7 h-7" />
        </button>
      )}

      {/* Overlays */}
      {renderAttractionDetail()}
      {renderChat()}

      {/* Day Selector Modal */}
      {showDaySelector && (
        <div className="fixed inset-0 bg-black/60 z-[1050] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-3xl p-6 w-full max-w-sm border border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Kies een dag</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(itinerary).map(day => (
                <button
                  key={day}
                  onClick={() => {
                    addToItinerary(day, showDaySelector);
                    setShowDaySelector(null);
                  }}
                  className="bg-slate-700 hover:bg-blue-600 text-white py-3 rounded-xl font-medium transition-colors border border-slate-600 hover:border-blue-500"
                >
                  {day}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowDaySelector(null)}
              className="mt-6 w-full bg-slate-900 hover:bg-slate-950 text-slate-300 py-3 rounded-xl font-bold transition-colors border border-slate-800"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-slate-800/90 backdrop-blur-lg border-t border-slate-700 px-6 py-4 flex justify-between items-center z-[900] pb-safe">
        <button 
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'discover' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Compass className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Ontdek</span>
        </button>
        <button 
          onClick={() => setActiveTab('saved')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'saved' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Heart className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Opgeslagen</span>
        </button>
        <button 
          onClick={() => setActiveTab('map')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'map' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <MapPin className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Kaart</span>
        </button>
        <button 
          onClick={() => setActiveTab('itinerary')}
          className={`flex flex-col items-center transition-colors ${activeTab === 'itinerary' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-400'}`}
        >
          <Calendar className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Planning</span>
        </button>
      </div>
    </div>
  );
}
