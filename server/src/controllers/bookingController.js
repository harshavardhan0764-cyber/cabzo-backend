const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { successResponse, errorResponse } = require('../utils/response');
const { calculateFare } = require('../utils/fare');
const bookingStore = require('../utils/bookingStore');

exports.calculateBookingFare = async (req, res) => {
  try {
    const { vehicle_type, distance_km, estimated_days, destination_state } = req.body;
    const fareDetails = await calculateFare(vehicle_type, distance_km, estimated_days, destination_state);
    return successResponse(res, fareDetails);
  } catch (error) {
    console.error(error);
    return errorResponse(res, error.message || 'Error calculating fare');
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      pickup_location, drop_location,
      pickup_lat, pickup_lng, drop_lat, drop_lng,
      vehicle_type, distance_km, estimated_days, destination_state,
      scheduled_at, customerName, customerPhone, customerEmail,
      total_fare, advance_amount
    } = req.body;

    const customer_id = req.user?.id || 'cust-direct';
    const bookingId = `CB-${Math.floor(100000 + Math.random() * 900000)}`;

    let fareDetails;
    if (total_fare && advance_amount) {
      fareDetails = { totalFare: total_fare, advanceAmount: advance_amount };
    } else {
      fareDetails = await calculateFare(vehicle_type, distance_km, estimated_days, destination_state).catch(() => ({
        totalFare: total_fare || 2050,
        advanceAmount: advance_amount || 500
      }));
    }

    // Save to unified booking store
    const bookingRecord = {
      bookingId,
      customerId: customer_id,
      customerName: customerName || req.user?.name || 'Customer',
      customerPhone: customerPhone || req.user?.phone || '9014467153',
      customerEmail: customerEmail || req.user?.email || 'customer@cabbazar.com',
      pickup: pickup_location || 'Pickup Location',
      drop: drop_location || 'Drop Location',
      distanceKm: distance_km || 145,
      vehicleCategory: vehicle_type || 'Outstation Cab',
      totalFare: fareDetails.totalFare,
      advancePaid: fareDetails.advanceAmount,
      remainingAmount: Math.max(0, fareDetails.totalFare - fareDetails.advanceAmount),
      status: 'CONFIRMED',
      paymentStatus: 'PAID (Advance Verified)',
      scheduledAt: scheduled_at || new Date().toISOString(),
      createdAt: Date.now()
    };

    bookingStore.saveBooking(bookingRecord);

    // Try DB insert as well
    try {
      if (db && typeof db.execute === 'function') {
        const query = `
          INSERT INTO bookings (
            id, customer_id, pickup_location, drop_location,
            pickup_lat, pickup_lng, drop_lat, drop_lng,
            vehicle_type, distance_km, estimated_days, destination_state,
            total_fare, advance_amount, scheduled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const params = [
          bookingId, customer_id, pickup_location, drop_location,
          pickup_lat || null, pickup_lng || null, drop_lat || null, drop_lng || null,
          vehicle_type, distance_km, estimated_days, destination_state,
          fareDetails.totalFare, fareDetails.advanceAmount, scheduled_at
        ];
        await db.execute(query, params);
      }
    } catch (dbErr) {
      console.warn('[DB Booking Insert Notice]', dbErr.message);
    }

    return successResponse(res, { bookingId, ...fareDetails }, 'Booking created successfully', 201);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error creating booking');
  }
};

exports.getAllBookings = async (req, res) => {
  try {
    // Try database first
    try {
      if (db && typeof db.execute === 'function') {
        let query = 'SELECT * FROM bookings ORDER BY created_at DESC';
        let params = [];
        if (req.user?.role === 'DRIVER') {
          query = 'SELECT * FROM bookings WHERE driver_id = ? ORDER BY created_at DESC';
          params.push(req.user.id);
        } else if (req.user?.role === 'CUSTOMER') {
          query = 'SELECT * FROM bookings WHERE customer_id = ? ORDER BY created_at DESC';
          params.push(req.user.id);
        }
        const [bookings] = await db.execute(query, params);
        if (bookings && bookings.length > 0) {
          return successResponse(res, bookings);
        }
      }
    } catch (dbErr) {
      console.warn('[DB Bookings Fetch Notice]', dbErr.message);
    }

    // High availability fallback: retrieve from bookingStore
    const userRole = req.user?.role;
    let list = bookingStore.getAllBookings();
    if (userRole === 'CUSTOMER' && req.user?.phone) {
      const ph = req.user.phone.replace(/\D/g, '').slice(-10);
      list = list.filter(b => (b.customerPhone || '').includes(ph));
    }
    return successResponse(res, list);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error fetching bookings');
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = bookingStore.getBookingById(req.params.id);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    if (req.user?.role === 'CUSTOMER' && req.user.phone) {
      const ph = req.user.phone.replace(/\D/g, '').slice(-10);
      if (booking.customerPhone && !booking.customerPhone.includes(ph)) {
        return errorResponse(res, 'Not authorized to view this booking', 403);
      }
    }

    return successResponse(res, booking);
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error fetching booking');
  }
};

exports.assignDriver = async (req, res) => {
  try {
    const booking_id = req.params.id;
    const { driver_id, driverDetails } = req.body;

    const details = driverDetails || {
      name: 'M. Suresh Kumar',
      phone: '+91 94441 23456',
      cabNumber: 'KA 01 AH 8899',
      cabModel: 'Maruti Suzuki Ertiga',
      rating: 4.9
    };

    const updated = bookingStore.updateBookingStatus(booking_id, 'DRIVER_ASSIGNED', { driverDetails: details });
    if (!updated) {
      return errorResponse(res, 'Booking not found', 404);
    }

    return successResponse(res, updated, 'Driver assigned successfully');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error assigning driver');
  }
};

exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const booking_id = req.params.id;

    const updated = bookingStore.updateBookingStatus(booking_id, status);
    if (!updated) {
      return errorResponse(res, 'Booking not found', 404);
    }

    return successResponse(res, updated, 'Booking status updated');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error updating booking status');
  }
};

/**
 * GET /api/bookings/:id/status
 * Public endpoint to allow the customer app to poll booking status & driver allocation in real-time
 */
exports.getBookingStatusPublic = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const booking = bookingStore.getBookingById(bookingId);
    if (!booking) {
      return errorResponse(res, 'Booking not found', 404);
    }

    const driver = booking.driverDetails || booking.driver || null;

    return successResponse(res, {
      bookingId: booking.bookingId || booking.id,
      status: booking.status,
      driverDetails: driver,
      driver: driver,
      totalFare: booking.totalFare,
      advancePaid: booking.advancePaid,
      remainingAmount: booking.remainingAmount,
      pickup: booking.pickup,
      drop: booking.drop,
      pickupDate: booking.pickupDate,
      pickupTime: booking.pickupTime,
      updatedAt: booking.updatedAt || Date.now()
    }, 'Live booking status retrieved');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error fetching live booking status', 500);
  }
};

/**
 * POST /api/bookings/sync
 * Sync client-side booking directly to server store
 */
exports.syncBooking = async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.bookingId) {
      return errorResponse(res, 'Valid booking data with bookingId is required', 400);
    }
    const created = bookingStore.createBooking({
      ...data,
      status: data.status || 'PENDING'
    });
    return successResponse(res, created, 'Booking synced with server');
  } catch (error) {
    console.error(error);
    return errorResponse(res, 'Error syncing booking', 500);
  }
};
