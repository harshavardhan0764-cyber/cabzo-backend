import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  MapPin, 
  Crosshair, 
  X, 
  Check, 
  Navigation, 
  Sparkles, 
  AlertCircle,
  Plane,
  Train,
  Building,
  Landmark,
  Compass,
  MapPinOff,
  History,
  TrendingUp,
  Hotel
} from 'lucide-react';
import { searchGooglePlaces, getPlaceDetails, getCurrentDeviceLocationGoogle } from '../utils/googleLocationService';
import { INDIA_POPULAR_PLACES, BENGALURU_PICKUP_HUBS, isBengaluruLocation } from '../utils/locationService';

export default function MapPickerModal({ 
  isOpen, 
  onClose, 
  onSelectLocation, 
  title = 'Select Location', 
  isPickup = false,
  initialLocation = null,
  otherLocation = null,
  allowSameLocation = false
}) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'POPULAR' | 'AIRPORT' | 'TRAIN' | 'TOURIST' | 'TECH'
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locatingGps, setLocatingGps] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSuggestions([]);
      setErrorMessage('');
      setActiveTab('ALL');
    }
  }, [isOpen]);

  // 2. Real-time Search using Google Places API + Local Indian Places dataset
  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setSuggestions([]);
      return;
    }

    let isCurrent = true;
    setSearching(true);
    setErrorMessage('');

    const timer = setTimeout(async () => {
      try {
        const qLower = query.trim().toLowerCase();
        
        // 1. Filter local places (if isPickup, filter strictly to Bengaluru)
        const sourceList = isPickup ? BENGALURU_PICKUP_HUBS : INDIA_POPULAR_PLACES;
        const localMatches = sourceList.filter(p => {
          if (isPickup && !isBengaluruLocation(p)) return false;
          const matchName = p.name.toLowerCase().includes(qLower);
          const matchCity = p.city?.toLowerCase().includes(qLower);
          const matchAddr = p.address?.toLowerCase().includes(qLower);
          const matchAlias = p.aliases?.some(a => a.toLowerCase().includes(qLower));
          return matchName || matchCity || matchAddr || matchAlias;
        });

        // 2. Fetch live Google Places API results
        const searchQuery = isPickup ? `${query} Bengaluru` : query;
        const rawGoogleMatches = await searchGooglePlaces(searchQuery);
        const googleMatches = isPickup
          ? rawGoogleMatches.filter(g => isBengaluruLocation(g))
          : rawGoogleMatches;

        if (isCurrent) {
          // Combine & deduplicate by name / placeId
          const combined = [...localMatches];
          googleMatches.forEach(gItem => {
            const exists = combined.some(c => 
              c.name.toLowerCase() === gItem.name.toLowerCase() ||
              (c.lat && gItem.lat && Math.abs(c.lat - gItem.lat) < 0.005 && Math.abs(c.lng - gItem.lng) < 0.005)
            );
            if (!exists) {
              combined.push(gItem);
            }
          });

          setSuggestions(combined);
          setSearching(false);
        }
      } catch (err) {
        if (isCurrent) {
          setSearching(false);
        }
      }
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, isPickup]);

  // Filtered Curated List when no query is typed
  const curatedPlaces = useMemo(() => {
    if (isPickup) {
      if (activeTab === 'AIRPORT') {
        return BENGALURU_PICKUP_HUBS.filter(p => p.category === 'airport');
      }
      if (activeTab === 'TRAIN') {
        return BENGALURU_PICKUP_HUBS.filter(p => p.category === 'train');
      }
      if (activeTab === 'TECH') {
        return BENGALURU_PICKUP_HUBS.filter(p => p.category === 'tech');
      }
      return BENGALURU_PICKUP_HUBS;
    }

    if (activeTab === 'AIRPORT') {
      return INDIA_POPULAR_PLACES.filter(p => p.category === 'airport');
    }
    if (activeTab === 'TRAIN') {
      return INDIA_POPULAR_PLACES.filter(p => p.category === 'train');
    }
    if (activeTab === 'TOURIST') {
      return INDIA_POPULAR_PLACES.filter(p => p.category === 'tourist');
    }
    if (activeTab === 'POPULAR') {
      return INDIA_POPULAR_PLACES.filter(p => ['Bengaluru (Bangalore)', 'Mysuru (Mysore)', 'Coorg (Madikeri)', 'Mangaluru (Mangalore)', 'Ooty (Nilgiris)', 'Chennai', 'Hyderabad', 'Coimbatore'].some(c => p.name.includes(c) || p.city.includes(c)));
    }
    // Default 'ALL' Top Hubs
    return INDIA_POPULAR_PLACES.slice(0, 18);
  }, [activeTab, isPickup]);

  if (!isOpen) return null;

  // Handle location item selection
  const handleSelectPlace = async (placeItem) => {
    setSearching(true);
    setErrorMessage('');

    try {
      let detailed = placeItem;
      if (placeItem.placeId && (!placeItem.lat || !placeItem.lng)) {
        detailed = await getPlaceDetails(placeItem);
      }

      // Enforce Bengaluru pickup only
      if (isPickup && !isBengaluruLocation(detailed)) {
        setErrorMessage('U & I Cabs pickup services are exclusively available from Bengaluru (Bangalore). Please select a pickup location within Bengaluru.');
        setSearching(false);
        return;
      }

      // Check if pickup and drop are identical (Bypassed for round trip)
      if (otherLocation && !allowSameLocation) {
        const otherName = typeof otherLocation === 'string' ? otherLocation : otherLocation.name;
        const otherLat = otherLocation?.lat;
        const otherLng = otherLocation?.lng;

        if (
          (otherLat && otherLng && detailed.lat && detailed.lng && 
           Math.abs(otherLat - detailed.lat) < 0.001 && Math.abs(otherLng - detailed.lng) < 0.001) ||
          (otherName && otherName.trim().toLowerCase() === detailed.name.trim().toLowerCase())
        ) {
          setErrorMessage('Pickup and Destination cannot be the same place. Please choose a different location.');
          setSearching(false);
          return;
        }
      }

      onSelectLocation(detailed);
      onClose();
    } catch (err) {
      setErrorMessage('Could not load place details. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // Handle GPS Current Location
  const handleGpsCurrentLocation = async () => {
    setLocatingGps(true);
    setErrorMessage('');
    try {
      const gpsPlace = await getCurrentDeviceLocationGoogle();
      if (isPickup && !isBengaluruLocation(gpsPlace)) {
        setErrorMessage('Your GPS location appears to be outside Bengaluru. Pickups are available exclusively within Bengaluru (Bangalore).');
        return;
      }
      handleSelectPlace(gpsPlace);
    } catch {
      setErrorMessage('Could not fetch GPS location. Please select a place from the list or search.');
    } finally {
      setLocatingGps(false);
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'airport':
        return <Plane className="w-4 h-4 text-sky-400" />;
      case 'train':
        return <Train className="w-4 h-4 text-emerald-400" />;
      case 'tech':
        return <Building className="w-4 h-4 text-indigo-400" />;
      case 'hotel':
        return <Hotel className="w-4 h-4 text-pink-400" />;
      case 'tourist':
        return <Landmark className="w-4 h-4 text-amber-400" />;
      default:
        return <MapPin className="w-4 h-4 text-orange-400" />;
    }
  };

  const displayedList = query.trim().length > 0 ? suggestions : curatedPlaces;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" 
        onClick={onClose}
      />

      {/* Main Location Search Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10">
        
        {/* Modal Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isPickup 
                ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
                : 'bg-orange-100 text-orange-600 border border-orange-200'
            }`}>
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900">{title}</h3>
                {isPickup && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full border border-emerald-300">
                    Bengaluru Only
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                {isPickup 
                  ? 'Pickups are available exclusively within Bengaluru (Bangalore)' 
                  : 'Search destinations, towns, hill stations & cities across India'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Instant GPS Button */}
        <div className="p-3 bg-white border-b border-slate-100 space-y-2.5 shrink-0">
          
          {/* Main Search Input */}
          <div className="relative flex items-center">
            <Search className={`w-4 h-4 absolute left-3.5 ${isPickup ? 'text-emerald-600' : 'text-orange-500'}`} />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isPickup 
                ? "Search Bengaluru address, airport, tech park, station..." 
                : "Search Indian city, airport, station, town..."}
              className={`w-full bg-slate-50 border-2 rounded-2xl pl-10 pr-9 py-3 text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-inner ${
                isPickup 
                  ? 'border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20' 
                  : 'border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              }`}
              autoFocus
            />
            {query && (
              <button 
                onClick={() => setQuery('')}
                className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* GPS Current Location Bar */}
          <button
            type="button"
            onClick={handleGpsCurrentLocation}
            disabled={locatingGps}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-extrabold text-xs transition active:scale-[0.99] cursor-pointer ${
              isPickup
                ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800'
                : 'bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700'
            }`}
          >
            <div className="flex items-center gap-2">
              <Crosshair className={`w-4 h-4 ${isPickup ? 'text-emerald-700' : 'text-orange-600'} ${locatingGps ? 'animate-spin' : ''}`} />
              <span>{locatingGps ? 'Detecting Device GPS...' : (isPickup ? '📍 Use My Bengaluru Location' : '📍 Use My Current Location')}</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              isPickup ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-700'
            }`}>
              GPS Auto-Detect
            </span>
          </button>

          {/* Category Filter Pills (When no active search query) */}
          {!query && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {(isPickup ? [
                { id: 'ALL', label: '⭐ All Bengaluru Hubs' },
                { id: 'AIRPORT', label: '✈️ Airport (BLR)' },
                { id: 'TRAIN', label: '🚆 Railway Stations' },
                { id: 'TECH', label: '🏢 Tech Parks & IT Corridors' }
              ] : [
                { id: 'ALL', label: '⭐ All Hubs' },
                { id: 'POPULAR', label: '🔥 Top Cities' },
                { id: 'AIRPORT', label: '✈️ Airports' },
                { id: 'TRAIN', label: '🚆 Stations' },
                { id: 'TOURIST', label: '🏛️ Hill Stations' }
              ]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl font-extrabold text-[11px] whitespace-nowrap transition cursor-pointer ${
                    activeTab === tab.id
                      ? (isPickup ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25' : 'bg-orange-500 text-white shadow-md shadow-orange-500/25')
                      : 'bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

        </div>

        {/* Validation Error Message */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Place Names List Container (Pure Names & Addresses, No Map) */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50 p-2 space-y-1">
          
          {/* Header indicator */}
          <div className="px-2 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
            <span>
              {query.trim().length > 0 
                ? (searching ? 'Searching places...' : `${suggestions.length} Locations Found:`) 
                : `${curatedPlaces.length} Recommended Destinations:`}
            </span>
            <span className="text-[10px] text-orange-600 font-extrabold">Tap to Select</span>
          </div>

          {/* Render Place Cards */}
          {displayedList.length > 0 ? (
            displayedList.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPlace(item)}
                className="w-full text-left p-3 rounded-2xl hover:bg-orange-50 active:bg-orange-100 border border-transparent hover:border-orange-200 flex items-start gap-3 transition cursor-pointer group bg-white shadow-xs mb-1"
              >
                {/* Category Icon Badge */}
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 group-hover:border-orange-300 text-orange-500 shrink-0 mt-0.5 shadow-xs">
                  {getCategoryIcon(item.category)}
                </div>

                {/* Place Name and Address Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-orange-600 transition truncate">
                      {item.name}
                    </h4>
                    <span className="text-[9px] text-orange-600 font-extrabold px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 shrink-0 uppercase tracking-wide">
                      {item.type || item.city || 'India'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5 leading-snug">
                    {item.address}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="p-8 text-center space-y-2">
              <MapPinOff className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-black text-slate-700">No matching places found</p>
              <p className="text-[10px] text-slate-500">
                Try searching for another city, airport, station, or landmark in India.
              </p>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-500 font-medium">
            ⚡ Instant accurate outstation routing
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
