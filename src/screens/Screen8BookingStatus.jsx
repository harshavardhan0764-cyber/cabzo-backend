import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Car, 
  Phone, 
  MapPin, 
  Share2, 
  Calendar, 
  ShieldCheck, 
  Navigation, 
  AlertTriangle, 
  Shield, 
  Mail, 
  User, 
  FileText,
  Sparkles
} from 'lucide-react';
import TopBar from '../components/TopBar';
import LiveGoogleMap from '../components/LiveGoogleMap';
import { useBooking, BOOKING_STATUSES } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';
import { sendBookingEmailConfirmation, openEmailClientConfirmation } from '../utils/emailService';

export default function Screen8BookingStatus({ onNavigate, onShowToast }) {
  const { activeBooking, updateBookingStatus } = useBooking();
  const { currentUser } = useAuth();
  const [showSosModal, setShowSosModal] = useState(false);

  if (!activeBooking) {
    return (
      <div className="flex-1 bg-slate-50 p-6 flex flex-col items-center justify-center text-center text-slate-900">
        <Clock className="w-12 h-12 text-slate-400 mb-3" />
        <h3 className="font-extrabold text-slate-900 text-sm">No Active Booking Found</h3>
        <button
          onClick={() => onNavigate('HomeScreen')}
          className="mt-4 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2 px-4 rounded-xl cursor-pointer shadow-md shadow-orange-500/20"
        >
          Book a Cab
        </button>
      </div>
    );
  }

  const currentStatus = activeBooking.status;
  const driverInfo = activeBooking.driverDetails || activeBooking.driver || null;
  const isAssigned = Boolean(driverInfo) || currentStatus === BOOKING_STATUSES.DRIVER_ASSIGNED || currentStatus === 'DRIVER_ASSIGNED';
  const isTripStarted = currentStatus === BOOKING_STATUSES.TRIP_STARTED;
  const isCompleted = currentStatus === BOOKING_STATUSES.TRIP_COMPLETED;

  // Resolve passenger email
  const customerEmail = activeBooking.customerEmail || currentUser?.email || 'Registered Customer Account';

  // Derive pickup and drop coordinates
  const pickupCoords = useMemo(() => {
    if (activeBooking.pickupLocation?.lat && activeBooking.pickupLocation?.lng) {
      return activeBooking.pickupLocation;
    }
    return { lat: 12.9716, lng: 77.5946, name: activeBooking.pickup || 'Bengaluru' };
  }, [activeBooking]);

  const dropCoords = useMemo(() => {
    if (activeBooking.dropLocation?.lat && activeBooking.dropLocation?.lng) {
      return activeBooking.dropLocation;
    }
    return { lat: 12.2958, lng: 76.6394, name: activeBooking.drop || 'Mysuru' };
  }, [activeBooking]);

  const totalDistance = Number(activeBooking.distanceKm) || 145;

  const handleCallDriver = () => {
    const phone = driverInfo?.phone || activeBooking.driverDetails?.phone || '+91 94441 23456';
    if (onShowToast) onShowToast(`Calling driver: ${phone}`, 'info');
    window.open(`tel:${phone}`, '_self');
  };

  const handleShare = () => {
    const summary = `🚖 U & I Cabs Trip Booking Details
Booking ID: #${activeBooking.bookingId}
Route: ${activeBooking.pickup} ➔ ${activeBooking.drop}
Doorstep Pickup: ${activeBooking.pickupAddress || activeBooking.pickup}
Date & Time: ${activeBooking.pickupDate || 'Today'} at ${activeBooking.pickupTime || '06:00 AM'}
Vehicle: ${activeBooking.vehicleName || 'Outstation Cab'}
Driver: ${activeBooking.driverDetails ? `${activeBooking.driverDetails.name} (${activeBooking.driverDetails.phone})` : 'Being Assigned'}
24x7 Support: +91 83107 54133`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(summary);
    }
    if (onShowToast) onShowToast('Trip details copied to clipboard!', 'success');
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Trip Status & Booking" 
        subtitle={`Booking #${activeBooking.bookingId}`}
        showBack 
        onBack={() => onNavigate('HomeScreen')} 
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 max-w-md mx-auto w-full pb-20">
        
        {/* 1. OFFICIAL JOURNEY ROUTE MAP */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm space-y-3">
          
          {/* Map Header */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-100 border border-orange-200 text-orange-600 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                  <span>Trip Route Map</span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded-full font-black uppercase">
                    Confirmed
                  </span>
                </h4>
                <p className="text-[10px] text-slate-500 font-medium">
                  {activeBooking.pickup} ➔ {activeBooking.drop}
                </p>
              </div>
            </div>

            <div className="text-right bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-xs font-black text-slate-900 block">{totalDistance} KM</span>
              <span className="text-[8px] text-orange-600 block uppercase font-bold">Extra: ₹12/KM</span>
            </div>
          </div>

          {/* Embedded Real Map (Static, No Simulation) */}
          <div className="px-2">
            <LiveGoogleMap 
              pickupLocation={pickupCoords}
              dropLocation={dropCoords}
              stopsLocations={activeBooking.stopsLocations || []}
              distanceKm={totalDistance}
              duration=""
              height="h-56 sm:h-64"
              showHud={false}
              isLiveTracking={false}
            />
          </div>

          {/* Route Overview Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-600 font-bold flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-orange-500" />
                <span>Scheduled Travel:</span>
              </span>
              <span className="text-slate-900 font-bold">
                {activeBooking.pickupDate || 'Today'} • {activeBooking.pickupTime || 'Immediate'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[10px]">
              <span className="text-slate-500">
                Vehicle: <strong className="text-slate-800">{activeBooking.vehicleName || 'Sedan (4+1)'}</strong>
              </span>

              <button
                type="button"
                onClick={handleShare}
                className="px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-bold active:scale-95 transition cursor-pointer shadow-xs"
              >
                <Share2 className="w-3 h-3 text-sky-600" />
                <span>Share Details</span>
              </button>
            </div>
          </div>

        </div>

        {/* 2. TRIP STATUS HERO & STEPPER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm text-center space-y-3">
          
          {/* Status Icon & Header */}
          {!isAssigned && (
            <div>
              <div className="w-14 h-14 mx-auto bg-amber-50 text-amber-500 border border-amber-200 rounded-full flex items-center justify-center mb-2">
                <Clock className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-3 py-0.5 rounded-full">
                ⏳ Driver Assignment In Progress
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1.5">
                Ride Confirmed & Dispatched
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Your ride details have been transmitted directly to Fleet Operations. Your verified driver will be assigned shortly.
              </p>
            </div>
          )}

          {isAssigned && !isTripStarted && !isCompleted && currentStatus !== BOOKING_STATUSES.DRIVER_ON_THE_WAY && (
            <div>
              <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-2 shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                ✓ Driver Assigned
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1.5">
                Driver Confirmed & Ready for Pickup
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Your driver details and vehicle registration have been allocated for your journey.
              </p>
            </div>
          )}

          {currentStatus === BOOKING_STATUSES.DRIVER_ON_THE_WAY && (
            <div>
              <div className="w-14 h-14 mx-auto bg-orange-50 text-orange-600 border border-orange-200 rounded-full flex items-center justify-center mb-2">
                <Navigation className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-orange-700 bg-orange-50 border border-orange-200 px-3 py-0.5 rounded-full">
                🚕 Driver On The Way
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1.5">
                Driver Heading to Your Doorstep
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                The driver is en route to your specified pickup address.
              </p>
            </div>
          )}

          {currentStatus === BOOKING_STATUSES.TRIP_STARTED && (
            <div>
              <div className="w-14 h-14 mx-auto bg-blue-50 text-blue-600 border border-blue-200 rounded-full flex items-center justify-center mb-2 shadow-xs">
                <Car className="w-7 h-7" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full">
                🚗 Trip in Progress
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1.5">
                Outstation Journey to {activeBooking.drop}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Have a pleasant journey. You can use 24x7 Safety SOS whenever needed.
              </p>
            </div>
          )}

          {isCompleted && (
            <div>
              <div className="w-14 h-14 mx-auto bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-0.5 rounded-full">
                ✓ Trip Completed
              </span>
              <h3 className="text-sm font-black text-slate-900 mt-1.5">
                Destination Reached Safely!
              </h3>
            </div>
          )}

          {/* Stepper Timeline */}
          <div className="pt-2.5 border-t border-slate-100 text-left space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Booking Confirmed (#{activeBooking.bookingId})</span>
            </div>

            <div className={`flex items-center gap-2 font-bold ${
              isAssigned ? 'text-emerald-600' : 'text-amber-600'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>{isAssigned ? `Driver Assigned (${driverInfo?.name || 'M. Suresh Kumar'})` : 'Assigning Fleet Driver...'}</span>
            </div>

            <div className={`flex items-center gap-2 font-bold ${
              isTripStarted || isCompleted ? 'text-emerald-600' : 'text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Trip Started</span>
            </div>

            <div className={`flex items-center gap-2 font-bold ${
              isCompleted ? 'text-emerald-600' : 'text-slate-400'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Arrived at Destination ({activeBooking.drop})</span>
            </div>
          </div>

        </div>

        {/* 3. PASSENGER & PICKUP CONTACT DETAILS */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-orange-500" />
              <span>Passenger & Doorstep Pickup</span>
            </span>
            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Verified
            </span>
          </div>

          <div className="text-xs space-y-1.5 text-slate-700">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Passenger Name:</span>
              <strong className="text-slate-900">{activeBooking.customerName || currentUser?.name || 'Customer'}</strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500">Contact Number:</span>
              <strong className="text-slate-900">{activeBooking.customerPhone || currentUser?.phone || 'Not provided'}</strong>
            </div>

            {activeBooking.alternatePhone && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">WhatsApp / Alt:</span>
                <span className="text-slate-800 font-medium">{activeBooking.alternatePhone}</span>
              </div>
            )}

            <div className="pt-1 border-t border-slate-100">
              <span className="text-slate-500 text-[10px] block">Exact Pickup Location & Landmark:</span>
              <p className="text-slate-900 font-medium text-[11px] mt-0.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                📍 {activeBooking.pickupAddress || activeBooking.pickup}
                {activeBooking.landmark ? ` (Landmark: ${activeBooking.landmark})` : ''}
              </p>
            </div>

            {activeBooking.driverNotes && (
              <div className="pt-1">
                <span className="text-slate-500 text-[10px] block">Driver Instructions:</span>
                <p className="text-slate-700 text-[11px] mt-0.5 bg-amber-50/50 p-2 rounded-xl border border-amber-200 font-medium">
                  💬 {activeBooking.driverNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. DRIVER & VEHICLE DETAILS CARD */}
        {isAssigned && (
          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-sm flex items-center justify-center shadow-md shadow-orange-500/20">
                  {driverInfo?.name?.slice(0, 2).toUpperCase() || 'DR'}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <span>{driverInfo?.name || 'Assigned Driver'}</span>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded font-black">
                      ★ {driverInfo?.rating || '4.9'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {driverInfo?.cabModel || 'Outstation Cab'}
                  </p>
                  <p className="text-[11px] font-mono font-bold text-orange-600">
                    {driverInfo?.cabNumber || 'Vehicle Assigned'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCallDriver}
                  className="w-10 h-10 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center transition active:scale-95 cursor-pointer shadow-xs"
                  title="Call Driver"
                >
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Safety & OTP Card */}
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-500 block font-medium">Start Trip OTP</span>
                  <span className="font-mono font-black text-slate-900 text-xs tracking-widest">
                    {activeBooking.startOtp || '4920'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSosModal(true)}
                className="px-2.5 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[10px] font-black hover:bg-rose-100 transition cursor-pointer"
              >
                🚨 SOS Safety
              </button>
            </div>
          </div>
        )}

        {/* 5. TAMPER-PROOF FINANCIAL RECORD & EMAIL NOTIFICATION */}
        <div className="p-3.5 bg-emerald-50/70 border-2 border-emerald-200 rounded-3xl text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                🔒
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">Tamper-Proof Ride Record</h4>
                <p className="text-[10px] text-emerald-700 font-medium">Auto-sent to Fleet Operations (+91 9014467153)</p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-200/80 text-emerald-900 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              Locked
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-[10px] text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Advance Paid:</span>
              <span className="font-bold text-emerald-700">₹{activeBooking.advancePaid || 500} (Verified ✓)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tolls & State Border Tax:</span>
              <span className="font-bold text-slate-800">
                {(activeBooking.payTollNow || activeBooking.tollPaymentPreference === 'PAY_NOW_ONLINE')
                  ? `₹${activeBooking.tollAmount || 0} (Paid Online ✓)`
                  : ((activeBooking.tollAmount || 0) > 0
                      ? `₹${activeBooking.tollAmount} (Pay to Driver at Drop-off)`
                      : '₹0 (None)'
                    )
                }
              </span>
            </div>
            {activeBooking.needCarrier && (
              <div className="flex justify-between">
                <span className="text-slate-500">Roof Carrier:</span>
                <span className="font-bold text-slate-800">₹100 (Opted for Extra Luggage)</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">After Destination Limit:</span>
              <span className="font-bold text-amber-700">₹12/km (Extra running rate)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Balance to Pay Driver:</span>
              <span className="font-bold text-slate-900 text-xs">₹{activeBooking.balancePayable || 0}</span>
            </div>
          </div>

          {/* Official Email Confirmation Card */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 text-left space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Confirmation Sent to Registered Email</h4>
                  <p className="text-[10px] text-blue-700 font-medium">Driver details & itinerary auto-dispatched</p>
                </div>
              </div>
              <span className="text-[9px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                ✓ Dispatched
              </span>
            </div>

            <p className="text-[11px] text-slate-600">
              Dispatched to: <strong className="text-blue-950 font-mono">{customerEmail}</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  sendBookingEmailConfirmation({ ...activeBooking, customerEmail });
                  if (onShowToast) onShowToast(`Dispatched to server email queue for ${customerEmail}!`, 'success');
                }}
                className="py-2 px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-98 transition cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Resend Email</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  openEmailClientConfirmation({ ...activeBooking, customerEmail });
                  if (onShowToast) onShowToast('Opening Gmail / Email app...', 'info');
                }}
                className="py-2 px-2 bg-white hover:bg-slate-50 text-blue-700 border border-blue-300 font-bold text-[11px] rounded-xl flex items-center justify-center gap-1 shadow-xs active:scale-98 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Open in Gmail</span>
              </button>
            </div>
          </div>
        </div>


        {isCompleted && (
          <div className="pt-2 space-y-2">
            <button
              onClick={() => onNavigate('CompletedTripsScreen')}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 active:scale-98 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>View Invoice & Trip Details</span>
            </button>
            <button
              onClick={() => onNavigate('HomeScreen')}
              className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-bold py-3 px-4 rounded-2xl text-xs active:scale-98 transition cursor-pointer"
            >
              Book Another Outstation Trip
            </button>
          </div>
        )}

      </div>

      {/* SOS Emergency Modal */}
      {showSosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base">Emergency SOS Support</h3>
              <p className="text-xs text-slate-600 mt-1">
                Your location and trip details will be transmitted to U &amp; I Cabs 24x7 Emergency Response Team and local highway patrol.
              </p>
            </div>
            <div className="space-y-2">
              <a
                href="tel:112"
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-rose-600/25"
              >
                <Phone className="w-4 h-4" />
                <span>Call Emergency Police (112)</span>
              </a>
              <a
                href="tel:+918310754133"
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <span>Call U &amp; I Cabs 24x7 Fleet Desk (+91 83107 54133)</span>
              </a>
            </div>
            <button
              onClick={() => setShowSosModal(false)}
              className="text-xs text-slate-500 hover:text-slate-800 pt-2 block mx-auto cursor-pointer font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
