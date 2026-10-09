const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/calculate-fare', bookingController.calculateBookingFare);
router.post('/sync', bookingController.syncBooking);
router.get('/:id/status', bookingController.getBookingStatusPublic);

router.use(authenticate);

router.post('/', authorize('CUSTOMER'), bookingController.createBooking);
router.get('/', bookingController.getAllBookings);
router.get('/:id', bookingController.getBookingById);
router.post('/:id/assign-driver', authorize('ADMIN'), bookingController.assignDriver);
router.patch('/:id/status', bookingController.updateBookingStatus);

module.exports = router;
