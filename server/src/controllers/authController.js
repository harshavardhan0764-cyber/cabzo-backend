/**
 * Auth Controller — Production OTP-based Authentication with MSG91
 *
 * Flow:
 *   sendOTP     → validate mobile → generate CSPRNG 6-digit OTP → hash with bcrypt
 *                 → persist in DB & memory cache
 *                 → send real SMS via MSG91 API v5 (if credentials set)
 *   verifyOTP   → find latest OTP record for mobile
 *                 → Check:
 *                     1. Already used? → 'OTP already used' (400)
 *                     2. Attempts exceeded? → 'Too many attempts' (429)
 *                     3. Expired? → 'OTP expired' (410)
 *                     4. Increment attempts & verify hash → 'Invalid OTP' (400)
 *                 → Mark as used (is_used = TRUE)
 *                 → Customer lookup/creation
 *                 → Generate secure JWT token
 *                 → Return customer, user, and token
 *   resendOTP   → enforce 30s cooldown → regenerate → dispatch via MSG91
 *   getMe       → fetch authenticated user from token
 */

const db = require('../config/database');
const { generateOTP, hashOTP, verifyOTP: checkOtpHash, normaliseMobile, displayMobile } = require('../utils/otp');
const { sendOTPviaMSG91, resendOTPviaMSG91, checkMsg91Config } = require('../utils/smsService');
const { verifyFirebaseIdToken, isFirebaseAdminConfigured } = require('../config/firebaseAdmin');
const { generateToken } = require('../utils/jwt');
const { successResponse, errorResponse } = require('../utils/response');
const { sendRegistrationOtpEmail } = require('../utils/emailService');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const OTP_EXPIRY_MS   = parseInt(process.env.OTP_EXPIRY_MINUTES  || '5')  * 60 * 1000;
const MAX_ATTEMPTS    = parseInt(process.env.OTP_MAX_ATTEMPTS     || '5');
const RESEND_COOLDOWN = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '30') * 1000;
const OTP_SALT        = 'cabbazar_otp_secure_salt_2026';
const OTP_FILE        = path.join(__dirname, '..', '..', 'data', 'active_email_otps.json');

