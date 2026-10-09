/**
 * CABZO API Configuration
 * Supports 24/7 Cloud Backend on Render + Local Development Fallbacks
 */

// If your Render URL is slightly different, this is the single source of truth:
export const CLOUD_BACKEND_URL = 'https://cabzo-backend.onrender.com';

/**
 * Returns primary API base URL (cloud first for 24/7 availability)
 */
export function getApiBaseUrl() {
  return `${CLOUD_BACKEND_URL}/api`;
}

/**
 * Returns prioritized candidate URLs for fast parallel fallback
 */
export function getCandidateApiUrls(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const urls = [
    `${CLOUD_BACKEND_URL}/api${cleanPath}`
  ];

  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '');
  if (isAndroid) {
    urls.push(`http://192.168.0.111:3001/api${cleanPath}`);
    urls.push(`http://192.168.0.103:3001/api${cleanPath}`);
    urls.push(`http://10.0.2.2:3001/api${cleanPath}`);
  }

  const host = (typeof window !== 'undefined' && window.location && window.location.hostname) ? window.location.hostname : '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    urls.push(`http://${host}:3001/api${cleanPath}`);
  }

  urls.push(`http://192.168.0.111:3001/api${cleanPath}`);
  urls.push(`http://localhost:3001/api${cleanPath}`);
  urls.push(`http://127.0.0.1:3001/api${cleanPath}`);

  return Array.from(new Set(urls));
}
