import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, Compass, MessageCircle, X, Search, Plus, Navigation, Clock, Ticket, Info, Star, Bookmark, Heart, Map, ChevronLeft, ChevronRight } from 'lucide-react';
import { attractions, Attraction } from './data';
import { chatWithAssistant, searchAttractions, getRouteSteps } from './gemini';
import Markdown from 'react-markdown';
import { pb } from './lib/pocketbase';

import DiscoverTab from './components/DiscoverTab';
import MapTab from './components/MapTab';
import SavedTab from './components/SavedTab';
import ItineraryTab from './components/ItineraryTab';
import AttractionModal from './components/AttractionModal';

export type Tab = 'discover' | 'map' | 'itinerary' | 'saved';
export type City = 'Londen' | 'Oxford';

const APP_VERSION = 'v0.3.0';

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const savedRecords = await pb.collection('saved_attractions').getFullList();
        setSavedAttractions(savedRecords.map(r => r.attraction_id));

        const itineraryRecords = await pb.collection('itinerary_items').getFullList();

        setItinerary(prev => {
          const newItinerary = { ...prev };
          itineraryRecords.forEach(record => {
            const attraction = record.attraction_data || attractions.find(a => a.id === record.attraction_id);
            if (attraction && newItinerary[record.day]) {
              // Vermijd duplicaten
              if (!newItinerary[record.day].some(a => a.id === attraction.id)) {
                newItinerary[record.day].push(attraction);
              }
            }
          });
          return newItinerary;
        });
      } catch (err) {
        console.error("PocketBase connection failed on init:", err);
        showToast("Kon opgeslagen data niet ophalen. Offline modus actief.");
      }
    };

    fetchInitialData();

    // Set up real-time subscriptions
    pb.collection('saved_attractions').subscribe('*', (e) => {
      if (e.action === 'create' || e.action === 'update') {
        setSavedAttractions(prev => {
          if (!prev.includes(e.record.attraction_id)) {
            return [...prev, e.record.attraction_id];
          }
          return prev;
        });
      } else if (e.action === 'delete') {
        setSavedAttractions(prev => prev.filter(id => id !== e.record.attraction_id));
      }
    });

    pb.collection('itinerary_items').subscribe('*', async (e) => {
      // Bij een delete hebben we de volledige attraction data niet nodig, alleen het ID
      if (e.action === 'delete') {
        setItinerary(prev => {
          const newItinerary = { ...prev };
          Object.keys(newItinerary).forEach(day => {
            newItinerary[day] = newItinerary[day].filter(a => a.id !== e.record.attraction_id);
          });
          return newItinerary;
        });
        return;
      }

      // Voor create/update proberen we de data te halen
      let attraction = e.record.attraction_data || attractions.find(a => a.id === e.record.attraction_id);

      // Als we het nog steeds niet hebben, probeer het via expand (als PocketBase dat ondersteunt)
      if (!attraction && e.record.expand?.attraction_id) {
        attraction = e.record.expand.attraction_id;
      }

      if (!attraction) return; // Mislukt om de attractie op te halen

      if (e.action === 'create') {
        setItinerary(prev => {
          const newItinerary = { ...prev };
          if (newItinerary[e.record.day] && !newItinerary[e.record.day].some(a => a.id === attraction.id)) {
            newItinerary[e.record.day] = [...newItinerary[e.record.day], attraction];
          }
          return newItinerary;
        });
      } else if (e.action === 'update') {
        setItinerary(prev => {
          const newItinerary = { ...prev };
          // Remove from all days first
          Object.keys(newItinerary).forEach(day => {
            newItinerary[day] = newItinerary[day].filter(a => a.id !== attraction.id);
          });
          // Add to the new day
          if (newItinerary[e.record.day]) {
            newItinerary[e.record.day] = [...newItinerary[e.record.day], attraction];
          }
          return newItinerary;
        });
      }
    }, { expand: 'attraction_id' });

    return () => {
      pb.collection('saved_attractions').unsubscribe('*');
      pb.collection('itinerary_items').unsubscribe('*');
    };
  }, []);

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

  const toggleSavedAttraction = async (attraction: Attraction) => {
    const isSaved = savedAttractions.includes(attraction.id);

    // Optimistische UI update
    setSavedAttractions(prev =>
      isSaved ? prev.filter(id => id !== attraction.id) : [...prev, attraction.id]
    );

    try {
      if (isSaved) {
        // Find and delete the record
        const records = await pb.collection('saved_attractions').getList(1, 1, {
          filter: `attraction_id = "${attraction.id}"`
        });
        if (records.items.length > 0) {
          await pb.collection('saved_attractions').delete(records.items[0].id);
        }
      } else {
        // Create new record
        await pb.collection('saved_attractions').create({
          attraction_id: attraction.id,
          attraction_data: attraction
        });
      }
    } catch (err) {
      console.error("PocketBase update failed:", err);
      showToast("Opslaan in de cloud mislukt.");
      // Rollback
      setSavedAttractions(prev =>
        isSaved ? [...prev, attraction.id] : prev.filter(id => id !== attraction.id)
      );
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

  const addToItinerary = async (day: string, attraction: Attraction) => {
    // Check for duplicates locally first
    if (itinerary[day].some(a => a.id === attraction.id)) {
      alert(`${attraction.name} staat al op ${day}!`);
      return;
    }

    // Optimistische UI update
    setItinerary(prev => ({
      ...prev,
      [day]: [...prev[day], attraction]
    }));
    showToast(`${attraction.name} is toegevoegd aan ${day}!`);

    try {
      await pb.collection('itinerary_items').create({
        day: day,
        attraction_id: attraction.id,
        attraction_data: attraction
      });
    } catch (err) {
      console.error("PocketBase update failed for itinerary:", err);
      showToast("Toevoegen in de cloud mislukt.");
      // Rollback
      setItinerary(prev => ({
        ...prev,
        [day]: prev[day].filter(a => a.id !== attraction.id)
      }));
    }
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

  const fetchRouteSteps = async (attraction: Attraction, origin?: string) => {
    setIsFetchingRoute(true);
    if (origin) {
      // Vanaf het opgegeven adres (bijv. het appartement)
      const steps = await getRouteSteps(attraction.name, attraction.city, undefined, undefined, origin);
      setRouteSteps(steps);
      setIsFetchingRoute(false);
    } else if (navigator.geolocation) {
      // Vanaf huidige locatie
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const steps = await getRouteSteps(attraction.name, attraction.city, position.coords.latitude, position.coords.longitude);
          setRouteSteps(steps);
          setIsFetchingRoute(false);
        },
        async () => {
          // Fallback indien locatie geweigerd wordt
          const steps = await getRouteSteps(attraction.name, attraction.city);
          setRouteSteps(steps);
          setIsFetchingRoute(false);
        }
      );
    } else {
      // Fallback
      const steps = await getRouteSteps(attraction.name, attraction.city);
      setRouteSteps(steps);
      setIsFetchingRoute(false);
    }
  };

  const displayedAttractions = searchQuery && searchResults.length > 0 
    ? searchResults 
    : attractions.filter(a => a.city === activeCity);

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
        {activeTab === 'discover' && (
          <DiscoverTab
            APP_VERSION={APP_VERSION}
            activeCity={activeCity}
            setActiveCity={setActiveCity}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setSearchResults={setSearchResults}
            handleSearch={handleSearch}
            displayedAttractions={displayedAttractions}
            isSearching={isSearching}
            setSelectedAttraction={setSelectedAttraction}
            setCurrentImageIndex={setCurrentImageIndex}
            savedAttractions={savedAttractions}
            toggleSavedAttraction={toggleSavedAttraction}
          />
        )}
        {activeTab === 'map' && (
          <MapTab
            activeCity={activeCity}
            itinerary={itinerary}
            attractions={attractions}
            setSelectedAttraction={setSelectedAttraction}
            setCurrentImageIndex={setCurrentImageIndex}
          />
        )}
        {activeTab === 'itinerary' && (
          <ItineraryTab
            itinerary={itinerary}
            setActiveTab={setActiveTab}
            setSelectedAttraction={setSelectedAttraction}
            setCurrentImageIndex={setCurrentImageIndex}
          />
        )}
        {activeTab === 'saved' && (
          <SavedTab
            attractions={attractions}
            savedAttractions={savedAttractions}
            setActiveTab={setActiveTab}
            setSelectedAttraction={setSelectedAttraction}
            setCurrentImageIndex={setCurrentImageIndex}
            toggleSavedAttraction={toggleSavedAttraction}
          />
        )}
      </div>

      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-600 text-white px-6 py-3 rounded-full shadow-lg shadow-black/50 z-[2000] text-sm font-medium transition-all animate-fade-in-down">
          {toastMessage}
        </div>
      )}

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
      <AttractionModal
        selectedAttraction={selectedAttraction}
        setSelectedAttraction={setSelectedAttraction}
        dynamicImages={dynamicImages}
        currentImageIndex={currentImageIndex}
        setCurrentImageIndex={setCurrentImageIndex}
        placeDetails={placeDetails}
        routeSteps={routeSteps}
        isFetchingRoute={isFetchingRoute}
        fetchRouteSteps={fetchRouteSteps}
        openRoute={openRoute}
        setShowDaySelector={setShowDaySelector}
      />
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
