import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  PlusCircle, 
  Trash2, 
  ArrowUpDown, 
  Calendar, 
  Clock, 
  Users, 
  ChevronRight, 
  Search, 
  Crosshair, 
  X, 
  ArrowRight, 
  MoveUp, 
  MoveDown, 
  Sparkles, 
  CheckCircle2, 
  Navigation, 
  Map as MapIcon, 
  AlertTriangle,
  Menu,
  Headphones,
  ShieldCheck,
  BadgePercent,
  Clock3,
  Home,
  BookOpen,
  User,
  Check,
  TrendingUp,
  Layers,
  Edit3,
  Route,
  Globe,
  Zap,
  Car,
  Bus,
  Sun,
  Moon
} from 'lucide-react';
import LiveGoogleMap from '../components/LiveGoogleMap';
import MapPickerModal from '../components/MapPickerModal';
import cabzoLogo from '../assets/cabzo_logo.png';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { calculateRouteDistance } from '../utils/distanceService';
import { getCurrentDeviceLocationGoogle } from '../utils/googleLocationService';
import { isBengaluruLocation } from '../utils/locationService';
import { VEHICLE_CONFIGS, calculateFare } from '../utils/fareCalculator';

// Realistic Destination Photos & Vehicle Hero
import destMysore from '../assets/dest_mysore.jpg';
import destCoorg from '../assets/dest_coorg.jpg';
import heroInnova from '../assets/innova_crysta.jpg';

