import React, { useState } from 'react';
import { 
  Car, 
  ArrowRight, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Lock, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const BENEFITS = [
  {
    id: 'drivers',
    icon: ShieldCheck,
    title: 'Verified Drivers',
    subtitle: 'Commercially verified & background checked',
    color: 'emerald',
    badge: '100% Background Checked',
    details: 'Every chauffeur undergoes mandatory criminal background screening, commercial license validation, and highway etiquette training. 4.8+ star rating guaranteed.'
  },
  {
    id: 'pickup',
    icon: Clock,
    title: 'On-Time Pickup',
    subtitle: 'Scheduled doorstep arrival guarantee',
    color: 'amber',
    badge: 'Punctuality Guarantee',
    details: 'Guaranteed on-time doorstep arrival at your requested schedule. If the cab arrives late by more than 15 mins without notice, you receive instant wallet credit.'
  },
  {
    id: 'stops',
    icon: MapPin,
    title: 'Flexible Stopovers',
    subtitle: 'Add stops during your route',
    color: 'orange',
    badge: 'Zero Halt Surcharge',
    details: 'Easily add intermediate stops along your highway route for breakfast, coffee, family pick-up, or sightseeing halts.'
  }
];

export default function Screen1Welcome({ onNavigate, onShowToast }) {
  const { isLoggedIn, currentUser } = useAuth();
  const [expandedCard, setExpandedCard] = useState(null);
  const [checkingSession, setCheckingSession] = useState(false);

  const handleContinue = () => {
    setCheckingSession(true);

    setTimeout(() => {
      setCheckingSession(false);
      if (isLoggedIn) {
        if (onShowToast) onShowToast(`Welcome back, ${currentUser?.name || 'Rajesh Kumar'}!`, 'success');
        onNavigate('HomeScreen');
      } else {
        onNavigate('LoginScreen');
      }
    }, 350);
  };

  const toggleExpand = (id) => {
    setExpandedCard(expandedCard === id ? null : id);
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 p-6 flex flex-col justify-between select-none relative overflow-y-auto">
      
      {/* 1. Header & Logo */}
      <div className="pt-4 text-center">
        
        {/* Animated Cab Logo Container */}
        <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-3xl p-0.5 shadow-md shadow-orange-500/20 flex items-center justify-center transform hover:scale-105 transition duration-300">
          <div className="w-full h-full bg-white rounded-[22px] flex items-center justify-center relative overflow-hidden shadow-inner">
            <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent pointer-events-none" />
            <div className="animate-cab-drive flex items-center justify-center">
              <span className="text-3xl">🚕</span>
            </div>
          </div>
        </div>

        {/* Brand Tagline */}
        <div className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-orange-700 mb-2">
          <span>U &amp; I CABS</span>
          <span>•</span>
          <span>YOUR RIDE, YOUR WAY</span>
        </div>

        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
          Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-amber-500">U &amp; I Cabs</span>
        </h1>
        <p className="text-slate-600 text-xs mt-1.5 max-w-xs mx-auto leading-relaxed">
          Reliable One-Way & Round-Trip Outstation Cabs at transparent, all-inclusive fares.
        </p>
      </div>

      {/* 2. Three Expandable Benefit Cards */}
      <div className="my-5 space-y-2.5">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block px-1">
          Why choose U &amp; I Cabs? (Tap to learn more)
        </span>

        {BENEFITS.map((feat) => {
          const isExpanded = expandedCard === feat.id;
          const Icon = feat.icon;

          return (
            <div
              key={feat.id}
              onClick={() => toggleExpand(feat.id)}
              className={`bg-white border rounded-2xl p-3.5 transition-all duration-300 cursor-pointer shadow-sm hover:border-orange-500/60 ${
                isExpanded 
                  ? 'border-orange-500 bg-orange-50/20 ring-1 ring-orange-400/30' 
                  : 'border-slate-200 hover:bg-slate-50/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    feat.id === 'drivers' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                    feat.id === 'pickup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                    'bg-orange-50 text-orange-600 border border-orange-100'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 leading-tight">
                      {feat.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-tight mt-0.5">
                      {feat.subtitle}
                    </p>
                  </div>
                </div>

                <div className="text-slate-400">
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-600 leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="inline-block bg-orange-50 text-orange-700 border border-orange-200 font-bold px-2 py-0.5 rounded text-[10px] mb-1.5">
                    {feat.badge}
                  </div>
                  <p>{feat.details}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 3. Bottom CTA with Signed-in State Logic */}
      <div className="space-y-3 pb-2">
        {isLoggedIn && (
          <div className="text-center animate-in fade-in duration-300">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-full shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>✓ Signed in as {currentUser?.name || 'Rajesh Kumar'}</span>
            </span>
          </div>
        )}

        <button
          onClick={handleContinue}
          disabled={checkingSession}
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm tracking-wide cursor-pointer"
        >
          {checkingSession ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Checking Session...</span>
            </div>
          ) : (
            <>
              <span>{isLoggedIn ? 'Continue to Home' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 font-medium">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>🔒 Secure • Reliable • Simple</span>
        </p>
      </div>

    </div>
  );
}
