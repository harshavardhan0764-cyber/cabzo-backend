import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  MapPin, 
  Calendar, 
  Clock, 
  FileText, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Car,
  Mail,
  Navigation
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

export default function Screen6bCustomerDetails({ onNavigate, onShowToast }) {
  const { bookingForm, updateBookingForm, fareSummary, computeCurrentFare } = useBooking();
  const { currentUser, currentPhone } = useAuth();

  // Initialize fields - keep contact phone completely empty as requested
  const [passengerName, setPassengerName] = useState(() => {
    return bookingForm.userName || currentUser?.name || '';
  });

  const [contactPhone, setContactPhone] = useState(() => {
    // Keep empty by default - never auto-fill random or dummy numbers
    return '';
  });

  const [alternatePhone, setAlternatePhone] = useState(() => {
    return bookingForm.alternatePhone || '';
  });

  const [exactPickupAddress, setExactPickupAddress] = useState(() => {
    const defaultAddr = bookingForm.pickupLocation?.address || bookingForm.pickup || '';
    return bookingForm.pickupAddress || defaultAddr;
  });

  const [pickupLandmark, setPickupLandmark] = useState(() => {
    return bookingForm.pickupLandmark || '';
  });

  const [pickupDate, setPickupDate] = useState(() => {
    return bookingForm.pickupDate || new Date().toISOString().split('T')[0];
  });

  const [pickupTime, setPickupTime] = useState(() => {
    return bookingForm.pickupTime || '06:00 AM';
  });

  const [specialNotes, setSpecialNotes] = useState(() => {
    return bookingForm.specialNotes || '';
  });

  const [phoneError, setPhoneError] = useState('');
  const [addressError, setAddressError] = useState('');

  const registeredEmail = currentUser?.email || localStorage.getItem('CabApp_CustomerEmail') || 'customer@cabbazar.com';
  const grossTotal = fareSummary?.grossTotal || 2050;
  const advanceAmount = fareSummary?.advanceAmount || 500;

  const handlePhoneChange = (val) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setContactPhone(cleaned);
    if (cleaned.length === 10) {
      setPhoneError('');
    }
  };

  const handleProceedToPayment = (e) => {
    e.preventDefault();

    // 1. Validate phone number
    if (!contactPhone || contactPhone.length !== 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      if (onShowToast) onShowToast('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    // 2. Validate exact pickup address
    if (!exactPickupAddress || exactPickupAddress.trim().length < 5) {
      setAddressError('Please enter your specific pickup address / house or building details');
      if (onShowToast) onShowToast('Please specify pickup address or building name', 'error');
      return;
    }

    // 3. Save all passenger and pickup details into BookingForm state
    updateBookingForm({
      userName: passengerName.trim() || 'Customer',
      userPhone: contactPhone.trim(),
      alternatePhone: alternatePhone.trim(),
      pickupAddress: exactPickupAddress.trim(),
      pickupLandmark: pickupLandmark.trim(),
      pickupDate,
      pickupTime,
      specialNotes: specialNotes.trim()
    });

    // 4. Recompute fare with confirmed date and schedule
    computeCurrentFare();

    if (onShowToast) {
      onShowToast('Passenger & pickup details saved!', 'success');
    }

    // 5. Navigate to Payment Screen
    onNavigate('PaymentScreen');
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Passenger & Pickup Details" 
        subtitle="Step 2 of 3: Journey Information"
        showBack 
        onBack={() => onNavigate('FareScreen')} 
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full pb-6">
        
        {/* 1. ROUTE & VEHICLE MINI SUMMARY CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
              TRIP SUMMARY
            </span>
            <span className="text-[10px] bg-orange-100 border border-orange-300 text-orange-800 font-extrabold px-2.5 py-0.5 rounded-full">
              {bookingForm.tripType === 'roundtrip' ? 'Round Trip' : 'One Way'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 font-bold">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-black text-slate-900 truncate">
                  {bookingForm.pickupLocation?.name || bookingForm.pickup} ➔ {bookingForm.dropLocation?.name || bookingForm.drop}
                </h4>
                <p className="text-[10px] text-slate-500">
                  {fareSummary?.vehicle?.name || 'SUV'} • {fareSummary?.actualDistance || 145} KM{bookingForm.needCarrier ? ' • Carrier (+₹100)' : ''}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-sm font-black text-orange-600 block">
                ₹{grossTotal.toLocaleString('en-IN')}
              </span>
              <span className="text-[9px] text-slate-500 block">
                Token: ₹{advanceAmount}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PASSENGER CONTACT DETAILS CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-orange-500" />
              <span>Passenger Contact Details</span>
            </h3>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Driver Telemetry
            </span>
          </div>

          {/* Passenger Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
              <span>Full Name</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={passengerName}
                onChange={(e) => setPassengerName(e.target.value)}
                placeholder="Enter passenger name"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-bold"
              />
            </div>
          </div>

          {/* Primary Mobile Number (Required) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Primary Contact Number</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-500">For driver coordination & OTP</span>
            </label>
            <div className="relative">
              <div className="absolute left-3 top-2.5 flex items-center gap-1 text-slate-500 font-bold text-xs border-r border-slate-200 pr-2">
                <span>🇮🇳 +91</span>
              </div>
              <input
                type="tel"
                maxLength={10}
                value={contactPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="10-digit mobile number"
                className={`w-full pl-20 pr-3 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white transition font-mono font-bold tracking-wider ${
                  phoneError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
            </div>
            {phoneError && (
              <p className="text-[10px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                <AlertCircle className="w-3 h-3" /> {phoneError}
              </p>
            )}
          </div>

          {/* Alternate Contact Number (Optional) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Alternate / WhatsApp Number (Optional)</span>
              <span className="text-[10px] text-slate-400">Backup</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                maxLength={10}
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Optional backup phone number"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-mono font-medium"
              />
            </div>
          </div>

          {/* Registered Email Confirmation Card (Automatic, No typing needed!) */}
          <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-extrabold text-emerald-800 uppercase block">
                Automatic Email Dispatch (Verified Account)
              </span>
              <span className="text-[11px] font-mono font-bold text-emerald-950 truncate block">
                {registeredEmail}
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 font-bold shrink-0">
              ✓ Auto
            </span>
          </div>

        </div>

        {/* 3. EXACT PICKUP LOCATION & LANDMARK CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exact Pickup Location Details</span>
            </h3>
            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Doorstep Cab
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span>Complete Doorstep Address / Building No.</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[10px] text-slate-500">Cab arrives here</span>
            </label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-emerald-600 absolute left-3 top-3" />
              <textarea
                rows={2}
                value={exactPickupAddress}
                onChange={(e) => {
                  setExactPickupAddress(e.target.value);
                  if (e.target.value.trim().length >= 5) setAddressError('');
                }}
                placeholder="Flat / House No., Apartment / Society, Street, Area"
                className={`w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border rounded-xl focus:outline-none focus:bg-white transition text-slate-900 font-medium leading-relaxed resize-none ${
                  addressError ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
            </div>
            {addressError && (
              <p className="text-[10px] text-rose-600 flex items-center gap-1 font-medium mt-0.5">
                <AlertCircle className="w-3 h-3" /> {addressError}
              </p>
            )}
          </div>

          {/* Nearby Landmark */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Nearby Landmark (Recommended)</span>
              <span className="text-[10px] text-slate-400">Easy driver navigation</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={pickupLandmark}
                onChange={(e) => setPickupLandmark(e.target.value)}
                placeholder="e.g. Opposite Metro Pillar 120, Behind Grand Mall, Near Temple"
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-medium"
              />
            </div>
          </div>
        </div>

        {/* 4. PICKUP DATE & TIME SCHEDULE CARD */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-orange-500" />
              <span>Pickup Date & Time</span>
            </h3>
            <span className="text-[10px] text-orange-700 font-bold bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
              Guaranteed On-Time
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Pickup Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Pickup Date</label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-orange-500 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={pickupDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-bold cursor-pointer"
                />
              </div>
            </div>

            {/* Pickup Time */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Pickup Time</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-orange-500 absolute left-3 top-3 pointer-events-none" />
                <select
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  className="w-full pl-9 pr-2 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-bold cursor-pointer"
                >
                  {[
                    '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', 
                    '07:00 AM', '07:30 AM', '08:00 AM', '09:00 AM', 
                    '10:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', 
                    '06:00 PM', '08:00 PM', '10:00 PM'
                  ].map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 5. SPECIAL INSTRUCTIONS / NOTES FOR DRIVER (OPTIONAL) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Special Notes for Driver (Optional)</span>
            </h3>
          </div>

          <input
            type="text"
            value={specialNotes}
            onChange={(e) => setSpecialNotes(e.target.value)}
            placeholder="e.g. Extra luggage, Call 15 mins before arrival, Pet traveling"
            className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:bg-white transition text-slate-900 font-medium"
          />

          <div className="flex flex-wrap gap-1.5 pt-1">
            {[
              'Call 15m before',
              'Boot space needed',
              'AC at 22°C',
              'Senior citizen'
            ].map((pill, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSpecialNotes(prev => prev ? `${prev}, ${pill}` : pill)}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 border border-slate-200 transition cursor-pointer"
              >
                + {pill}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* ACTION CTA BUTTON: PROCEED TO PAYMENT */}
      <div className="p-4 bg-white/95 border-t border-slate-200 shadow-lg max-w-md mx-auto w-full">
        <button
          onClick={handleProceedToPayment}
          className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-md shadow-orange-500/30 active:scale-98 flex items-center justify-center gap-2 transition text-sm tracking-wide cursor-pointer"
        >
          <span>Proceed to Payment (₹{advanceAmount})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
