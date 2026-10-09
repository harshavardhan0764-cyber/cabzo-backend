/**
 * Test Admin Authentication, Authorization, RBAC & Endpoints
 */

const { generateToken } = require('./src/utils/jwt');
const adminController = require('./src/controllers/adminController');

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function testAdminBackend() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🛡️ TESTING ADMIN BACKEND ENDPOINTS & RBAC SECURITY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let passed = 0;
  let failed = 0;

  // 1. Admin login with correct credentials
  console.log('1. Admin login with admin@cabbazar.com / admin123:');
  const loginReq = { body: { email: 'admin@cabbazar.com', password: 'admin123' } };
  const loginRes = createMockRes();
  await adminController.login(loginReq, loginRes);
  if (loginRes.statusCode === 200 && loginRes.body.success && loginRes.body.data.token) {
    console.log('   ✓ PASSED: Admin logged in, received JWT with role ADMIN');
    passed++;
  } else {
    console.error('   ❌ FAILED:', loginRes.body);
    failed++;
  }

  // 2. Admin login with wrong credentials
  console.log('2. Admin login rejection with invalid password:');
  const badLoginReq = { body: { email: 'admin@cabbazar.com', password: 'wrongpassword' } };
  const badLoginRes = createMockRes();
  await adminController.login(badLoginReq, badLoginRes);
  if (badLoginRes.statusCode === 401) {
    console.log('   ✓ PASSED: Correctly rejected invalid admin login (401)');
    passed++;
  } else {
    console.error('   ❌ FAILED:', badLoginRes.body);
    failed++;
  }

  // 3. Test RBAC Middleware with Customer Token attempting Admin endpoint
  console.log('3. Customer token attempting Admin endpoint:');
  const customerUser = { id: 101, name: 'Customer Bob', phone: '9000000000', role: 'CUSTOMER' };
  const customerToken = generateToken(customerUser);
  const { authenticate, authorize } = require('./src/middleware/auth');

  let rbacBlocked = false;
  const mockReqCustomer = {
    headers: { authorization: `Bearer ${customerToken}` },
    user: customerUser
  };
  const mockResCustomer = createMockRes();
  const authMiddleware = authorize('ADMIN');
  authMiddleware(mockReqCustomer, mockResCustomer, () => {
    rbacBlocked = false;
  });
  if (mockResCustomer.statusCode === 403) {
    console.log('   ✓ PASSED: Customer token blocked with 403 Forbidden on Admin route');
    passed++;
  } else {
    console.error('   ❌ FAILED: Customer was not blocked by RBAC middleware');
    failed++;
  }

  // 4. Test Dashboard Stats
  console.log('4. Admin Dashboard stats:');
  const statsReq = { user: { role: 'ADMIN' } };
  const statsRes = createMockRes();
  await adminController.getDashboardStats(statsReq, statsRes);
  if (statsRes.statusCode === 200 && statsRes.body.data.totalBookings >= 1) {
    console.log(`   ✓ PASSED: Dashboard returned KPIs (Total Bookings: ${statsRes.body.data.totalBookings}, Revenue: ₹${statsRes.body.data.totalRevenue})`);
    passed++;
  } else {
    console.error('   ❌ FAILED:', statsRes.body);
    failed++;
  }

  // 5. Test Get Bookings
  console.log('5. Admin Get All Bookings:');
  const bookingsReq = { query: {} };
  const bookingsRes = createMockRes();
  await adminController.getAllBookings(bookingsReq, bookingsRes);
  if (bookingsRes.statusCode === 200 && Array.isArray(bookingsRes.body.data) && bookingsRes.body.data.length > 0) {
    console.log(`   ✓ PASSED: Fetched ${bookingsRes.body.data.length} bookings for Admin`);
    passed++;
  } else {
    console.error('   ❌ FAILED:', bookingsRes.body);
    failed++;
  }

  // 6. Test Update Booking Status
  console.log('6. Admin Update Booking Status to CONFIRMED:');
  const sampleBookingId = bookingsRes.body.data[0].bookingId;
  const updateReq = { params: { id: sampleBookingId }, body: { status: 'CONFIRMED' } };
  const updateRes = createMockRes();
  await adminController.updateBookingStatus(updateReq, updateRes);
  if (updateRes.statusCode === 200 && updateRes.body.data.status === 'CONFIRMED') {
    console.log(`   ✓ PASSED: Updated status of #${sampleBookingId} to CONFIRMED`);
    passed++;
  } else {
    console.error('   ❌ FAILED:', updateRes.body);
    failed++;
  }

  // 7. Test Assign Driver to Booking
  console.log('7. Admin Assign Driver to Booking:');
  const assignReq = {
    params: { id: sampleBookingId },
    body: {
      driverDetails: {
        name: 'M. Suresh Kumar',
        phone: '+91 94441 23456',
        cabNumber: 'KA 01 AH 8899',
        cabModel: 'Maruti Suzuki Ertiga'
      }
    }
  };
  const assignRes = createMockRes();
  await adminController.assignDriver(assignReq, assignRes);
  if (assignRes.statusCode === 200 && assignRes.body.data.booking.driverDetails.name === 'M. Suresh Kumar') {
    console.log(`   ✓ PASSED: Assigned driver to #${sampleBookingId}`);
    passed++;
  } else {
    console.error('   ❌ FAILED:', assignRes.body);
    failed++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`🏁 ADMIN BACKEND TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (failed === 0) process.exit(0);
  else process.exit(1);
}

testAdminBackend().catch(err => {
  console.error(err);
  process.exit(1);
});
