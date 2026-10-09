/**
 * Rate Limiters
 *
 * - apiLimiter:      General API limit — 100 req/15min per IP
 * - otpSendLimiter:  OTP send/resend — 5 per phone/IP per 15min (prevents SMS spam)
 * - otpVerifyLimiter: OTP verify — 10 per IP per 15min (prevents brute force)
 * - authLimiter:     Admin login — 10 per IP per hour
 */

const rateLimit = require('express-rate-limit');

// ─── Standard response format ──────────────────────────────────────────────
const rateLimitResponse = (message) => ({
  success: false,
  message,
  errors: [{ msg: message }]
});

// ─── General API limiter ────────────────────────────────────────────────────
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many requests. Please try again in 15 minutes.')
});

// Helper to skip rate limiting for localhost / development
const isLocalOrDev = (req) => {
  return (
    process.env.NODE_ENV === 'development' ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1' ||
    req.hostname === 'localhost'
  );
};

// ─── OTP send/resend — tight limit to prevent SMS abuse ───────────────────
exports.otpSendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 20,                     // 20 OTP requests per IP per 15 min
  skip: isLocalOrDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many OTP requests. Please wait 15 minutes before requesting another OTP.'
  )
});

// ─── OTP verification — prevent brute force ────────────────────────────────
exports.otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  skip: isLocalOrDev,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse(
    'Too many verification attempts from this network. Please try again in 15 minutes.'
  )
});

// ─── Admin login limiter ───────────────────────────────────────────────────
exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,   // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitResponse('Too many login attempts. Please try again after an hour.')
});