const POPULAR_ROUTES = [
  {
    id: 'blr-mgl',
    from: 'Bengaluru',
    to: 'Mangaluru',
    distance: '389 km',
    duration: '8h 15m',
    startingFare: '₹4,950',
    tag: 'Coastal Gateway & Ghats',
    image: destCoorg,
    pickupObj: { name: 'Bengaluru', address: 'Bengaluru, Karnataka 560001, India', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
    dropObj: { name: 'Mangaluru', address: 'Mangaluru, Karnataka 575001, India', lat: 12.9141, lng: 74.8560, city: 'Mangaluru', state: 'Karnataka' }
  },
  {
    id: 'blr-mys',
    from: 'Bengaluru',
    to: 'Mysuru',
    distance: '145 km',
    duration: '3h 16m',
    startingFare: '₹2,050',
    tag: 'Heritage & Palaces',
    image: destMysore,
    pickupObj: { name: 'Bengaluru', address: 'Bengaluru, Karnataka 560001, India', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
    dropObj: { name: 'Mysuru', address: 'Mysuru, Karnataka 570001, India', lat: 12.2958, lng: 76.6394, city: 'Mysuru', state: 'Karnataka' }
  },
  {
    id: 'blr-coorg',
    from: 'Bengaluru',
    to: 'Coorg (Madikeri)',
    distance: '250 km',
    duration: '5h 30m',
    startingFare: '₹3,400',
    tag: 'Misty Hills & Coffee',
    image: destCoorg,
    pickupObj: { name: 'Bengaluru', address: 'Bengaluru, Karnataka 560001, India', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
    dropObj: { name: 'Coorg (Madikeri)', address: 'Madikeri, Kodagu, Karnataka 571201', lat: 12.4244, lng: 75.7382, city: 'Coorg', state: 'Karnataka' }
  },
  {
    id: 'blr-ooty',
    from: 'Bengaluru',
    to: 'Ooty (Nilgiris)',
    distance: '275 km',
    duration: '6h 15m',
    startingFare: '₹3,850',
    tag: 'Queen of Hill Stations',
    image: destCoorg,
    pickupObj: { name: 'Bengaluru', address: 'Bengaluru, Karnataka 560001, India', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
    dropObj: { name: 'Ooty (Nilgiris)', address: 'Udhagamandalam, The Nilgiris, Tamil Nadu 643001', lat: 11.4102, lng: 76.6950, city: 'Ooty', state: 'Tamil Nadu' }
  },
  {
    id: 'blr-chn',
    from: 'Bengaluru',
    to: 'Chennai',
    distance: '350 km',
    duration: '6h 45m',
    startingFare: '₹4,600',
    tag: 'Metro Corridor',
    image: destMysore,
    pickupObj: { name: 'Bengaluru', address: 'Bengaluru, Karnataka 560001, India', lat: 12.9716, lng: 77.5946, city: 'Bengaluru', state: 'Karnataka' },
    dropObj: { name: 'Chennai', address: 'Chennai, Tamil Nadu 600001, India', lat: 13.0827, lng: 80.2707, city: 'Chennai', state: 'Tamil Nadu' }
  }
];

export default function Screen5Home({ onNavigate, onOpenMenu, onShowToast }) {
  const { currentUser } = useAuth();
  const { 
    bookingForm, 
    updateBookingForm, 
    addStop, 
    updateStop, 
    removeStop, 
    moveStop,
    computeCurrentFare,
    bookingsDb,
    activeBooking 
  } = useBooking();

  const [mapPickerTarget, setMapPickerTarget] = useState(null);
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState(bookingForm.selectedRouteId || 'car_fastest');
  const [routeInfo, setRouteInfo] = useState({
    distanceKm: bookingForm.calculatedKm || 145,
    durationFormatted: bookingForm.estimatedDuration || '3 hrs 16 mins',
    routePoints: [],
    availableRoutes: []
  });
  const [sameLocationError, setSameLocationError] = useState(false);

  const hasPickup = Boolean(bookingForm.pickup && bookingForm.pickup.trim());
  const hasDrop = Boolean(bookingForm.drop && bookingForm.drop.trim());
  const hasCompleteRoute = hasPickup && hasDrop && !sameLocationError;

  // Recalculate distance and duration when route coordinates change via Google Directions
  useEffect(() => {
    let isMounted = true;
    async function updateRoute() {
      const pLoc = bookingForm.pickupLocation || bookingForm.pickup;
      const dLoc = bookingForm.dropLocation || bookingForm.drop;

      if (!pLoc || !dLoc || !bookingForm.pickup || !bookingForm.drop) return;

      const pName = typeof pLoc === 'object' ? pLoc.name : pLoc;
      const dName = typeof dLoc === 'object' ? dLoc.name : dLoc;
      const pLat = pLoc?.lat;
      const dLat = dLoc?.lat;

      // For round trip, same pickup and drop is VALID (you return to same city)
      // Only block same location for one-way trips
      const isRoundTrip = bookingForm.tripType === 'roundtrip';
      const isSame = (
        (pLat && dLat && Math.abs(pLat - dLat) < 0.001 && Math.abs(pLoc.lng - dLoc.lng) < 0.001) ||
        (pName && dName && pName.trim().toLowerCase() === dName.trim().toLowerCase())
      );
      if (isSame && !isRoundTrip) {
        setSameLocationError(true);
        return;
      } else {
        setSameLocationError(false);
      }

      setCalculatingRoute(true);
      const activeStops = (bookingForm.stopsLocations?.length ? bookingForm.stopsLocations : bookingForm.stops).filter(Boolean);
      const result = await calculateRouteDistance(pLoc, dLoc, activeStops, selectedRouteId);
      
      if (isMounted) {
        setRouteInfo(result);
        const currentActive = result.availableRoutes?.find(r => r.id === selectedRouteId) || result.selectedRoute || result;
        updateBookingForm({ 
          calculatedKm: currentActive.distanceKm || result.distanceKm,
          estimatedDuration: currentActive.durationFormatted || result.durationFormatted,
          routePoints: currentActive.routePoints || result.routePoints,
          selectedRouteId: currentActive.id || 'car_fastest',
          selectedRouteName: currentActive.label || 'Car (Fastest)',
          selectedRouteSummary: currentActive.summary || 'via Express Highway'
        });
        setCalculatingRoute(false);
      }
    }

    const timer = setTimeout(updateRoute, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [bookingForm.pickupLocation, bookingForm.dropLocation, bookingForm.stopsLocations, bookingForm.pickup, bookingForm.drop, bookingForm.stops, bookingForm.tripType, selectedRouteId]);

  // Handle switching between Car (Fastest), Shortest, and Bus/Coach Routes
  const handleSelectRouteOption = (routeId) => {
    setSelectedRouteId(routeId);
    const targetRoute = (routeInfo.availableRoutes || []).find(r => r.id === routeId);
    if (targetRoute) {
      setRouteInfo(prev => ({
        ...prev,
        distanceKm: targetRoute.distanceKm,
        durationFormatted: targetRoute.durationFormatted,
        routePoints: targetRoute.routePoints
      }));
      updateBookingForm({
        calculatedKm: targetRoute.distanceKm,
        estimatedDuration: targetRoute.durationFormatted,
        routePoints: targetRoute.routePoints,
        selectedRouteId: targetRoute.id,
        selectedRouteName: targetRoute.label,
        selectedRouteSummary: targetRoute.summary
      });
      if (onShowToast) onShowToast(`Selected ${targetRoute.label}: ${targetRoute.distanceKm} km`, 'info');
    }
  };

  // Handle Location Chosen from Google Map / Autocomplete
  const handleLocationSelected = (placeObj) => {
    if (mapPickerTarget === 'pickup') {
      updateBookingForm({
        pickup: placeObj.name,
        pickupLocation: placeObj
      });
      if (onShowToast) onShowToast(`Pickup set to ${placeObj.name}`, 'success');
    } else if (mapPickerTarget === 'drop') {
      updateBookingForm({
        drop: placeObj.name,
        dropLocation: placeObj
      });
      if (onShowToast) onShowToast(`Destination set to ${placeObj.name}`, 'success');
    } else if (mapPickerTarget === 'stop_new') {
      const nextStops = [...(bookingForm.stops || []), placeObj.name];
      const nextStopLocs = [...(bookingForm.stopsLocations || []), placeObj];
      updateBookingForm({
        stops: nextStops,
        stopsLocations: nextStopLocs
      });
      if (onShowToast) onShowToast(`Added stop: ${placeObj.name}`, 'info');
    } else if (typeof mapPickerTarget === 'number') {
      const nextStops = [...bookingForm.stops];
      const nextStopLocs = [...(bookingForm.stopsLocations || [])];
      nextStops[mapPickerTarget] = placeObj.name;
      nextStopLocs[mapPickerTarget] = placeObj;
      updateBookingForm({
        stops: nextStops,
        stopsLocations: nextStopLocs
      });
    }

    setMapPickerTarget(null);
  };

  // Quick action: Use Current Device GPS for Pickup
  const handleUseCurrentLocationForPickup = async (e) => {
    e.stopPropagation();
    try {
      if (onShowToast) onShowToast('Detecting GPS location...', 'info');
      const gpsPlace = await getCurrentDeviceLocationGoogle();
      if (!isBengaluruLocation(gpsPlace)) {
        if (onShowToast) onShowToast('U & I Cabs pickups are currently available exclusively from Bengaluru (Bangalore).', 'warning');
        return;
      }
      updateBookingForm({
        pickup: gpsPlace.name,
        pickupLocation: gpsPlace
      });
      if (onShowToast) onShowToast(`Pickup set to ${gpsPlace.name}`, 'success');
    } catch {
      if (onShowToast) onShowToast('Could not fetch GPS. Please search for your location.', 'warning');
    }
  };

  // Swap pickup & drop
  const handleSwap = () => {
    if (!isBengaluruLocation(bookingForm.dropLocation || bookingForm.drop)) {
      if (onShowToast) onShowToast('Pickup location must be within Bengaluru (Bangalore).', 'warning');
      return;
    }
    const tempPickup = bookingForm.pickup;
    const tempPickupLoc = bookingForm.pickupLocation;
    updateBookingForm({
      pickup: bookingForm.drop,
      pickupLocation: bookingForm.dropLocation,
      drop: tempPickup,
      dropLocation: tempPickupLoc
    });
    if (onShowToast) onShowToast(`Swapped locations`, 'info');
  };

  // Pre-fill popular route
  const handleSelectPopularRoute = (route) => {
    updateBookingForm({
      pickup: route.pickupObj.name,
      pickupLocation: route.pickupObj,
      drop: route.dropObj.name,
      dropLocation: route.dropObj
    });
    if (onShowToast) onShowToast(`Route: ${route.from} ➔ ${route.to}`, 'success');
  };

  // Passengers stepper
  const handlePassengerChange = (delta) => {
    const current = bookingForm.passengers || 2;
    const next = Math.max(1, Math.min(12, current + delta));
    updateBookingForm({ passengers: next });
  };

  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addDaysToStr = (dateStr, daysToAdd) => {
    try {
      const base = dateStr ? new Date(dateStr) : new Date();
      if (isNaN(base.getTime())) return getTodayStr();
      base.setDate(base.getDate() + Number(daysToAdd));
      const year = base.getFullYear();
      const month = String(base.getMonth() + 1).padStart(2, '0');
      const day = String(base.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch {
      return getTodayStr();
    }
  };

  const calculateDaysBetween = (startStr, endStr) => {
    try {
      if (!startStr || !endStr) return 1;
      const s = new Date(startStr);
      const e = new Date(endStr);
      if (isNaN(s.getTime()) || isNaN(e.getTime())) return 1;
      const diff = e.getTime() - s.getTime();
      if (diff < 0) return 1;
      return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)) + 1);
    } catch {
      return 1;
    }
  };

  // Handle Starting Date Change
  const handleStartDateChange = (newStart) => {
    const startStr = newStart || getTodayStr();
    const currentDays = Math.max(1, Number(bookingForm.days) || 1);
    let endStr = bookingForm.returnDate;
    if (!endStr || new Date(endStr) < new Date(startStr)) {
      endStr = addDaysToStr(startStr, currentDays - 1);
    }
    const computedDays = calculateDaysBetween(startStr, endStr);
    updateBookingForm({
      pickupDate: startStr,
      returnDate: endStr,
      days: computedDays
    });
  };

  // Handle Ending Date Change
  const handleEndDateChange = (newEnd) => {
    let startStr = bookingForm.pickupDate || getTodayStr();
    let endStr = newEnd || startStr;
    if (new Date(endStr) < new Date(startStr)) {
      startStr = endStr;
    }
    const computedDays = calculateDaysBetween(startStr, endStr);
    updateBookingForm({
      pickupDate: startStr,
      returnDate: endStr,
      days: computedDays
    });
  };

  // Handle Days Stepper Change (+ or -)
  const handleDaysChange = (delta) => {
    const currentDays = Math.max(1, Number(bookingForm.days) || 1);
    const nextDays = Math.max(1, Math.min(30, currentDays + delta));
    const startStr = bookingForm.pickupDate || getTodayStr();
    const nextEndStr = addDaysToStr(startStr, nextDays - 1);
    updateBookingForm({
      pickupDate: startStr,
      returnDate: nextEndStr,
      days: nextDays
    });
  };

  // Calculate fare & navigate to FareScreen
  const handleCalculateFare = (e) => {
    e.preventDefault();

    if (sameLocationError) {
      if (onShowToast) onShowToast('Pickup and Drop cannot be the same place.', 'error');
      return;
    }

    if (!hasCompleteRoute) {
      if (onShowToast) onShowToast('Please select both pickup and destination locations', 'error');
      return;
    }

    computeCurrentFare();
    onNavigate('FareScreen');
  };

  const { theme, toggleTheme, isDark } = useTheme();

  const userName = currentUser?.name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Customer');
  const pickupDisplayName = bookingForm.pickupLocation?.name || bookingForm.pickup || '';
  const dropDisplayName = bookingForm.dropLocation?.name || bookingForm.drop || '';

  return (
    <div className={`flex-1 flex flex-col justify-between min-h-full transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      
      {/* 1. APP HEADER */}
      <header className={`px-4 py-3 backdrop-blur-md border-b flex items-center justify-between sticky top-0 z-30 shadow-md ${isDark ? 'bg-slate-950/95 border-slate-800/90 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMenu}
            className={`w-9 h-9 rounded-2xl border flex items-center justify-center transition active:scale-95 shadow-sm ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-850' : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-950 hover:bg-slate-200'
            }`}
            aria-label="Open navigation drawer"
          >
            <Menu className="w-5 h-5 text-orange-400" />
          </button>
          
          <div className="flex items-center gap-2">
            <img 
              src={cabzoLogo} 
              alt="U & I Cabs" 
              className="w-10 h-10 rounded-2xl object-contain shadow-sm bg-white border border-slate-200 shrink-0 p-0.5" 
            />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base text-orange-500 tracking-wider">
                  U &amp; I Cabs
                </span>
                <span className="text-[9px] bg-orange-500/20 text-orange-400 border border-orange-500/30 px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                  Outstation
                </span>
              </div>
              <p className={`text-[10px] flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                <span>👋 Hello, <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{userName}</span></span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition active:scale-95 shadow-sm text-xs font-black cursor-pointer ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-amber-400 hover:bg-slate-850' 
                : 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
            }`}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-900" />
                <span className="text-[11px]">Dark</span>
              </>
            )}
          </button>

          <button
            onClick={() => onNavigate('ContactUsScreen')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-orange-400 font-bold text-xs transition shadow-sm active:scale-95 ${
              isDark ? 'bg-slate-900 border-slate-800 hover:bg-slate-850' : 'bg-slate-100 border-slate-300 hover:bg-slate-200'
            }`}
            title="24/7 Helpline Support"
          >
            <Headphones className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px]">24/7 Help</span>
          </button>

          {/* User Profile Avatar */}
          <button
            onClick={() => onNavigate('ProfileScreen')}
            className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xs flex items-center justify-center border border-white/20 shadow-md active:scale-95"
            title="View Profile"
          >
            {userName ? userName[0].toUpperCase() : 'R'}
          </button>
        </div>
      </header>

      {/* MAIN SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 max-w-md mx-auto w-full pb-20">
        
        {/* Auto-Saved Active Trip Quick Tracker Banner */}
        {activeBooking && activeBooking.status !== 'TRIP_COMPLETED' && activeBooking.status !== 'CANCELLED' && (
          <div 
            onClick={() => onNavigate('BookingStatusScreen', { bookingId: activeBooking.bookingId })}
            className={`border rounded-3xl p-3.5 flex items-center justify-between cursor-pointer transition shadow-lg group active:scale-[0.99] animate-in fade-in ${
              activeBooking.status === 'TRIP_STARTED'
                ? 'bg-gradient-to-r from-emerald-500/20 via-orange-500/15 to-emerald-500/20 border-emerald-500/50 hover:border-emerald-400'
                : 'bg-gradient-to-r from-orange-500/20 via-amber-500/10 to-orange-500/20 border-orange-500/40 hover:border-orange-500'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0 pr-2">
              <div className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 ${
                activeBooking.status === 'TRIP_STARTED'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
              }`}>
                <Car className={`w-4 h-4 ${activeBooking.status === 'TRIP_STARTED' ? 'animate-pulse' : ''}`} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${
                    activeBooking.status === 'TRIP_STARTED' ? 'text-emerald-400' : 'text-orange-400'
                  }`}>
                    {activeBooking.status === 'TRIP_STARTED'
                      ? '🚕 Live Trip In Progress'
                      : activeBooking.status === 'FINDING_DRIVER'
                        ? '⏳ Finding Driver'
                        : '🚗 Confirmed Ride'} • #{activeBooking.bookingId}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <h4 className="text-xs font-black text-white group-hover:text-orange-400 transition truncate mt-0.5">
                  {activeBooking.pickup} ➔ {activeBooking.drop}
                </h4>
              </div>
            </div>
            <div className={`flex items-center gap-1 text-[11px] font-black shrink-0 px-2.5 py-1 rounded-xl border ${
              activeBooking.status === 'TRIP_STARTED'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
            }`}>
              <span>Track Live</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
            </div>
          </div>
        )}

        {/* 2. PICKUP / DROP LOCATION SELECTION CARD */}
        <div className={`border rounded-3xl p-4 space-y-3 relative transition-colors shadow-md ${
          isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white border-slate-200/90 text-slate-900'
        }`}>
          
          {/* Header Row & Trip Type Toggle */}
          <div className="flex items-center justify-between pb-1">
            <h3 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Navigation className="w-3.5 h-3.5 text-orange-500" />
              <span>Book Your Outstation Ride</span>
            </h3>

            {/* Trip Type Tabs */}
            <div className={`flex p-1 rounded-2xl border text-[11px] font-extrabold ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => updateBookingForm({ tripType: 'oneway', days: 1 })}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  bookingForm.tripType === 'oneway'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                One Way
              </button>
              <button
                type="button"
                onClick={() => updateBookingForm({ 
                  tripType: 'roundtrip', 
                  days: Math.max(1, Number(bookingForm.days) || 1),
                  returnDate: bookingForm.returnDate || bookingForm.pickupDate || getTodayStr()
                })}
                className={`px-3 py-1 rounded-xl transition cursor-pointer ${
                  bookingForm.tripType === 'roundtrip'
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Round Trip
              </button>
            </div>
          </div>

          {/* PICKUP LOCATION FIELD (Google Places Autocomplete across India) */}
          <div
            onClick={() => setMapPickerTarget('pickup')}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition active:scale-[0.99] group ${
              isDark 
                ? (hasPickup ? 'border-emerald-500/50 bg-emerald-950/10' : 'border-slate-800 hover:border-emerald-500/60 bg-slate-950')
                : (hasPickup ? 'border-2 border-emerald-500/70 bg-emerald-50/40 shadow-xs' : 'border-2 border-slate-200 hover:border-emerald-500 bg-slate-50/70 shadow-xs')
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isDark ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-300'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      PICKUP LOCATION
                    </span>
                    <span className="text-[9px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded border border-emerald-300">
                      Bengaluru Only
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocationForPickup}
                    className="text-[9px] text-orange-500 hover:text-orange-600 font-bold flex items-center gap-1 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/30 cursor-pointer"
                    title="Use GPS current location in Bengaluru"
                  >
                    <Crosshair className="w-2.5 h-2.5" />
                    <span>GPS</span>
                  </button>
                </div>
                {hasPickup ? (
                  <>
                    <h4 className={`text-xs font-black transition truncate mt-0.5 ${isDark ? 'text-white group-hover:text-emerald-400' : 'text-slate-900 group-hover:text-emerald-700'}`}>
                      {pickupDisplayName}
                    </h4>
                    <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      {bookingForm.pickupLocation?.address || 'Tap to search and change location'}
                    </p>
                  </>
                ) : (
                  <p className={`text-xs font-bold transition mt-0.5 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                    Select address, airport, tech park, station in Bengaluru...
                  </p>
                )}
              </div>
            </div>
            <div className={`p-2 rounded-xl border shrink-0 transition ${
              isDark ? 'bg-slate-900 border-slate-800 group-hover:border-emerald-500/40 text-slate-400 group-hover:text-white' : 'bg-white border-slate-200 group-hover:border-emerald-400 text-slate-500 group-hover:text-slate-900 shadow-xs'
            }`}>
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Intermediate Stops (e.g. Mandya) */}
          {(bookingForm.stops || []).map((stop, idx) => {
            const stopObj = bookingForm.stopsLocations?.[idx];
            const stopName = typeof stop === 'object' ? stop.name : stop;
            const stopAddr = stopObj?.address || 'Intermediate stop';

            return (
              <div 
                key={idx} 
                className={`rounded-2xl p-2.5 flex items-center justify-between animate-in slide-in-from-top-1 duration-200 border ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50/90 border-2 border-amber-200 text-amber-950 shadow-xs'
                }`}
              >
                <div 
                  onClick={() => setMapPickerTarget(idx)}
                  className="flex items-start gap-2.5 flex-1 pr-2 cursor-pointer min-w-0"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-400/30 shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black text-amber-600 uppercase block">
                      Halt #{idx + 1}
                    </span>
                    <h5 className={`text-xs font-bold truncate ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{stopName}</h5>
                    <p className={`text-[9px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{stopAddr}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'up')}
                      className={`p-1 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100'}`}
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {idx < bookingForm.stops.length - 1 && (
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'down')}
                      className={`p-1 rounded-lg transition ${isDark ? 'text-slate-400 hover:text-white hover:bg-slate-800' : 'text-slate-600 hover:text-slate-950 hover:bg-amber-100'}`}
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeStop(idx)}
                    className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/20 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Stop & Swap Buttons */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => {
                if ((bookingForm.stops || []).length >= 4) {
                  if (onShowToast) onShowToast('Maximum 4 stops allowed', 'warning');
                  return;
                }
                setMapPickerTarget('stop_new');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-black text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-300 px-3.5 py-1.5 rounded-xl transition active:scale-95 cursor-pointer shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>＋ Add Stopover</span>
            </button>

            <button
              type="button"
              onClick={handleSwap}
              className={`inline-flex items-center gap-1 text-[11px] font-bold transition p-1 cursor-pointer ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950'}`}
              title="Swap pickup and drop"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-orange-500" />
              <span>Swap</span>
            </button>
          </div>

          {/* DROP DESTINATION FIELD (Google Places Autocomplete across India) */}
          <div
            onClick={() => setMapPickerTarget('drop')}
            className={`w-full border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition active:scale-[0.99] group ${
              isDark 
                ? (hasDrop ? 'border-rose-500/50 bg-rose-950/10' : 'border-slate-800 hover:border-rose-500/60 bg-slate-950')
                : (hasDrop ? 'border-2 border-rose-500/70 bg-rose-50/40 shadow-xs' : 'border-2 border-slate-200 hover:border-rose-500 bg-slate-50/70 shadow-xs')
            }`}
          >
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
                isDark ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-rose-100 text-rose-700 border-rose-300'
              }`}>
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                  DROP DESTINATION
                </span>
                {hasDrop ? (
                  <>
                    <h4 className={`text-xs font-black transition truncate mt-0.5 ${isDark ? 'text-white group-hover:text-rose-400' : 'text-slate-900 group-hover:text-rose-700'}`}>
                      {dropDisplayName}
                    </h4>
                    <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      {bookingForm.dropLocation?.address || 'Search any city, airport, hotel, or landmark in India'}
                    </p>
                  </>
                ) : (
                  <p className={`text-xs font-bold transition mt-0.5 ${isDark ? 'text-slate-400 group-hover:text-white' : 'text-slate-500 group-hover:text-slate-900'}`}>
                    Search destination (e.g. Mangaluru, Mysuru, Coorg, Ooty)...
                  </p>
                )}
              </div>
            </div>
            <div className={`p-2 rounded-xl border shrink-0 transition ${
              isDark ? 'bg-slate-900 border-slate-800 group-hover:border-rose-500/40 text-slate-400 group-hover:text-white' : 'bg-white border-slate-200 group-hover:border-rose-400 text-slate-500 group-hover:text-slate-900 shadow-xs'
            }`}>
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Same Location Error Warning */}
          {sameLocationError && (
            <div className="p-2.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Pickup and Drop cannot be identical.</span>
            </div>
          )}

          {/* QUICK BOOKING CONTROLS (STARTING DATE, ENDING DATE, DURATION, TIME, RIDERS) */}
          <div className={`pt-3 border-t space-y-2.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
            
            {bookingForm.tripType === 'oneway' ? (
              /* --- ONE WAY CONTROLS (Travel Date, Pickup Time) [Duration & Riders removed] --- */
              <div className="grid grid-cols-2 gap-2">
                {/* Travel Date */}
                <div 
                  onClick={() => {
                    const el = document.getElementById('pickup-date-input');
                    if (el && el.showPicker) {
                      try { el.showPicker(); } catch {}
                    }
                  }}
                  className={`border rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800 hover:border-orange-500/70' 
                      : 'bg-white border-2 border-slate-300 hover:border-orange-500 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <label className={`text-[9px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      <Calendar className="w-3.5 h-3.5 text-orange-500" /> Travel Date
                    </label>
                  </div>
                  <input
                    id="pickup-date-input"
                    type="date"
                    value={bookingForm.pickupDate || getTodayStr()}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                    className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                      isDark ? 'text-white' : 'text-slate-950'
                    }`}
                  />
                </div>

                {/* Pickup Time */}
                <div className={`border rounded-2xl p-2.5 flex flex-col justify-between transition ${
                  isDark 
                    ? 'bg-slate-950 border-slate-800' 
                    : 'bg-white border-2 border-slate-300 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className={`text-[9px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      <Clock className="w-3.5 h-3.5 text-orange-500" /> Time
                    </label>
                  </div>
                  <select
                    value={bookingForm.pickupTime}
                    onChange={(e) => updateBookingForm({ pickupTime: e.target.value })}
                    style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                    className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                      isDark ? 'text-white bg-slate-950' : 'text-slate-950 bg-white'
                    }`}
                  >
                    {['05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((t, idx) => (
                      <option key={idx} value={t} className={`font-bold ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'}`}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              /* --- ROUND TRIP CONTROLS (Starting Date, Ending Date, Pickup Time, Return Time) [Duration & Riders removed] --- */
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Starting Date */}
                  <div 
                    onClick={() => {
                      const el = document.getElementById('pickup-date-input');
                      if (el && el.showPicker) {
                        try { el.showPicker(); } catch {}
                      }
                    }}
                    className={`border rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 hover:border-orange-500/70' 
                        : 'bg-white border-2 border-slate-300 hover:border-orange-500 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className={`text-[9px] font-black uppercase flex items-center gap-1.5 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                        <Calendar className="w-3.5 h-3.5 text-orange-500" /> Starting Date
                      </label>
                      <div 
                        className="p-1 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500 hover:text-white transition shadow-sm"
                        title="Select Starting Date"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <input
                      id="pickup-date-input"
                      type="date"
                      value={bookingForm.pickupDate || getTodayStr()}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                      className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}
                    />
                  </div>

                  {/* Ending Date */}
                  <div 
                    onClick={() => {
                      const el = document.getElementById('return-date-input');
                      if (el && el.showPicker) {
                        try { el.showPicker(); } catch {}
                      }
                    }}
                    className={`border rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition ${
                      isDark 
                        ? 'bg-slate-950 border-slate-800 hover:border-amber-500/70' 
                        : 'bg-white border-2 border-slate-300 hover:border-amber-500 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className={`text-[9px] font-black uppercase flex items-center gap-1.5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> Ending Date
                      </label>
                      <div 
                        className="p-1 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500 hover:text-white transition shadow-sm"
                        title="Select Ending Date"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                    </div>
                    <input
                      id="return-date-input"
                      type="date"
                      min={bookingForm.pickupDate || getTodayStr()}
                      value={bookingForm.returnDate || bookingForm.pickupDate || getTodayStr()}
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                      className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Pickup Time */}
                  <div className={`border rounded-2xl p-2.5 flex flex-col justify-between transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800' 
                      : 'bg-white border-2 border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[9px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        <Clock className="w-3.5 h-3.5 text-orange-500" /> Pickup Time
                      </label>
                    </div>
                    <select
                      value={bookingForm.pickupTime}
                      onChange={(e) => updateBookingForm({ pickupTime: e.target.value })}
                      style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                      className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                        isDark ? 'text-white bg-slate-950' : 'text-slate-950 bg-white'
                      }`}
                    >
                      {['05:00 AM', '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM', '08:00 PM'].map((t, idx) => (
                        <option key={idx} value={t} className={`font-bold ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'}`}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Return Drop Time */}
                  <div className={`border rounded-2xl p-2.5 flex flex-col justify-between transition ${
                    isDark 
                      ? 'bg-slate-950 border-slate-800' 
                      : 'bg-white border-2 border-slate-300 shadow-sm'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-[9px] font-black uppercase flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                        <Clock className="w-3.5 h-3.5 text-amber-500" /> Return Time
                      </label>
                    </div>
                    <select
                      value={bookingForm.returnTime || '07:00 PM'}
                      onChange={(e) => updateBookingForm({ returnTime: e.target.value })}
                      style={{ colorScheme: isDark ? 'dark' : 'light', color: isDark ? '#ffffff' : '#020617' }}
                      className={`text-[12px] font-black outline-none w-full mt-1 cursor-pointer bg-transparent ${
                        isDark ? 'text-white bg-slate-950' : 'text-slate-950 bg-white'
                      }`}
                    >
                      {['04:00 PM', '05:00 PM', '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM', '10:00 PM'].map((t, idx) => (
                        <option key={idx} value={t} className={`font-bold ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-950'}`}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SUMMARY CALLOUT BANNER */}
            <div className={`px-3 py-2 rounded-2xl border flex items-center justify-between text-xs transition ${
              isDark 
                ? 'bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-orange-500/15 border-orange-500/30 text-orange-200' 
                : 'bg-orange-50 border-orange-200 text-orange-950 shadow-sm'
            }`}>
              {bookingForm.tripType === 'oneway' ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">⚡</span>
                    <div>
                      <span className="font-extrabold block text-xs">
                        One-Way Direct Outstation Cab
                      </span>
                      <span className={`text-[10px] ${isDark ? 'text-orange-300/80' : 'text-orange-700'}`}>
                        Route: {routeInfo.distanceKm || 145} KM • Min billable: 250 KM • Zero return charges
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isDark ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-orange-100 border-orange-300 text-orange-900 font-bold'
                    }`}>
                      Min 250 KM
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🗓️</span>
                    <div>
                      <span className="font-extrabold block text-xs">
                        {(Number(bookingForm.days) || 1)} Day{(Number(bookingForm.days) || 1) === 1 ? '' : 's'} Round Trip
                      </span>
                      {(() => {
                        const d = Number(bookingForm.days) || 1;
                        const bPerDay = d === 1 ? 300 : 400;
                        const totalBata = d * bPerDay;
                        return (
                          <span className={`text-[10px] ${isDark ? 'text-orange-300/80' : 'text-orange-700'}`}>
                            Driver Bata: ₹{totalBata} ({d === 1 ? '₹300/day' : '₹400/day'}) • Min billable: {d * 250} KM
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                      isDark ? 'bg-orange-500/20 border-orange-500/40 text-orange-300' : 'bg-orange-100 border-orange-300 text-orange-900 font-bold'
                    }`}>
                      ₹{((Number(bookingForm.days) || 1) === 1 ? 300 : (Number(bookingForm.days) || 1) * 400)} Bata
                    </span>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

        {/* 3. LIVE SATELLITE ROUTE MAP SECTION (Transitions in when Pickup & Drop are selected) */}
        {hasCompleteRoute && (
          <div className={`border rounded-3xl p-4 shadow-xl space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300 ${
            isDark ? 'bg-slate-900 border-orange-500/50' : 'bg-white border-2 border-slate-200'
          }`}>
            
            {/* Route Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-500 border border-orange-500/30">
                  <Route className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-xs font-black truncate max-w-[200px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    {pickupDisplayName} ➔ {dropDisplayName}
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time Google Driving Route</span>
                  </p>
                </div>
              </div>

              {/* Distance Badge */}
              <div className={`text-right px-3 py-1.5 rounded-2xl border ${
                isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200 shadow-xs'
              }`}>
                <span className="text-xs font-black text-orange-600 block">
                  {routeInfo.distanceKm} km
                </span>
                <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Direct Highway
                </span>
              </div>
            </div>

            {/* LIVE REAL GOOGLE SATELLITE MAP */}
            <div className={`overflow-hidden rounded-2xl border shadow-inner ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <LiveGoogleMap 
                pickupLocation={bookingForm.pickupLocation || { lat: 12.9716, lng: 77.5946, name: pickupDisplayName }}
                dropLocation={bookingForm.dropLocation || { lat: 12.2958, lng: 76.6394, name: dropDisplayName }}
                stopsLocations={bookingForm.stopsLocations || []}
                availableRoutes={routeInfo.availableRoutes || []}
                selectedRouteId={selectedRouteId}
                onSelectRoute={handleSelectRouteOption}
                distanceKm={routeInfo.distanceKm}
                duration={routeInfo.durationFormatted}
                height="h-56 sm:h-64"
                showHud={false}
              />
            </div>

            {/* TRIP DISTANCE DISPLAY (Pure Distance & Travel Duration) */}
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between shadow-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    TOTAL TRIP DISTANCE
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {routeInfo.distanceKm} km
                    </span>
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <span>Extra: ₹12/km</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[9px] font-extrabold uppercase text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full shadow-xs">
                  Direct Route
                </span>
                <p className={`text-[10px] font-medium mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  National Highway
                </p>
              </div>
            </div>

            {/* Route Stops / Points Summary */}
            <div className={`p-2.5 rounded-2xl border space-y-1.5 text-xs ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 text-[9px] font-black text-white flex items-center justify-center shrink-0">
                  A
                </span>
                <span className={`font-bold truncate text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{pickupDisplayName}</span>
                <span className="text-[9px] text-emerald-600 ml-auto font-extrabold uppercase">Pickup</span>
              </div>

              {(bookingForm.stops || []).map((stop, idx) => (
                <div key={idx} className="flex items-center gap-2 pl-1 border-l-2 border-amber-500 ml-1.5 py-0.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                  <span className={`font-bold truncate text-[11px] ${isDark ? 'text-amber-300' : 'text-slate-900'}`}>{typeof stop === 'object' ? stop.name : stop}</span>
                  <span className="text-[9px] text-amber-600 ml-auto font-medium">Halt #{idx + 1}</span>
                </div>
              ))}

              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center shrink-0">
                  B
                </span>
                <span className={`font-bold truncate text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>{dropDisplayName}</span>
                <span className="text-[9px] text-rose-600 ml-auto font-extrabold uppercase">Destination</span>
              </div>
            </div>

            {/* Quick Route Actions: Add Stop | Edit Pickup | Edit Drop */}
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setMapPickerTarget('stop_new')}
                className={`flex-1 py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs ${
                  isDark ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-amber-400' : 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Stop</span>
              </button>

              <button
                type="button"
                onClick={() => setMapPickerTarget('pickup')}
                className={`flex-1 py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs ${
                  isDark ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <Edit3 className="w-3 h-3 text-emerald-600" />
                <span>Edit Pickup</span>
              </button>

              <button
                type="button"
                onClick={() => setMapPickerTarget('drop')}
                className={`flex-1 py-2 px-3 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1 transition cursor-pointer shadow-xs ${
                  isDark ? 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <Edit3 className="w-3 h-3 text-rose-600" />
                <span>Edit Drop</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. CHOOSE YOUR VEHICLE FLEET */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Choose Your Vehicle
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Commercial yellow-plate vehicles with AC</p>
            </div>
            <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-300 shadow-xs">
              Clean & Sanitized
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {Object.values(VEHICLE_CONFIGS).map((veh) => {
              const isAvailable = veh.available !== false;
              const isSelected = bookingForm.vehicleId === veh.id && isAvailable;
              const estKm = hasCompleteRoute ? (routeInfo.distanceKm || 145) : 145;
              const isRT = bookingForm.tripType === 'roundtrip';
              const daysCount = isRT ? Math.max(1, Number(bookingForm.days) || 1) : 1;
              const previewFare = (hasCompleteRoute && isAvailable) ? calculateFare({
                vehicleId: veh.id,
                distanceKm: estKm,
                days: daysCount,
                tripType: bookingForm.tripType,
                includeToll: bookingForm.includeToll,
                needCarrier: bookingForm.needCarrier,
                pickup: bookingForm.pickupLocation || bookingForm.pickup,
                drop: bookingForm.dropLocation || bookingForm.drop
              }) : null;
              const approxCost = previewFare ? previewFare.grossTotal : null;

              return (
                <div
                  key={veh.id}
                  onClick={() => {
                    if (!isAvailable) {
                      if (onShowToast) onShowToast(`${veh.name} is presently not available. Please choose Ertiga or Innova Crysta.`, 'info');
                      return;
                    }
                    updateBookingForm({ vehicleId: veh.id });
                  }}
                  className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between cursor-pointer group shadow-sm ${
                    !isAvailable
                      ? (isDark ? 'border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed' : 'border-slate-200 bg-slate-100/80 opacity-70 cursor-not-allowed')
                      : isSelected
                        ? (isDark ? 'border-orange-500 bg-slate-900 ring-2 ring-orange-500/30 shadow-xl' : 'border-2 border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20 shadow-md')
                        : (isDark ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700' : 'border-2 border-slate-200 bg-white hover:border-orange-400 shadow-xs')
                  }`}
                >
                  {/* Real Vehicle Photograph */}
                  <div className={`h-24 w-full overflow-hidden relative ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                    <img 
                      src={veh.image} 
                      alt={`${veh.name} commercial outstation cab`}
                      className={`w-full h-full object-cover transition-transform duration-500 ${isAvailable ? 'group-hover:scale-105' : 'grayscale'}`}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900 via-transparent to-transparent' : 'from-black/40 via-transparent to-transparent'}`} />
                    
                    {/* Rate pill or Unavailable Badge */}
                    {isAvailable ? (
                      <span className={`absolute top-2 right-2 text-[10px] font-black px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                        isDark ? 'bg-slate-950/80 text-orange-400 border border-orange-500/30' : 'bg-white/95 text-orange-600 border border-orange-200'
                      }`}>
                        ₹{isRT ? (veh.roundTripRatePerKm || veh.ratePerKm) : veh.ratePerKm}/km {isRT ? '• Round Trip' : `(+₹${veh.oneWayReturnRatePerKm || 7}/km return)`}
                      </span>
                    ) : (
                      <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-950/90 text-rose-300 border border-rose-500/40 backdrop-blur-md">
                        Not Available
                      </span>
                    )}

                    {!isAvailable && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                        <span className="text-[10px] font-black uppercase tracking-wider text-rose-200 bg-rose-900/80 border border-rose-500/50 px-2 py-0.5 rounded-lg shadow-sm">
                          🚫 Presently Not Available
                        </span>
                      </div>
                    )}

                    {/* Selected check */}
                    {isSelected && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Vehicle Specs (Duration and riders removed) */}
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <h4 className={`font-extrabold text-xs transition truncate ${isDark ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-600'}`}>
                        {veh.name}
                      </h4>
                      <span className="text-[11px] font-black text-emerald-600">
                        {isAvailable && approxCost != null ? `₹${approxCost.toLocaleString('en-IN')}` : (isAvailable ? '—' : 'Unavailable')}
                      </span>
                    </div>
                    <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {veh.modelName || veh.description}
                    </p>
                    <div className={`mt-2 flex items-center justify-between text-[10px] font-bold pt-1.5 border-t ${
                      isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
                    }`}>
                      <span>🧳 {veh.luggage}</span>
                      <span className="text-orange-500 font-extrabold">Extra: ₹12/km</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ROOF CARRIER / EXTRA LUGGAGE OPTION (+₹100) */}
          <div className={`p-3 rounded-2xl border transition-all shadow-xs flex items-center justify-between mt-2.5 ${
            bookingForm.needCarrier
              ? (isDark ? 'bg-orange-950/30 border-orange-500/70 ring-1 ring-orange-500/30' : 'bg-orange-50/80 border-orange-300 ring-1 ring-orange-400/20')
              : (isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200')
          }`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center text-lg border shrink-0 ${
                bookingForm.needCarrier 
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                  : (isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700')
              }`}>
                🧳
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    Roof Carrier for Extra Luggage
                  </h4>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full">
                    +₹100
                  </span>
                </div>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Fitted on vehicle roof for extra bags, suitcases & oversized luggage
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateBookingForm({ needCarrier: !bookingForm.needCarrier })}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition cursor-pointer border shrink-0 ${
                bookingForm.needCarrier
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : (isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-300')
              }`}
            >
              {bookingForm.needCarrier ? '✓ Carrier Added (+₹100)' : '+ Add Carrier (₹100)'}
            </button>
          </div>

          {/* EXTRA KM OVERAGE NOTICE (₹12/KM AFTER DESTINATION) */}
          <div className={`p-2.5 rounded-2xl border flex items-center justify-between text-[11px] ${
            isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="font-bold flex items-center gap-1.5">
              <span>🛣️</span>
              <span>After total destination over:</span>
            </span>
            <span className="font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
              ₹12 / KM
            </span>
          </div>

          {/* PRIMARY ACTION CTA: CONTINUE TO FARE CALCULATION (UNDER CAR SELECTION) */}
          <button
            type="button"
            onClick={handleCalculateFare}
            className="w-full mt-2 font-extrabold py-3.5 px-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-xs uppercase tracking-wider bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30 active:scale-[0.99] transition cursor-pointer"
          >
            <span>CONTINUE → CALCULATE FARE {hasCompleteRoute && routeInfo.distanceKm ? `(${routeInfo.distanceKm} KM)` : ''}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 5. POPULAR OUTSTATION ROUTES (HORIZONTAL SCROLL) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Popular Outstation Routes
              </h3>
              <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>One-tap route prefill with Google Maps</p>
            </div>
            <span className="text-[10px] text-amber-700 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-xs">
              <TrendingUp className="w-3 h-3 text-amber-600" /> Top Rated
            </span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {POPULAR_ROUTES.map((route) => (
              <div
                key={route.id}
                onClick={() => handleSelectPopularRoute(route)}
                className={`w-56 shrink-0 rounded-3xl border overflow-hidden shadow-sm transition duration-300 cursor-pointer snap-start group ${
                  isDark ? 'border-slate-800 bg-slate-900 hover:border-orange-500/50' : 'border-2 border-slate-200 bg-white hover:border-orange-400'
                }`}
              >
                <div className={`h-24 w-full relative overflow-hidden ${isDark ? 'bg-slate-950' : 'bg-slate-100'}`}>
                  <img 
                    src={route.image} 
                    alt={route.to} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-slate-900 via-slate-900/30 to-transparent' : 'from-black/40 via-transparent to-transparent'}`} />
                  <span className={`absolute top-2 left-2 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full backdrop-blur-md shadow-xs ${
                    isDark ? 'bg-slate-950/80 text-amber-300 border border-amber-500/30' : 'bg-white/95 text-amber-900 border border-amber-300'
                  }`}>
                    {route.tag}
                  </span>
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-xs font-black transition truncate ${isDark ? 'text-white group-hover:text-orange-400' : 'text-slate-900 group-hover:text-orange-600'}`}>
                      {route.from} ➔ {route.to}
                    </h4>
                  </div>
                  <div className={`flex items-center justify-between text-[10px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span>{route.distance}</span>
                    <span className="text-orange-600 font-black">{route.startingFare}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. WHY CHOOSE CABZO (4 PREMIUM CARDS) */}
        <div className="space-y-2.5">
          <div className="px-1">
            <h3 className={`text-xs font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Why Choose U &amp; I Cabs
            </h3>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Your Ride, Your Way • Safe & Guaranteed Outstation Travel</p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 shadow-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-2 border-slate-200'
            }`}>
              <div className="p-2 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Verified Drivers</h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Police verified, highway experts</p>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 shadow-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-2 border-slate-200'
            }`}>
              <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shrink-0">
                <BadgePercent className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Transparent Pricing</h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Zero hidden charges, clear tolls</p>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 shadow-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-2 border-slate-200'
            }`}>
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 shrink-0">
                <Clock3 className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>On-Time Pickup</h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Guaranteed on-time or compensated</p>
              </div>
            </div>

            <div className={`p-3 rounded-2xl border flex items-start gap-2.5 shadow-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-2 border-slate-200'
            }`}>
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 shrink-0">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <h4 className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>24/7 Helpline</h4>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Call / WhatsApp: 8310754133</p>
              </div>
            </div>
          </div>
        </div>

        {/* 7. ACTIVE / UPCOMING BOOKING CARD */}
        {activeBooking ? (
          <div 
            onClick={() => onNavigate('BookingStatusScreen')}
            className={`p-3.5 rounded-3xl border flex items-center justify-between cursor-pointer shadow-md transition group ${
              isDark 
                ? 'bg-gradient-to-r from-orange-500/15 via-slate-900 to-amber-500/10 border-orange-500/40 hover:border-orange-500' 
                : 'bg-gradient-to-r from-orange-50 via-white to-amber-50 border-2 border-orange-300 hover:border-orange-500'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 border border-orange-300 flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                BK
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-black text-orange-700 bg-orange-100 px-2 py-0.2 rounded-full border border-orange-300">
                    Upcoming Ride
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {activeBooking.bookingId}
                  </span>
                </div>
                <h4 className={`text-xs font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {activeBooking.pickup} ➔ {activeBooking.drop}
                </h4>
                <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {activeBooking.pickupDate} • {activeBooking.pickupTime} • {activeBooking.vehicleName}
                </p>
              </div>
            </div>

            <span className="text-xs font-bold text-orange-600 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
              Track &gt;
            </span>
          </div>
        ) : (
          <div className={`p-3.5 rounded-3xl border text-center shadow-xs ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-2 border-slate-200'
          }`}>
            <p className={`text-xs font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>Book your first outstation ride with U &amp; I Cabs</p>
            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Your Ride, Your Way • Guaranteed cabs with transparent fares</p>
          </div>
        )}

      </div>

      {/* 8. BOTTOM NAVIGATION BAR */}
      <nav className={`sticky bottom-0 left-0 right-0 backdrop-blur-lg border-t py-2 px-6 flex items-center justify-around z-40 shadow-xl ${
        isDark ? 'bg-slate-950/95 border-slate-800/90' : 'bg-white/95 border-slate-200 shadow-md'
      }`}>
        <button
          onClick={() => onNavigate('HomeScreen')}
          className="flex flex-col items-center gap-1 text-orange-600 transition cursor-pointer"
        >
          <Home className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">Home</span>
        </button>

        <button
          onClick={() => onNavigate('MyBookingsScreen')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950 font-medium'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[10px] font-bold">Bookings</span>
        </button>

        <button
          onClick={() => onNavigate('CompletedTripsScreen')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950 font-medium'
          }`}
        >
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-[10px] font-bold">Trips</span>
        </button>

        <button
          onClick={() => onNavigate('ProfileScreen')}
          className={`flex flex-col items-center gap-1 transition cursor-pointer ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-950 font-medium'
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[10px] font-bold">Profile</span>
        </button>
      </nav>

      {/* Interactive Google Map & Places Autocomplete Modal */}
      <MapPickerModal
        isOpen={Boolean(mapPickerTarget !== null)}
        onClose={() => setMapPickerTarget(null)}
        onSelectLocation={handleLocationSelected}
        title={
          mapPickerTarget === 'pickup' ? 'Select Pickup Location (Bengaluru Only)' :
          mapPickerTarget === 'drop' ? 'Select Destination' :
          'Select Intermediate Stop'
        }
        isPickup={mapPickerTarget === 'pickup'}
        initialLocation={
          mapPickerTarget === 'pickup' ? bookingForm.pickupLocation :
          mapPickerTarget === 'drop' ? bookingForm.dropLocation :
          typeof mapPickerTarget === 'number' ? bookingForm.stopsLocations?.[mapPickerTarget] : null
        }
        otherLocation={
          mapPickerTarget === 'pickup' ? bookingForm.dropLocation :
          mapPickerTarget === 'drop' ? bookingForm.pickupLocation : null
        }
        allowSameLocation={bookingForm.tripType === 'roundtrip'}
      />

    </div>
  );
}
