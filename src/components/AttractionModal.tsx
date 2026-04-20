import React from 'react';
import { X, ChevronLeft, ChevronRight, Clock, MapPin, Info, Star, Ticket, Map, Navigation, Plus } from 'lucide-react';
import { Attraction } from '../data';

interface AttractionModalProps {
  selectedAttraction: Attraction | null;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  dynamicImages: string[];
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  placeDetails: {summary?: string, rating?: number, reviews?: number, openingHours?: any} | null;
  routeSteps: string[] | null;
  isFetchingRoute: boolean;
  fetchRouteSteps: (attraction: Attraction, origin?: string) => void;
  openRoute: (attraction: Attraction) => void;
  setShowDaySelector: (attraction: Attraction | null) => void;
}

export default function AttractionModal({
  selectedAttraction,
  setSelectedAttraction,
  dynamicImages,
  currentImageIndex,
  setCurrentImageIndex,
  placeDetails,
  routeSteps,
  isFetchingRoute,
  fetchRouteSteps,
  openRoute,
  setShowDaySelector
}: AttractionModalProps) {
  if (!selectedAttraction) return null;
  const a = selectedAttraction;

  // Gebruik de dynamisch ingeladen Wikimedia beelden, of val terug op de placeholders
  const fallbackImages = dynamicImages.length > 0 ? dynamicImages : (a.imageUrls && a.imageUrls.length > 0 ? a.imageUrls : []);
  let images = Array.from(new Set([...fallbackImages, a.imageUrl])).filter(Boolean);

  const UNSPLASH_PLACEHOLDER = 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1000';

  // Filter out the Unsplash placeholder if there are actual real images available
  if (images.length > 1) {
    images = images.filter(img => img !== UNSPLASH_PLACEHOLDER);
  }

  if (images.length === 0) {
    images = [UNSPLASH_PLACEHOLDER];
  }

  const checkIsOpen = () => {
    if (!placeDetails || !placeDetails.openingHours || !placeDetails.openingHours.periods) {
      return null; // Onbekend
    }

    const nu = new Date();
    // getDay() gives 0 for Sunday, 1 for Monday etc.
    // Google Places API periods.open.day gives 0 for Sunday, 1 for Monday etc.
    const huidigeDag = nu.getDay();
    const huidigeUur = nu.getHours();
    const huidigeMinuut = nu.getMinutes();
    const huidigeTijdInMinuten = huidigeUur * 60 + huidigeMinuut;

    const periods = placeDetails.openingHours.periods;

    // Als er precies 1 periode is met open.day === 0 en open.time === "0000" en geen close, dan is het 24/7 open
    if (periods.length === 1 && periods[0].open && periods[0].open.day === 0 && periods[0].open.time === "0000" && !periods[0].close) {
      return true;
    }

    for (const period of periods) {
      if (!period.open || !period.close || !period.open.time || !period.close.time) continue;

      const openDag = period.open.day;
      const sluitDag = period.close.day;

      const openUur = parseInt(period.open.time.substring(0, 2), 10);
      const openMinuut = parseInt(period.open.time.substring(2, 4), 10);
      const openTijdInMinuten = openUur * 60 + openMinuut;

      const sluitUur = parseInt(period.close.time.substring(0, 2), 10);
      const sluitMinuut = parseInt(period.close.time.substring(2, 4), 10);
      const sluitTijdInMinuten = sluitUur * 60 + sluitMinuut;

      // Zelfde dag open en dicht
      if (openDag === sluitDag) {
        if (huidigeDag === openDag && huidigeTijdInMinuten >= openTijdInMinuten && huidigeTijdInMinuten < sluitTijdInMinuten) {
          return true;
        }
      } else {
        // Sluitingstijd is op een volgende dag (na middernacht)
        if (huidigeDag === openDag && huidigeTijdInMinuten >= openTijdInMinuten) {
           return true; // We zijn na de openingstijd op de openingsdag
        }
        if (huidigeDag === sluitDag && huidigeTijdInMinuten < sluitTijdInMinuten) {
           return true; // We zijn na middernacht maar voor de sluitingstijd op de sluitingsdag
        }
      }
    }

    return false; // Als geen enkele periode matcht, is het gesloten
  };

  const isOpen = checkIsOpen();

  return (
      <div className="fixed inset-0 bg-gray-50 dark:bg-slate-900 z-[1000] overflow-y-auto">
      <div className="relative h-80">
        <img src={images[currentImageIndex]} alt={a.name} className="w-full h-full object-cover transition-opacity duration-300" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>

        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-slate-900 dark:text-white backdrop-blur-sm transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 p-2 rounded-full text-slate-900 dark:text-white backdrop-blur-sm transition-colors"
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
          className="absolute top-6 left-4 bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md p-3 rounded-full shadow-lg border border-white/10"
        >
          <X className="w-6 h-6 text-slate-900 dark:text-white" />
        </button>

        <div className="absolute -bottom-8 left-4 right-4 bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-xl border border-gray-200 dark:border-slate-700 flex justify-between items-center">
          <div>
            <div className="flex items-center text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">
              <Clock className="w-4 h-4 mr-1 text-blue-400" /> Openingstijden
            </div>
            <div className="font-bold text-slate-900 dark:text-white text-lg">{a.openingHours || 'Geen tijden bekend'}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Status</div>
            {isOpen === true && (
              <div className="text-sm font-bold text-green-500 flex items-center justify-end">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span> Nu Open
              </div>
            )}
            {isOpen === false && (
              <div className="text-sm font-bold text-red-500 flex items-center justify-end">
                <span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span> Gesloten
              </div>
            )}
            {isOpen === null && (
              <div className="text-sm font-bold text-slate-400 flex items-center justify-end">
                <span className="w-2 h-2 rounded-full bg-slate-400 mr-1.5"></span> Onbekend
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-16 pb-6">
        <div className="flex items-center space-x-2 mb-2">
          <span className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800/50 text-xs font-bold px-3 py-1 rounded-full border">{a.city}</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{a.name}</h1>

        {/* Rating from Google Maps */}
        {placeDetails?.rating && (
          <div className="flex items-center text-yellow-500 mb-2">
            <Star className="w-5 h-5 fill-current" />
            <span className="ml-1 font-bold text-slate-900 dark:text-white">{placeDetails.rating}</span>
            <span className="ml-1 text-slate-500 dark:text-slate-400 text-sm">({placeDetails.reviews} reviews) - Google Maps</span>
          </div>
        )}

        <p className="text-slate-500 dark:text-slate-400 flex items-start mb-8 text-sm">
          <MapPin className="w-4 h-4 mr-1.5 mt-0.5 flex-shrink-0 text-slate-500" />
          {a.location}
        </p>

        {/* Editorial Summary from Google Maps */}
        {placeDetails?.summary && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 mb-8">
            <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-4 flex items-center">
              <Info className="w-5 h-5 text-blue-400 mr-2" /> Google Maps Info
            </h3>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{placeDetails.summary}</p>
          </div>
        )}

        {a.ticketRequired && (
          <div className="bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30 rounded-3xl p-6 mb-8 border">
            <div className="flex items-center mb-3">
              <Ticket className="w-6 h-6 text-blue-400 mr-3" />
              <h3 className="font-bold text-blue-900 dark:text-blue-100 text-lg">Tickets & Tijdsloten</h3>
            </div>
            <p className="text-blue-900 dark:text-blue-200/70 text-sm mb-5 leading-relaxed">
              Vergeet niet om je tickets vooraf online te reserveren! {a.timeSlotRequired && 'Een tijdslot is verplicht.'}
            </p>
            {a.bookingUrl ? (
              <a href={a.bookingUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-center bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors shadow-lg shadow-blue-900/20">
                Boek via Officiële Website
              </a>
            ) : (
              <button className="bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors shadow-lg shadow-blue-900/20">
                Boek een Tijdslot
              </button>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 mb-8">
          <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-4">Over deze locatie</h3>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{a.fullDescription}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 mb-8">
          <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-4 flex items-center">
            <Map className="w-5 h-5 text-blue-400 mr-2" /> Locatie op de kaart
          </h3>
          <div className="w-full h-64 mt-4 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
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

        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-lg border border-gray-200 dark:border-slate-700 mb-8">
          <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-4 flex items-center">
            <Navigation className="w-5 h-5 text-blue-400 mr-2" /> Routebeschrijving
          </h3>

          {!routeSteps && !isFetchingRoute && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Kies je vertrekpunt voor een stapsgewijze route via Gemini:</p>
              <button
                onClick={() => fetchRouteSteps(a)}
                className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors flex items-center justify-center"
              >
                <MapPin className="w-4 h-4 mr-2 text-blue-400" /> Vanaf huidige locatie
              </button>
              <button
                onClick={() => fetchRouteSteps(a, "113 Woodside Rd, London N22 5HR, Verenigd Koninkrijk")}
                className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors flex items-center justify-center"
              >
                <Map className="w-4 h-4 mr-2 text-blue-400" /> Vanaf het appartement
              </button>
            </div>
          )}

          {isFetchingRoute && (
            <div className="flex items-center justify-center py-4 text-slate-500 dark:text-slate-400">
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
                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {a.highlights && a.highlights.length > 0 && (
          <div className="mb-8">
            <h3 className="font-bold text-slate-900 dark:text-white text-xl mb-5 flex items-center">
              <Star className="w-5 h-5 text-yellow-500 mr-2" /> Hoogtepunten
            </h3>
            <div className="space-y-4">
              {a.highlights.map((h, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 rounded-3xl p-5 shadow-lg border border-gray-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 text-lg">{h.title}</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{h.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {a.familyTip && (
          <div className="bg-green-50 border-green-100 dark:bg-green-900/20 dark:border-green-800/30 rounded-3xl p-6 mb-8 border">
            <div className="flex items-center mb-3">
              <Info className="w-6 h-6 text-green-400 mr-3" />
              <h3 className="font-bold text-green-900 dark:text-green-100 text-lg">Familietip</h3>
            </div>
            <p className="text-green-900 dark:text-green-200/80 text-sm leading-relaxed">{a.familyTip}</p>
          </div>
        )}

        <div className="flex space-x-4 mt-10 pb-28">
          <button
            onClick={() => setShowDaySelector(a)}
            className="flex-1 bg-blue-600 hover:bg-blue-500 text-slate-900 dark:text-white py-4 rounded-2xl font-bold flex items-center justify-center shadow-lg shadow-blue-900/20 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" /> Toevoegen
          </button>
          <button
            onClick={() => openRoute(a)}
            className="flex-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white py-4 rounded-2xl font-bold flex items-center justify-center shadow-lg transition-colors border border-gray-300 dark:border-slate-600"
          >
            <Navigation className="w-5 h-5 mr-2" /> Route
          </button>
        </div>
      </div>
    </div>
  );
}
