import React, { useState } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  ShieldAlert, 
  LogOut, 
  ChevronRight, 
  Bell, 
  Globe, 
  HelpCircle, 
  FileText, 
  ShieldCheck, 
  Lock,
  Save,
  CheckCircle2,
  X,
  Sparkles,
  ArrowUpCircle,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import TopBar from '../components/TopBar';
import { useAuth } from '../context/AuthContext';

export default function Screen10Profile({ onNavigate, onOpenMenu, onShowToast, onCheckForUpdates }) {
  const { currentUser, currentPhone, updateProfile, logout } = useAuth();

  const [name, setName] = useState(currentUser?.name || currentUser?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Customer'));
  const [email, setEmail] = useState(currentUser?.email || '');
  const [emergencyContact, setEmergencyContact] = useState(currentUser?.emergencyContact || '');
  const [city, setCity] = useState(currentUser?.city || 'Bengaluru');
  
  React.useEffect(() => {
    if (currentUser) {
      setName(currentUser?.name || currentUser?.full_name || (currentUser?.email ? currentUser.email.split('@')[0] : 'Customer'));
      setEmail(currentUser?.email || '');
      setEmergencyContact(currentUser?.emergencyContact || '');
      setCity(currentUser?.city || 'Bengaluru');
    }
  }, [currentUser]);

  const [editingField, setEditingField] = useState(null); // 'personal' | 'email' | 'emergency' | 'notifications' | 'language' | null
  const [notifications, setNotifications] = useState({ sms: true, push: true, promo: false });
  const [language, setLanguage] = useState('English');

  const maskedPhone = currentPhone && currentPhone.length === 10
    ? `+91 XXXXXXX${currentPhone.slice(-3)}`
    : (currentPhone ? `+91 ${currentPhone}` : 'Not provided');

  const handleSaveField = () => {
    try {
      updateProfile({ name, email, emergencyContact, city });
      setEditingField(null);
      if (onShowToast) onShowToast('Profile changes saved to Firebase!', 'success');
    } catch (err) {
      if (onShowToast) onShowToast(err.message, 'error');
    }
  };

  const handleLogout = () => {
    logout();
    if (onShowToast) onShowToast('Signed out of session', 'info');
    onNavigate('LoginScreen');
  };

  return (
    <div className="flex-1 bg-slate-50 text-slate-900 flex flex-col justify-between">
      <TopBar 
        title="Profile & Settings" 
        onOpenMenu={onOpenMenu}
        onOpenSupport={() => onNavigate('ContactUsScreen')}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 max-w-md mx-auto w-full">
        
        {/* Profile Card Header */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-3xl flex items-center justify-center shadow-md shadow-orange-500/20">
            {name ? name[0].toUpperCase() : 'R'}
          </div>

          <h3 className="font-black text-lg text-slate-900 leading-tight">{name}</h3>
          <p className="text-xs text-slate-500 font-bold">{email}</p>

          <div className="pt-1">
            <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-black px-3 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Verified Customer
            </span>
          </div>
        </div>

        {/* ACCOUNT SECTION */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            ACCOUNT
          </span>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {/* Personal Information */}
            <button
              type="button"
              onClick={() => setEditingField('personal')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Personal Information</span>
                  <span className="text-[11px] text-slate-500">{name} • {city}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Email */}
            <button
              type="button"
              onClick={() => setEditingField('email')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Email Address</span>
                  <span className="text-[11px] text-slate-500">{email}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Emergency Contact */}
            <button
              type="button"
              onClick={() => setEditingField('emergency')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Emergency Contact</span>
                  <span className="text-[11px] text-slate-500">
                    {emergencyContact ? `+91 ${emergencyContact}` : 'Not added (Tap to add)'}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* PREFERENCES SECTION */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            PREFERENCES
          </span>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            {/* Notifications */}
            <button
              type="button"
              onClick={() => setEditingField('notifications')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Trip Notifications</span>
                  <span className="text-[11px] text-slate-500">SMS & Push Enabled</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Language */}
            <button
              type="button"
              onClick={() => setEditingField('language')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Language</span>
                  <span className="text-[11px] text-slate-500">{language}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* SUPPORT SECTION */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            SUPPORT & POLICIES
          </span>

          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm">
            <button
              type="button"
              onClick={() => onNavigate('ContactUsScreen')}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-orange-500" />
                <span className="text-xs font-bold text-slate-900">Help & Support</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => { if (onShowToast) onShowToast('Displaying U & I Cabs Terms & Conditions', 'info'); }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900">Terms & Conditions</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={() => { if (onShowToast) onShowToast('Displaying U & I Cabs Privacy Policy', 'info'); }}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-900">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </div>

        {/* ABOUT U & I CABS & APP UPDATE SECTION */}
        <div className="space-y-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 px-1">
            ABOUT U &amp; I CABS
          </span>

          <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-md shadow-amber-500/20">
                  UI
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">U &amp; I Cabs</h4>
                  <p className="text-[11px] font-semibold text-slate-500">Current Version: 1.0.0</p>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black">
                Installed
              </span>
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onCheckForUpdates) {
                    onCheckForUpdates();
                  }
                }}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Check for Updates</span>
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-2">
          <button
            onClick={handleLogout}
            className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-black py-3.5 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer shadow-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out (Logout)</span>
          </button>
        </div>

      </div>

      {/* --- EDIT MODAL --- */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-[340px] bg-white border border-slate-200 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="text-sm font-black text-slate-900 capitalize">
                Edit {editingField}
              </h4>
              <button
                onClick={() => setEditingField(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingField === 'personal' && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Home City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {editingField === 'email' && (
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Email ID</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>
            )}

            {editingField === 'emergency' && (
              <div>
                <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">Emergency Contact</label>
                <input
                  type="tel"
                  maxLength={10}
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
                <p className="text-[10px] text-amber-600 mt-1">Must be different from your registered phone.</p>
              </div>
            )}

            {editingField === 'language' && (
              <div className="space-y-2">
                {['English', 'हिंदी (Hindi)', 'தமிழ் (Tamil)', 'ಕನ್ನಡ (Kannada)', 'తెలుగు (Telugu)'].map((lang, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setLanguage(lang); setEditingField(null); }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold text-left transition cursor-pointer ${
                      language === lang ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}

            {editingField !== 'language' && (
              <button
                onClick={handleSaveField}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20 transition cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save to Profile</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
