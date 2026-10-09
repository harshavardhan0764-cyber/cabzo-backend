const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// ─── Public Payment Routes for Customer Checkout ─────────────────────────────
// Razorpay configuration (Public Key ID only)
router.get('/config', paymentController.getConfig);

// Create Razorpay Order
router.post('/create-order', paymentController.createOrder);

// Verify Razorpay Payment Signature, Amount & Dispatch Confirmation Email
router.post('/verify', paymentController.verifyPayment);

// Legacy initiate route compatibility
router.post('/initiate', paymentController.initiatePayment);

module.exports = router;
