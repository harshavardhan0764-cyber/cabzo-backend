const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// ─── Public Admin Login Route ────────────────────────────────────────────────
router.post('/login', adminController.login);

// ─── Real-Time Stream (SSE) ──────────────────────────────────────────────────
// Allows Admin Dashboard to receive live booking changes instantly
router.get('/bookings/stream', authenticate, authorize('ADMIN'), adminController.streamBookingUpdates);

// ─── Protected Operations Routes (Strictly ADMIN Role) ────────────────────────
router.use(authenticate);
router.use(authorize('ADMIN'));

// Dashboard Stats & KPIs
router.get('/dashboard', adminController.getDashboardStats);

// Bookings Management
router.get('/bookings', adminController.getAllBookings);
router.get('/bookings/:id', adminController.getBookingById);
router.patch('/bookings/:id/status', adminController.updateBookingStatus);
router.post('/bookings/:id/assign-driver', adminController.assignDriver);

// Driver & Vehicle Management
router.get('/drivers', adminController.getDrivers);
router.post('/drivers', adminController.addDriver);

module.exports = router;
