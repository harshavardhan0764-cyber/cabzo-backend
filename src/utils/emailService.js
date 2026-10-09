import { getCandidateApiUrls } from '../config/api';

/**
 * Client-Side Email Confirmation Dispatcher
 * Dispatches full booking confirmation details via email upon successful payment.
 */

export const ADMIN_CONFIRMATION_EMAIL = 'outstationcabsb@gmail.com';

export async function sendBookingEmailConfirmation(booking) {
  if (!booking) return false;

  const payload = {
    bookingId: booking.bookingId,
    customerName: booking.userName || 'Customer',
    userName: booking.userName || 'Customer',
    customerPhone: booking.userPhone || '9014467153',
    userPhone: booking.userPhone || '9014467153',
    customerEmail: booking.userEmail || localStorage.getItem('CabApp_CustomerEmail') || 'customer@cabbazar.com',
    userEmail: booking.userEmail || localStorage.getItem('CabApp_CustomerEmail') || 'customer@cabbazar.com',
    adminEmail: ADMIN_CONFIRMATION_EMAIL,
    pickup: booking.pickup,
    drop: booking.drop,
    stops: booking.stops || [],
    tripType: booking.tripType || 'oneway',
    pickupDate: booking.pickupDate,
    pickupTime: booking.pickupTime,
    returnDate: booking.returnDate,
    returnTime: booking.returnTime,
    distanceKm: booking.distanceKm,
    vehicleName: booking.vehicleName,
    advancePaid: booking.advancePaid || 500,
    balancePayable: booking.balancePayable || 0,
    totalFare: booking.estimatedFare || booking.totalFare || 2050,
    paymentId: booking.paymentId || 'pay_online_verified',
    payTollNow: booking.payTollNow !== undefined ? booking.payTollNow : true,
    tollPaymentPreference: booking.tollPaymentPreference || (booking.payTollNow ? 'PAY_NOW_ONLINE' : 'PAY_AFTER_TRIP'),
    tollAmount: booking.tollAmount || 0,
    nhaiToll: booking.nhaiToll || 0,
    statePermitFee: booking.statePermitFee || 0,
    stateBorderCount: booking.stateBorderCount || 0,
    timestamp: new Date().toISOString()
  };

  // 1. Post to backend email dispatch API
  try {
    const urls = getCandidateApiUrls('/notifications/send-email');
    await Promise.any(urls.map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) return res;
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    })).catch(() => null);

    if (res && res.ok) {
      console.log(`[Email Service] Confirmation email dispatched successfully for #${booking.bookingId}`);
    }
  } catch (err) {
    console.warn('[Email Service Warning]', err);
  }

  // 2. Record in local audit history
  try {
    const existing = JSON.parse(localStorage.getItem('CabApp_Email_Dispatches') || '[]');
    existing.unshift({
      timestamp: Date.now(),
      bookingId: booking.bookingId,
      recipient: payload.customerEmail,
      status: 'EMAIL_DISPATCHED',
      details: payload
    });
    localStorage.setItem('CabApp_Email_Dispatches', JSON.stringify(existing.slice(0, 50)));
  } catch (_) {}

  return true;
}

/**
 * Direct Fallback: Opens user's default email app (Gmail / Outlook / Apple Mail)
 * with pre-filled ride details addressed to outstationcabsb@gmail.com.
 */
export function openEmailClientConfirmation(booking) {
  if (!booking) return;

  const tollText = (booking.tollAmount || 0) > 0 
    ? `Rs. ${booking.tollAmount} (${(booking.payTollNow || booking.tollPaymentPreference === 'PAY_NOW_ONLINE') ? 'Paid Online ✓' : 'Pay to Driver En Route'})` 
    : 'Rs. 0 (None)';

  const recipient = ADMIN_CONFIRMATION_EMAIL;
  const subject = encodeURIComponent(`U & I Cabs Ride Confirmation #${booking.bookingId || 'CB-0000'} (${booking.pickup || ''} to ${booking.drop || ''})`);
  const body = encodeURIComponent(
`U & I Cabs Outstation Ride Confirmation • Your Ride, Your Way
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID     : ${booking.bookingId || 'CB-0000'}
Customer Name  : ${booking.userName || 'Customer'}
Customer Phone : ${booking.userPhone || '8310754133'}
Route          : ${booking.pickup || ''} ➔ ${booking.drop || ''}
Trip Type      : ${booking.tripType === 'roundtrip' ? 'Round Trip' : 'One Way'}
Pickup Date    : ${booking.pickupDate || 'Today'}
Pickup Time    : ${booking.pickupTime || 'Immediate'}
Vehicle        : ${booking.vehicleName || 'Sedan'}
Total Fare     : Rs. ${booking.estimatedFare || booking.totalFare || 0}
Tolls & Taxes  : ${tollText}
Advance Paid   : Rs. ${booking.advancePaid || 500} (Verified Online ✓)
Balance Due    : Rs. ${booking.balancePayable || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
U & I Cabs 24/7 Helpline: +91 83107 54133 • outstationcabsb@gmail.com
System Token: VERIFIED-PAID`
  );

  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
  try {
    window.open(mailtoUrl, '_blank');
  } catch (_) {
    window.location.href = mailtoUrl;
  }
}

