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

const APP_VERSION = 'v0.5.7';

export async function fetchAttractionImages(attractionName: string, city: string): Promise<{images: string[], details: any}> {
  let newImages: string[] = [];
  let newDetails: any = null;

  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  let googleSuccess = false;

  if (apiKey) {
    try {
      const query = `${attractionName} ${city}`;
      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.photos,places.editorialSummary,places.rating,places.userRatingCount,places.regularOpeningHours'
        },
        body: JSON.stringify({ textQuery: query })
      });
      const data = await response.json();

      if (data.places && data.places.length > 0) {
        const place = data.places[0];

        if (place.photos) {
          const photos = place.photos.slice(0, 5);
          newImages = photos.map((photo: any) =>
            `https://places.googleapis.com/v1/${photo.name}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`
          );
        }

        newDetails = {
          summary: place.editorialSummary?.text,
          rating: place.rating,
          reviews: place.userRatingCount,
          openingHours: place.regularOpeningHours
        };
        googleSuccess = true;
      }
    } catch (e) {
      console.error("Failed to fetch Google Places data", e);
    }
  }

  // Fallback to Wikimedia Commons if Google failed or didn't find images
  if (!googleSuccess || newImages.length === 0) {
    try {
      const query = `${attractionName} ${city}`;
      const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=6&gsrlimit=5&prop=imageinfo&iiprop=url&format=json&origin=*`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.query && data.query.pages) {
        const urls = Object.values(data.query.pages)
          .map((page: any) => page.imageinfo?.[0]?.url)
          .filter((url: string) => url && !url.toLowerCase().endsWith('.svg') && !url.toLowerCase().endsWith('.pdf'));

        if (urls.length > 0) {
          newImages = urls as string[];
        }
      }
    } catch (e) {
      console.error("Failed to fetch real images", e);
    }
  }

  return { images: newImages, details: newDetails };
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

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
  const [savedAttractionsData, setSavedAttractionsData] = useState<Attraction[]>([]);
  const [showDaySelector, setShowDaySelector] = useState<Attraction | null>(null);
  const [placeDetails, setPlaceDetails] = useState<{summary?: string, rating?: number, reviews?: number, openingHours?: any} | null>(null);
  const [attractionsCache, setAttractionsCache] = useState<Record<string, any>>({});
  const [imageDictionary, setImageDictionary] = useState<Record<string, string>>({});
  
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
        setSavedAttractionsData(savedRecords.map(r => r.attraction_data || attractions.find(a => a.id === r.attraction_id)).filter(Boolean));

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

        // Fetch all attractions cache to display pre-fetched images on Discover page
        try {
          const cacheRecords = await pb.collection('attractions_cache').getFullList();
          const cacheMap: Record<string, any> = {};
          const imageMap: Record<string, string> = {};

          cacheRecords.forEach(record => {
            cacheMap[record.attraction_id] = record;

            let displayImage = '';
            if (record.dynamicImages && record.dynamicImages.length > 0) {
              displayImage = record.dynamicImages[0];
            } else if (record.imageUrl) {
              displayImage = record.imageUrl;
            } else if (record.imageUrls && record.imageUrls.length > 0) {
              displayImage = record.imageUrls[0];
            }
            if (displayImage) {
              imageMap[record.attraction_id] = displayImage;
            }
          });
          setAttractionsCache(cacheMap);

          // Also pre-fill imageDictionary with static attractions images as fallback
          attractions.forEach(a => {
            if (!imageMap[a.id] && a.imageUrl) {
              imageMap[a.id] = a.imageUrl;
            }
          });
          setImageDictionary(imageMap);
        } catch (cacheErr) {
          console.log("Could not load attractions_cache on init", cacheErr);
          // Pre-fill imageDictionary with static attractions images as fallback even if offline
          const imageMap: Record<string, string> = {};
          attractions.forEach(a => {
            if (a.imageUrl) {
              imageMap[a.id] = a.imageUrl;
            }
          });
          setImageDictionary(imageMap);
        }
      } catch (err) {
        console.error("PocketBase connection failed on init:", err);
        showToast("Kon opgeslagen data niet ophalen. Offline modus actief.");
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedAttraction) {
      setDynamicImages([]);
      setCurrentImageIndex(0);
      setRouteSteps(null);
      setIsFetchingRoute(false);
      setPlaceDetails(null);
      
      const loadAttractionData = async () => {
        // First try to load from PocketBase cache
        try {
          const cachedRecord = await pb.collection('attractions_cache').getFirstListItem(`attraction_id = "${selectedAttraction.id}"`);
          let cacheHit = false;

          let hasImages = false;
          let hasDetails = false;

          if (cachedRecord) {
            if (cachedRecord.imageUrls && cachedRecord.imageUrls.length > 0) {
              setDynamicImages(cachedRecord.imageUrls);
              hasImages = true;
            } else if (cachedRecord.imageUrl) {
              setDynamicImages([cachedRecord.imageUrl]);
              hasImages = true;
            } else if (cachedRecord.dynamicImages && cachedRecord.dynamicImages.length > 0) {
              setDynamicImages(cachedRecord.dynamicImages);
              hasImages = true;
            }

            if (cachedRecord.placeDetails) {
              setPlaceDetails(cachedRecord.placeDetails);
              hasDetails = true;
            }

            if (cachedRecord.routeSteps && cachedRecord.routeSteps.length > 0) {
              setRouteSteps(cachedRecord.routeSteps);
            }

            if (hasImages && hasDetails) {
              return; // Successfully loaded everything from cache
            }
          }
        } catch (e) {
          // Normal if not found (404) or offline, proceed to fallback API calls
          console.log("Not found in cache or PB offline, proceeding to APIs", e);
        }

        // Fetch data via APIs if not fully in cache
        const fetchResult = await fetchAttractionImages(selectedAttraction.name, selectedAttraction.city);
        let newImages = fetchResult.images;
        let newDetails = fetchResult.details;

        if (newImages.length > 0) {
          setDynamicImages(newImages);
        }
        if (newDetails) {
          setPlaceDetails(newDetails);
        }

        // Save fetched data back to cache
        if (newImages.length > 0 || newDetails) {
          try {
            // First check if record exists to update it, otherwise create
            let existingRecord: any = null;
            try {
              existingRecord = await pb.collection('attractions_cache').getFirstListItem(`attraction_id = "${selectedAttraction.id}"`);
            } catch (err) {
              // Not found
            }

            // Only save images if we don't already have images in cache.
            // This prevents overwriting user-pinned URLs from PB admin.
            const hasExistingImages = existingRecord && (
              (existingRecord.dynamicImages && existingRecord.dynamicImages.length > 0) ||
              existingRecord.imageUrl ||
              (existingRecord.imageUrls && existingRecord.imageUrls.length > 0)
            );

            const cacheData: any = {
              attraction_id: selectedAttraction.id,
            };

            if (newImages.length > 0 && !hasExistingImages) {
              cacheData.dynamicImages = newImages;
              cacheData.imageUrl = newImages[0] || '';
            }
            if (newDetails && (!existingRecord || !existingRecord.placeDetails)) {
              cacheData.placeDetails = newDetails;
            }

            if (Object.keys(cacheData).length > 1) { // more than just attraction_id
              let updatedRecord;
              try {
                if (existingRecord) {
                  try {
                    updatedRecord = await pb.collection('attractions_cache').update(existingRecord.id, cacheData);
                  } catch (updateErr: any) {
                    if (updateErr.status === 404) {
                      console.warn(`[404] attractions_cache update failed for id: ${existingRecord.id}. Falling back to search_cache...`);
                      updatedRecord = await pb.collection('search_cache').update(existingRecord.id, cacheData);
                    } else {
                      throw updateErr;
                    }
                  }
                } else {
                   updatedRecord = await pb.collection('attractions_cache').create(cacheData);
                }
              } catch (err: any) {
                console.warn("Failed to write to cache collections", err);
                // Fallback to updating state locally even if PB write failed
                updatedRecord = { ...existingRecord, ...cacheData };
              }
              // Update local state instantly for DiscoverTab
              setAttractionsCache(prev => ({
                ...prev,
                [selectedAttraction.id]: updatedRecord
              }));

              if (newImages.length > 0) {
                setImageDictionary(prev => ({
                  ...prev,
                  [selectedAttraction.id]: newImages[0]
                }));
              }
            }
          } catch (e) {
            console.error("Failed to write to attractions_cache", e);
          }
        }
      };
      
      loadAttractionData();
    }
  }, [selectedAttraction]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearchResults([]); // Clear stale results before searching
    setIsSearching(true);
    // Local search first
    const local = attractions.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) && a.city === activeCity);
    if (local.length > 0) {
      setSearchResults(local);
      setIsSearching(false);
    } else {
      // Fallback to Gemini Maps search
      const results = await searchAttractions(`${searchQuery} in ${activeCity}`);
      const formattedResults = results.map((r: any) => ({
        id: `search-${r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        name: r.name,
        shortDescription: r.shortDescription || r.address,
        fullDescription: r.shortDescription || 'Geen uitgebreide beschrijving beschikbaar.',
        imageUrl: r.imageUrl || '',
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
      }));

      // Update image dictionary with search results images
      setImageDictionary(prev => {
        const newDict = { ...prev };
        formattedResults.forEach((r: any) => {
          if (r.imageUrl) {
            newDict[r.id] = r.imageUrl;
          }
        });
        return newDict;
      });

      setSearchResults(formattedResults);
      setIsSearching(false);
    }
  };

  const toggleSavedAttraction = async (attraction: Attraction) => {
    const isSaved = savedAttractions.includes(attraction.id);

    // Optimistische UI update
    setSavedAttractions(prev =>
      isSaved ? prev.filter(id => id !== attraction.id) : [...prev, attraction.id]
    );
    setSavedAttractionsData(prev =>
      isSaved ? prev.filter(a => a.id !== attraction.id) : [...prev, attraction]
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
      setSavedAttractionsData(prev =>
        isSaved ? [...prev, attraction] : prev.filter(a => a.id !== attraction.id)
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

  const removeFromItinerary = async (day: string, attraction: Attraction) => {
    // Optimistische UI update
    setItinerary(prev => ({
      ...prev,
      [day]: prev[day].filter(a => a.id !== attraction.id)
    }));
    showToast(`${attraction.name} verwijderd van ${day}`);

    try {
      const records = await pb.collection('itinerary_items').getList(1, 1, {
        filter: `attraction_id = "${attraction.id}" && day = "${day}"`
      });
      if (records.items.length > 0) {
        await pb.collection('itinerary_items').delete(records.items[0].id);
      }
    } catch (err) {
      console.error("Failed to remove itinerary item from PocketBase:", err);
      showToast("Verwijderen in de cloud mislukt.");
      // Rollback
      setItinerary(prev => ({
        ...prev,
        [day]: [...prev[day], attraction]
      }));
    }
  };

  const moveItineraryItem = async (fromDay: string, toDay: string, attraction: Attraction) => {
    if (itinerary[toDay].some(a => a.id === attraction.id)) {
      alert(`${attraction.name} staat al op ${toDay}!`);
      return;
    }

    // Optimistische UI update
    setItinerary(prev => ({
      ...prev,
      [fromDay]: prev[fromDay].filter(a => a.id !== attraction.id),
      [toDay]: [...prev[toDay], attraction]
    }));
    showToast(`${attraction.name} verplaatst naar ${toDay}`);

    try {
      const records = await pb.collection('itinerary_items').getList(1, 1, {
        filter: `attraction_id = "${attraction.id}" && day = "${fromDay}"`
      });
      if (records.items.length > 0) {
        await pb.collection('itinerary_items').update(records.items[0].id, {
          day: toDay
        });
      }
    } catch (err) {
      console.error("Failed to move itinerary item in PocketBase:", err);
      showToast("Verplaatsen in de cloud mislukt.");
      // Rollback
      setItinerary(prev => ({
        ...prev,
        [fromDay]: [...prev[fromDay], attraction],
        [toDay]: prev[toDay].filter(a => a.id !== attraction.id)
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

    // Check cache first ONLY if no custom origin or geolocation is strictly needed
    // Wait, the prompt says: "wanneer een attractie wordt geselecteerd, eerst checken of deze al in een PocketBase collectie genaamd attractions_cache staat... Zo ja, gebruik de opgeslagen dynamicImages, placeDetails en routeSteps."
    // And "zodra de data binnen is, schrijf deze weg naar de attractions_cache". We'll wrap the setRouteSteps to also save.

    const saveRouteToCache = async (steps: string[]) => {
      setRouteSteps(steps);
      try {
        let existingRecord = null;
        try {
          existingRecord = await pb.collection('attractions_cache').getFirstListItem(`attraction_id = "${attraction.id}"`);
        } catch (err) { }

        if (existingRecord) {
          try {
            await pb.collection('attractions_cache').update(existingRecord.id, { routeSteps: steps });
          } catch (updateErr: any) {
            if (updateErr.status === 404) {
              console.warn(`[404] attractions_cache update failed for routeSteps id: ${existingRecord.id}. Falling back to search_cache...`);
              await pb.collection('search_cache').update(existingRecord.id, { routeSteps: steps });
            } else {
              throw updateErr;
            }
          }
        } else {
          await pb.collection('attractions_cache').create({ attraction_id: attraction.id, routeSteps: steps });
        }
      } catch (e: any) {
        console.warn("Failed to write routeSteps to cache", e);
      }
    };

    if (origin) {
      // Vanaf het opgegeven adres (bijv. het appartement)
      const steps = await getRouteSteps(attraction.name, attraction.city, undefined, undefined, origin);
      await saveRouteToCache(steps);
      setIsFetchingRoute(false);
    } else if (navigator.geolocation) {
      // Vanaf huidige locatie
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const steps = await getRouteSteps(attraction.name, attraction.city, position.coords.latitude, position.coords.longitude);
          await saveRouteToCache(steps);
          setIsFetchingRoute(false);
        },
        async () => {
          // Fallback indien locatie geweigerd wordt
          const steps = await getRouteSteps(attraction.name, attraction.city);
          await saveRouteToCache(steps);
          setIsFetchingRoute(false);
        }
      );
    } else {
      // Fallback
      const steps = await getRouteSteps(attraction.name, attraction.city);
      await saveRouteToCache(steps);
      setIsFetchingRoute(false);
    }
  };

  const displayedAttractions = isSearching
    ? []
    : (searchQuery && searchResults.length > 0
      ? searchResults
      : attractions.filter(a => a.city === activeCity));

  // Background fetch for list displayedAttractions
  useEffect(() => {
    let isMounted = true;
    const fetchMissingImages = async () => {
      // Small delay to allow UI to render first
      await new Promise(resolve => setTimeout(resolve, 500));

      const missing = displayedAttractions.filter(a => {
        // If it's already in dictionary or cache with images, or if we already checked it, skip
        const cached = attractionsCache[a.id];
        const hasCachedImages = cached && (
          (cached.dynamicImages && cached.dynamicImages.length > 0) ||
          cached.imageUrl ||
          (cached.imageUrls && cached.imageUrls.length > 0)
        );
        // also check if we explicitly tracked checking it
        const hasAttemptedFetch = cached && cached.attraction_id === a.id;
        return !imageDictionary[a.id] && !hasCachedImages && !hasAttemptedFetch;
      });

      if (missing.length === 0) return;

      for (const a of missing) {
        if (!isMounted) break;
        try {
          const fetchResult = await fetchAttractionImages(a.name, a.city);
          if (!isMounted) break;

          let newImages = fetchResult.images;
          let newDetails = fetchResult.details;

          // Always record that we fetched for this attraction to avoid refetching it indefinitely if it fails
          setAttractionsCache(prev => ({ ...prev, [a.id]: prev[a.id] || { attraction_id: a.id } }));

          // Save to PB and state
          if (newImages.length > 0 || newDetails) {
            let existingRecord: any = null;
            try {
              existingRecord = await pb.collection('attractions_cache').getFirstListItem(`attraction_id = "${a.id}"`);
            } catch (err) {
              // Not found
            }

            const cacheData: any = {
              attraction_id: a.id,
            };

            if (newImages.length > 0) {
              cacheData.dynamicImages = newImages;
              cacheData.imageUrl = newImages[0] || '';
            }
            if (newDetails && (!existingRecord || !existingRecord.placeDetails)) {
              cacheData.placeDetails = newDetails;
            }

            if (Object.keys(cacheData).length > 1) {
              let updatedRecord;
              try {
                if (existingRecord) {
                  try {
                    updatedRecord = await pb.collection('attractions_cache').update(existingRecord.id, cacheData);
                  } catch (updateErr: any) {
                    if (updateErr.status === 404) {
                      console.warn(`[404] attractions_cache update failed for bg-fetch id: ${existingRecord.id}. Falling back to search_cache...`);
                      updatedRecord = await pb.collection('search_cache').update(existingRecord.id, cacheData);
                    } else {
                      throw updateErr;
                    }
                  }
                } else {
                   updatedRecord = await pb.collection('attractions_cache').create(cacheData);
                }
              } catch (err: any) {
                console.warn("Failed to write to cache collections during bg fetch", err);
                updatedRecord = { ...existingRecord, ...cacheData };
              }

              // Update state
              setAttractionsCache(prev => ({ ...prev, [a.id]: updatedRecord }));
              if (newImages.length > 0) {
                setImageDictionary(prev => ({ ...prev, [a.id]: newImages[0] }));
              }
            }
          }
        } catch (err) {
          console.error("Failed background fetch for", a.name, err);
        }

        // Brief pause between requests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    };

    if (displayedAttractions.length > 0) {
      fetchMissingImages();
    }

    return () => {
      isMounted = false;
    };
  }, [displayedAttractions]); // Removed attractionsCache and imageDictionary to prevent infinite loops

  const renderChat = () => (
    <div className={`fixed inset-0 bg-gray-50 dark:bg-slate-900 z-[2000] flex flex-col transition-transform duration-300 ${isChatOpen ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-slate-900 dark:text-white p-5 flex items-center justify-between shadow-md pt-safe">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center mr-3 shadow-lg shadow-blue-900/20">
            <MessageCircle className="w-5 h-5 text-slate-900 dark:text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">Reisassistent</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Altijd online</p>
          </div>
        </div>
        <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-5 space-y-6 bg-gray-50 dark:bg-slate-900">
        {chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl ${msg.role === 'user' ? 'bg-blue-600 text-slate-900 dark:text-white rounded-tr-sm shadow-lg shadow-blue-900/20' : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-sm shadow-md'}`}>
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
            <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 rounded-3xl rounded-tl-sm shadow-md flex space-x-2 items-center">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 pb-safe">
        <div className="flex items-center bg-gray-50 dark:bg-slate-900 rounded-full p-1.5 pr-2 border border-gray-200 dark:border-slate-700 shadow-inner">
          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Vraag iets over Londen of Oxford..."
            className="flex-1 bg-transparent px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatLoading}
            className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white p-3 rounded-full disabled:opacity-50 transition-colors shadow-lg shadow-blue-900/20"
          >
            <Navigation className="w-5 h-5 transform rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-slate-900 flex flex-col font-sans overflow-hidden text-slate-800 dark:text-slate-200 selection:bg-blue-500/30">
      
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
            attractionsCache={attractionsCache}
            imageDictionary={imageDictionary}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
          />
        )}
        {activeTab === 'map' && (
          <MapTab
            activeCity={activeCity}
            itinerary={itinerary}
            attractions={attractions}
            savedAttractionsData={savedAttractionsData}
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
            imageDictionary={imageDictionary}
            removeFromItinerary={removeFromItinerary}
            moveItineraryItem={moveItineraryItem}
          />
        )}
        {activeTab === 'saved' && (
          <SavedTab
            savedAttractionsData={savedAttractionsData}
            setActiveTab={setActiveTab}
            setSelectedAttraction={setSelectedAttraction}
            setCurrentImageIndex={setCurrentImageIndex}
            toggleSavedAttraction={toggleSavedAttraction}
            imageDictionary={imageDictionary}
          />
        )}
      </div>

      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-slate-900 dark:text-white px-6 py-3 rounded-full shadow-lg shadow-black/50 z-[2000] text-sm font-medium transition-all animate-fade-in-down">
          {toastMessage}
        </div>
      )}

      {/* Floating Chat Button */}
      {!isChatOpen && (
        <button 
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-24 right-5 bg-blue-600 text-slate-900 dark:text-white p-4 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.4)] shadow-blue-900/50 hover:bg-blue-500 transition-all z-[900] flex items-center justify-center border border-blue-500/50"
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
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm border border-gray-200 dark:border-slate-700 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 text-center">Kies een dag</h3>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(itinerary).map(day => (
                <button
                  key={day}
                  onClick={() => {
                    addToItinerary(day, showDaySelector);
                    setShowDaySelector(null);
                  }}
                  className="bg-gray-100 dark:bg-slate-700 hover:bg-blue-600 text-slate-900 dark:text-white py-3 rounded-xl font-medium transition-colors border border-gray-300 dark:border-slate-600 hover:border-blue-500"
                >
                  {day}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowDaySelector(null)}
              className="mt-6 w-full bg-gray-50 dark:bg-slate-900 hover:bg-gray-200 dark:bg-slate-950 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold transition-colors border border-gray-200 dark:border-slate-800"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full bg-white border-slate-200 dark:bg-slate-900/90 dark:border-slate-800 backdrop-blur-lg border-t px-6 py-4 flex justify-between items-center z-[1100] pb-safe">
        <button 
          onClick={() => {
            setActiveTab('discover');
            setSelectedAttraction(null);
          }}
          className={`flex flex-col items-center transition-colors ${activeTab === 'discover' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-500 dark:text-slate-400'}`}
        >
          <Compass className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Ontdek</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('saved');
            setSelectedAttraction(null);
          }}
          className={`flex flex-col items-center transition-colors ${activeTab === 'saved' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-500 dark:text-slate-400'}`}
        >
          <Heart className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Opgeslagen</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('map');
            setSelectedAttraction(null);
          }}
          className={`flex flex-col items-center transition-colors ${activeTab === 'map' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-500 dark:text-slate-400'}`}
        >
          <MapPin className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Kaart</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('itinerary');
            setSelectedAttraction(null);
          }}
          className={`flex flex-col items-center transition-colors ${activeTab === 'itinerary' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-500 dark:text-slate-400'}`}
        >
          <Calendar className="w-6 h-6 mb-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-wider">Planning</span>
        </button>
      </div>
    </div>
  );
}
