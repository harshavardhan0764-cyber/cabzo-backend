import React, { createContext, useContext, useState, useEffect } from 'react';
import { calculateFare } from '../utils/fareCalculator';
import { useAuth } from './AuthContext';
import { getCandidateApiUrls } from '../config/api';

const BookingContext = createContext();

export const BOOKING_STATUSES = {
  FINDING_DRIVER: 'FINDING_DRIVER',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ON_THE_WAY: 'DRIVER_ON_THE_WAY',
  TRIP_STARTED: 'TRIP_STARTED',
  TRIP_COMPLETED: 'TRIP_COMPLETED',
  CANCELLED: 'CANCELLED'
};

const getTodayDateStr = () => {
  try {
    return new Date().toISOString().split('T')[0];
  } catch {
    return '2026-10-02';
  }
};

const getFutureDateStr = (daysAhead = 3) => {
  try {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  } catch {
    return '2026-10-05';
  }
};

const INITIAL_BOOKING_FORM = {
  tripType: 'roundtrip', // default round trip
  pickup: '',
  pickupLocation: null,
  drop: '',
  dropLocation: null,
  stops: [],
  stopsLocations: [],
  pickupDate: getTodayDateStr(),
  pickupTime: '06:00 AM',
  returnDate: getTodayDateStr(),
  returnTime: '07:00 PM',
  vehicleId: 'suv',
  passengers: 2,
  needCarrier: false,
  includeToll: true,
  isAutoKm: true,
  manualKm: 145,
  calculatedKm: 145,
  estimatedDuration: '3 hrs 15 mins',
  routePoints: [],
  selectedRouteId: 'direct_highway',
  selectedRouteName: 'Direct Highway',
  selectedRouteSummary: 'via National Highway Expressway',
  days: 1
};

const DEFAULT_BOOKINGS = [
  {
    bookingId: 'BK-10024',
    userPhone: '9876543210',
    tripType: 'oneway',
    pickup: 'Bengaluru',
    pickupLocation: {
      name: 'Bengaluru',
      address: 'Bengaluru, Karnataka 560001, India',
      lat: 12.9716,
      lng: 77.5946
    },
    drop: 'Mysuru',
    dropLocation: {
      name: 'Mysuru',
      address: 'Mysuru, Karnataka 570001, India',
      lat: 12.2958,
      lng: 76.6394
    },
    stops: ['Mandya (Breakfast Halt)'],
    stopsLocations: [
      {
        name: 'Mandya (Breakfast Halt)',
        address: 'Bengaluru - Mysuru Expy, Mandya, Karnataka 571401',
        lat: 12.5244,
        lng: 76.8958
      }
    ],
    pickupDate: '12 Sep 2026',
    pickupTime: '06:00 AM',
    returnDate: null,
    returnTime: null,
    vehicleName: 'Sedan (4+1)',
    vehicleId: 'sedan',
    passengers: 2,
    distanceKm: 145,
    estimatedDuration: '3 hrs 15 mins',
    days: 1,
    includeToll: true,
    estimatedFare: 2050,
    advancePaid: 500,
    balancePayable: 1550,
    status: BOOKING_STATUSES.DRIVER_ASSIGNED,
    driverDetails: {
      name: 'M. Suresh Kumar',
      phone: '+91 94441 23456',
      cabNumber: 'TN 09 BX 4589',
      cabModel: 'Maruti Suzuki Dzire',
      rating: 4.9
    },
    paymentId: 'pay_rzp_9847291',
    createdAt: Date.now() - 3600000 * 2
  },
  {
    bookingId: 'BK-10012',
    userPhone: '9876543210',
    tripType: 'roundtrip',
    pickup: 'Chennai T. Nagar',
    drop: 'Pondicherry White Town',
    stops: ['Mahabalipuram'],
    pickupDate: '20 Aug 2026',
    pickupTime: '07:00 AM',
    returnDate: '22 Aug 2026',
    returnTime: '08:00 PM',
    vehicleName: 'Sedan (4+1)',
    vehicleId: 'sedan',
    passengers: 3,
    distanceKm: 340,
    days: 3,
    includeToll: true,
    estimatedFare: 1620,
    advancePaid: 500,
    balancePayable: 1120,
    status: BOOKING_STATUSES.TRIP_COMPLETED,
    driverDetails: {
      name: 'R. Karthi',
      phone: '+91 98840 98765',
      cabNumber: 'TN 07 CA 9012',
      cabModel: 'Toyota Etios (White AC)',
      rating: 5.0
    },
    paymentId: 'pay_rzp_8841920',
    createdAt: Date.now() - 86400000 * 19
  }
];

