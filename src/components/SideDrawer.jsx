import React from 'react';
import { 
  User, 
  Car, 
  CheckCircle2, 
  PhoneCall, 
  LogOut, 
  ChevronRight, 
  X, 
  Clock,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CURRENT_VERSION = '1.0.0';

export default function SideDrawer({ isOpen, onClose, onNavigate, onCheckForUpdates }) {
  const { currentUser, currentPhone, logout } = useAuth();

  if (!isOpen) return null;

  const installedVersion = localStorage.getItem('CabApp_InstalledVersion') || null;
  const isUpToDate = installedVersion === CURRENT_VERSION;

  const handleNav = (screenId) => {
    onClose();
    onNavigate(screenId);
  };

  const handleLogout = () => {
    logout();
    onClose();
    onNavigate('LoginScreen');
  };

  const maskedPhone = currentPhone.length === 10
    ? `+91 XXXXXXX${currentPhone.slice(-3)}`
    : `+91 ${currentPhone || '9876543210'}`;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer Body */}
      {/* Drawer Body */}
      <div className="relative w-4/5 max-w-[300px] bg-white border-r border-slate-200 text-slate-900 h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-300">
        
        {/* Drawer Header */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-5 text-white shadow-md">
          <div className="flex justify-between items-start mb-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black backdrop-blur shadow-lg">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'R'}
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <h3 className="font-black text-base leading-tight truncate">
            {currentUser?.name || currentUser?.email?.split('@')[0] || 'Customer'}
          </h3>
          <p className="text-xs text-orange-100 font-bold mt-0.5 truncate">
            {currentUser?.email || (currentPhone ? `+91 ${currentPhone}` : 'customer@cabbazar.com')}
          </p>
          {currentPhone && currentPhone !== '9876543210' && (
            <p className="text-[10px] text-orange-200 font-medium">
              {maskedPhone}
            </p>
          )}
          <div className="mt-2 inline-flex items-center gap-1 bg-black/20 px-2.5 py-0.5 rounded-full text-[10px] font-black text-orange-100">
            ✓ Verified Customer
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-3 overflow-y-auto px-2 space-y-1">
          
          <button
            onClick={() => handleNav('HomeScreen')}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <Car className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs">Book a Cab</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>

          <button
            onClick={() => handleNav('MyBookingsScreen')}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs block">My Bookings</span>
                <span className="text-[10px] text-slate-500">Upcoming & live status</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>

          <button
            onClick={() => handleNav('CompletedTripsScreen')}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs block">Completed Trips</span>
                <span className="text-[10px] text-slate-500">Trip invoices & history</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>

          <button
            onClick={() => handleNav('ProfileScreen')}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs block">Profile & Settings</span>
                <span className="text-[10px] text-slate-500">Account & emergency info</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>


          <button
            onClick={() => handleNav('ContactUsScreen')}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-xs block">Support & FAQs</span>
                <span className="text-[10px] text-slate-500">Email, Phone, Issues</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>

          <button
            onClick={() => {
              onClose();
              if (onCheckForUpdates) onCheckForUpdates();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-orange-50 text-slate-700 hover:text-orange-600 transition group text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-slate-100 group-hover:bg-orange-100 text-slate-600 group-hover:text-orange-600 border border-slate-200">
                <Sparkles className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <span className="font-bold text-xs block">About U &amp; I Cabs</span>
                <span className="text-[10px] text-slate-500">v1.0.0 • Check for Updates</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600" />
          </button>

        </div>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-2">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 rounded-2xl font-black text-xs transition active:scale-98 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out (Logout)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
