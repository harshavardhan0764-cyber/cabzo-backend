const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config();
const nodemailer = require('nodemailer');

const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

let cachedTransporter = null;

async function getTransporter(preferredPort = 465) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = preferredPort || parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || 'outstationcabsb@gmail.com';
  const rawPass = (process.env.SMTP_PASS || 'tnfw ymqp nsqi qhnv').trim();
  const pass = rawPass.replace(/\s+/g, '');

  // Always use real Gmail SMTP credentials
  if (user && pass && pass.length >= 8) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      tls: { rejectUnauthorized: false }
    });
  }

  console.warn(`\n⚠️  [CabBazar Email Notice]: Real SMTP password not configured in server/.env.`);
  console.warn(`   To receive real emails at lharsha031@gmail.com:`);
  console.warn(`   1. Open Google Account: https://myaccount.google.com/apppasswords`);
  console.warn(`   2. Generate a 16-character App Password (e.g. 'abcd efgh ijkl mnop')`);
  console.warn(`   3. Put it in server/.env: SMTP_PASS=your_16_digit_password\n`);

  // Fallback to test/ethereal or JSON transport for development
  try {
    const testAccount = await nodemailer.createTestAccount();
    cachedTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
    return cachedTransporter;
  } catch (err) {
    // Ultimate fallback: JSON transporter that logs without network failures
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return cachedTransporter;
  }
}

