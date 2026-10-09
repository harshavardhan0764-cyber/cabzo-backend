/**
 * Auth Routes
 * POST /api/auth/send-otp    — Request OTP (sends real SMS via MSG91)
 * POST /api/auth/verify-otp  — Verify OTP → login or auto-register
 * POST /api/auth/resend-otp  — Resend OTP (30s cooldown enforced)
 * GET  /api/auth/sms-status  — Health check: MSG91 configured? (no key exposure)
 */

const express = require('express');
const { body, query } = require('express-validator');
const router = express.Router();
const auth = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

// ─── Validation helpers ────────────────────────────────────────────────────
const mobileRule = body('mobile')
  .trim()
  .notEmpty().withMessage('Mobile number is required.')
  .matches(/^(\+91|91)?[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number (starts with 6-9).');

const otpRule = body('otp')
  .trim()
  .notEmpty().withMessage('OTP is required.')
  .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits.')
  .isNumeric().withMessage('OTP must contain only digits.');

const roleRule = body('role')
  .optional()
  .isIn(['CUSTOMER', 'DRIVER']).withMessage('Role must be CUSTOMER or DRIVER.');

// ─── Routes ────────────────────────────────────────────────────────────────

// Send OTP — strict rate limit (5 per phone per 15min)
router.post(
  '/send-otp',
  otpSendLimiter,
  [mobileRule, roleRule],
  validate,
  auth.sendOTP
);

// Verify OTP — strict rate limit (10 per IP per 15min)
router.post(
  '/verify-otp',
  otpVerifyLimiter,
  [mobileRule, otpRule, roleRule],
  validate,
  auth.verifyOTP
);

// Resend OTP — same send limiter (cooldown enforced in controller too)
router.post(
  '/resend-otp',
  otpSendLimiter,
  [mobileRule, roleRule],
  validate,
  auth.resendOTP
);

// Firebase Email/Password Auth Login — verifies Firebase ID token & syncs customer session
router.post(
  '/firebase-login',
  otpVerifyLimiter,
  [
    body('idToken').trim().notEmpty().withMessage('Firebase ID token is required.'),
    body('name').optional().trim(),
    body('mobile').optional().trim()
  ],
  validate,
  auth.firebaseLogin
);

// Email OTP verification to reduce fake accounts
router.post('/send-email-otp', auth.sendEmailOTP);
router.post('/verify-email-otp', auth.verifyEmailOTP);
router.post('/clear-stored-data', auth.clearStoredData);
router.get('/clear-stored-data', auth.clearStoredData);

const { authenticate } = require('../middleware/auth');

// Current authenticated user session
router.get('/me', authenticate, auth.getMe);

// SMS health check — no auth needed, safe to expose publicly
router.get('/sms-status', auth.smsStatus);

module.exports = router;
