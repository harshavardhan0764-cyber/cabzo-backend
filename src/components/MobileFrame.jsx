import React from 'react';

export default function MobileFrame({ children }) {
  return (
    <main className="w-full min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col relative overflow-x-hidden selection:bg-orange-500 selection:text-white">
      {children}
    </main>
  );
}