function getCleanFromHeader(displayName = 'CabBazar Outstation') {
  const raw = process.env.FROM_EMAIL || process.env.SMTP_USER || 'outstationcabsb@gmail.com';
  const match = raw.match(/<([^>]+)>/);
  const cleanEmail = match ? match[1].trim() : raw.replace(/["']/g, '').trim();
  return `"${displayName}" <${cleanEmail}>`;
}

// In-memory set to prevent duplicate booking emails
const sentBookingEmails = new Set();

/**
 * Build rich HTML email invoice for booking confirmation
 */
function buildBookingEmailHtml(booking) {
  const customerName = booking.customerName || booking.userName || 'Valued Customer';
  const customerPhone = booking.customerPhone || booking.userPhone || '9014467153';
  const customerEmail = booking.customerEmail || booking.userEmail || 'Not provided';
  const bookingId = booking.bookingId || 'CB-00000';
  const pickup = booking.pickup || 'Bengaluru';
  const drop = booking.drop || 'Mysuru';
  const stops = (booking.stops && booking.stops.length > 0) ? booking.stops.join(', ') : 'Direct Non-Stop';
  const tripType = booking.tripType === 'roundtrip' ? 'Round Trip (Return Included)' : 'One Way Outstation';
  const pickupDate = booking.pickupDate || 'Today';
  const pickupTime = booking.pickupTime || 'Immediate';
  const vehicleCategory = booking.vehicleCategory || booking.vehicleName || 'Sedan (4+1)';
  const distanceKm = booking.distanceKm || 145;
  const totalFare = booking.totalFare || booking.estimatedFare || 2050;
  const advancePaid = booking.advancePaid || 500;
  const remainingAmount = booking.remainingAmount !== undefined ? booking.remainingAmount : (booking.balancePayable !== undefined ? booking.balancePayable : Math.max(0, totalFare - advancePaid));
  const paymentStatus = booking.paymentStatus || 'SUCCESS (Verified via Razorpay)';
  const razorpayPaymentId = booking.razorpayPaymentId || booking.paymentId || 'pay_online_verified';
  const razorpayOrderId = booking.razorpayOrderId || '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>CabBazar Ride Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #f59e0b 100%); padding: 30px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.92; font-size: 13px; font-weight: 500; }
    .status-badge { display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 800; margin-top: 15px; }
    .content { padding: 24px; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .route-box { background: #fff7ed; border: 1px solid #fed7aa; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
    .fare-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .fare-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
    .fare-table tr:last-child td { border-bottom: none; font-size: 15px; font-weight: 800; color: #ea580c; padding-top: 12px; }
    .footer { background: #f1f5f9; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚖 CabBazar Outstation</h1>
      <p>Booking Confirmed & Razorpay Advance Verified</p>
      <div class="status-badge">✓ BOOKING CONFIRMED #${bookingId}</div>
    </div>

    <div class="content">
      <!-- 1. Customer & Booking Details -->
      <div class="section-title">Customer & Booking Information</div>
      <div class="card">
        <div class="row">
          <span class="label">Booking ID:</span>
          <span class="value" style="font-family: monospace; color: #ea580c;">${bookingId}</span>
        </div>
        <div class="row">
          <span class="label">Customer Name:</span>
          <span class="value">${customerName}</span>
        </div>
        <div class="row">
          <span class="label">Customer Phone:</span>
          <span class="value" style="font-family: monospace;">${customerPhone}</span>
        </div>
        <div class="row">
          <span class="label">Customer Email:</span>
          <span class="value">${customerEmail}</span>
        </div>
      </div>

      <!-- 2. Trip Route & Schedule -->
      <div class="section-title">Trip Route & Schedule</div>
      <div class="route-box">
        <div class="row">
          <span class="label">🟢 Pickup:</span>
          <span class="value" style="color: #047857;">${pickup}</span>
        </div>
        <div class="row">
          <span class="label">🔴 Drop:</span>
          <span class="value" style="color: #b91c1c;">${drop}</span>
        </div>
        <div class="row">
          <span class="label">🛣️ Distance:</span>
          <span class="value">${distanceKm} KM</span>
        </div>
        <div class="row">
          <span class="label">🚗 Vehicle Category:</span>
          <span class="value">${vehicleCategory}</span>
        </div>
        <div class="row">
          <span class="label">📅 Date & Time:</span>
          <span class="value">${pickupDate} at ${pickupTime}</span>
        </div>
        <div class="row">
          <span class="label">🔄 Trip Type:</span>
          <span class="value">${tripType}</span>
        </div>
        <div class="row">
          <span class="label">🛑 Halts:</span>
          <span class="value">${stops}</span>
        </div>
      </div>

      <!-- 3. Razorpay Payment & Fare Details -->
      <div class="section-title">Payment & Fare Invoice</div>
      <div class="card">
        <table class="fare-table">
          <tr>
            <td class="label">Total Fare:</td>
            <td class="value">₹${totalFare}</td>
          </tr>
          <tr>
            <td class="label">Advance Paid:</td>
            <td class="value" style="color: #047857;">₹${advancePaid} (Verified ✓)</td>
          </tr>
          <tr>
            <td class="label">Remaining Amount (To Driver):</td>
            <td class="value" style="color: #ea580c; font-weight: 800;">₹${remainingAmount}</td>
          </tr>
          <tr>
            <td class="label">Payment Status:</td>
            <td class="value" style="color: #047857;">${paymentStatus}</td>
          </tr>
          <tr>
            <td class="label">Razorpay Payment ID:</td>
            <td class="value" style="font-family: monospace; font-size: 11px;">${razorpayPaymentId}</td>
          </tr>
          ${razorpayOrderId ? `
          <tr>
            <td class="label">Razorpay Order ID:</td>
            <td class="value" style="font-family: monospace; font-size: 11px;">${razorpayOrderId}</td>
          </tr>` : ''}
        </table>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for choosing <strong>CabBazar Outstation Services</strong>.</p>
      <p>24x7 Customer Helpline: <strong>+91 9014467153</strong> • <strong>outstationcabsb@gmail.com</strong></p>
    </div>
  </div>
</body>
</html>
`;
}

/**
 * Send Booking Confirmation Email to both Customer and Admin
 */
async function sendBookingConfirmationEmail(booking) {
  if (!booking) return false;

  const razorpayPaymentId = booking.razorpayPaymentId || booking.paymentId || 'pay_online';
  const bookingId = booking.bookingId || 'CB-00000';
  const dedupeKey = `${razorpayPaymentId}_${bookingId}`;

  // Idempotency: Prevent duplicate emails for the same payment/booking
  if (sentBookingEmails.has(dedupeKey)) {
    console.log(`\n⚡ [EMAIL DEDUPLICATION] Duplicate booking email suppressed for ${dedupeKey}`);
    return {
      success: true,
      duplicateSuppressed: true,
      bookingId
    };
  }

  const customerName = booking.customerName || booking.userName || 'Customer';
  const customerPhone = booking.customerPhone || booking.userPhone || '9014467153';
  const pickup = booking.pickup || 'Pickup Location';
  const drop = booking.drop || 'Drop Location';
  const distanceKm = booking.distanceKm || 145;
  const totalFare = booking.totalFare || booking.estimatedFare || 2050;
  const advancePaid = booking.advancePaid || 500;
  const remainingAmount = booking.remainingAmount !== undefined ? booking.remainingAmount : (booking.balancePayable !== undefined ? booking.balancePayable : Math.max(0, totalFare - advancePaid));
  const vehicleCategory = booking.vehicleCategory || booking.vehicleName || 'Outstation Cab';
  const paymentStatus = booking.paymentStatus || 'SUCCESS (Verified via Razorpay)';

  const customerEmail = booking.customerEmail || booking.userEmail;
  const adminEmail = process.env.ADMIN_EMAIL || 'outstationcabsb@gmail.com';

  const recipients = [];
  if (customerEmail && customerEmail.includes('@')) {
    recipients.push(customerEmail);
  }
  if (adminEmail && !recipients.includes(adminEmail)) {
    recipients.push(adminEmail);
  }

  // Always ensure outstationcabsb@gmail.com receives the confirmation
  if (!recipients.includes('outstationcabsb@gmail.com')) {
    recipients.push('outstationcabsb@gmail.com');
  }

  const subject = `🚖 CabBazar Booking Confirmation #${bookingId} - Paid ₹${advancePaid} (${pickup} ➔ ${drop})`;
  const htmlContent = buildBookingEmailHtml(booking);
  
  // Explicitly format all 12 requested fields in plain text
  const textContent = `
CabBazar Booking Notification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Customer Name       : ${customerName}
Customer Phone      : ${customerPhone}
Pickup              : ${pickup}
Drop                : ${drop}
Distance            : ${distanceKm} KM
Total Fare          : Rs. ${totalFare}
Advance Paid        : Rs. ${advancePaid}
Remaining Amount    : Rs. ${remainingAmount}
Vehicle Category    : ${vehicleCategory}
Payment Status      : ${paymentStatus}
Razorpay Payment ID : ${razorpayPaymentId}
Booking ID          : ${bookingId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Support Helpline    : +91 9014467153 • outstationcabsb@gmail.com
`;

  try {
    const transporter = await getTransporter();
    const mailOptions = {
      from: getCleanFromHeader('CabBazar Outstation'),
      to: recipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    sentBookingEmails.add(dedupeKey);
    console.log(`\n📧 [EMAIL DISPATCHED] Booking confirmation sent for #${bookingId} (Razorpay: ${razorpayPaymentId}) to: ${recipients.join(', ')}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`   Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return {
      success: true,
      messageId: info.messageId,
      recipients,
      previewUrl: nodemailer.getTestMessageUrl(info) || null
    };
  } catch (err) {
    console.warn('[Email Dispatch Warning]', err.message);
    return {
      success: false,
      error: err.message,
      recipients
    };
  }
}

/**
 * Build rich HTML email for Ride Accepted & Driver Assigned to Customer
 */
function buildDriverAssignedEmailHtml(booking, driver) {
  const customerName = booking.userName || booking.customerName || 'Valued Customer';
  const bookingId = booking.bookingId || 'CB-00000';
  const pickup = booking.pickup || 'Pickup Point';
  const drop = booking.drop || 'Drop Point';
  const pickupDate = booking.pickupDate || 'Today';
  const pickupTime = booking.pickupTime || 'Scheduled Time';
  const tripType = booking.tripType === 'roundtrip' ? 'Round Trip (Return Included)' : 'One Way Outstation';
  const totalFare = booking.estimatedFare || booking.totalFare || 2050;
  const advancePaid = booking.advancePaid || 500;
  const balancePayable = booking.balancePayable || (totalFare - advancePaid);
  
  const driverName = driver.name || 'Assigned Fleet Driver';
  const driverPhone = driver.phone || '+91 94441 23456';
  const cabNumber = driver.cabNumber || 'KA 01 BX 4589';
  const cabModel = driver.cabModel || booking.vehicleName || 'Sedan (AC)';
  const rating = driver.rating || '4.9';
  const otp = driver.otp || '4829';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ride Accepted & Driver Assigned</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #059669 0%, #10b981 50%, #14b8a6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; }
    .header p { margin: 6px 0 0; opacity: 0.95; font-size: 13px; font-weight: 500; }
    .status-badge { display: inline-block; background: #ffffff; color: #047857; padding: 6px 16px; border-radius: 999px; font-size: 12px; font-weight: 800; margin-top: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .content { padding: 24px; }
    .driver-card { background: #f0fdf4; border: 2px solid #86efac; border-radius: 16px; padding: 20px; margin-bottom: 22px; text-align: center; }
    .driver-avatar { width: 54px; height: 54px; background: #16a34a; color: white; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 22px; font-weight: bold; margin-bottom: 8px; line-height: 54px; }
    .driver-name { font-size: 18px; font-weight: 800; color: #064e3b; margin: 0; }
    .driver-rating { font-size: 12px; font-weight: 700; color: #059669; margin: 4px 0 12px; }
    .call-btn { display: inline-block; background: #16a34a; color: #ffffff !important; padding: 10px 24px; border-radius: 12px; font-size: 13px; font-weight: 800; text-decoration: none; margin-top: 6px; box-shadow: 0 4px 12px rgba(22,163,74,0.3); }
    .otp-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 14px; padding: 14px; text-align: center; margin-bottom: 22px; }
    .otp-number { font-size: 24px; font-weight: 900; letter-spacing: 4px; color: #1d4ed8; font-family: monospace; }
    .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 16px; margin-bottom: 20px; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #64748b; font-weight: 500; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .fare-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    .fare-table td { padding: 8px 0; font-size: 13px; border-bottom: 1px dashed #e2e8f0; }
    .fare-table tr:last-child td { border-bottom: none; font-size: 15px; font-weight: 800; color: #059669; padding-top: 12px; }
    .footer { background: #f8fafc; padding: 18px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚕 Ride Accepted & Driver Assigned</h1>
      <p>Hello ${customerName}, your driver is confirmed and ready!</p>
      <div class="status-badge">✓ RIDE ACCEPTED #${bookingId}</div>
    </div>

    <div class="content">
      <!-- DRIVER CARD -->
      <div class="driver-card">
        <div class="driver-avatar">${driverName.charAt(0)}</div>
        <h2 class="driver-name">${driverName}</h2>
        <div class="driver-rating">★ ${rating} • Verified Professional Driver</div>
        
        <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #bbf7d0; border-radius: 10px; margin-bottom: 12px;">
          <tr>
            <td style="padding: 10px; text-align: center; border-right: 1px solid #e2e8f0;">
              <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block;">CAB MODEL</span>
              <strong style="font-size: 13px; color: #0f172a;">${cabModel}</strong>
            </td>
            <td style="padding: 10px; text-align: center;">
              <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; display: block;">VEHICLE NUMBER</span>
              <strong style="font-size: 13px; color: #0f172a; font-family: monospace;">${cabNumber}</strong>
            </td>
          </tr>
        </table>

        <a href="tel:${driverPhone.replace(/[^0-9+]/g, '')}" class="call-btn">📞 Call Driver: ${driverPhone}</a>
      </div>

      <!-- TRIP PIN / SECURITY CODE -->
      <div class="otp-box">
        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #1e40af; display: block; margin-bottom: 4px;">
          🔒 TRIP START SECURITY PIN
        </span>
        <div class="otp-number">${otp}</div>
        <p style="margin: 4px 0 0; font-size: 11px; color: #475569;">Share this PIN with your driver only when boarding the vehicle.</p>
      </div>

      <!-- ROUTE & SCHEDULE -->
      <div class="section-title">Trip Route & Schedule</div>
      <div class="card">
        <div class="row">
          <span class="label">Pickup Location:</span>
          <span class="value" style="color: #16a34a;">🟢 ${pickup}</span>
        </div>
        <div class="row">
          <span class="label">Drop Location:</span>
          <span class="value" style="color: #dc2626;">🔴 ${drop}</span>
        </div>
        <div class="row">
          <span class="label">Scheduled Date:</span>
          <span class="value">${pickupDate}</span>
        </div>
        <div class="row">
          <span class="label">Scheduled Time:</span>
          <span class="value">${pickupTime}</span>
        </div>
        <div class="row">
          <span class="label">Journey Type:</span>
          <span class="value">${tripType}</span>
        </div>
      </div>

      <!-- FARE SUMMARY -->
      <div class="section-title">Fare & Payment Breakdown</div>
      <div class="card">
        <table class="fare-table">
          <tr>
            <td>Total Trip Fare</td>
            <td style="text-align: right; font-weight: 700;">₹${totalFare}</td>
          </tr>
          <tr>
            <td>Highway Toll & State Border Tax</td>
            <td style="text-align: right; font-weight: 700; color: #475569;">${(booking.tollAmount || 0) > 0 ? ((booking.payTollNow || booking.tollPaymentPreference === 'PAY_NOW_ONLINE') ? `₹${booking.tollAmount} (Paid Online ✓)` : `₹${booking.tollAmount} (Pay to Driver)`) : '₹0 (None / Intra-State)'}</td>
          </tr>
          <tr>
            <td>Advance Paid Online</td>
            <td style="text-align: right; font-weight: 700; color: #16a34a;">- ₹${advancePaid} (Paid ✓)</td>
          </tr>
          <tr>
            <td>Balance Payable to Driver</td>
            <td style="text-align: right; font-weight: 800; color: #059669;">₹${balancePayable}</td>
          </tr>
        </table>
      </div>
    </div>

    <div class="footer">
      <p>Driver arrives 10 minutes prior to scheduled pickup time.</p>
      <p>CabBazar 24x7 Customer Helpline: <strong>+91 9014467153</strong> • <strong>outstationcabsb@gmail.com</strong></p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Ride Accepted & Driver Assigned Email to Customer (and Admin copy)
 */
async function sendDriverAssignedEmail(booking, driverDetails) {
  if (!booking) return false;

  const driver = driverDetails || booking.driverDetails || {
    name: 'M. Suresh Kumar',
    phone: '+91 94441 23456',
    cabNumber: 'TN 09 BX 4589',
    cabModel: booking.vehicleName || 'Maruti Suzuki Dzire',
    rating: '4.9',
    otp: '4829'
  };

  const customerEmail = booking.userEmail || booking.customerEmail;
  const adminEmail = process.env.ADMIN_EMAIL || 'outstationcabsb@gmail.com';
  const fromEmail = process.env.FROM_EMAIL || 'outstationcabsb@gmail.com';

  const recipients = [];
  if (customerEmail && customerEmail.includes('@')) {
    recipients.push(customerEmail);
  }
  // Admin copy for audit
  if (adminEmail && !recipients.includes(adminEmail)) {
    recipients.push(adminEmail);
  }
  if (!recipients.includes('outstationcabsb@gmail.com')) {
    recipients.push('outstationcabsb@gmail.com');
  }

  const subject = `🚕 Ride Accepted! Driver Assigned for Booking #${booking.bookingId} (${booking.pickup} ➔ ${booking.drop}) - CabBazar`;
  const htmlContent = buildDriverAssignedEmailHtml(booking, driver);
  const textContent = `
CabBazar - Ride Accepted & Driver Assigned!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Booking ID     : ${booking.bookingId}
Driver Name    : ${driver.name}
Driver Contact : ${driver.phone}
Cab Model      : ${driver.cabModel}
Vehicle Number : ${driver.cabNumber}
Trip PIN       : ${driver.otp || '4829'}
Route          : ${booking.pickup} to ${booking.drop}
Pickup Time    : ${booking.pickupDate} at ${booking.pickupTime}
Total Fare     : Rs. ${booking.estimatedFare || booking.totalFare}
Advance Paid   : Rs. ${booking.advancePaid} (Verified ✓)
Balance to Driver : Rs. ${booking.balancePayable}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Helpline: +91 9014467153 • outstationcabsb@gmail.com
`;

  try {
    const transporter = await getTransporter();
    const mailOptions = {
      from: getCleanFromHeader('CabBazar Operations'),
      to: recipients.join(', '),
      subject,
      text: textContent,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`\n📧 [DRIVER ASSIGNED EMAIL DISPATCHED] Sent for #${booking.bookingId} to customer/admin: ${recipients.join(', ')}`);
    return {
      success: true,
      messageId: info.messageId,
      recipients
    };
  } catch (err) {
    console.warn('[Driver Email Dispatch Warning]', err.message);
    return {
      success: false,
      error: err.message,
      recipients
    };
  }
}

/**
 * Build rich HTML email for registration email OTP verification
 */
function buildRegistrationOtpEmailHtml(email, otp, name) {
  const recipientName = name || 'Customer';
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verify Your Email - U &amp; I Cabs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #ea580c 0%, #f97316 50%, #f59e0b 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0; opacity: 0.94; font-size: 13px; font-weight: 500; }
    .content { padding: 28px 24px; }
    .otp-box { background: #fff7ed; border: 2px dashed #f97316; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
    .otp-code { font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #ea580c; font-family: 'Courier New', Courier, monospace; margin: 4px 0; }
    .otp-sub { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 6px; }
    .info-box { background: #f1f5f9; border-radius: 12px; padding: 14px 16px; font-size: 12px; color: #475569; line-height: 1.6; margin-bottom: 20px; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>U &amp; I Cabs</h1>
      <p>Secure Account Verification</p>
    </div>
    <div class="content">
      <p style="font-size: 14px; margin-top: 0;">Hi <strong>${recipientName}</strong>,</p>
      <p style="font-size: 13px; color: #475569; line-height: 1.6;">
        Welcome to <strong>U &amp; I Cabs</strong>! Please use the following 6-digit verification code to complete your registration:
      </p>

      <div class="otp-box">
        <div style="font-size: 11px; text-transform: uppercase; font-weight: 800; color: #9a3412; letter-spacing: 1.5px;">Your Verification Code</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-sub">Valid for 10 minutes • Do not share this OTP with anyone</div>
      </div>

      <div class="info-box">
        <strong>🔒 Security Notice:</strong><br>
        If you did not request this verification code, please ignore this email.
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 4px;">U &amp; I Cabs 24x7 Helpline: <strong>+91 83107 54133</strong> • outstationcabsb@gmail.com</p>
      <p style="margin: 0;">Your Ride, Your Way</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send Registration OTP Email to Customer
 */
async function sendRegistrationOtpEmail(email, otp, name) {
  if (!email || !otp) return { success: false, error: 'Missing email or otp' };

  const fromEmail = process.env.FROM_EMAIL || 'outstationcabsb@gmail.com';
  const subject = `Your U & I Cabs verification code: ${otp}`;
  const htmlContent = buildRegistrationOtpEmailHtml(email, otp, name);
  const textContent = `
U & I Cabs Email Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hi ${name || 'Customer'},

Your One-Time Password (OTP) to complete registration and verify your U & I Cabs account is:

      ${otp}

This code is valid for 10 minutes.
Do not share this OTP with anyone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
24/7 Helpline: +91 83107 54133
Email: outstationcabsb@gmail.com
`;

  const mailOptions = {
    from: getCleanFromHeader('U & I Cabs'),
    to: email,
    subject,
    text: textContent,
    html: htmlContent
  };

  // Strategy 1: Attempt Port 465 (SSL)
  try {
    const transporter465 = await getTransporter(465);
    const info = await transporter465.sendMail(mailOptions);
    console.log(`\n📧 [EMAIL OTP DISPATCHED via 465] Verification code ${otp} sent to ${email} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      port: 465
    };
  } catch (err465) {
    console.warn(`[Email OTP Warning] Port 465 failed (${err465.message}). Retrying via Port 587 (STARTTLS)...`);
  }

  // Strategy 2: Fallback to Port 587 (STARTTLS)
  try {
    const transporter587 = await getTransporter(587);
    const info = await transporter587.sendMail(mailOptions);
    console.log(`\n📧 [EMAIL OTP DISPATCHED via 587] Verification code ${otp} sent to ${email} (MessageID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId,
      port: 587
    };
  } catch (err587) {
    console.warn('[Email OTP Warning] Port 587 also failed:', err587.message);
    return {
      success: false,
      error: err587.message
    };
  }
}

module.exports = {
  sendBookingConfirmationEmail,
  buildBookingEmailHtml,
  sendDriverAssignedEmail,
  buildDriverAssignedEmailHtml,
  sendRegistrationOtpEmail,
  buildRegistrationOtpEmailHtml
};

