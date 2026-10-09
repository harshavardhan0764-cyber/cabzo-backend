import React, { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  CheckCircle2, 
  ArrowUpCircle, 
  Sparkles, 
  X, 
  RotateCcw,
  Smartphone,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  getAppVersionInfo, 
  checkForAppUpdate, 
  startGooglePlayUpdate, 
  completeGooglePlayUpdate,
  onUpdateDownloaded,
  onUpdateProgress,
  APP_METADATA 
} from '../services/appUpdateService';

export default function AppUpdateModal({ isOpen, onClose, onShowToast, autoCheck = false, isStartup = false }) {
  const [versionInfo, setVersionInfo] = useState({
    versionName: APP_METADATA.versionName,
    versionCode: APP_METADATA.versionCode
  });
  const [checking, setChecking] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const [updateState, setUpdateState] = useState({
    updateAvailable: false,
    availableVersionName: null,
    isDownloaded: false,
    downloading: false,
    progressPercent: 0,
    isImmediate: false,
    message: ''
  });
  const [actionError, setActionError] = useState('');

  // Fetch initial version info
  useEffect(() => {
    getAppVersionInfo().then(info => {
      if (info) {
        setVersionInfo({
          versionName: info.versionName || APP_METADATA.versionName,
          versionCode: info.versionCode || APP_METADATA.versionCode
        });
      }
    });
  }, []);

  // Listen to background download progress & completion
  useEffect(() => {
    let subDownload = null;
    let subProgress = null;

    try {
      subDownload = onUpdateDownloaded((data) => {
        setUpdateState(prev => ({
          ...prev,
          downloading: false,
          isDownloaded: true,
          message: 'Update downloaded. Restart CABZO to install the latest version.'
        }));
      });

      subProgress = onUpdateProgress((data) => {
        const total = data?.totalBytesToDownload || 0;
        const current = data?.bytesDownloaded || 0;
        const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
        setUpdateState(prev => ({
          ...prev,
          downloading: true,
          progressPercent: percent
        }));
      });
    } catch (_) {}

    return () => {
      if (subDownload && typeof subDownload.then === 'function') {
        subDownload.then(handle => handle?.remove?.()).catch(() => {});
      }
      if (subProgress && typeof subProgress.then === 'function') {
        subProgress.then(handle => handle?.remove?.()).catch(() => {});
      }
    };
  }, []);

  // Trigger check when modal opens or autoCheck is true
  useEffect(() => {
    if (isOpen) {
      setActionError('');
      if (autoCheck || !hasChecked) {
        performUpdateCheck();
      }
    }
  }, [isOpen]);

  const performUpdateCheck = async () => {
    setChecking(true);
    setActionError('');
    try {
      const res = await checkForAppUpdate();
      setHasChecked(true);

      if (res.isDownloaded) {
        setUpdateState({
          updateAvailable: true,
          availableVersionName: res.availableVersionName || '1.0.1',
          isDownloaded: true,
          downloading: false,
          progressPercent: 100,
          isImmediate: false,
          message: 'Update downloaded. Restart CABZO to install the latest version.'
        });
      } else if (res.updateAvailable) {
        const isCrit = (res.updatePriority >= 4) && res.isImmediateAllowed && !res.isFlexibleAllowed;
        setUpdateState({
          updateAvailable: true,
          availableVersionName: res.availableVersionName || '1.0.1',
          isDownloaded: false,
          downloading: false,
          progressPercent: 0,
          isImmediate: isCrit,
          message: `New version available: ${res.availableVersionName || '1.0.1'}`
        });
      } else {
        setUpdateState({
          updateAvailable: false,
          availableVersionName: null,
          isDownloaded: false,
          downloading: false,
          progressPercent: 0,
          isImmediate: false,
          message: "You're using the latest version of CABZO."
        });
      }
    } catch (err) {
      setHasChecked(true);
      setUpdateState(prev => ({
        ...prev,
        updateAvailable: false,
        message: "You're using the latest version of CABZO."
      }));
    } finally {
      setChecking(false);
    }
  };

  const handleStartUpdate = async () => {
    setActionError('');
    try {
      const mode = updateState.isImmediate ? 'IMMEDIATE' : 'FLEXIBLE';
      await startGooglePlayUpdate(mode);
      if (onShowToast) onShowToast('Google Play update started.', 'info');
    } catch (err) {
      console.warn('Update trigger:', err);
      // If local testing outside Google Play store:
      setActionError(err.message || 'Update request handled by Google Play.');
    }
  };

  const handleRestartToApply = async () => {
    try {
      await completeGooglePlayUpdate();
    } catch (err) {
      setActionError(err.message || 'Could not restart application.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl relative space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center pt-1">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center overflow-hidden">
              <img 
                src="/cabzo_official_logo.jpg" 
                alt="U & I Cabs" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = '<span class="text-amber-400 font-black text-xl">U & I Cabs</span>';
                }}
              />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-wide">
            U &amp; I Cabs
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
            Current Version: <span className="font-bold text-slate-800 dark:text-slate-200">{versionInfo.versionName}</span>
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-2xl p-4 text-center space-y-3">
          
          {checking ? (
            <div className="py-4 space-y-2">
              <div className="w-7 h-7 mx-auto border-3 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Checking for updates...
              </p>
            </div>
          ) : updateState.isDownloaded ? (
            <div className="py-2 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                Update downloaded
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Restart U & I Cabs to install the latest version.
              </p>
            </div>
          ) : updateState.updateAvailable ? (
            <div className="py-2 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                New version available: {updateState.availableVersionName || '1.0.1'}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Update U & I Cabs to get the latest features and bug fixes.
              </p>

              {updateState.downloading && (
                <div className="pt-2 space-y-1">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${updateState.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold">
                    Downloading in background ({updateState.progressPercent}%)
                  </p>
                </div>
              )}
            </div>
          ) : hasChecked ? (
            <div className="py-2 space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                You're using the latest version of U & I Cabs.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Google Play updates are enabled.
              </p>
            </div>
          ) : (
            <div className="py-3">
              <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                Tap below to check if a newer release is published on Google Play.
              </p>
            </div>
          )}

          {actionError && (
            <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-1">
              {actionError}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          {updateState.isDownloaded ? (
            <button
              type="button"
              onClick={handleRestartToApply}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Restart Now</span>
            </button>
          ) : updateState.updateAvailable ? (
            <>
              <button
                type="button"
                onClick={handleStartUpdate}
                disabled={updateState.downloading}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-98 transition cursor-pointer disabled:opacity-50"
              >
                <ArrowUpCircle className="w-4 h-4" />
                <span>{updateState.downloading ? 'Downloading...' : 'Update Now'}</span>
              </button>

              {!updateState.isImmediate && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold transition cursor-pointer"
                >
                  Later
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={performUpdateCheck}
              disabled={checking}
              className="w-full py-3.5 bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-amber-400 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg active:scale-98 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Checking...' : 'Check for Updates'}</span>
            </button>
          )}

          {(!updateState.updateAvailable || updateState.isDownloaded) && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-xs font-semibold transition cursor-pointer text-center"
            >
              Close
            </button>
          )}
        </div>

        {/* Sub-note */}
        <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Official Google Play In-App Updates</span>
        </div>

      </div>
    </div>
  );
}
