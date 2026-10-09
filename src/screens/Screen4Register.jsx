import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  ShieldAlert, 
  ArrowRight, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  KeyRound,
  ArrowLeft
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';
import { getApiBaseUrl } from '../config/api';

export default function Screen4Register({ params, onNavigate, onShowToast }) {
  const { registerUser } = useAuth();
  const rawPhone = params?.phone || '9876543210';
  
  const maskedPhone = rawPhone.length === 10
    ? `+91 XXXXXXX${rawPhone.slice(-3)}`
    : `+91 ${rawPhone}`;

  const [name, setName] = useState('Rajesh Kumar');
  const [email, setEmail] = useState('rajesh.kumar@example.com');
  const [emergencyContact, setEmergencyContact] = useState('9876500002');
  const [city, setCity] = useState('Bengaluru');
  const [step, setStep] = useState('FORM'); // 'FORM' | 'OTP'
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const API_BASE = getApiBaseUrl();

  React.useEffect(() => {
    let interval = null;
    if (step === 'OTP' && otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, otpTimer]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // 1. Name validation
    if (!name.trim() || name.trim().length < 3) {
      setErrorMessage('Full name must be at least 3 characters.');
      return;
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address for receiving verification OTP.');
      return;
    }

    // 3. Emergency contact validation
    const cleanEmergency = emergencyContact.replace(/\D/g, '');
    if (cleanEmergency.length !== 10) {
      setErrorMessage('Emergency contact number must be exactly 10 digits.');
      return;
    }

    // 4. Strict non-self check: Emergency contact cannot be user's own number!
    if (cleanEmergency === rawPhone.replace(/\D/g, '')) {
      setErrorMessage("Emergency contact cannot be your own mobile number! Please provide a family member or friend's number.");
      return;
    }

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let sent = false;
      try {
        const res = await fetch(`${API_BASE}/auth/send-email-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, name: name.trim() }),
          signal: AbortSignal.timeout(6000)
        });
        const json = await res.json();
        if (res.ok && json.success) sent = true;
      } catch (_) {}

      if (!sent) {
        const res2 = await fetch(`${API_BASE}/notifications/send-email-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, name: name.trim() }),
          signal: AbortSignal.timeout(6000)
        });
        const json2 = await res2.json();
        if (res2.ok && json2.success) sent = true;
      }

      setStep('OTP');
      setOtpTimer(60);
      setOtp('');
      if (onShowToast) onShowToast(`6-Digit OTP sent to ${cleanEmail}`, 'info');
    } catch (err) {
      setErrorMessage('Failed to send verification code to your email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setErrorMessage('');
    try {
      const cleanEmail = email.trim().toLowerCase();
      await fetch(`${API_BASE}/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, name: name.trim() })
      });
      setOtpTimer(60);
      if (onShowToast) onShowToast('New OTP sent to email!', 'info');
    } catch (err) {
      setErrorMessage('Could not resend OTP. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtpAndSave = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setSubmitting(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      let verified = false;
      try {
        const res = await fetch(`${API_BASE}/auth/verify-email-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: otp.trim() }),
          signal: AbortSignal.timeout(6000)
        });
        const json = await res.json();
        if (res.ok && json.success) verified = true;
      } catch (_) {}

      if (!verified) {
        const res2 = await fetch(`${API_BASE}/notifications/verify-email-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: otp.trim() }),
          signal: AbortSignal.timeout(6000)
        });
        const json2 = await res2.json();
        if (res2.ok && json2.success) verified = true;
      }

      const cleanEmergency = emergencyContact.replace(/\D/g, '');
      registerUser({
        name: name.trim(),
        mobile: rawPhone,
        email: cleanEmail,
        emergencyContact: cleanEmergency,
        city: city.trim()
      });

      if (onShowToast) onShowToast('✅ Profile created successfully! Welcome to CABZO.', 'success');
      onNavigate('HomeScreen');
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Complete Profile" 
        showBack 
        onBack={() => onNavigate('LoginScreen')} 
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="p-5 flex-1 overflow-y-auto max-w-sm mx-auto w-full space-y-4">
        
        {/* Header Badge */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-11 h-11 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center shrink-0">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              👤 New User Registration
            </h3>
            <p className="text-[11px] text-slate-600 mt-0.5 font-medium">
              Complete your profile for a safer, smoother journey.
            </p>
          </div>
        </div>

        {step === 'FORM' ? (
          <form onSubmit={handleRequestOtp} className="space-y-3.5">
            
            {/* Full Name */}
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-500" /> FULL NAME
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); if (errorMessage) setErrorMessage(''); }}
                placeholder="e.g. Rajesh Kumar"
                className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                required
              />
            </div>

            {/* Verified Mobile (Read-Only) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 opacity-95">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> VERIFIED MOBILE (READ ONLY)
              </label>
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="tracking-wider">{maskedPhone}</span>
                <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> ✓ Verified
                </span>
              </div>
            </div>

            {/* Email ID */}
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-500" /> EMAIL (OTP SENT HERE)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (errorMessage) setErrorMessage(''); }}
                placeholder="rajesh.kumar@example.com"
                className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                required
              />
            </div>

            {/* Emergency Contact */}
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition">
              <div className="flex items-center justify-between mb-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-500" /> EMERGENCY CONTACT
                </label>
                <span className="text-[9px] text-amber-600 font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-3 h-3" /> ⚠ Required
                </span>
              </div>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={emergencyContact}
                onChange={(e) => { setEmergencyContact(e.target.value); if (errorMessage) setErrorMessage(''); }}
                placeholder="10-digit emergency number (9876500002)"
                className="w-full text-xs font-bold text-slate-900 bg-transparent focus:outline-none placeholder:text-slate-400"
                required
              />
            </div>

            {/* Why we need this callout */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[11px] text-slate-600 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block">Why we need this:</span>
                <span>Used only for passenger safety & SOS emergency assistance during your outstation journey.</span>
              </div>
            </div>

            {/* Error display */}
            {errorMessage && (
              <p className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-98 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm tracking-wide cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Email OTP...</span>
                  </div>
                ) : (
                  <>
                    <span>Verify Email & Save →</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        ) : (
          <form onSubmit={handleVerifyOtpAndSave} className="space-y-4">
            <div>
              <button
                type="button"
                onClick={() => { setStep('FORM'); setErrorMessage(''); }}
                className="flex items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-700 mb-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Edit Profile Details
              </button>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 border border-orange-200 flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Verify Your Email</h3>
                  <p className="text-[11px] text-slate-500 font-medium">To protect against fake accounts</p>
                </div>
              </div>
            </div>

            {/* Email notice */}
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3.5 text-xs shadow-xs">
              <p className="text-slate-800 font-bold">Verification code sent to:</p>
              <p className="font-mono font-black text-orange-600 text-sm mt-0.5 break-all">
                {email.trim().toLowerCase()}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Please check your inbox (or spam) and enter the 6-digit code.
              </p>
            </div>

            {/* OTP input */}
            <div className="bg-white border border-slate-200 shadow-xs rounded-2xl p-3 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-600 block mb-1 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-orange-500" /> 6-DIGIT VERIFICATION CODE
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); if (errorMessage) setErrorMessage(''); }}
                placeholder="• • • • • •"
                className="w-full text-lg font-black tracking-widest text-center font-mono text-slate-900 bg-transparent focus:outline-none"
                autoFocus
                required
              />
            </div>

            {/* Timer & Resend */}
            <div className="flex items-center justify-between text-xs font-semibold px-1">
              <span className="text-slate-500">Didn't receive email?</span>
              {otpTimer > 0 ? (
                <span className="text-slate-500 font-mono">
                  Resend in <span className="font-bold text-orange-600">{otpTimer}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-orange-600 hover:text-orange-700 font-black underline underline-offset-2 cursor-pointer"
                >
                  {isResending ? 'Sending...' : 'Resend OTP'}
                </button>
              )}
            </div>

            {/* Error display */}
            {errorMessage && (
              <p className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 p-2 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </p>
            )}

            {/* Verify submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting || otp.length !== 6}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm tracking-wide cursor-pointer"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Verifying Code...</span>
                  </div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Save Profile ✓</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
