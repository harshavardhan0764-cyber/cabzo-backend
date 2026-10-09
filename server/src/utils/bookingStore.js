/**
 * Unified Server-Side Booking Store & Real-Time Event Hub
 * Shared between Customer App and Admin App
 * Works with PostgreSQL database and auto-persists to server/data/bookings.json
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const db = require('../config/database');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.warn('Could not create data dir:', err.message);
  }
}

const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const DRIVERS_FILE = path.join(DATA_DIR, 'drivers.json');

const bookingEvents = new EventEmitter();
bookingEvents.setMaxListeners(100);

const bookingsMap = new Map();

const DEFAULT_SEED_BOOKINGS = [
  {
    bookingId: 'BK-10024',
    customerName: 'Harsh Vardhan',
    customerPhone: '9014467153',
    customerEmail: 'outstationcabsb@gmail.com',
    tripType: 'roundtrip',
    pickup: 'Bengaluru (Koramangala)',
    drop: 'Mysuru Palace',
    stops: ['Mandya Highway Halt'],
    pickupDate: '03 Oct 2026',
    pickupTime: '06:30 AM',
    returnDate: '04 Oct 2026',
    returnTime: '08:00 PM',
    vehicleCategory: 'Maruti Suzuki Ertiga (6+1)',
    vehicleId: 'ertiga',
    passengers: 4,
    distanceKm: 290,
    days: 2,
    totalFare: 5510,
    advancePaid: 850,
    remainingAmount: 4660,
    paymentStatus: 'PAID (Verified via Razorpay)',
    status: 'CONFIRMED',
    razorpayPaymentId: 'pay_rzp_89201948',
    razorpayOrderId: 'order_rzp_10928374',
    driverDetails: {
      name: 'M. Suresh Kumar',
      phone: '+91 94441 23456',
      cabNumber: 'KA 01 AH 8899',
      cabModel: 'Maruti Suzuki Ertiga (Grey AC)',
      rating: 4.9
    },
    payTollNow: true,
    tollAmount: 320,
    createdAt: Date.now() - 3600000 * 3
  },
  {
    bookingId: 'BK-10018',
    customerName: 'Priya Sharma',
    customerPhone: '9845012345',
    customerEmail: 'priya.sharma@example.com',
    tripType: 'oneway',
    pickup: 'Bengaluru Airport (BLR)',
    drop: 'Coorg (Madikeri)',
    stops: [],
    pickupDate: '04 Oct 2026',
    pickupTime: '09:00 AM',
    returnDate: null,
    returnTime: null,
    vehicleCategory: 'Innova Crysta (7+1)',
    vehicleId: 'crysta',
    passengers: 5,
    distanceKm: 260,
    days: 1,
    totalFare: 6240,
    advancePaid: 1000,
    remainingAmount: 5240,
    paymentStatus: 'PAID (Verified via Razorpay)',
    status: 'PENDING',
    razorpayPaymentId: 'pay_rzp_77192841',
    razorpayOrderId: 'order_rzp_99182736',
    driverDetails: null,
    payTollNow: true,
    tollAmount: 280,
    createdAt: Date.now() - 3600000 * 1
  },
  {
    bookingId: 'BK-10012',
    customerName: 'Ramesh Reddy',
    customerPhone: '9740098765',
    customerEmail: 'ramesh.reddy@example.com',
    tripType: 'roundtrip',
    pickup: 'Bengaluru (Indiranagar)',
    drop: 'Ooty (Nilgiris)',
    stops: ['Bandipur National Park'],
    pickupDate: '28 Sep 2026',
    pickupTime: '05:30 AM',
    returnDate: '30 Sep 2026',
    returnTime: '09:00 PM',
    vehicleCategory: 'Maruti Suzuki Ertiga (6+1)',
    vehicleId: 'ertiga',
    passengers: 4,
    distanceKm: 560,
    days: 3,
    totalFare: 10640,
    advancePaid: 1500,
    remainingAmount: 9140,
    paymentStatus: 'PAID (Verified via Razorpay)',
    status: 'COMPLETED',
    razorpayPaymentId: 'pay_rzp_66192837',
    razorpayOrderId: 'order_rzp_88172635',
    driverDetails: {
      name: 'Anand R.',
      phone: '+91 97410 56789',
      cabNumber: 'KA 05 MN 3421',
      cabModel: 'Toyota Innova Crysta (Silver AC)',
      rating: 5.0
    },
    payTollNow: true,
    tollAmount: 450,
    createdAt: Date.now() - 86400000 * 4
  }
];

const DEFAULT_DRIVERS = [
  { id: 'drv-1', name: 'M. Suresh Kumar', phone: '+91 94441 23456', cabNumber: 'KA 01 AH 8899', cabModel: 'Maruti Suzuki Ertiga (Grey AC)', rating: 4.9, status: 'BUSY' },
  { id: 'drv-2', name: 'Anand R.', phone: '+91 97410 56789', cabNumber: 'KA 05 MN 3421', cabModel: 'Toyota Innova Crysta (Silver AC)', rating: 5.0, status: 'AVAILABLE' },
  { id: 'drv-3', name: 'Manjunath Gowda', phone: '+91 99801 11223', cabNumber: 'KA 04 MM 5566', cabModel: 'Maruti Suzuki Ertiga (White AC)', rating: 4.8, status: 'AVAILABLE' },
  { id: 'drv-4', name: 'R. Karthi', phone: '+91 98840 98765', cabNumber: 'KA 03 XY 1234', cabModel: 'Swift Dzire Sedan (White AC)', rating: 4.9, status: 'AVAILABLE' },
  { id: 'drv-5', name: 'Gurpreet Singh', phone: '+91 98112 33445', cabNumber: 'KA 01 TA 7711', cabModel: 'Innova Crysta (Bronze AC)', rating: 4.9, status: 'OFFLINE' }
];

let driversList = [...DEFAULT_DRIVERS];

function loadData() {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(BOOKINGS_FILE, 'utf8'));
      if (Array.isArray(data)) {
        data.forEach(b => bookingsMap.set(b.bookingId, b));
      }
    } else {
      DEFAULT_SEED_BOOKINGS.forEach(b => bookingsMap.set(b.bookingId, b));
      saveBookingsToDisk();
    }

    if (fs.existsSync(DRIVERS_FILE)) {
      const drv = JSON.parse(fs.readFileSync(DRIVERS_FILE, 'utf8'));
      if (Array.isArray(drv) && drv.length > 0) {
        driversList = drv;
      }
    } else {
      saveDriversToDisk();
    }
  } catch (err) {
    console.warn('[BookingStore Load Warning]', err.message);
  }
}
loadData();

function saveBookingsToDisk() {
  try {
    const list = Array.from(bookingsMap.values());
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(list, null, 2), 'utf8');
  } catch (err) {
    console.warn('[BookingStore Save Bookings Warning]', err.message);
  }
}

function saveDriversToDisk() {
  try {
    fs.writeFileSync(DRIVERS_FILE, JSON.stringify(driversList, null, 2), 'utf8');
  } catch (err) {
    console.warn('[BookingStore Save Drivers Warning]', err.message);
  }
}

// ─── API Operations ──────────────────────────────────────────────────────────

function getAllBookings(filters = {}) {
  let list = Array.from(bookingsMap.values());

  // Filter by status if requested
  if (filters.status && filters.status !== 'ALL') {
    list = list.filter(b => b.status === filters.status);
  }

  // Search by query (bookingId, customerName, customerPhone, pickup, drop)
  if (filters.search && filters.search.trim()) {
    const q = filters.search.trim().toLowerCase();
    list = list.filter(b =>
      (b.bookingId && b.bookingId.toLowerCase().includes(q)) ||
      (b.customerName && b.customerName.toLowerCase().includes(q)) ||
      (b.customerPhone && b.customerPhone.includes(q)) ||
      (b.pickup && b.pickup.toLowerCase().includes(q)) ||
      (b.drop && b.drop.toLowerCase().includes(q))
    );
  }

  // Sort descending by creation date
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

function getBookingById(bookingId) {
  return bookingsMap.get(bookingId) || null;
}

function saveBooking(booking) {
  if (!booking || !booking.bookingId) return null;
  const existing = bookingsMap.get(booking.bookingId) || {};
  const merged = {
    ...existing,
    ...booking,
    updatedAt: Date.now()
  };
  if (!merged.createdAt) merged.createdAt = Date.now();

  bookingsMap.set(booking.bookingId, merged);
  saveBookingsToDisk();

  // Emit event for real-time subscribers
  bookingEvents.emit('booking:change', { type: existing.bookingId ? 'UPDATE' : 'CREATE', booking: merged });
  return merged;
}

function updateBookingStatus(bookingId, status, extra = {}) {
  const booking = bookingsMap.get(bookingId);
  if (!booking) return null;

  booking.status = status;
  if (extra.driverDetails) {
    booking.driverDetails = extra.driverDetails;
  }
  Object.assign(booking, extra);
  booking.updatedAt = Date.now();

  bookingsMap.set(bookingId, booking);
  saveBookingsToDisk();

  bookingEvents.emit('booking:change', { type: 'UPDATE', booking });
  return booking;
}

function deleteBooking(bookingId) {
  if (bookingsMap.has(bookingId)) {
    const deleted = bookingsMap.get(bookingId);
    bookingsMap.delete(bookingId);
    saveBookingsToDisk();
    bookingEvents.emit('booking:change', { type: 'DELETE', bookingId });
    return deleted;
  }
  return null;
}

function getDashboardStats() {
  const bookings = Array.from(bookingsMap.values());
  const todayDateStr = new Date().toISOString().split('T')[0];

  let totalBookings = bookings.length;
  let todayBookings = 0;
  let pendingBookings = 0;
  let confirmedBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;

  let totalRevenue = 0;
  let advancePayments = 0;
  let pendingAmounts = 0;

  bookings.forEach(b => {
    // Check if booked today
    if (b.createdAt) {
      const createdDate = new Date(b.createdAt).toISOString().split('T')[0];
      if (createdDate === todayDateStr) todayBookings++;
    }

    const st = (b.status || '').toUpperCase();
    if (st === 'PENDING') pendingBookings++;
    else if (st === 'CONFIRMED' || st === 'DRIVER_ASSIGNED' || st === 'ASSIGNED') confirmedBookings++;
    else if (st === 'COMPLETED') completedBookings++;
    else if (st === 'CANCELLED' || st === 'REJECTED') cancelledBookings++;

    const fare = Number(b.totalFare || 0);
    const adv = Number(b.advancePaid || 0);
    const rem = Number(b.remainingAmount !== undefined ? b.remainingAmount : Math.max(0, fare - adv));

    totalRevenue += fare;
    advancePayments += adv;
    if (st !== 'CANCELLED' && st !== 'REJECTED' && st !== 'COMPLETED') {
      pendingAmounts += rem;
    }
  });

  return {
    totalBookings,
    todayBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    totalRevenue,
    advancePayments,
    pendingAmounts
  };
}

function getDrivers() {
  return [...driversList];
}

function addDriver(driverData) {
  const newDriver = {
    id: `drv-${Date.now()}`,
    name: driverData.name || 'New Driver',
    phone: driverData.phone || '',
    cabNumber: driverData.cabNumber || '',
    cabModel: driverData.cabModel || 'Maruti Suzuki Ertiga',
    rating: 5.0,
    status: 'AVAILABLE',
    createdAt: Date.now()
  };
  driversList.unshift(newDriver);
  saveDriversToDisk();
  return newDriver;
}

module.exports = {
  getAllBookings,
  getBookingById,
  saveBooking,
  updateBookingStatus,
  deleteBooking,
  getDashboardStats,
  getDrivers,
  addDriver,
  bookingEvents
};