function getPersistedEmailOtps() {
  try {
    if (fs.existsSync(OTP_FILE)) {
      return JSON.parse(fs.readFileSync(OTP_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function savePersistedEmailOtps(data) {
  try {
    const dir = path.dirname(OTP_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OTP_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

// Dual-layer memory cache for high resilience
const memoryOtpStore = new Map(); // mobile -> latest OTP record
const memoryEmailOtpStore = new Map(); // cleanEmail -> { otp, otpHash, expiresAt, attempts, createdAt }
const memoryUsers = new Map();    // mobile & id -> { user, customer }

function maskMobile(mobile) {
  return mobile.slice(0, 4) + 'XXXXXX' + mobile.slice(-2);
}

// ─── POST /api/auth/send-otp ─────────────────────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    let { mobile, role } = req.body;

    let normMobile;
    try {
      normMobile = normaliseMobile(mobile);
    } catch {
      return errorResponse(res, 'Please enter a valid 10-digit Indian mobile number.', 400);
    }

    // Driver role check
    if (role === 'DRIVER') {
      try {
        const [rows] = await db.execute(
          'SELECT id FROM users WHERE phone = ? AND role = ?',
          [normMobile, 'DRIVER']
        );
        if (!rows || rows.length === 0) {
          return errorResponse(res, 'No driver account found with this mobile number.', 404);
        }
      } catch (dbErr) {
        const memUser = memoryUsers.get(normMobile);
        if (!memUser || memUser.user.role !== 'DRIVER') {
          return errorResponse(res, 'No driver account found with this mobile number.', 404);
        }
      }
    }

    // Check resend cooldown
    const memRecent = memoryOtpStore.get(normMobile);
    if (memRecent && !memRecent.is_used) {
      const elapsed = Date.now() - memRecent.created_at;
      if (elapsed < RESEND_COOLDOWN) {
        const waitSec = Math.ceil((RESEND_COOLDOWN - elapsed) / 1000);
        return errorResponse(res, `Please wait ${waitSec} second${waitSec !== 1 ? 's' : ''} before requesting a new OTP.`, 429);
      }
    }

    try {
      const [recent] = await db.execute(
        `SELECT created_at FROM otp_verifications
         WHERE mobile_number = ? AND is_used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [normMobile]
      );
      if (recent && recent.length > 0) {
        const sentAt = new Date(recent[0].created_at).getTime();
        const elapsed = Date.now() - sentAt;
        if (elapsed < RESEND_COOLDOWN) {
          const waitSec = Math.ceil((RESEND_COOLDOWN - elapsed) / 1000);
          return errorResponse(res, `Please wait ${waitSec} second${waitSec !== 1 ? 's' : ''} before requesting a new OTP.`, 429);
        }
      }
    } catch (_) {}

    // Verify MSG91 SMS Service is configured (Never fall back to fake/test OTP)
    const smsConfig = checkMsg91Config();
    if (!smsConfig.configured) {
      console.warn('[sendOTP] SMS Service not configured. Missing:', smsConfig.missing.join(', '));
      return errorResponse(res, 'SMS service is not configured.', 503);
    }

    // Invalidate prior unused OTPs
    try {
      await db.execute(
        'UPDATE otp_verifications SET is_used = TRUE WHERE mobile_number = ? AND is_used = FALSE',
        [normMobile]
      );
    } catch (_) {}

    // Generate cryptographically secure 6-digit OTP
    const otp       = generateOTP();
    const otpHash   = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const now       = Date.now();

    // Store secure hash only (never store plaintext OTP)
    const otpRecord = {
      mobile_number: normMobile,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      is_used: false,
      created_at: now
    };
    memoryOtpStore.set(normMobile, otpRecord);

    try {
      await db.execute(
        `INSERT INTO otp_verifications
           (mobile_number, otp_hash, expires_at, attempt_count, is_used)
         VALUES (?, ?, ?, 0, FALSE)`,
        [normMobile, otpHash, expiresAt]
      );
    } catch (_) {}

    // Dispatch real SMS via MSG91
    const smsResult = await sendOTPviaMSG91(normMobile, otp);
    if (!smsResult.success) {
      console.error('[MSG91] SMS dispatch failed:', smsResult.message);
      return errorResponse(res, 'Unable to send OTP. Please try again.', 502);
    }

    return successResponse(res, {
      mobile: displayMobile(normMobile),
      expiresIn: OTP_EXPIRY_MS / 1000,
      resendAfter: RESEND_COOLDOWN / 1000
    }, `OTP sent to ${displayMobile(normMobile)}`);

  } catch (err) {
    console.error('[sendOTP] Error:', err);
    return errorResponse(res, 'Unable to send OTP. Please try again.', 500);
  }
};

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    let { mobile, otp, role } = req.body;

    let normMobile;
    try {
      normMobile = normaliseMobile(mobile);
    } catch {
      return errorResponse(res, 'Invalid mobile number.', 400);
    }

    // Accept exactly 6 digits
    if (!otp || !/^\d{6}$/.test(otp.toString().trim())) {
      return errorResponse(res, 'Invalid OTP', 400);
    }

    const otpStr = otp.toString().trim();

    // 1. Fetch latest OTP record for this mobile number (DB or memory)
    let record = null;
    let isDbRecord = false;

    try {
      const [otpRows] = await db.execute(
        `SELECT * FROM otp_verifications
         WHERE mobile_number = ?
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [normMobile]
      );
      if (otpRows && otpRows.length > 0) {
        record = otpRows[0];
        isDbRecord = true;
      }
    } catch (_) {}

    if (!record) {
      record = memoryOtpStore.get(normMobile);
    }

    if (!record) {
      return errorResponse(res, 'Incorrect OTP. Please try again.', 400);
    }

    // 2. Check: OTP has not already been used
    if (record.is_used) {
      return errorResponse(res, 'OTP already used', 400);
    }

    // 3. Check: attempt limit has not been exceeded
    if (record.attempt_count >= MAX_ATTEMPTS) {
      if (isDbRecord) {
        try {
          await db.execute('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [record.id]);
        } catch (_) {}
      }
      record.is_used = true;
      return errorResponse(res, 'Too many attempts. Please request a new OTP.', 429);
    }

    // 4. Check: OTP has not expired
    const expiryTime = new Date(record.expires_at).getTime();
    if (Date.now() > expiryTime) {
      return errorResponse(res, 'OTP expired. Please request a new OTP.', 410);
    }

    // 5. Increment attempt count
    record.attempt_count = (record.attempt_count || 0) + 1;
    if (isDbRecord) {
      try {
        await db.execute('UPDATE otp_verifications SET attempt_count = attempt_count + 1 WHERE id = ?', [record.id]);
      } catch (_) {}
    }

    // 6. Verify OTP against hash only (no plaintext storage/fallback)
    const isCorrect = await checkOtpHash(otpStr, record.otp_hash);

    if (!isCorrect) {
      if (record.attempt_count >= MAX_ATTEMPTS) {
        if (isDbRecord) {
          try {
            await db.execute('UPDATE otp_verifications SET is_used = TRUE WHERE id = ?', [record.id]);
          } catch (_) {}
        }
        record.is_used = true;
        return errorResponse(res, 'Too many attempts. Please request a new OTP.', 429);
      }
      return errorResponse(res, 'Incorrect OTP. Please try again.', 400);
    }

    // 7. Mark OTP as used and verified
    record.is_used = true;
    if (isDbRecord) {
      try {
        await db.execute('UPDATE otp_verifications SET is_used = TRUE, verified = TRUE WHERE id = ?', [record.id]);
      } catch (_) {}
    }

    // 8. Find customer by mobile number, log in or create customer
    const userRole = role === 'DRIVER' ? 'DRIVER' : 'CUSTOMER';
    let user = null;
    let customer = null;
    let isNewCustomer = false;

    try {
      if (userRole === 'DRIVER') {
        const [drivers] = await db.execute(
          'SELECT * FROM users WHERE phone = ? AND role = ?',
          [normMobile, 'DRIVER']
        );
        if (drivers && drivers.length > 0) {
          user = drivers[0];
        }
      } else {
        const [custRows] = await db.execute(
          'SELECT * FROM customers WHERE mobile_number = ?',
          [normMobile]
        );
        if (custRows && custRows.length > 0) {
          customer = custRows[0];
        } else {
          const [insertCust] = await db.execute(
            'INSERT INTO customers (full_name, mobile_number, email) VALUES (?, ?, ?)',
            ['Customer', normMobile, null]
          );
          customer = {
            id: insertCust?.insertId || Date.now(),
            full_name: 'Customer',
            mobile_number: normMobile,
            email: null
          };
          isNewCustomer = true;
        }

        const [userRows] = await db.execute(
          'SELECT * FROM users WHERE phone = ?',
          [normMobile]
        );
        if (userRows && userRows.length > 0) {
          user = userRows[0];
        } else {
          const [insertUser] = await db.execute(
            'INSERT INTO users (name, phone, role, status) VALUES (?, ?, ?, ?)',
            [customer.full_name || 'Customer', normMobile, 'CUSTOMER', 'ACTIVE']
          );
          user = {
            id: insertUser?.insertId || customer.id,
            name: customer.full_name || 'Customer',
            phone: normMobile,
            email: customer.email,
            role: 'CUSTOMER',
            status: 'ACTIVE'
          };
        }
      }
    } catch (dbErr) {
      // Offline resilient session
      let existing = memoryUsers.get(normMobile);
      if (existing) {
        customer = existing.customer;
        user = existing.user;
      } else {
        isNewCustomer = true;
        customer = {
          id: Date.now(),
          full_name: 'Customer',
          mobile_number: normMobile,
          email: null
        };
        user = {
          id: customer.id,
          name: customer.full_name,
          phone: normMobile,
          email: null,
          role: userRole,
          status: 'ACTIVE'
        };
        memoryUsers.set(normMobile, { customer, user });
        memoryUsers.set(user.id, { customer, user });
      }
    }

    if (!user) {
      user = {
        id: Date.now(),
        name: customer?.full_name || 'Customer',
        phone: normMobile,
        email: customer?.email || null,
        role: userRole,
        status: 'ACTIVE'
      };
    }

    // Save in memory for /auth/me lookup by user.id
    memoryUsers.set(user.id, { customer, user });
    memoryUsers.set(normMobile, { customer, user });

    // 9. Generate secure JWT session
    const token = generateToken(user);

    // 10. Return authenticated customer & user
    // Normalize role so both lowercase 'customer' and uppercase 'CUSTOMER' match client guards!
    const normalizedRole = (user.role || 'CUSTOMER').toLowerCase();

    return successResponse(res, {
      token,
      isNewCustomer,
      user: {
        id: user.id,
        name: user.name || customer?.full_name || 'Customer',
        phone: user.phone || normMobile,
        email: user.email || null,
        role: normalizedRole,
        ROLE: user.role
      },
      customer: customer || {
        id: user.id,
        full_name: user.name,
        mobile_number: normMobile,
        email: user.email
      }
    }, 'Mobile number verified');

  } catch (err) {
    console.error('[verifyOTP] Error:', err);
    return errorResponse(res, 'Server error', 500);
  }
};

// ─── POST /api/auth/firebase-login ──────────────────────────────────────────
// Firebase Email/Password Authentication Handler
// Verifies cryptographically signed Firebase ID token & syncs customer profile in PostgreSQL
exports.firebaseLogin = async (req, res) => {
  try {
    const { idToken, name, mobile } = req.body;
    if (!idToken) {
      return errorResponse(res, 'Firebase ID token is required.', 400);
    }

    // 1. Verify token using Firebase Admin SDK
    let decodedToken;
    try {
      decodedToken = await verifyFirebaseIdToken(idToken);
    } catch (tokenErr) {
      console.error('[firebaseLogin] Token verification failed:', tokenErr.message);
      return errorResponse(res, tokenErr.message || 'Invalid or expired Firebase ID token.', 401);
    }

    const firebaseUid = decodedToken.uid;
    const tokenEmail = (decodedToken.email || '').trim().toLowerCase();
    const tokenPhone = (decodedToken.phone_number || '').trim();

    // 2. Normalize customer metadata from registration or token
    const rawName = (name || decodedToken.name || decodedToken.displayName || '').trim();
    const rawMobile = (mobile || tokenPhone || '').trim();
    let normMobile = '';
    if (rawMobile) {
      try {
        normMobile = normaliseMobile(rawMobile);
      } catch (_) {
        const digits = rawMobile.replace(/\D/g, '');
        normMobile = digits.length >= 10 ? `+91${digits.slice(-10)}` : rawMobile;
      }
    }

    // 3. Find or create Customer in PostgreSQL (Never store passwords in DB)
    let customer = null;
    let user = null;
    let isNewCustomer = false;
    let bookings = [];

    try {
      // Look up by firebase_uid first, then by email
      let custRows = [];
      if (tokenEmail) {
        const [rows] = await db.execute(
          'SELECT * FROM customers WHERE firebase_uid = ? OR email = ?',
          [firebaseUid, tokenEmail]
        );
        custRows = rows;
      } else {
        const [rows] = await db.execute(
          'SELECT * FROM customers WHERE firebase_uid = ?',
          [firebaseUid]
        );
        custRows = rows;
      }

      if (custRows && custRows.length > 0) {
        customer = custRows[0];
        // Sync any updated/missing fields
        const updates = [];
        const params = [];

        if (!customer.firebase_uid) {
          updates.push('firebase_uid = ?');
          params.push(firebaseUid);
          customer.firebase_uid = firebaseUid;
        }
        if (rawName && (!customer.full_name || customer.full_name === 'Valued Customer' || customer.full_name === 'Customer')) {
          updates.push('full_name = ?');
          params.push(rawName);
          customer.full_name = rawName;
        }
        if (normMobile && (!customer.mobile_number || customer.mobile_number.startsWith('+910000'))) {
          updates.push('mobile_number = ?');
          params.push(normMobile);
          customer.mobile_number = normMobile;
        }
        if (tokenEmail && !customer.email) {
          updates.push('email = ?');
          params.push(tokenEmail);
          customer.email = tokenEmail;
        }

        if (updates.length > 0) {
          params.push(customer.id);
          try {
            await db.execute(`UPDATE customers SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
          } catch (_) {}
        }
      } else {
        isNewCustomer = true;
        const custName = rawName || 'Customer';
        const custMobile = normMobile || `+91${Date.now().toString().slice(-10)}`;
        const [insertCust] = await db.execute(
          'INSERT INTO customers (firebase_uid, full_name, email, mobile_number) VALUES (?, ?, ?, ?)',
          [firebaseUid, custName, tokenEmail || null, custMobile]
        );
        customer = {
          id: insertCust?.insertId || Date.now(),
          firebase_uid: firebaseUid,
          full_name: custName,
          email: tokenEmail || null,
          mobile_number: custMobile
        };
      }

      // 4. Load existing customer booking history
      if (customer && customer.id) {
        try {
          const [bRows] = await db.execute(
            'SELECT id, booking_number, pickup_address, drop_address, status, total_fare, created_at FROM bookings WHERE customer_id = ? ORDER BY created_at DESC LIMIT 5',
            [customer.id]
          );
          if (bRows && Array.isArray(bRows)) {
            bookings = bRows;
          }
        } catch (_) {}
      }

      // 5. Find or create User record for authentication session
      const [userRows] = await db.execute(
        'SELECT * FROM users WHERE email = ? OR (phone = ? AND phone != "")',
        [tokenEmail || 'no-email', customer.mobile_number || 'no-phone']
      );
      if (userRows && userRows.length > 0) {
        user = userRows[0];
      } else {
        const [insertUser] = await db.execute(
          'INSERT INTO users (name, phone, email, role, status) VALUES (?, ?, ?, ?, ?)',
          [customer.full_name || 'Customer', customer.mobile_number || '', tokenEmail || null, 'CUSTOMER', 'ACTIVE']
        );
        user = {
          id: insertUser?.insertId || customer.id,
          name: customer.full_name || 'Customer',
          phone: customer.mobile_number || '',
          email: tokenEmail || null,
          role: 'CUSTOMER',
          status: 'ACTIVE'
        };
      }
    } catch (dbErr) {
      console.warn('[firebaseLogin] DB notice:', dbErr.message);
    }

    // Resilient fallback if PostgreSQL is temporarily offline
    if (!customer) {
      const cacheKey = tokenEmail || firebaseUid;
      const mem = memoryUsers.get(cacheKey) || memoryUsers.get(firebaseUid);
      if (mem && mem.customer) {
        customer = mem.customer;
        user = mem.user;
      } else {
        isNewCustomer = true;
        customer = {
          id: Date.now(),
          firebase_uid: firebaseUid,
          full_name: rawName || 'Customer',
          email: tokenEmail || null,
          mobile_number: normMobile || `+91${Date.now().toString().slice(-10)}`
        };
        user = {
          id: customer.id,
          name: customer.full_name,
          email: customer.email,
          phone: customer.mobile_number,
          role: 'CUSTOMER',
          status: 'ACTIVE'
        };
      }
    }

    if (!user) {
      user = {
        id: customer.id,
        name: customer.full_name || 'Customer',
        email: tokenEmail || customer.email,
        phone: customer.mobile_number || normMobile,
        role: 'CUSTOMER',
        status: 'ACTIVE'
      };
    }

    // Cache in memory for immediate /auth/me lookup
    memoryUsers.set(user.id, { customer, user });
    memoryUsers.set(firebaseUid, { customer, user });
    if (tokenEmail) memoryUsers.set(tokenEmail, { customer, user });
    if (customer.mobile_number) memoryUsers.set(customer.mobile_number, { customer, user });

    // 6. Generate secure application JWT session
    const token = generateToken({
      id: user.id,
      email: tokenEmail || customer.email,
      phone: customer.mobile_number,
      role: 'CUSTOMER',
      firebase_uid: firebaseUid
    });

    const normalizedRole = (user.role || 'CUSTOMER').toLowerCase();

    return successResponse(res, {
      token,
      isNewCustomer,
      user: {
        id: user.id,
        name: user.name || customer.full_name || 'Customer',
        email: tokenEmail || customer.email,
        phone: customer.mobile_number || normMobile,
        role: normalizedRole,
        ROLE: user.role,
        firebase_uid: firebaseUid
      },
      customer: {
        ...customer,
        bookings
      }
    }, 'Authentication successful.');
  } catch (err) {
    console.error('[firebaseLogin] Error:', err);
    return errorResponse(res, 'Authentication failed. Please try again.', 500);
  }
};

// ─── POST /api/auth/resend-otp ───────────────────────────────────────────
exports.resendOTP = async (req, res) => {
  try {
    let { mobile, role } = req.body;

    let normMobile;
    try {
      normMobile = normaliseMobile(mobile);
    } catch {
      return errorResponse(res, 'Invalid mobile number.', 400);
    }

    // Cooldown check
    const memRecord = memoryOtpStore.get(normMobile);
    if (memRecord && !memRecord.is_used) {
      const elapsed = Date.now() - memRecord.created_at;
      if (elapsed < RESEND_COOLDOWN) {
        const waitSec = Math.ceil((RESEND_COOLDOWN - elapsed) / 1000);
        return errorResponse(res, `Please wait ${waitSec} second${waitSec !== 1 ? 's' : ''} before resending.`, 429);
      }
    }

    try {
      const [recent] = await db.execute(
        `SELECT created_at FROM otp_verifications
         WHERE mobile_number = ? AND is_used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [normMobile]
      );
      if (recent && recent.length > 0) {
        const elapsed = Date.now() - new Date(recent[0].created_at).getTime();
        if (elapsed < RESEND_COOLDOWN) {
          const waitSec = Math.ceil((RESEND_COOLDOWN - elapsed) / 1000);
          return errorResponse(res, `Please wait ${waitSec} second${waitSec !== 1 ? 's' : ''} before resending.`, 429);
        }
      }
    } catch (_) {}

    // Verify MSG91 configuration
    const smsConfig = checkMsg91Config();
    if (!smsConfig.configured) {
      console.warn('[resendOTP] SMS service not configured. Missing:', smsConfig.missing.join(', '));
      return errorResponse(res, 'SMS service is not configured.', 503);
    }

    // Invalidate old OTPs
    try {
      await db.execute(
        'UPDATE otp_verifications SET is_used = TRUE WHERE mobile_number = ? AND is_used = FALSE',
        [normMobile]
      );
    } catch (_) {}

    // Generate new OTP
    const otp       = generateOTP();
    const otpHash   = await hashOTP(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    const now       = Date.now();

    // Store secure hash only (never store plaintext OTP)
    memoryOtpStore.set(normMobile, {
      mobile_number: normMobile,
      otp_hash: otpHash,
      expires_at: expiresAt,
      attempt_count: 0,
      is_used: false,
      created_at: now
    });

    try {
      await db.execute(
        `INSERT INTO otp_verifications
           (mobile_number, otp_hash, expires_at, attempt_count, is_used)
         VALUES (?, ?, ?, 0, FALSE)`,
        [normMobile, otpHash, expiresAt]
      );
    } catch (_) {}

    // Send real SMS via MSG91
    const smsResult = await sendOTPviaMSG91(normMobile, otp);
    if (!smsResult.success) {
      console.error('[MSG91] Resend dispatch failed:', smsResult.message);
      return errorResponse(res, 'Unable to send OTP. Please try again.', 502);
    }

    return successResponse(res, {
      mobile: displayMobile(normMobile),
      expiresIn: OTP_EXPIRY_MS / 1000,
      resendAfter: RESEND_COOLDOWN / 1000
    }, `OTP sent to ${displayMobile(normMobile)}`);

  } catch (err) {
    console.error('[resendOTP] Error:', err);
    return errorResponse(res, 'Unable to send OTP. Please try again.', 500);
  }
};

// ─── GET /api/auth/me ────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return errorResponse(res, 'Not authenticated', 401);
    }
    let user = null;
    let customer = null;
    try {
      const [users] = await db.execute(
        'SELECT id, name, phone, email, role, status, profile_photo FROM users WHERE id = ?',
        [req.user.id]
      );
      if (users && users.length > 0) {
        user = users[0];
        if (user.role === 'CUSTOMER') {
          const [custRows] = await db.execute(
            'SELECT * FROM customers WHERE mobile_number = ?',
            [user.phone]
          );
          customer = custRows && custRows.length > 0 ? custRows[0] : null;
        }
      }
    } catch (_) {}

    if (!user) {
      const mem = memoryUsers.get(req.user.id);
      if (mem) {
        user = mem.user;
        customer = mem.customer;
      } else {
        user = req.user;
      }
    }

    const normalizedRole = (user.role || 'CUSTOMER').toLowerCase();

    return successResponse(res, {
      id: user.id,
      name: user.name || customer?.full_name || 'Customer',
      phone: user.phone,
      email: user.email,
      role: normalizedRole,
      ROLE: user.role,
      customer
    }, 'User profile retrieved');
  } catch (err) {
    return errorResponse(res, 'Server error', 500);
  }
};

// ─── GET /api/auth/sms-status ────────────────────────────────────────────
exports.smsStatus = async (req, res) => {
  const config = checkMsg91Config();
  return successResponse(res, {
    configured: config.configured,
    provider: 'MSG91',
    mode: config.configured ? 'REAL_SMS' : 'UNCONFIGURED',
    sender_id: process.env.MSG91_SENDER_ID || 'CABPRO',
    otp_expiry_seconds: parseInt(process.env.MSG91_OTP_EXPIRY || '300', 10),
    target_country: 'India (+91)'
  }, config.configured ? 'MSG91 SMS service configured and ready.' : 'SMS service is not configured.');
};

// ─── POST /api/auth/send-email-otp ───────────────────────────────────────
exports.sendEmailOTP = async (req, res) => {
  try {
    const { email, name } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return errorResponse(res, 'Please provide a valid email address.', 400);
    }

    // Resend cooldown check (30 seconds)
    const existing = memoryEmailOtpStore.get(cleanEmail);
    if (existing && Date.now() - existing.createdAt < 30000) {
      const waitSec = Math.ceil((30000 - (Date.now() - existing.createdAt)) / 1000);
      return errorResponse(res, `Please wait ${waitSec}s before requesting a new OTP.`, 429);
    }

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    const otpHash = crypto.createHash('sha256').update(`${cleanEmail}:${otp}:${OTP_SALT}`).digest('hex');

    const entry = {
      otp,
      otpHash,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    };

    memoryEmailOtpStore.set(cleanEmail, entry);

    const persisted = getPersistedEmailOtps();
    persisted[cleanEmail] = entry;
    savePersistedEmailOtps(persisted);

    // Dispatch real-time email via Google SMTP
    const emailResult = await sendRegistrationOtpEmail(cleanEmail, otp, name).catch(err => {
      console.warn('[Real-Time Email Warning]', err.message);
      return { success: false, error: err.message };
    });

    return successResponse(res, {
      email: cleanEmail,
      expiresIn: 600,
      expiresAt,
      otpHash,
      emailSent: emailResult.success !== false
    }, 'Verification code sent to your email.');
  } catch (err) {
    console.error('[Send Email OTP Error]', err);
    return errorResponse(res, 'Failed to send verification email. Please try again.', 500);
  }
};

// ─── POST /api/auth/verify-email-otp ─────────────────────────────────────
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanOtp = (otp || '').toString().trim();

    if (!cleanEmail || !cleanOtp) {
      return errorResponse(res, 'Email and 6-digit verification code are required.', 400);
    }

    let record = memoryEmailOtpStore.get(cleanEmail);
    if (!record) {
      const persisted = getPersistedEmailOtps();
      record = persisted[cleanEmail];
    }

    if (!record) {
      return errorResponse(res, 'No verification code found for this email. Please request a new OTP.', 404);
    }

    if (Date.now() > record.expiresAt) {
      memoryEmailOtpStore.delete(cleanEmail);
      const persisted = getPersistedEmailOtps();
      delete persisted[cleanEmail];
      savePersistedEmailOtps(persisted);
      return errorResponse(res, 'Verification code has expired. Please request a new OTP.', 410);
    }

    if (record.attempts >= 5) {
      memoryEmailOtpStore.delete(cleanEmail);
      const persisted = getPersistedEmailOtps();
      delete persisted[cleanEmail];
      savePersistedEmailOtps(persisted);
      return errorResponse(res, 'Too many failed attempts. Please request a new OTP.', 429);
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      const persisted = getPersistedEmailOtps();
      persisted[cleanEmail] = record;
      savePersistedEmailOtps(persisted);
      return errorResponse(res, 'Invalid verification code. Please check your email and try again.', 400);
    }

    // Verified successfully!
    memoryEmailOtpStore.delete(cleanEmail);
    const persisted = getPersistedEmailOtps();
    delete persisted[cleanEmail];
    savePersistedEmailOtps(persisted);

    return successResponse(res, { verified: true, email: cleanEmail }, 'Email verified successfully!');
  } catch (err) {
    console.error('[Verify Email OTP Error]', err);
    return errorResponse(res, 'Verification failed. Please try again.', 500);
  }
};

// ─── POST/GET /api/auth/clear-stored-data ────────────────────────────────
exports.clearStoredData = async (req, res) => {
  try {
    memoryEmailOtpStore.clear();
    memoryOtpStore.clear();
    savePersistedEmailOtps({});
    return successResponse(res, { cleared: true }, 'All stored OTP and session data cleared successfully.');
  } catch (err) {
    return errorResponse(res, 'Failed to clear data.', 500);
  }
};

// ─── GET /api/auth/test-email ────────────────────────────────────────────
exports.testEmail = async (req, res) => {
  const targetEmail = req.query.to || 'lharsha031@gmail.com';
  const result = await sendRegistrationOtpEmail(targetEmail, '999888', 'Tester');
  return res.json(result);
};


