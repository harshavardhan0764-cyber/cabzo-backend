const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

// Public route to automatically dispatch verified bookings to admin (+91 9014467153)
router.post('/dispatch-admin', notificationController.dispatchAdmin);

// Public route to send full booking confirmation details via email
router.post('/send-email', notificationController.sendConfirmationEmail);

// Public route to send driver details to customer email once admin accepts & assigns driver
router.post('/send-driver-assigned', notificationController.sendDriverAssigned);

// Public route to send registration email OTP
router.post('/send-email-otp', notificationController.sendEmailOTP);
router.post('/verify-email-otp', notificationController.verifyEmailOTP);

router.use(authenticate);

router.get('/', notificationController.getNotifications);
router.post('/mark-read', notificationController.markAsRead);

module.exports = router;
