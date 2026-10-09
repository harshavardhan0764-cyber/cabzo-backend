import React from 'react';
import { MapPin, Navigation, Clock, ShieldCheck, ArrowRight } from 'lucide-react';

export default function RouteMapPreview({ 
  pickup = 'Bengaluru', 
  drop = 'Mysuru', 
  stops = [], 
  distanceKm = 145, 
  duration = '3 hrs 15 mins',
  routeName = 'National Highway',
  routeSummary = 'via Express Highway',
  pickupCoord = null,
  dropCoord = null
}) {
  const pickupName = typeof pickup === 'object' ? pickup.name : pickup;
  const dropName = typeof drop === 'object' ? drop.name : drop;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Visual Map Header Area */}
      <div className="relative h-32 bg-slate-950 overflow-hidden flex items-center justify-center p-4">
        {/* Background Road Grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />

        {/* Highway Route Polyline Animation */}
        <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 flex items-center justify-between z-10">
          {/* Pickup Marker */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 border-2 border-slate-900 font-black text-xs">
              A
            </div>
            <span className="text-[10px] font-black text-emerald-400 mt-1 max-w-[80px] truncate text-center bg-slate-950/80 px-1.5 py-0.5 rounded border border-emerald-500/20">
              {pickupName}
            </span>
          </div>

          {/* Dotted Glowing Highway Route Line */}
          <div className="flex-1 mx-2 relative flex items-center">
            <div className="w-full h-1 bg-gradient-to-r from-emerald-500 via-orange-500 to-amber-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.6)]" />
            
            {/* Intermediate stops if any */}
            {(() => {
              const validStops = (stops || []).filter(Boolean);
              if (validStops.length === 0) return null;
              return (
                <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center top-1/2">
                  <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-slate-900 shadow-md flex items-center justify-center text-[8px] font-black text-slate-950">
                    {validStops.length}
                  </div>
                  <span className="text-[9px] font-bold text-amber-300 whitespace-nowrap mt-1 bg-slate-950/80 px-1 rounded">
                    {validStops.length} Stop{validStops.length > 1 ? 's' : ''}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Drop Marker */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 border-2 border-slate-900 font-black text-xs">
              B
            </div>
            <span className="text-[10px] font-black text-orange-400 mt-1 max-w-[80px] truncate text-center bg-slate-950/80 px-1.5 py-0.5 rounded border border-orange-500/20">
              {dropName}
            </span>
          </div>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 left-3 right-3 flex items-center justify-between z-20 pointer-events-none">
          <span className="text-[10px] font-bold bg-slate-900/90 text-slate-300 px-2 py-0.5 rounded-full border border-slate-800 backdrop-blur-sm flex items-center gap-1">
            <Navigation className="w-3 h-3 text-orange-400" />
            <span>{routeName}</span>
          </span>

          <span className="text-[10px] font-extrabold bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30 backdrop-blur-sm">
            Live Route Preview
          </span>
        </div>
      </div>

      {/* Distance & Route Summary Bar (Duration removed) */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center justify-around divide-x divide-slate-800 text-center">
        <div className="flex-1 px-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Distance</p>
          <p className="text-sm font-black text-white">{distanceKm} KM</p>
        </div>

        <div className="flex-1 px-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">After Destination</p>
          <p className="text-sm font-black text-amber-400">₹12 / KM</p>
          <p className="text-[8px] text-slate-400">Extra km rate</p>
        </div>

        <div className="flex-1 px-2">
          <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Highway Route</p>
          <p className="text-xs font-black text-emerald-400 truncate" title={routeSummary}>
            Direct Highway
          </p>
        </div>
      </div>
    </div>
  );
}
