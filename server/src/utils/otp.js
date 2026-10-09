/**
 * OTP Utility — secure generation, hashing, verification
 * Uses crypto.randomInt for cryptographically secure OTPs
 * Uses bcrypt for one-way hashing (never store plaintext OTP)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 10;

/**
 * Generate a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt instead of Math.random() (not CSPRNG).
 * @returns {string} 6-digit string, zero-padded
 */
function generateOTP() {
  // randomInt(min, max) → [min, max)
  const otp = crypto.randomInt(100000, 1000000).toString();
  return otp;
}

/**
 * Hash OTP with bcrypt for secure DB storage.
 * @param {string} otp
 * @returns {Promise<string>} bcrypt hash
 */
async function hashOTP(otp) {
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  return bcrypt.hash(otp, salt);
}

/**
 * Verify plain OTP against stored bcrypt hash.
 * @param {string} otp       plain OTP from user input
 * @param {string} hashedOTP bcrypt hash from DB
 * @returns {Promise<boolean>}
 */
async function verifyOTP(otp, hashedOTP) {
  return bcrypt.compare(otp, hashedOTP);
}

/**
 * Normalise an Indian mobile number to E.164 without '+'
 * Input: '9876543210' or '+919876543210' or '919876543210'
 * Output: '919876543210'
 * @param {string} mobile
 * @returns {string}
 */
function normaliseMobile(mobile) {
  let m = mobile.trim().replace(/\s+/g, '').replace(/[^0-9]/g, '');
  if (m.length === 10) return '91' + m;
  if (m.length === 12 && m.startsWith('91')) return m;
  if (m.length === 13 && mobile.startsWith('+91')) return m.slice(1);
  throw new Error('Invalid Indian mobile number: ' + mobile);
}

/**
 * Format mobile for display: +91 98765 43210
 * @param {string} normalised '919876543210'
 * @returns {string}
 */
function displayMobile(normalised) {
  const digits = normalised.replace(/^91/, '');
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

module.exports = { generateOTP, hashOTP, verifyOTP, normaliseMobile, displayMobile };
