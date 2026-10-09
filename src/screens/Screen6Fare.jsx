import React, { useState } from 'react';
import { 
  Receipt, 
  Car, 
  MapPin, 
  ShieldCheck, 
  Info, 
  CreditCard, 
  ArrowRight,
  CheckCircle2, 
  HelpCircle,
  X,
  Sparkles,
  Navigation
} from 'lucide-react';
import TopBar from '../components/TopBar';
import RouteMapPreview from '../components/RouteMapPreview';
import { useBooking } from '../context/BookingContext';

export default function Screen6Fare({ onNavigate, onShowToast }) {
  const { bookingForm, fareSummary, updateBookingForm } = useBooking();
  const [showExplanation, setShowExplanation] = useState(false);

  if (!fareSummary) {
    return (
      <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center text-center text-slate-100">
        <Receipt className="w-12 h-12 text-slate-600 mb-3" />
        <h3 className="font-extrabold text-white text-sm">No Fare Calculated</h3>
        <p className="text-xs text-slate-400 mt-1 mb-4">Please build your journey on the home screen first.</p>
        <button
          onClick={() => onNavigate('HomeScreen')}
          className="bg-orange-500 text-white font-bold text-xs py-2.5 px-4 rounded-xl"
        >
          Go to Home Screen
        </button>
      </div>
    );
  }

  const {
    vehicle,
    actualDistance,
    chargedKm,
    ratePerKm,
    baseFare,
    numDays,
    driverBataPerDay,
    totalDriverBata,
    tollParking,
    otherCharges,
    grossTotal,
    advanceAmount,
    balancePayable
  } = fareSummary;

  const handleProceed = () => {
    onNavigate('CustomerDetailsScreen');
  };

  const pickupName = bookingForm.pickupLocation?.name || bookingForm.pickup;
  const pickupAddr = bookingForm.pickupLocation?.address || 'Pickup Location';
  const dropName = bookingForm.dropLocation?.name || bookingForm.drop;
  const dropAddr = bookingForm.dropLocation?.address || 'Destination';

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Fare Estimate" 
        showBack 
        onBack={() => onNavigate('HomeScreen')} 
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* LIVE ROUTE OVERVIEW MAP */}
        <RouteMapPreview 
          pickup={bookingForm.pickupLocation || bookingForm.pickup}
          drop={bookingForm.dropLocation || bookingForm.drop}
          stops={bookingForm.stops || []}
          distanceKm={actualDistance}
          duration={bookingForm.estimatedDuration || '3 hrs 15 mins'}
          routeName={bookingForm.selectedRouteName || 'Car (Fastest)'}
          routeSummary={bookingForm.selectedRouteSummary || 'via Express Highway'}
        />

        {/* 1. YOUR JOURNEY Header Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
              LOCATION DETAILS
            </span>
            <span className="text-[10px] font-extrabold text-orange-700 bg-orange-100 border border-orange-300 px-2.5 py-0.5 rounded-full shadow-xs">
              {bookingForm.tripType === 'roundtrip' ? 'Round Trip' : 'One Way'}
            </span>
          </div>

          <div className="space-y-3">
            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 truncate">{pickupName}</h3>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                    Pickup
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 truncate">{pickupAddr}</p>
              </div>
            </div>

            {/* Stops */}
            {(bookingForm.stops || []).filter(Boolean).map((stop, idx) => {
              const stopObj = bookingForm.stopsLocations?.[idx];
              const stopName = typeof stop === 'object' ? stop.name : stop;
              const stopAddr = stopObj?.address || 'Highway Halt';
              return (
                <div key={idx} className="flex items-start gap-3 pl-2">
                  <div className="w-4 h-4 rounded-full bg-amber-100 border border-amber-300 text-amber-800 flex items-center justify-center text-[9px] font-black shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{stopName}</h4>
                    <p className="text-[9px] text-slate-500 truncate">{stopAddr}</p>
                  </div>
                </div>
              );
            })}

            {/* Drop */}
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 truncate">{dropName}</h3>
                  <span className="text-[9px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-200">
                    Drop
                  </span>
                </div>
                <p className="text-[10px] text-slate-600 truncate">{dropAddr}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. FARE BREAKDOWN Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              FARE BREAKDOWN
            </span>
            <button
              type="button"
              onClick={() => setShowExplanation(true)}
              className="text-[10px] text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>How is my fare calculated?</span>
            </button>
          </div>

          {/* Roof Carrier for Extra Luggage Option (+₹100) */}
          <div className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
            bookingForm.needCarrier
              ? 'bg-orange-50/90 border-orange-300 ring-1 ring-orange-400/20'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🧳</span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs block">Roof Carrier for Extra Luggage</span>
                  <span className="text-[9px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full">
                    +₹100
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Carrier on roof for extra bags and suitcases</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateBookingForm({ needCarrier: !bookingForm.needCarrier })}
              className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer border ${
                bookingForm.needCarrier
                  ? 'bg-orange-500 text-white border-orange-600 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-300 hover:border-orange-400'
              }`}
            >
              {bookingForm.needCarrier ? '✓ Added (+₹100)' : '+ Add Carrier'}
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-700">
              <div>
                <span className="block text-slate-900 font-bold">
                  Base Fare ({chargedKm} km{bookingForm.tripType === 'roundtrip' ? ` • ${actualDistance} km × 2` : ''})
                </span>
                <span className="text-[10px] text-slate-500">₹{ratePerKm}/km ({bookingForm.tripType === 'roundtrip' ? 'Return Rate' : 'One-Way'}) • {vehicle?.fullName || 'Standard AC'}</span>
              </div>
              <span className="font-extrabold text-slate-900 text-sm">₹{baseFare.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <div>
                <span className="block text-slate-900 font-bold">
                  {bookingForm.tripType === 'oneway' ? 'Driver Allowance (One-Way)' : `Driver Allowance (${numDays} ${numDays === 1 ? 'Day' : 'Days'})`}
                </span>
                <span className="text-[10px] text-slate-500">
                  {bookingForm.tripType === 'oneway' 
                    ? (totalDriverBata === 0 ? '✓ Included in per-km fare' : `₹${totalDriverBata} night halt allowance`) 
                    : `₹${driverBataPerDay}/day Bata • ${numDays === 1 ? '1-Day Trip (₹300)' : `Multi-Day (₹400/day)`}`
                  }
                </span>
              </div>
              <span className="font-extrabold text-slate-900 text-sm">
                {totalDriverBata === 0 ? '₹0 (Included)' : `₹${totalDriverBata.toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="flex justify-between items-center text-slate-700">
              <div>
                <span className="block text-slate-900 font-bold">Toll (Highway FASTag)</span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {fareSummary.highwayNote || `${fareSummary.estimatedPlazas || 2} NHAI Toll Plazas (FASTag)`}
                </span>
              </div>
              <span className="font-extrabold text-slate-900 text-sm">₹{tollParking.toLocaleString('en-IN')}</span>
            </div>

            {fareSummary.carrierCharge > 0 && (
              <div className="flex justify-between items-center text-slate-700">
                <div>
                  <span className="block text-slate-900 font-bold">Other Charges (Roof Carrier)</span>
                  <span className="text-[10px] text-slate-500">Fitted on roof for extra luggage</span>
                </div>
                <span className="font-extrabold text-slate-900 text-sm">₹{fareSummary.carrierCharge}</span>
              </div>
            )}

            {/* Extra Km Rate Policy */}
            <div className="p-2.5 rounded-xl bg-amber-50/80 border border-amber-200 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span>🛣️</span>
                <span className="font-bold text-slate-800">After total destination over:</span>
              </div>
              <span className="font-black text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                ₹12 / KM
              </span>
            </div>

            <div className="border-t border-dashed border-slate-200 my-2" />

            <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div>
                <span className="font-black text-sm text-slate-900 block">TOTAL FARE</span>
                <span className="text-[10px] text-slate-500 font-medium">All inclusive guaranteed price</span>
              </div>
              <span className="text-xl font-black text-orange-600">
                ₹{grossTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* 3. BOOKING ADVANCE Card */}
        <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border-2 border-orange-200 rounded-3xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-orange-900">
              BOOKING ADVANCE
            </span>
            <span className="text-lg font-black text-white bg-orange-500 px-3 py-0.5 rounded-full shadow-xs">
              ₹{advanceAmount}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs pt-1">
            <span className="text-slate-700 font-medium">REMAINING BALANCE (Pay to Driver):</span>
            <span className="font-black text-slate-950">₹{balancePayable.toLocaleString('en-IN')}</span>
          </div>

          <div className="pt-2 border-t border-orange-200/80 space-y-1 text-[11px] text-slate-700">
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ Transparent pricing based on route & distance
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ✓ No hidden or surge charges
            </div>
          </div>
        </div>

      </div>

      {/* Action Footer */}
      <div className="p-4 bg-white/95 border-t border-slate-200 shadow-lg max-w-md mx-auto w-full">
        <button
          onClick={handleProceed}
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md shadow-orange-500/30 flex items-center justify-center gap-2 transition text-sm tracking-wide cursor-pointer"
        >
          <span>Continue to Passenger & Pickup Details</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* --- EXPLANATION MODAL --- */}
      {showExplanation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-3 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-orange-500" />
                <span>How is my fare calculated?</span>
              </h4>
              <button
                onClick={() => setShowExplanation(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-800 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">1. Base Fare</span>
                  <span className="text-[10px] text-slate-500">{chargedKm} km @ ₹{ratePerKm}/km ({bookingForm.tripType === 'roundtrip' ? 'Return Rate' : 'One-Way'}) ({vehicle?.name}){bookingForm.tripType === 'roundtrip' ? ` (${actualDistance} km × 2)` : ''}</span>
                </div>
                <span className="font-black text-slate-900">₹{baseFare.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">2. Driver Allowance (Bata)</span>
                  <span className="text-[10px] text-slate-500">
                    {numDays} {numDays === 1 ? 'day' : 'days'} @ ₹{driverBataPerDay}/day Bata ({numDays === 1 ? '₹300 for 1-day trip' : '₹400/day for multi-day trips'})
                  </span>
                </div>
                <span className="font-black text-slate-900">₹{totalDriverBata.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block">3. Toll & State Taxes</span>
                  <span className="text-[10px] text-emerald-700 font-bold">{fareSummary.highwayNote || 'NHAI FASTag plazas'}</span>
                </div>
                <span className="font-black text-slate-900">₹{tollParking.toLocaleString('en-IN')}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-orange-600 text-sm">
                <span>TOTAL GUARANTEED FARE</span>
                <span>₹{grossTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="font-bold text-slate-800">💡 Transparent Route Pricing Policy:</p>
              <p>&bull; <b>Toll Fees:</b> Dynamically calculated from start ({pickupName}) to end ({dropName}) factoring in all intermediate national highway FASTag booths and inter-state permit taxes.</p>
              <p>&bull; <b>Driver Allowance:</b> ₹300 for a 1-day trip; ₹400/day for multi-day trips (more than 1 day) covering food & night halt.</p>
            </div>

            <button
              onClick={() => setShowExplanation(false)}
              className="w-full mt-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer"
            >
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
