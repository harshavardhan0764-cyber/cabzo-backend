/**
 * Payment API Helper for Razorpay Integration
 * Supports localhost, network IP, and Android emulator endpoints
 */

import { getCandidateApiUrls } from '../config/api';

const getCandidateApiBases = () => {
  return getCandidateApiUrls('');
};

async function apiRequest(endpoint, options = {}) {
  const bases = getCandidateApiBases();
  let lastError = null;

  for (const base of bases) {
    const url = `${base}${endpoint}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg = data?.message || data?.error || `HTTP error ${res.status}`;
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      lastError = err;
      // If server responded with a business logic/validation error, do not failover to other hosts
      if (err.name !== 'AbortError' && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Network error: Unable to connect to payment server at port 3001');
}

/**
 * Fetch Razorpay public configuration
 */
export async function getRazorpayConfig() {
  return apiRequest('/payments/config', { method: 'GET' });
}

/**
 * Create Razorpay Order on server
 */
export async function createRazorpayOrder(orderPayload) {
  return apiRequest('/payments/create-order', {
    method: 'POST',
    body: JSON.stringify(orderPayload)
  });
}

/**
 * Verify Razorpay payment signature & amount server-side
 */
export async function verifyRazorpayPayment(verificationPayload) {
  return apiRequest('/payments/verify', {
    method: 'POST',
    body: JSON.stringify(verificationPayload)
  });
}

/**
 * Ensures Razorpay Checkout script is loaded
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
