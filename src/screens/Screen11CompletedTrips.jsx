import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Car, 
  MapPin, 
  Calendar, 
  Download, 
  Star, 
  RotateCcw, 
  Receipt,
  X,
  FileText,
  Printer
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useBooking } from '../context/BookingContext';

export default function Screen11CompletedTrips({ onNavigate, onOpenMenu, onShowToast }) {
  const { completedTrips, rebookTrip } = useBooking();
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const handleBookAgain = (trip) => {
    rebookTrip(trip);
    if (onShowToast) onShowToast(`Pre-filled journey: ${trip.pickup} ➔ ${trip.drop}`, 'success');
    onNavigate('HomeScreen');
  };

  const handleOpenInvoice = (trip) => {
    setSelectedInvoice(trip);
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Completed Trips" 
        subtitle="Trip history & official GST invoices"
        onOpenMenu={onOpenMenu}
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {completedTrips.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center my-6 space-y-3 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-900 text-sm">No Completed Trips Yet</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Your completed rides will appear here along with downloadable invoices.
            </p>
            <button
              onClick={() => onNavigate('HomeScreen')}
              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3 px-5 rounded-2xl shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
            >
              Book an Outstation Trip
            </button>
          </div>
        ) : (
          completedTrips.map((trip) => (
            <div 
              key={trip.bookingId}
              className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm space-y-3"
            >
              {/* Card Header: ID + Status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  {trip.bookingId}
                </span>
                <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ✓ COMPLETED
                </span>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200" />
                  <div className="w-0.5 h-6 bg-slate-200 my-0.5" />
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-slate-900">
                    🟢 {trip.pickup}
                  </h4>
                  <h4 className="text-xs font-black text-slate-900">
                    🔴 {trip.drop}
                  </h4>
                </div>
              </div>

              {/* Details & Amount Paid */}
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 text-[11px] grid grid-cols-3 gap-2 text-center">
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Date</span>
                  <span className="font-extrabold text-slate-900">{trip.pickupDate}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Vehicle</span>
                  <span className="font-extrabold text-slate-900">{trip.vehicleName}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase block">Total Paid</span>
                  <span className="font-black text-emerald-700">₹{trip.estimatedFare}</span>
                </div>
              </div>

              {/* Driver & Rating */}
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                <div>
                  <span className="text-slate-500 text-[11px] block font-medium">Driver</span>
                  <span className="font-bold text-slate-900">
                    {trip.driverDetails?.name || 'R. Karthi'}
                  </span>
                </div>
                <div className="flex items-center gap-0.5 text-amber-500">
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                  <Star className="w-3.5 h-3.5 fill-amber-500" />
                </div>
              </div>

              {/* Actions [ Invoice ] [ Book Again ] */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenInvoice(trip)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 active:scale-95 cursor-pointer shadow-xs"
                >
                  <Receipt className="w-3.5 h-3.5 text-slate-600" />
                  <span>Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBookAgain(trip)}
                  className="bg-orange-50 hover:bg-orange-100 text-orange-700 font-black py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition border border-orange-200 active:scale-95 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Book Again</span>
                </button>
              </div>

            </div>
          ))
        )}

      </div>

      <div className="p-4 bg-white/95 border-t border-slate-200 max-w-md mx-auto w-full shadow-lg">
        <button
          onClick={() => onNavigate('HomeScreen')}
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition active:scale-98 cursor-pointer"
        >
          <span>Plan a New Outstation Ride</span>
        </button>
      </div>

      {/* --- INVOICE MODAL --- */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[360px] bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-slate-900">GST Tax Invoice</h4>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between text-slate-600">
                <span>Invoice No:</span>
                <span className="font-mono text-slate-900 font-bold">{selectedInvoice.bookingId}-INV</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Trip Date:</span>
                <span className="text-slate-900 font-bold">{selectedInvoice.pickupDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Route:</span>
                <span className="text-slate-900 font-bold">{selectedInvoice.pickup} ➔ {selectedInvoice.drop}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Vehicle:</span>
                <span className="text-slate-900 font-bold">{selectedInvoice.vehicleName}</span>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Base Fare:</span>
                  <span className="text-slate-900">₹{selectedInvoice.estimatedFare - 550}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Driver Allowance:</span>
                  <span className="text-slate-900">₹300</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Toll / GST (5%):</span>
                  <span className="text-slate-900">₹250</span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-black text-sm text-emerald-700">
                  <span>Total Paid (Full):</span>
                  <span>₹{selectedInvoice.estimatedFare}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (onShowToast) onShowToast(`Invoice ${selectedInvoice.bookingId} downloaded as PDF!`, 'success');
                  setSelectedInvoice(null);
                }}
                className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