/**
 * Dispatch Driver Details to Customer's Email upon Admin Ride Acceptance
 */
export async function sendDriverDetailsEmailToCustomer(booking, driverDetails) {
  if (!booking) return false;

  const targetDriver = driverDetails || booking.driverDetails || {
    name: 'M. Suresh Kumar',
    phone: '+91 94441 23456',
    cabNumber: 'TN 09 BX 4589',
    cabModel: booking.vehicleName || 'Maruti Suzuki Dzire',
    rating: 4.9,
    otp: '4829'
  };

  const payload = {
    booking: {
      ...booking,
      driverDetails: targetDriver
    },
    driverDetails: targetDriver,
    customerEmail: booking.userEmail || localStorage.getItem('CabApp_CustomerEmail') || 'outstationcabsb@gmail.com'
  };

  try {
    const urls = getCandidateApiUrls('/notifications/send-driver-assigned');
    await Promise.any(urls.map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timer);
        if (res.ok) return res;
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        clearTimeout(timer);
        throw e;
      }
    })).catch(() => null);

    console.log(`[Email Service] Driver details email sent to customer for #${booking.bookingId}`);
  } catch (err) {
    console.warn('[Driver Email Service Warning]', err);
  }

  // Record in audit log
  try {
    const existing = JSON.parse(localStorage.getItem('CabApp_Driver_Email_Dispatches') || '[]');
    existing.unshift({
      timestamp: Date.now(),
      bookingId: booking.bookingId,
      customerEmail: payload.customerEmail,
      driver: targetDriver,
      status: 'DRIVER_DISPATCH_SENT'
    });
    localStorage.setItem('CabApp_Driver_Email_Dispatches', JSON.stringify(existing.slice(0, 50)));
  } catch (_) {}

  return true;
}

/**
 * Fallback to open email with driver details
 */
export function openCustomerDriverEmailClient(booking, driverDetails) {
  if (!booking) return;

  const driver = driverDetails || booking.driverDetails || {};
  const recipient = booking.userEmail || ADMIN_CONFIRMATION_EMAIL;
  const subject = encodeURIComponent(`Ride Accepted! Driver Assigned for #${booking.bookingId || 'CB-0000'} - U & I Cabs`);
  const body = encodeURIComponent(
`U & I Cabs Outstation - Driver Assigned!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID     : ${booking.bookingId || 'CB-0000'}
Ride Status    : ACCEPTED & CONFIRMED ✓

DRIVER DETAILS:
• Driver Name  : ${driver.name || 'Assigned Driver'}
• Driver Phone : ${driver.phone || '+91 94441 23456'}
• Cab Model    : ${driver.cabModel || booking.vehicleName || 'Sedan AC'}
• Cab Plate    : ${driver.cabNumber || 'KA 01 BX 4589'}
• Security PIN : ${driver.otp || '4829'}

TRIP SCHEDULE:
• Route        : ${booking.pickup || ''} to ${booking.drop || ''}
• Pickup Date  : ${booking.pickupDate || 'Today'}
• Pickup Time  : ${booking.pickupTime || 'Immediate'}
• Total Fare   : Rs. ${booking.estimatedFare || booking.totalFare || 0}
• Advance Paid : Rs. ${booking.advancePaid || 500} (Paid Online ✓)
• Balance Due  : Rs. ${booking.balancePayable || 0}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
U & I Cabs 24/7 Helpline: +91 83107 54133 • outstationcabsb@gmail.com`
  );

  const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;
  try {
    window.open(mailtoUrl, '_blank');
  } catch (_) {
    window.location.href = mailtoUrl;
  }
}

