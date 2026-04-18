import React from 'react';
import { X, ChevronLeft, ChevronRight, Clock, MapPin, Info, Star, Ticket, Map, Navigation, Plus } from 'lucide-react';
import { Attraction } from '../data';

interface AttractionModalProps {
  selectedAttraction: Attraction | null;
  setSelectedAttraction: (attraction: Attraction | null) => void;
  dynamicImages: string[];
  currentImageIndex: number;
  setCurrentImageIndex: React.Dispatch<React.SetStateAction<number>>;
  placeDetails: {summary?: string, rating?: number, reviews?: number} | null;
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
  const images = Array.from(new Set([a.imageUrl, ...fallbackImages]));

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
            <div className="space-y-3">
              <p className="text-sm text-slate-300 mb-2">Kies je vertrekpunt voor een stapsgewijze route via Gemini:</p>
              <button
                onClick={() => fetchRouteSteps(a)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors flex items-center justify-center"
              >
                <MapPin className="w-4 h-4 mr-2 text-blue-400" /> Vanaf huidige locatie
              </button>
              <button
                onClick={() => fetchRouteSteps(a, "113 Woodside Rd, London N22 5HR, Verenigd Koninkrijk")}
                className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-3 rounded-xl text-sm font-bold w-full transition-colors flex items-center justify-center"
              >
                <Map className="w-4 h-4 mr-2 text-blue-400" /> Vanaf het appartement
              </button>
            </div>
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
}