export function BookingProvider({ children }) {
  const { currentPhone, currentUser } = useAuth();
  
  // Auto-save & restore Draft Booking Form
  const [bookingForm, setBookingForm] = useState(() => {
    try {
      const saved = localStorage.getItem('CabApp_Draft_Booking');
      return saved ? { ...INITIAL_BOOKING_FORM, ...JSON.parse(saved) } : INITIAL_BOOKING_FORM;
    } catch {
      return INITIAL_BOOKING_FORM;
    }
  });

  const [fareSummary, setFareSummary] = useState(null);
  
  // Persistent active booking reference (defaults to null for clean slate)
  const [activeBookingId, setActiveBookingId] = useState(() => {
    return localStorage.getItem('CabApp_ActiveBookingId') || null;
  });

  // Firebase Bookings collection (Auto-saved to localStorage)
  const [bookingsDb, setBookingsDb] = useState(() => {
    try {
      const saved = localStorage.getItem('CabApp_Firebase_Bookings');
      return saved ? JSON.parse(saved) : DEFAULT_BOOKINGS;
    } catch {
      return DEFAULT_BOOKINGS;
    }
  });

  // Reported issues (Auto-saved to localStorage)
  const [reportedIssues, setReportedIssues] = useState(() => {
    try {
      const saved = localStorage.getItem('CabApp_Firebase_Issues');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Auto-persist draft form on every change
  useEffect(() => {
    try {
      localStorage.setItem('CabApp_Draft_Booking', JSON.stringify(bookingForm));
    } catch {}
  }, [bookingForm]);

  // Auto-persist all bookings to persistent storage
  useEffect(() => {
    try {
      localStorage.setItem('CabApp_Firebase_Bookings', JSON.stringify(bookingsDb));
    } catch {}
  }, [bookingsDb]);

  // Auto-persist active booking ID
  useEffect(() => {
    if (activeBookingId) {
      try {
        localStorage.setItem('CabApp_ActiveBookingId', activeBookingId);
      } catch {}
    } else {
      try {
        localStorage.removeItem('CabApp_ActiveBookingId');
      } catch {}
    }
  }, [activeBookingId]);

  // Clean-slate detection: When user logs in with new account or switches, start completely fresh!
  useEffect(() => {
    const lastPhone = localStorage.getItem('CabApp_LastSessionPhone');
    const cleanCurrent = (currentPhone || '').replace(/\D/g, '').slice(-10);

    if (cleanCurrent && lastPhone !== cleanCurrent) {
      // User changed or new user logged in -> start completely fresh across all features!
      localStorage.setItem('CabApp_LastSessionPhone', cleanCurrent);
      setBookingForm(INITIAL_BOOKING_FORM);
      setActiveBookingId(null);
      try {
        localStorage.removeItem('CabApp_Draft_Booking');
        localStorage.removeItem('CabApp_ActiveBookingId');
      } catch {}
    } else if (!cleanCurrent && lastPhone) {
      // User logged out
      localStorage.removeItem('CabApp_LastSessionPhone');
      setBookingForm(INITIAL_BOOKING_FORM);
      setActiveBookingId(null);
      try {
        localStorage.removeItem('CabApp_Draft_Booking');
        localStorage.removeItem('CabApp_ActiveBookingId');
      } catch {}
    }
  }, [currentPhone]);

  useEffect(() => {
    try {
      localStorage.setItem('CabApp_Firebase_Issues', JSON.stringify(reportedIssues));
    } catch {}
  }, [reportedIssues]);

  // Real-time synchronization of Driver Assignment and Booking Status across Customer & Admin apps
  useEffect(() => {
    const syncBookingsState = () => {
      try {
        const stored = localStorage.getItem('cabzo_bookings') || localStorage.getItem('CabApp_Firebase_Bookings');
        if (stored) {
          const list = JSON.parse(stored);
          if (Array.isArray(list) && list.length > 0) {
            setBookingsDb(prev => {
              let changed = false;
              const next = prev.map(item => {
                const updated = list.find(l => l.bookingId === item.bookingId || l.id === item.bookingId);
                if (updated && (updated.status !== item.status || updated.driverDetails || updated.driver)) {
                  changed = true;
                  return {
                    ...item,
                    status: updated.status || item.status,
                    driverDetails: updated.driverDetails || updated.driver || item.driverDetails,
                    driver: updated.driverDetails || updated.driver || item.driver
                  };
                }
                return item;
              });
              return changed ? next : prev;
            });
          }
        }
      } catch (_) {}
    };

    // 1. Listen for storage changes across tabs / frames
    window.addEventListener('storage', syncBookingsState);
    window.addEventListener('cabzo_driver_assigned', syncBookingsState);

    // 2. Poll backend every 2.5 seconds for active booking driver updates
    const pollInterval = setInterval(async () => {
      syncBookingsState();

      if (activeBookingId) {
        try {
          const urls = getCandidateApiUrls(`/bookings/${activeBookingId}/status`);
          const res = await Promise.any(urls.map(async (url) => {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 2000);
            try {
              const r = await fetch(url, { signal: controller.signal });
              clearTimeout(timer);
              if (r.ok) return r;
              throw new Error(`HTTP ${r.status}`);
            } catch (err) {
              clearTimeout(timer);
              throw err;
            }
          })).catch(() => null);

          if (res && res.ok) {
            const json = await res.json().catch(() => null);
            if (json && json.success && json.data) {
              const liveData = json.data;
              if (liveData.driverDetails || liveData.status !== BOOKING_STATUSES.FINDING_DRIVER) {
                setBookingsDb(prev => prev.map(b => {
                  if (b.bookingId === activeBookingId) {
                    return {
                      ...b,
                      status: liveData.status || b.status,
                      driverDetails: liveData.driverDetails || b.driverDetails,
                      driver: liveData.driverDetails || b.driver
                    };
                  }
                  return b;
                }));
              }
            }
          }
        } catch (_) {}
      }
    }, 2500);

    return () => {
      window.removeEventListener('storage', syncBookingsState);
      window.removeEventListener('cabzo_driver_assigned', syncBookingsState);
      clearInterval(pollInterval);
    };
  }, [activeBookingId]);

  // Compute fare
  const computeCurrentFare = (customForm = null) => {
    const form = customForm || bookingForm;
    const km = form.isAutoKm ? form.calculatedKm : (Number(form.manualKm) || 145);
    
    let days = 1;
    if (form.tripType === 'roundtrip') {
      if (form.pickupDate && form.returnDate) {
        const start = new Date(form.pickupDate);
        const end = new Date(form.returnDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
          const diffTime = end.getTime() - start.getTime();
          days = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);
        } else {
          days = Math.max(1, Number(form.days) || 1);
        }
      } else {
        days = Math.max(1, Number(form.days) || 1);
      }
    } else {
      // One-way trips are strictly 1 day (unless > 650 km)
      days = km > 650 ? Math.ceil(km / 500) : 1;
    }

    const activeStops = (form.stopsLocations?.length ? form.stopsLocations : form.stops || []).filter(Boolean);

    const fare = calculateFare({
      vehicleId: form.vehicleId,
      distanceKm: km,
      days,
      tripType: form.tripType,
      includeToll: form.includeToll,
      passengers: form.passengers,
      needCarrier: form.needCarrier || false,
      pickup: form.pickupLocation || form.pickup,
      drop: form.dropLocation || form.drop,
      stops: activeStops
    });

    setFareSummary(fare);
    return fare;
  };

  useEffect(() => {
    computeCurrentFare();
  }, [
    bookingForm.vehicleId, 
    bookingForm.calculatedKm, 
    bookingForm.manualKm, 
    bookingForm.tripType, 
    bookingForm.includeToll, 
    bookingForm.needCarrier,
    bookingForm.passengers,
    bookingForm.pickupDate,
    bookingForm.returnDate,
    bookingForm.days,
    bookingForm.pickup,
    bookingForm.drop,
    bookingForm.stops,
    bookingForm.stopsLocations
  ]);

  const updateBookingForm = (updates) => {
    setBookingForm(prev => {
      const updated = { ...prev, ...updates };
      return updated;
    });
  };

  // Stop Management: Add, Update, Remove, Move (100% in sync)
  const addStop = (stopName = '', stopLocation = null) => {
    if ((bookingForm.stops || []).length >= 4) return false;
    setBookingForm(prev => {
      const stops = [...(prev.stops || []), stopName];
      const stopsLocations = [...(prev.stopsLocations || [])];
      stopsLocations.push(stopLocation || (stopName ? { name: stopName, address: stopName } : null));
      return { ...prev, stops, stopsLocations };
    });
    return true;
  };

  const updateStop = (index, value, stopLocation = null) => {
    setBookingForm(prev => {
      const nextStops = [...(prev.stops || [])];
      nextStops[index] = typeof value === 'object' ? value.name : value;
      
      const nextStopLocs = [...(prev.stopsLocations || [])];
      while (nextStopLocs.length <= index) {
        nextStopLocs.push(null);
      }
      nextStopLocs[index] = stopLocation || (typeof value === 'object' ? value : { name: value, address: value });
      return { ...prev, stops: nextStops, stopsLocations: nextStopLocs };
    });
  };

  const removeStop = (index) => {
    setBookingForm(prev => {
      const stops = (prev.stops || []).filter((_, i) => i !== index);
      const stopsLocations = (prev.stopsLocations || []).filter((_, i) => i !== index);
      return { ...prev, stops, stopsLocations };
    });
  };

  const moveStop = (index, direction) => {
    setBookingForm(prev => {
      const newStops = [...(prev.stops || [])];
      const newStopLocs = [...(prev.stopsLocations || [])];
      while (newStopLocs.length < newStops.length) {
        newStopLocs.push(null);
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newStops.length) return prev;
      
      const tempStop = newStops[index];
      newStops[index] = newStops[targetIndex];
      newStops[targetIndex] = tempStop;

      const tempLoc = newStopLocs[index];
      newStopLocs[index] = newStopLocs[targetIndex];
      newStopLocs[targetIndex] = tempLoc;

      return { ...prev, stops: newStops, stopsLocations: newStopLocs };
    });
  };

  // Create & Auto-Save Booking upon successful payment
  const createBooking = (paymentDetails) => {
    const calculatedDays = fareSummary ? fareSummary.numDays : 1;
    const calculatedDistance = bookingForm.isAutoKm ? bookingForm.calculatedKm : Number(bookingForm.manualKm);
    
    // Generate unique auto-incrementing / random Booking ID
    const newId = `BK-${Math.floor(10000 + Math.random() * 90000)}`;

    let formattedDate = '12 Sep 2026';
    try {
      if (bookingForm.pickupDate) {
        const d = new Date(bookingForm.pickupDate);
        if (!isNaN(d.getTime())) {
          formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
    } catch {}

    let formattedReturnDate = null;
    try {
      if (bookingForm.returnDate) {
        const d = new Date(bookingForm.returnDate);
        if (!isNaN(d.getTime())) {
          formattedReturnDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        }
      }
    } catch {}

    const resolvedPhone = (bookingForm.userPhone || bookingForm.customerPhone || currentPhone || currentUser?.phone || '').replace(/\D/g, '').slice(-10);

    const newBooking = {
      bookingId: newId,
      id: newId,
      userPhone: resolvedPhone,
      userName: bookingForm.userName || currentUser?.name || currentUser?.full_name || 'Customer',
      userEmail: paymentDetails?.userEmail || currentUser?.email || localStorage.getItem('CabApp_CustomerEmail') || '',
      tripType: bookingForm.tripType,
      pickup: typeof bookingForm.pickup === 'object' ? bookingForm.pickup.name : (bookingForm.pickup || 'Bengaluru'),
      pickupLocation: bookingForm.pickupLocation || { name: bookingForm.pickup || 'Bengaluru', address: 'Bengaluru, Karnataka', lat: 12.9716, lng: 77.5946 },
      drop: typeof bookingForm.drop === 'object' ? bookingForm.drop.name : (bookingForm.drop || 'Mysuru'),
      dropLocation: bookingForm.dropLocation || { name: bookingForm.drop || 'Mysuru', address: 'Mysuru, Karnataka', lat: 12.2958, lng: 76.6394 },
      stops: (bookingForm.stops || []).filter(Boolean),
      stopsLocations: bookingForm.stopsLocations || [],
      pickupDate: formattedDate,
      pickupTime: bookingForm.pickupTime || '06:00 AM',
      returnDate: formattedReturnDate || bookingForm.returnDate || null,
      returnTime: bookingForm.returnTime || '07:00 PM',
      vehicleName: fareSummary?.vehicle?.name || 'Sedan (4+1)',
      vehicleId: bookingForm.vehicleId || 'sedan',
      passengers: bookingForm.passengers || 2,
      distanceKm: calculatedDistance || 145,
      estimatedDuration: bookingForm.estimatedDuration || '3 hrs 15 mins',
      selectedRouteId: bookingForm.selectedRouteId || 'car_fastest',
      selectedRouteName: bookingForm.selectedRouteName || 'Car (Fastest)',
      selectedRouteSummary: bookingForm.selectedRouteSummary || 'via Express Highway',
      routePoints: bookingForm.routePoints || [],
      days: calculatedDays,
      includeToll: bookingForm.includeToll !== false,
      estimatedFare: paymentDetails?.totalFare || fareSummary?.grossTotal || 2050,
      totalFare: paymentDetails?.totalFare || fareSummary?.grossTotal || 2050,
      advancePaid: paymentDetails?.amount || fareSummary?.advanceAmount || 500,
      balancePayable: paymentDetails?.balancePayable !== undefined ? paymentDetails.balancePayable : (fareSummary?.balancePayable || 1550),
      payTollNow: paymentDetails?.payTollNow !== undefined ? paymentDetails.payTollNow : true,
      tollPaymentPreference: paymentDetails?.tollPaymentPreference || (paymentDetails?.payTollNow === false ? 'PAY_AFTER_TRIP' : 'PAY_NOW_ONLINE'),
      tollAmount: paymentDetails?.tollAmount !== undefined ? paymentDetails.tollAmount : (fareSummary?.estimatedToll || 0),
      nhaiToll: paymentDetails?.nhaiToll !== undefined ? paymentDetails.nhaiToll : (fareSummary?.nhaiToll || 0),
      statePermitFee: paymentDetails?.statePermitFee !== undefined ? paymentDetails.statePermitFee : (fareSummary?.statePermitFee || 0),
      stateBorderCount: paymentDetails?.stateBorderCount !== undefined ? paymentDetails.stateBorderCount : (fareSummary?.stateBorderCount || 0),
      needCarrier: Boolean(bookingForm.needCarrier),
      extraKmRate: 12,
      customerName: bookingForm.userName || bookingForm.customerName || currentUser?.name || 'Customer',
      customerPhone: resolvedPhone,
      alternatePhone: bookingForm.alternatePhone || '',
      pickupAddress: bookingForm.pickupAddress || '',
      landmark: bookingForm.pickupLandmark || bookingForm.landmark || '',
      driverNotes: bookingForm.specialNotes || bookingForm.driverNotes || '',
      customerEmail: paymentDetails?.userEmail || currentUser?.email || '',
      status: BOOKING_STATUSES.FINDING_DRIVER,
      paymentId: paymentDetails?.paymentId || `pay_rzp_${Date.now().toString().slice(-6)}`,
      driverDetails: null,
      createdAt: Date.now()
    };

    // Auto-save to Bookings Database and sync active ID
    setBookingsDb(prev => [newBooking, ...prev]);
    setActiveBookingId(newId);

    // Save to shared localStorage keys for instant Admin App visibility
    try {
      const keys = ['cabzo_bookings', 'cabbazar_bookings'];
      for (const k of keys) {
        const existing = JSON.parse(localStorage.getItem(k) || '[]');
        existing.unshift(newBooking);
        localStorage.setItem(k, JSON.stringify(existing));
      }
      window.dispatchEvent(new Event('storage'));
    } catch (_) {}

    // Post to unified backend server (cloud 24/7 or local)
    try {
      const urls = getCandidateApiUrls('/bookings/sync');
      Promise.any(urls.map(url => fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      }))).catch(() => null);
    } catch (_) {}

    return newBooking;
  };

  // Update Status in Realtime
  const updateBookingStatus = (bookingId, newStatus, extraData = {}) => {
    setBookingsDb(prev => prev.map(b => {
      if (b.bookingId === bookingId) {
        let driverDetails = b.driverDetails;
        if ((newStatus === BOOKING_STATUSES.DRIVER_ASSIGNED || newStatus === BOOKING_STATUSES.DRIVER_ON_THE_WAY || newStatus === BOOKING_STATUSES.TRIP_STARTED || newStatus === BOOKING_STATUSES.TRIP_COMPLETED) && !driverDetails) {
          driverDetails = {
            name: 'M. Suresh Kumar',
            phone: '+91 94441 23456',
            cabNumber: 'TN 09 BX 4589',
            cabModel: 'Maruti Suzuki Dzire',
            rating: 4.9
          };
        }
        return {
          ...b,
          status: newStatus,
          driverDetails: extraData.driverDetails || driverDetails,
          ...extraData
        };
      }
      return b;
    }));
  };

  // Prepopulate for Book Again
  const rebookTrip = (trip) => {
    setBookingForm({
      ...INITIAL_BOOKING_FORM,
      tripType: trip.tripType || 'oneway',
      pickup: trip.pickup,
      drop: trip.drop,
      stops: trip.stops || [],
      vehicleId: trip.vehicleId || 'sedan',
      passengers: trip.passengers || 2,
      includeToll: trip.includeToll !== false
    });
  };

  // Submit Issue
  const reportIssue = ({ bookingId, category, description }) => {
    const newIssue = {
      id: `ISSUE-${Date.now()}`,
      bookingId,
      userPhone: currentPhone || '9876543210',
      category,
      description,
      status: 'SUBMITTED',
      createdAt: Date.now()
    };
    setReportedIssues(prev => [newIssue, ...prev]);
    return newIssue;
  };

  // ADMIN PERMISSIONS: Delete Booking
  const deleteBooking = (bookingId) => {
    setBookingsDb(prev => prev.filter(b => b.bookingId !== bookingId));
  };

  // ADMIN PERMISSIONS: Edit Full Booking Details (fares, driver, locations, dates)
  const editBookingDetails = (bookingId, updatedFields) => {
    setBookingsDb(prev => prev.map(b => {
      if (b.bookingId === bookingId) {
        return {
          ...b,
          ...updatedFields,
          // Recalculate balance if estimatedFare or advancePaid updated
          balancePayable: (updatedFields.estimatedFare !== undefined || updatedFields.advancePaid !== undefined)
            ? (Number(updatedFields.estimatedFare ?? b.estimatedFare) - Number(updatedFields.advancePaid ?? b.advancePaid))
            : (updatedFields.balancePayable ?? b.balancePayable)
        };
      }
      return b;
    }));
  };

  // ADMIN PERMISSIONS: Cancel Booking
  const cancelBookingByAdmin = (bookingId, reason = 'Cancelled by Fleet Operations Admin') => {
    updateBookingStatus(bookingId, BOOKING_STATUSES.CANCELLED, {
      cancellationReason: reason
    });
  };

  // ADMIN PERMISSIONS: Reset to Initial DB
  const resetBookingsDb = () => {
    setBookingsDb(DEFAULT_BOOKINGS);
  };

  // User-scoped bookings: strictly isolated by phone or email
  const userPhoneClean = (currentPhone || currentUser?.phone || currentUser?.mobile || '').replace(/\D/g, '').slice(-10);
  const userEmailClean = (currentUser?.email || '').trim().toLowerCase();

  const userBookings = bookingsDb.filter(b => {
    const bPhoneClean = (b.userPhone || '').replace(/\D/g, '').slice(-10);
    const bEmailClean = (b.userEmail || '').trim().toLowerCase();
    
    if (userPhoneClean && bPhoneClean && userPhoneClean === bPhoneClean) return true;
    if (userEmailClean && bEmailClean && userEmailClean === bEmailClean) return true;
    return false;
  });

  // Active booking reference (strictly scoped to current user, null if none)
  const activeBooking = (activeBookingId ? userBookings.find(b => b.bookingId === activeBookingId) : null)
    || userBookings.find(b => b.status !== BOOKING_STATUSES.TRIP_COMPLETED && b.status !== BOOKING_STATUSES.CANCELLED)
    || null;

  // User-scoped filters
  const myBookings = userBookings.filter(b => b.status !== BOOKING_STATUSES.TRIP_COMPLETED && b.status !== BOOKING_STATUSES.CANCELLED);
  const completedTrips = userBookings.filter(b => b.status === BOOKING_STATUSES.TRIP_COMPLETED);

  const resetBookingSession = () => {
    setBookingForm(INITIAL_BOOKING_FORM);
    setActiveBookingId(null);
    try {
      localStorage.removeItem('CabApp_Draft_Booking');
      localStorage.removeItem('CabApp_ActiveBookingId');
    } catch {}
  };

  return (
    <BookingContext.Provider value={{
      bookingForm,
      fareSummary,
      activeBookingId,
      activeBooking,
      bookingsDb,
      userBookings,
      myBookings,
      completedTrips,
      resetBookingSession,
      reportedIssues,
      updateBookingForm,
      addStop,
      updateStop,
      removeStop,
      moveStop,
      computeCurrentFare,
      createBooking,
      updateBookingStatus,
      deleteBooking,
      editBookingDetails,
      cancelBookingByAdmin,
      resetBookingsDb,
      rebookTrip,
      reportIssue,
      setActiveBookingId
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export const useBooking = () => useContext(BookingContext);
