import { Loader } from '@googlemaps/js-api-loader';

// Custom dark mode styling for CabBazar roadmap view
export const CABBAZAR_DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0b1120' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b1120' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f8fafc' }]
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0f291e' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0f172a' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#ea580c' }] // CabBazar Orange Highway accent
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#7c2d12' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0369a1' }]
  }
];

let googleMapsPromise = null;
let authFailureCallback = null;

// Suppress native Google Maps auth/error alert popups
if (typeof window !== 'undefined') {
  try {
    const originalAlert = window.alert;
    window.alert = function (msg) {
      if (typeof msg === 'string' && (
        msg.includes('Google Maps') || 
        msg.includes('API key') || 
        msg.includes('load Google Maps correctly') ||
        msg.includes('development purposes')
      )) {
        console.warn('Suppressed Google Maps alert dialog:', msg);
        return;
      }
      return originalAlert ? originalAlert.apply(this, arguments) : undefined;
    };
  } catch (e) {
    // Ignore alert patching issues
  }

  // Catch Google Maps authentication failures (e.g. invalid key, billing not active)
  window.gm_authFailure = () => {
    console.warn('Google Maps Platform auth failure: Switching to high-resolution satellite/OpenStreetMap engine.');
    if (authFailureCallback) {
      authFailureCallback(new Error('Google Maps API authentication failed.'));
    }
  };
}

/**
 * Register callback for Google auth failure
 */
export function onGoogleAuthFailure(cb) {
  authFailureCallback = cb;
}

export const DEFAULT_GOOGLE_MAPS_KEY = '';

/**
 * Get configured Google Maps API Key from environment or localStorage
 */
export function getGoogleMapsApiKey() {
  // 1. Check runtime localStorage override
  try {
    const local = localStorage.getItem('GOOGLE_MAPS_API_KEY');
    if (local === 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs' || local === 'YOUR_GOOGLE_MAPS_API_KEY') {
      localStorage.removeItem('GOOGLE_MAPS_API_KEY');
    } else if (local && local.trim().length > 15 && local.startsWith('AIzaSy')) {
      return local.trim();
    }
  } catch {
    // Ignored
  }

  // 2. Check window global
  if (typeof window !== 'undefined' && window.GOOGLE_MAPS_API_KEY && window.GOOGLE_MAPS_API_KEY.length > 15 && window.GOOGLE_MAPS_API_KEY.startsWith('AIzaSy') && window.GOOGLE_MAPS_API_KEY !== 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs') {
    return window.GOOGLE_MAPS_API_KEY;
  }

  // 3. Check Vite env variables
  const envViteKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (envViteKey && envViteKey.trim().length > 15 && envViteKey.startsWith('AIzaSy') && envViteKey !== 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs') {
    return envViteKey.trim();
  }

  const envKey = import.meta.env?.GOOGLE_MAPS_API_KEY;
  if (envKey && envKey.trim().length > 15 && envKey.startsWith('AIzaSy') && envKey !== 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs') {
    return envKey.trim();
  }

  return '';
}

/**
 * Set runtime API key in localStorage & reload promise
 */
export function setRuntimeApiKey(key) {
  if (key && key.trim() && key.trim().length > 15 && key.startsWith('AIzaSy') && key !== 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs') {
    localStorage.setItem('GOOGLE_MAPS_API_KEY', key.trim());
  } else {
    localStorage.removeItem('GOOGLE_MAPS_API_KEY');
  }
  googleMapsPromise = null;
}

/**
 * Check if a Google Maps API Key is configured
 */
export function getApiKeyStatus() {
  const key = getGoogleMapsApiKey();
  const hasKey = Boolean(key && key.length > 15 && key.startsWith('AIzaSy') && key !== 'AIzaSyCbttc8iCqv0ANGmLFyp4MIcJLQyjsnKPs');
  const keyPreview = hasKey ? `${key.slice(0, 6)}...${key.slice(-4)}` : 'Not Set';
  return { hasKey, key, keyPreview };
}

/**
 * Asynchronously load Google Maps Platform JavaScript API
 */
export function loadGoogleMaps() {
  if (typeof window !== 'undefined' && window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    return Promise.reject(new Error('Missing Google Maps API Key. Please configure GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY.'));
  }

  const loader = new Loader({
    apiKey,
    version: 'weekly',
    libraries: ['places', 'geometry', 'routes', 'marker']
  });

  googleMapsPromise = loader.load().then(() => {
    return window.google.maps;
  }).catch((err) => {
    console.warn('Google Maps API load error:', err.message);
    googleMapsPromise = null;
    throw err;
  });

  return googleMapsPromise;
}
