const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');
const { sendBookingConfirmationEmail } = require('../utils/emailService');
const bookingStore = require('../utils/bookingStore');

// ─── Local Data Storage Fallback for High Availability ─────────────────────────
const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err.message);
  }
}

const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const PAYMENTS_FILE = path.join(DATA_DIR, 'payments.json');

// In-memory caches for ultra-fast lookup and idempotency
const ordersCache = new Map();
const processedPaymentsCache = new Map();

// Initialize caches from disk if files exist
function loadPersistedData() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      Object.entries(data).forEach(([k, v]) => ordersCache.set(k, v));
    }
    if (fs.existsSync(PAYMENTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(PAYMENTS_FILE, 'utf8'));
      Object.entries(data).forEach(([k, v]) => processedPaymentsCache.set(k, v));
    }
  } catch (err) {
    console.warn('[Storage Load Notice]', err.message);
  }
}
loadPersistedData();

function saveOrdersToDisk() {
  try {
    const obj = Object.fromEntries(ordersCache);
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Orders Save Warning]', err.message);
  }
}

function savePaymentsToDisk() {
  try {
    const obj = Object.fromEntries(processedPaymentsCache);
    fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Payments Save Warning]', err.message);
  }
}

function getOrderRecord(orderId) {
  if (!orderId) return null;
  if (ordersCache.has(orderId)) return ordersCache.get(orderId);
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8'));
      if (data && data[orderId]) {
        ordersCache.set(orderId, data[orderId]);
        return data[orderId];
      }
    }
  } catch {}
  return null;
}

// ─── Razorpay Client Helper ──────────────────────────────────────────────────
function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret || key_id.trim() === '' || key_secret.trim() === '' ||
      key_id === 'your_razorpay_key_id' || key_secret === 'your_razorpay_key_secret') {
    return null;
  }

  return new Razorpay({
    key_id: key_id.trim(),
    key_secret: key_secret.trim()
  });
}

/**
 * GET /api/payments/config
 * Returns public Razorpay key ID to frontend (NEVER returns secret!)
 */
exports.getConfig = (req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const isConfigured = Boolean(
    keyId && 
    keyId !== 'your_razorpay_key_id' && 
    process.env.RAZORPAY_KEY_SECRET && 
    process.env.RAZORPAY_KEY_SECRET !== 'your_razorpay_key_secret'
  );

  return successResponse(res, {
    keyId: isConfigured ? keyId.trim() : '',
    currency: 'INR',
    isConfigured
  }, 'Razorpay configuration');
};

/**
 * POST /api/payments/create-order
 * Creates a server-side Razorpay Order with the exact advance amount in paise
 */
exports.createOrder = async (req, res) => {
  try {
    const { 
      amount, 
      bookingId, 
      customerName, 
      customerPhone, 
      customerEmail,
      pickup,
      drop,
      vehicleCategory,
      notes 
    } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return errorResponse(res, 'Valid payment amount is required (must be greater than 0)', 400);
    }

    const razorpay = getRazorpayClient();
    if (!razorpay) {
      return errorResponse(
        res,
        'Razorpay credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in server/.env',
        500
      );
    }

    // Razorpay requires amount in subunits (paise for INR)
    const amountInPaise = Math.round(numAmount * 100);
    const sanitizedId = (bookingId || 'CB').toString().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16);
    const receipt = `rcpt_${sanitizedId}_${Date.now()}`.slice(0, 40);

    const orderPayload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        bookingId: bookingId || '',
        customerName: customerName || '',
        customerPhone: customerPhone || '',
        customerEmail: customerEmail || '',
        pickup: (pickup || '').slice(0, 50),
        drop: (drop || '').slice(0, 50),
        vehicleCategory: vehicleCategory || '',
        ...(notes || {})
      }
    };

    const order = await razorpay.orders.create(orderPayload);

    // Save order in memory cache & disk
    const orderRecord = {
      orderId: order.id,
      amount: numAmount,
      amountInPaise,
      currency: order.currency,
      receipt: order.receipt,
      bookingId: bookingId || null,
      customerEmail: customerEmail || null,
      status: 'CREATED',
      createdAt: new Date().toISOString()
    };

    ordersCache.set(order.id, orderRecord);
    saveOrdersToDisk();

    // Optionally record in database
    try {
      if (db && typeof db.execute === 'function') {
        await db.execute(
          'INSERT INTO payments (id, booking_id, user_id, amount, payment_type, status, transaction_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [order.id, bookingId || null, req.user?.id || null, numAmount, 'ADVANCE', 'PENDING', order.id]
        );
      }
    } catch (dbErr) {
      // Non-blocking fallback
      console.warn('[DB Payments Insert Notice]', dbErr.message);
    }

    return successResponse(res, {
      orderId: order.id,
      amount: order.amount, // in paise
      amountInRupees: numAmount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_ID.trim() : '' : ''
    }, 'Razorpay order created successfully');

  } catch (error) {
    console.error('[Razorpay Order Error]', error);
    return errorResponse(res, `Failed to create Razorpay order: ${error.message}`, 500);
  }
};

