/**
 * Firebase Admin SDK Configuration
 *
 * Used solely on the backend to verify cryptographically signed Firebase ID tokens
 * received from the frontend after real SMS OTP verification.
 *
 * Never expose private keys or service account credentials to the frontend.
 */

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let isInitialized = false;
let authInstance = null;

function initFirebaseAdmin() {
  if (isInitialized && authInstance) {
    return true;
  }

  if (getApps().length > 0) {
    isInitialized = true;
    authInstance = getAuth();
    return true;
  }

  try {
    let app = null;

    // Option 1: Path to serviceAccountKey.json
    const serviceAccountPath = (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
    if (serviceAccountPath) {
      const resolvedPath = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);

      if (fs.existsSync(resolvedPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        app = initializeApp({
          credential: cert(serviceAccount)
        });
        isInitialized = true;
        authInstance = getAuth(app);
        console.log('🔥 Firebase Admin initialized via service account file:', path.basename(resolvedPath));
        return true;
      }
    }

    // Option 2: JSON string in environment variable
    const serviceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
    if (serviceAccountJson && serviceAccountJson.startsWith('{')) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      app = initializeApp({
        credential: cert(serviceAccount)
      });
      isInitialized = true;
      authInstance = getAuth(app);
      console.log('🔥 Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT_JSON');
      return true;
    }

    // Option 3: Individual Environment Variables
    const projectId = (process.env.FIREBASE_PROJECT_ID || '').trim();
    const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
    let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();

    if (projectId && clientEmail && privateKey && !privateKey.includes('YOUR_')) {
      // Handle escaped newlines in .env
      privateKey = privateKey.replace(/\\n/g, '\n');
      app = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        })
      });
      isInitialized = true;
      authInstance = getAuth(app);
      console.log('🔥 Firebase Admin initialized via environment credentials for project:', projectId);
      return true;
    }

    // Option 4: Project ID only (for Google Cloud / Application Default Credentials)
    if (projectId && !projectId.includes('YOUR_')) {
      app = initializeApp({
        projectId
      });
      isInitialized = true;
      authInstance = getAuth(app);
      console.log('🔥 Firebase Admin initialized with Project ID:', projectId);
      return true;
    }

    console.warn('⚠️ Firebase Admin SDK is not yet configured with service account credentials.');
    return false;
  } catch (err) {
    console.error('⚠️ Firebase Admin initialization error:', err.message);
    return false;
  }
}

// Attempt initialization on startup safely
try {
  initFirebaseAdmin();
} catch (e) {
  console.warn('⚠️ Firebase Admin startup notice:', e.message);
}

/**
 * Checks whether Firebase Admin is configured and ready to verify tokens.
 */
function isFirebaseAdminConfigured() {
  if (!isInitialized || !authInstance) {
    return initFirebaseAdmin();
  }
  return true;
}

/**
 * Verifies a Firebase ID token sent from the frontend.
 * Returns the decoded token containing verified `uid` and `phone_number`.
 *
 * @param {string} idToken
 * @returns {Promise<{ uid: string, phone_number: string, [key: string]: any }>}
 */
async function verifyFirebaseIdToken(idToken) {
  if (!isFirebaseAdminConfigured() || !authInstance) {
    throw new Error('Firebase Admin SDK is not configured. Please add your Firebase service account credentials in server/.env');
  }

  const decodedToken = await authInstance.verifyIdToken(idToken);
  return decodedToken;
}

module.exports = {
  initFirebaseAdmin,
  isFirebaseAdminConfigured,
  verifyFirebaseIdToken
};
