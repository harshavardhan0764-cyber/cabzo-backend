import React, { useState } from 'react';
import { 
  Car, 
  MapPin, 
  Calendar, 
  Clock, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useBooking, BOOKING_STATUSES } from '../context/BookingContext';

export default function Screen9MyBookings({ onNavigate, onOpenMenu, onShowToast }) {
  const { myBookings, completedTrips, setActiveBookingId, rebookTrip } = useBooking();
  const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'completed'

  const upcomingBookings = myBookings || [];
  const completedBookings = completedTrips || [];

  const displayList = activeTab === 'upcoming' ? upcomingBookings : completedBookings;

  const handleSelectBooking = (bookingId) => {
    setActiveBookingId(bookingId);
    onNavigate('BookingStatusScreen', { bookingId });
  };

  const handleBookAgain = (trip) => {
    rebookTrip(trip);
    if (onShowToast) onShowToast(`Pre-filled journey: ${trip.pickup} ➔ ${trip.drop}`, 'info');
    onNavigate('HomeScreen');
  };

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between">
      <TopBar 
        title="My Bookings" 
        subtitle="Current & completed outstation rides"
        onOpenMenu={onOpenMenu}
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* Tab Switcher [ Upcoming ] [ Completed ] */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/80 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-300/80 dark:border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => setActiveTab('upcoming')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
            }`}
          >
            <span>Upcoming ({upcomingBookings.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition duration-200 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-transparent'
            }`}
          >
            <span>Completed ({completedBookings.length})</span>
          </button>
        </div>

        {/* Bookings List */}
        {displayList.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center my-6 space-y-3 shadow-sm">
            <div className="w-16 h-16 mx-auto bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 rounded-3xl flex items-center justify-center">
              <Car className="w-8 h-8" />
            </div>
            <h3 className="font-black text-slate-900 dark:text-white text-sm">
              {activeTab === 'upcoming' ? 'No upcoming rides' : 'No completed rides'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              Plan your next outstation journey with transparent pricing and verified drivers.
            </p>
            <button
              onClick={() => onNavigate('HomeScreen')}
              className="mt-2 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3 px-5 rounded-2xl shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
            >
              Book a Ride
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((b) => {
              const isConfirmed = b.status !== BOOKING_STATUSES.FINDING_DRIVER && b.status !== BOOKING_STATUSES.TRIP_COMPLETED;
              const isFinding = b.status === BOOKING_STATUSES.FINDING_DRIVER;
              const isComplete = b.status === BOOKING_STATUSES.TRIP_COMPLETED;

              return (
                <div
                  key={b.bookingId}
                  onClick={() => handleSelectBooking(b.bookingId)}
                  className="bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 hover:border-orange-500/60 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md space-y-3 group"
                >
                  {/* Card Header: ID + Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {b.bookingId}
                    </span>
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                      isComplete 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                        : isConfirmed 
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                    }`}>
                      {isComplete ? '✓ COMPLETED' : isConfirmed ? '✓ CONFIRMED' : '⏳ FINDING DRIVER'}
                    </span>
                  </div>

                  {/* Route Visualizer */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950" />
                      <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-700 my-0.5" />
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-orange-500 transition">
                        🟢 {b.pickup}
                      </h4>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white group-hover:text-orange-500 transition">
                        🔴 {b.drop}
                      </h4>
                    </div>
                  </div>

                  {/* Meta details */}
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Schedule</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">📅 {b.pickupDate} • 🕐 {b.pickupTime}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase block">Vehicle</span>
                      <span className="font-extrabold text-slate-900 dark:text-white">🚕 {b.vehicleName}</span>
                    </div>
                  </div>

                  {/* Driver / Action Footer */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 text-[11px]">Driver: </span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {b.driverDetails?.name || 'M. Suresh Kumar'}
                      </span>
                    </div>

                    {isComplete ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleBookAgain(b); }}
                        className="text-orange-600 dark:text-orange-400 hover:text-orange-700 font-black text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Book Again</span>
                      </button>
                    ) : (
                      <span className="text-orange-600 dark:text-orange-400 font-black text-xs flex items-center gap-0.5 group-hover:translate-x-0.5 transition">
                        Track Ride <ChevronRight className="w-4 h-4" />
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Book New Ride Bottom Action */}
      <div className="p-4 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 max-w-md mx-auto w-full shadow-lg">
        <button
          onClick={() => onNavigate('HomeScreen')}
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-md shadow-orange-500/20 transition active:scale-98 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Book New Outstation Ride</span>
        </button>
      </div>

    </div>
  );
}