/**
 * POST /api/payments/verify
 * Server-side HMAC-SHA256 signature verification & amount validation
 * Dispatches confirmation email to outstationcabsb@gmail.com and customer on success
 */
exports.verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      bookingDetails
    } = req.body;

    // 1. Mandatory Parameter Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return errorResponse(
        res,
        'Missing payment verification parameters (razorpay_order_id, razorpay_payment_id, razorpay_signature required)',
        400
      );
    }

    const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!key_secret || key_secret === 'your_razorpay_key_secret') {
      return errorResponse(
        res,
        'Razorpay secret key is not configured on the server. Please set RAZORPAY_KEY_SECRET in server/.env',
        500
      );
    }

    // 2. Idempotency Check: Prevent duplicate payment processing & duplicate emails
    if (processedPaymentsCache.has(razorpay_payment_id)) {
      console.log(`\n⚡ [IDEMPOTENCY] Payment ${razorpay_payment_id} was already processed successfully. Returning cached confirmation.`);
      const cached = processedPaymentsCache.get(razorpay_payment_id);
      return successResponse(res, {
        ...cached,
        duplicate: true,
        message: 'Payment already verified previously'
      }, 'Payment already verified');
    }

    // 3. Server-Side HMAC-SHA256 Signature Verification
    const generatedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    let isSignatureValid = false;
    try {
      isSignatureValid = crypto.timingSafeEqual(
        Buffer.from(generatedSignature, 'utf8'),
        Buffer.from(razorpay_signature, 'utf8')
      );
    } catch (e) {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      console.warn(`\n❌ [SECURITY ALERT] Razorpay signature mismatch for Order ${razorpay_order_id} & Payment ${razorpay_payment_id}`);
      return errorResponse(res, 'Invalid Razorpay signature. Payment verification failed.', 400);
    }

    // 4. Amount Verification
    const details = bookingDetails || {};
    const expectedAdvance = Number(details.advancePaid || details.amount || 0);

    const storedOrder = getOrderRecord(razorpay_order_id);
    if (storedOrder && expectedAdvance > 0) {
      if (Math.abs(storedOrder.amount - expectedAdvance) > 1) { // 1 rupee tolerance for float rounding
        console.warn(`\n❌ [AMOUNT MISMATCH] Order recorded ₹${storedOrder.amount} but client verified ₹${expectedAdvance}`);
        return errorResponse(
          res,
          `Payment amount mismatch: Expected ₹${storedOrder.amount}, but received ₹${expectedAdvance}`,
          400
        );
      }
    }

    // If Razorpay SDK is available, optionally verify payment status directly with Razorpay API
    const razorpay = getRazorpayClient();
    if (razorpay) {
      try {
        const paymentInfo = await razorpay.payments.fetch(razorpay_payment_id);
        if (paymentInfo) {
          if (paymentInfo.status !== 'captured' && paymentInfo.status !== 'authorized') {
            console.warn(`[Razorpay Payment Status Warning] Status is '${paymentInfo.status}' for ${razorpay_payment_id}`);
          }
          if (expectedAdvance > 0) {
            const paidInRupees = paymentInfo.amount / 100;
            if (Math.abs(paidInRupees - expectedAdvance) > 1) {
              return errorResponse(
                res,
                `Razorpay payment amount ₹${paidInRupees} does not match expected advance ₹${expectedAdvance}`,
                400
              );
            }
          }
        }
      } catch (fetchErr) {
        // Log error but continue if signature was mathematically valid (e.g. offline mock or rate limit)
        console.warn('[Razorpay Fetch Payment Notice]', fetchErr.message);
      }
    }

    // 5. Calculate Remaining Amount & Booking Snapshot
    const totalFare = Number(details.totalFare || 0);
    const advancePaid = expectedAdvance || (storedOrder ? storedOrder.amount : 0);
    const remainingAmount = details.remainingAmount !== undefined
      ? Number(details.remainingAmount)
      : Math.max(0, totalFare - advancePaid);

    const bookingId = details.bookingId || `CB-${Math.floor(100000 + Math.random() * 900000)}`;

    const paymentRecord = {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      bookingId,
      totalFare,
      advancePaid,
      remainingAmount,
      status: 'SUCCESS',
      verifiedAt: new Date().toISOString(),
      customerName: details.customerName || details.userName || 'Customer',
      customerPhone: details.customerPhone || details.userPhone || 'Not Provided',
      customerEmail: details.customerEmail || details.userEmail || 'customer@cabbazar.com',
      pickup: details.pickup || 'Pickup Location',
      drop: details.drop || 'Drop Location',
      distanceKm: details.distanceKm || details.distance || 0,
      vehicleCategory: details.vehicleCategory || details.vehicleName || 'Outstation Cab'
    };

    // Save to processed cache & file for persistence & idempotency
    processedPaymentsCache.set(razorpay_payment_id, paymentRecord);
    savePaymentsToDisk();

    // Sync to unified Server-Side Booking Store for real-time Admin updates
    try {
      bookingStore.saveBooking({
        bookingId,
        customerName: paymentRecord.customerName,
        customerPhone: paymentRecord.customerPhone,
        customerEmail: paymentRecord.customerEmail,
        pickup: paymentRecord.pickup,
        drop: paymentRecord.drop,
        distanceKm: paymentRecord.distanceKm,
        totalFare,
        advancePaid,
        remainingAmount,
        vehicleCategory: paymentRecord.vehicleCategory,
        paymentStatus: 'PAID (Verified via Razorpay)',
        status: 'CONFIRMED',
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        driverDetails: null,
        payTollNow: details.payTollNow,
        tollAmount: details.tollAmount || 0,
        createdAt: Date.now()
      });
    } catch (storeErr) {
      console.warn('[BookingStore Sync Notice]', storeErr.message);
    }

    // 6. Update Database if available
    try {
      if (db && typeof db.execute === 'function') {
        await db.execute(
          'UPDATE payments SET status = ?, transaction_id = ? WHERE id = ? OR transaction_id = ?',
          ['SUCCESS', razorpay_payment_id, razorpay_order_id, razorpay_order_id]
        );
        if (bookingId) {
          await db.execute(
            'UPDATE bookings SET status = ?, payment_status = ? WHERE id = ?',
            ['CONFIRMED', 'PAID', bookingId]
          );
        }
      }
    } catch (dbErr) {
      console.warn('[DB Update Notice]', dbErr.message);
    }

    // 7. Dispatch Gmail Notification with all 12 requested fields
    const emailPayload = {
      customerName: paymentRecord.customerName,
      customerPhone: paymentRecord.customerPhone,
      pickup: paymentRecord.pickup,
      drop: paymentRecord.drop,
      distanceKm: paymentRecord.distanceKm,
      totalFare,
      advancePaid,
      remainingAmount,
      vehicleCategory: paymentRecord.vehicleCategory,
      paymentStatus: 'PAID (Advance Verified ✓)',
      razorpayPaymentId: razorpay_payment_id,
      razorpayOrderId: razorpay_order_id,
      bookingId,
      customerEmail: paymentRecord.customerEmail,
      pickupDate: details.pickupDate || 'Today',
      pickupTime: details.pickupTime || 'Immediate',
      tripType: details.tripType || 'Round Trip',
      payTollNow: details.payTollNow,
      tollAmount: details.tollAmount || 0
    };

    let emailSent = false;
    let emailMessageId = null;
    let emailError = null;

    try {
      const emailResult = await sendBookingConfirmationEmail(emailPayload);
      if (emailResult && emailResult.success) {
        emailSent = true;
        emailMessageId = emailResult.messageId;
      } else if (emailResult && emailResult.error) {
        emailError = emailResult.error;
      }
    } catch (mailErr) {
      console.warn('[Booking Email Dispatch Warning]', mailErr.message);
      emailError = mailErr.message;
    }

    // 8. Return Confirmation to Frontend
    return successResponse(res, {
      verified: true,
      bookingId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      totalFare,
      advancePaid,
      remainingAmount,
      status: 'CONFIRMED',
      emailSent,
      emailMessageId,
      emailError,
      timestamp: paymentRecord.verifiedAt
    }, 'Payment verified and booking confirmed successfully');

  } catch (error) {
    console.error('[Payment Verification Fatal Error]', error);
    return errorResponse(res, `Internal server error during verification: ${error.message}`, 500);
  }
};

/**
 * Legacy / Backward-compatible Initiate Payment endpoint
 */
exports.initiatePayment = async (req, res) => {
  return exports.createOrder(req, res);
};
