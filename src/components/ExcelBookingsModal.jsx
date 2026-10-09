import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  X, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  MapPin, 
  ExternalLink,
  Car
} from 'lucide-react';
import { downloadBookingsExcel } from '../utils/excelExporter';

export default function ExcelBookingsModal({ isOpen, onClose, bookings = [], onShowToast }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'upcoming' | 'completed'

  if (!isOpen) return null;

  const filtered = bookings.filter(b => {
    const matchesSearch = 
      (b.bookingId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.pickup || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.drop || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.vehicleName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterType === 'completed') return b.status === 'TRIP_COMPLETED';
    if (filterType === 'upcoming') return b.status !== 'TRIP_COMPLETED';
    return true;
  });

  const totalRevenue = bookings.reduce((sum, b) => sum + (Number(b.estimatedFare) || 0), 0);
  const totalAdvance = bookings.reduce((sum, b) => sum + (Number(b.advancePaid) || 0), 0);
  const totalBalance = bookings.reduce((sum, b) => sum + (Number(b.balancePayable) || 0), 0);
  const totalKm = bookings.reduce((sum, b) => sum + (Number(b.distanceKm) || 0), 0);

  const handleDownload = () => {
    downloadBookingsExcel(bookings, `cabzo_bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    if (onShowToast) onShowToast('Excel/CSV spreadsheet downloaded successfully!', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  CABZO Bookings Excel Master Sheet
                </h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  .XLSX / .CSV Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detailed spreadsheet report of all active, upcoming, and completed outstation bookings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs py-2 px-4 rounded-xl shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel (.csv)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Excel Summary KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Bookings</span>
            <span className="text-lg font-black text-white">{bookings.length} Trips</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Distance</span>
            <span className="text-lg font-black text-orange-400">{totalKm} KM</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Gross Value</span>
            <span className="text-lg font-black text-emerald-400">₹{totalRevenue.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Pending Balance</span>
            <span className="text-lg font-black text-amber-400">₹{totalBalance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by ID, city, car..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-bold">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'all' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setFilterType('upcoming')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'upcoming' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Active / Upcoming
            </button>
            <button
              onClick={() => setFilterType('completed')}
              className={`px-3 py-1 rounded-lg transition ${filterType === 'completed' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Interactive Excel Sheet Table Container */}
        <div className="flex-1 overflow-auto bg-slate-950">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900 text-slate-400 font-black uppercase text-[10px] tracking-wider border-b border-slate-800 sticky top-0 z-10">
                <th className="p-3 whitespace-nowrap">#</th>
                <th className="p-3 whitespace-nowrap">Booking ID</th>
                <th className="p-3 whitespace-nowrap">Status</th>
                <th className="p-3 whitespace-nowrap">Pickup ➔ Drop</th>
                <th className="p-3 whitespace-nowrap">Route Mode</th>
                <th className="p-3 whitespace-nowrap">Distance</th>
                <th className="p-3 whitespace-nowrap">Est. Time</th>
                <th className="p-3 whitespace-nowrap">Vehicle</th>
                <th className="p-3 whitespace-nowrap">Schedule</th>
                <th className="p-3 whitespace-nowrap">Total Fare</th>
                <th className="p-3 whitespace-nowrap">Advance</th>
                <th className="p-3 whitespace-nowrap">Balance</th>
                <th className="p-3 whitespace-nowrap">Driver</th>
                <th className="p-3 whitespace-nowrap">Cab Number</th>
                <th className="p-3 whitespace-nowrap">Payment ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={15} className="p-8 text-center text-slate-500 text-xs font-sans">
                    No bookings found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((b, idx) => {
                  const isComplete = b.status === 'TRIP_COMPLETED';
                  const isFinding = b.status === 'FINDING_DRIVER';

                  return (
                    <tr 
                      key={b.bookingId || idx}
                      className="hover:bg-slate-900/60 transition group text-slate-200"
                    >
                      <td className="p-3 text-slate-500">{idx + 1}</td>
                      <td className="p-3 font-bold text-orange-400 font-mono whitespace-nowrap">{b.bookingId}</td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          isComplete 
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isFinding
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-sans font-bold text-white">
                        {b.pickup} ➔ {b.drop}
                      </td>
                      <td className="p-3 whitespace-nowrap text-slate-300 font-sans">
                        {b.selectedRouteName || 'Car (Fastest)'}
                      </td>
                      <td className="p-3 whitespace-nowrap font-black text-orange-300">{b.distanceKm} KM</td>
                      <td className="p-3 whitespace-nowrap text-slate-400">{b.estimatedDuration}</td>
                      <td className="p-3 whitespace-nowrap text-white font-sans">{b.vehicleName}</td>
                      <td className="p-3 whitespace-nowrap text-slate-300">{b.pickupDate} {b.pickupTime}</td>
                      <td className="p-3 whitespace-nowrap font-black text-emerald-400">₹{b.estimatedFare}</td>
                      <td className="p-3 whitespace-nowrap text-slate-300">₹{b.advancePaid}</td>
                      <td className="p-3 whitespace-nowrap font-bold text-amber-400">₹{b.balancePayable}</td>
                      <td className="p-3 whitespace-nowrap text-white font-sans">{b.driverDetails?.name || 'M. Suresh Kumar'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-400">{b.driverDetails?.cabNumber || 'TN 09 BX 4589'}</td>
                      <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[10px]">{b.paymentId || 'pay_demo_10024'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Showing <strong className="text-white">{filtered.length}</strong> of <strong className="text-white">{bookings.length}</strong> total bookings</span>
          <button
            onClick={handleDownload}
            className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export full sheet to Excel (.csv)</span>
          </button>
        </div>

      </div>
    </div>
  );
}
