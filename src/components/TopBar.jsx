import React from 'react';
import { Menu, ArrowLeft, Headphones } from 'lucide-react';

export default function TopBar({ 
  title = "Cab Booking", 
  showBack = false, 
  onBack, 
  onOpenMenu, 
  onOpenSupport,
  subtitle
}) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        {showBack ? (
          <button 
            onClick={onBack}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white active:scale-90 transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            aria-label="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        ) : (
          <button 
            onClick={onOpenMenu}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-950 dark:hover:text-white active:scale-90 transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            aria-label="Open Navigation Drawer"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h1 className="font-black text-sm leading-tight tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>{title}</span>
          </h1>
          {subtitle && (
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5 font-medium">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={onOpenSupport}
          className="p-2 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50 active:scale-90 transition shadow-xs cursor-pointer"
          title="24/7 Customer Helpline"
        >
          <Headphones className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
