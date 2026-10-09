const db = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

exports.getNotifications = async (req, res) => {
    try {
        const [notifications] = await db.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        return successResponse(res, notifications);
    } catch (error) {
        console.error(error);
        return errorResponse(res, 'Error fetching notifications');
    }
};

exports.dispatchAdmin = async (req, res) => {
    try {
        const payload = req.body || {};
        const adminEmail = process.env.ADMIN_EMAIL || 'outstationcabsb@gmail.com';

        console.log(`\n📧 [ADMIN DISPATCH VIA EMAIL TO ${adminEmail}]:`);
        console.log(`   Booking ID : ${payload.bookingId}`);
        console.log(`   Customer   : ${payload.customerName} (${payload.customerPhone})`);
        console.log(`   Route      : ${payload.pickup} ➔ ${payload.drop}`);
        console.log(`   Total Fare : ₹${payload.totalFare} (Advance: ₹${payload.advancePaid}, Balance: ₹${payload.balancePayable})\n`);

        const emailResult = await sendBookingConfirmationEmail(payload);

        return successResponse(res, { 
            dispatched: true, 
            emailDispatched: emailResult.success,
            target: adminEmail, 
            bookingId: payload.bookingId,
            timestamp: new Date().toISOString()
        }, 'Admin notified securely via email');
    } catch (error) {
        console.error('[Admin Dispatch Error]', error);
        return errorResponse(res, 'Error dispatching admin notification');
    }
};

const { sendBookingConfirmationEmail, sendDriverAssignedEmail, sendRegistrationOtpEmail } = require('../utils/emailService');

const memoryEmailOtpStore = new Map();

exports.sendConfirmationEmail = async (req, res) => {
    try {
        const booking = req.body || {};
        const result = await sendBookingConfirmationEmail(booking);
        return successResponse(res, result, 'Booking confirmation email dispatched successfully');
    } catch (error) {
        console.error('[Email Dispatch Error]', error);
        return errorResponse(res, 'Error dispatching email confirmation');
    }
};

exports.sendDriverAssigned = async (req, res) => {
    try {
        const { booking, driverDetails } = req.body || {};
        const activeBooking = booking || req.body || {};
        const activeDriver = driverDetails || activeBooking.driverDetails;
        
        console.log(`\n🚖 [DISPATCHING DRIVER ASSIGNED EMAIL] For #${activeBooking.bookingId} to customer ${activeBooking.userEmail || activeBooking.customerEmail || 'customer'}`);
        const result = await sendDriverAssignedEmail(activeBooking, activeDriver);
        return successResponse(res, result, 'Driver details sent to customer email successfully');
    } catch (error) {
        console.error('[Driver Email Dispatch Error]', error);
        return errorResponse(res, 'Error dispatching driver assignment email');
    }
};

exports.sendEmailOTP = async (req, res) => {
    try {
        const { email, name } = req.body || {};
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return errorResponse(res, 'Please provide a valid email address.', 400);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 10 * 60 * 1000;

        memoryEmailOtpStore.set(cleanEmail, {
            otp,
            expiresAt,
            attempts: 0,
            createdAt: Date.now()
        });

        const emailResult = await sendRegistrationOtpEmail(cleanEmail, otp, name);

        return successResponse(res, {
            email: cleanEmail,
            expiresIn: 600,
            emailSent: emailResult.success
        }, 'Verification code sent to your email.');
    } catch (err) {
        console.error('[Send Email OTP Error]', err);
        return errorResponse(res, 'Failed to send verification email. Please try again.', 500);
    }
};

exports.verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body || {};
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanOtp = (otp || '').toString().trim();

        if (!cleanEmail || !cleanOtp) {
            return errorResponse(res, 'Email and 6-digit verification code are required.', 400);
        }

        const record = memoryEmailOtpStore.get(cleanEmail);
        if (!record) {
            return errorResponse(res, 'No verification code found for this email. Please request a new OTP.', 404);
        }

        if (Date.now() > record.expiresAt) {
            memoryEmailOtpStore.delete(cleanEmail);
            return errorResponse(res, 'Verification code has expired. Please request a new OTP.', 410);
        }

        if (record.attempts >= 5) {
            memoryEmailOtpStore.delete(cleanEmail);
            return errorResponse(res, 'Too many failed attempts. Please request a new OTP.', 429);
        }

        if (record.otp !== cleanOtp) {
            record.attempts += 1;
            return errorResponse(res, 'Invalid verification code. Please check your email and try again.', 400);
        }

        memoryEmailOtpStore.delete(cleanEmail);
        return successResponse(res, { verified: true, email: cleanEmail }, 'Email verified successfully!');
    } catch (err) {
        console.error('[Verify Email OTP Error]', err);
        return errorResponse(res, 'Verification failed. Please try again.', 500);
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.body || {};
        if (notificationId) {
            await db.execute('UPDATE notifications SET is_read = TRUE WHERE id = ?', [notificationId]).catch(() => {});
        } else if (req.user && req.user.id) {
            await db.execute('UPDATE notifications SET is_read = TRUE WHERE user_id = ?', [req.user.id]).catch(() => {});
        }
        return successResponse(res, null, 'Notifications marked as read');
    } catch (error) {
        return successResponse(res, null, 'Notifications marked as read');
    }
};


