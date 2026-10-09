import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ message, type = 'info', onClose }) {
  if (!message) return null;

  const bg = {
    success: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/20',
    error: 'bg-rose-500/15 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20',
    info: 'bg-slate-900 border-slate-700 text-slate-200 ring-1 ring-slate-800',
    warning: 'bg-amber-500/15 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/20'
  }[type] || 'bg-slate-900 border-slate-700 text-slate-200';

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle
  }[type] || Info;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xs animate-in fade-in slide-in-from-bottom duration-200 pointer-events-none">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-bold pointer-events-auto ${bg}`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 leading-tight">{message}</span>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:opacity-80 transition text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
