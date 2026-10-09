import React, { useState } from 'react';
import { 
  PhoneCall, 
  MessageSquare, 
  Mail, 
  Headphones, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Send, 
  CheckCircle2,
  ShieldCheck,
  Clock,
  Sparkles
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useBooking } from '../context/BookingContext';

const FAQS = [
  {
    q: 'How is the outstation fare calculated?',
    a: 'Outstation fares include base distance rate per km according to your selected vehicle, driver daily allowance (₹300/day), and estimated toll/taxes with zero hidden surcharges.'
  },
  {
    q: 'Why do I pay a ₹500 advance?',
    a: 'The ₹500 advance token confirms your ride and locks a verified chauffeur. The remaining balance is paid directly to your driver at the end of the trip.'
  },
  {
    q: 'Can I add multiple stops?',
    a: 'Yes! You can add up to 4 custom intermediate halts along your route for meals, sightseeing, or picking up co-passengers at zero extra base charge.'
  },
  {
    q: 'What happens if a driver isn’t assigned?',
    a: 'In the rare event a chauffeur cannot be assigned, your ₹500 advance token is instantly 100% refunded back to your original payment method.'
  },
  {
    q: 'Can I cancel my booking?',
    a: 'You can cancel free of charge anytime up to 2 hours prior to scheduled departure from the My Bookings screen.'
  },
  {
    q: 'How do refunds work?',
    a: 'Refunds are processed automatically via Razorpay back to your source account (UPI / Card / Net Banking) within 24 to 48 hours.'
  }
];

export default function Screen12ContactUs({ onNavigate, onOpenMenu, onShowToast }) {
  const { bookingsDb, reportIssue } = useBooking();

  const [openFaq, setOpenFaq] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState(bookingsDb[0]?.bookingId || 'BK-10024');
  const [category, setCategory] = useState('Driver Delayed');
  const [description, setDescription] = useState('');
  const [issueSubmitted, setIssueSubmitted] = useState(false);

  const handleCall = () => {
    if (onShowToast) onShowToast('Calling 24/7 Helpline: +91 83107 54133', 'info');
    window.open('tel:+918310754133', '_self');
  };

  const handleWhatsApp = () => {
    if (onShowToast) onShowToast('Opening WhatsApp Support (+91 83107 54133)...', 'info');
    window.open('https://wa.me/918310754133?text=Hello%20U%20%26%20I%20Cabs%2C%20I%20need%20assistance%20with%20my%20booking.', '_blank');
  };

  const handleEmail = () => {
    if (onShowToast) onShowToast('Opening Email to outstationcabsb@gmail.com', 'info');
    window.open('mailto:outstationcabsb@gmail.com?subject=U%20%26%20I%20Cabs%20Booking%20Assistance', '_self');
  };

  const handleSubmitIssue = (e) => {
    e.preventDefault();
    if (!description.trim()) {
      if (onShowToast) onShowToast('Please write a brief description of the issue', 'error');
      return;
    }

    reportIssue({
      bookingId: selectedBooking,
      category,
      description: description.trim()
    });

    setIssueSubmitted(true);
    setDescription('');
    if (onShowToast) onShowToast('Support ticket registered! Ticket ID generated.', 'success');
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Contact & Support" 
        subtitle="24/7 Customer Care Assistance"
        onOpenMenu={onOpenMenu}
        onOpenSupport={() => { if (onShowToast) onShowToast('24/7 Helpline: 8310754133', 'info'); }}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* Support Banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-900">U &amp; I Cabs Support</h3>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
              Available 24/7 for booking, outstation and trip assistance.
            </p>
          </div>
        </div>

        {/* 3 Contact Action Cards: Call, WhatsApp, Email */}
        <div className="space-y-2.5">
          
          {/* Call Helpline */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  CALL HELPLINE (24/7)
                </span>
                <h4 className="text-xs font-black text-slate-900">+91 83107 54133</h4>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCall}
              className="bg-orange-500 hover:bg-orange-600 text-white font-black py-2 px-3.5 rounded-xl text-xs transition shadow-md shadow-orange-500/20 active:scale-95 cursor-pointer"
            >
              Call Now
            </button>
          </div>

          {/* WhatsApp Helpline */}
          <div className="bg-white border border-emerald-200 rounded-3xl p-4 flex items-center justify-between shadow-sm bg-gradient-to-r from-emerald-50/40 to-teal-50/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-base">
                💬
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 block">
                  WHATSAPP HELPLINE
                </span>
                <h4 className="text-xs font-black text-slate-900">+91 83107 54133</h4>
              </div>
            </div>
            <button
              type="button"
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-3.5 rounded-xl text-xs transition shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
            >
              Chat on WhatsApp
            </button>
          </div>

          {/* Email Support */}
          <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  OFFICIAL EMAIL SUPPORT
                </span>
                <h4 className="text-xs font-black text-slate-900 font-mono">outstationcabsb@gmail.com</h4>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEmail}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs"
            >
              Email Us
            </button>
          </div>

        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            FREQUENTLY ASKED QUESTIONS
          </span>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx}>
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="w-full p-3.5 flex items-center justify-between text-left text-xs font-bold text-slate-800 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <span>{isOpen ? '▾' : '▸'} {faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-orange-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="p-3.5 bg-slate-50 text-[11px] text-slate-600 leading-relaxed border-t border-slate-100 font-medium">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 🚨 Emergency / Trip Issue Form */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🚨</span>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Emergency / Trip Issue
            </h4>
          </div>

          {issueSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-center space-y-2 animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h5 className="font-black text-xs text-slate-900">Issue Ticket Submitted!</h5>
              <p className="text-[11px] text-slate-600">
                Our support team is reviewing your ticket and will call you within 10 minutes.
              </p>
              <button
                type="button"
                onClick={() => setIssueSubmitted(false)}
                className="text-[11px] text-orange-600 font-bold hover:underline mt-1 cursor-pointer"
              >
                Submit another issue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitIssue} className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Select Booking</label>
                <select
                  value={selectedBooking}
                  onChange={(e) => setSelectedBooking(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  {bookingsDb.map(b => (
                    <option key={b.bookingId} value={b.bookingId} className="bg-white text-slate-900">
                      {b.bookingId} ({b.pickup} ➔ {b.drop})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Issue Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                >
                  <option value="Driver Delayed">Driver Delayed / Not Arrived</option>
                  <option value="Fare Discrepancy">Fare / Toll Discrepancy</option>
                  <option value="Vehicle Cleanliness">Vehicle Cleanliness / AC</option>
                  <option value="Route Deviation">Route Deviation</option>
                  <option value="Refund Status">Advance Refund Query</option>
                  <option value="Other">Other Inquiry</option>
                </select>
              </div>

              <div>
                <label className="text-[9px] font-bold text-slate-600 uppercase block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white placeholder:text-slate-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition active:scale-98 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Ticket</span>
              </button>
            </form>
          )}

        </div>

      </div>

      <div className="p-3 bg-white border-t border-slate-200 text-center">
        <p className="text-[10px] text-slate-500 font-medium">
          CABZO Technologies • Your Ride, Your Way • 24/7 Helpline & Roadside Assistance
        </p>
      </div>

    </div>
  );
}
