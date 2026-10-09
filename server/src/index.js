const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');

dotenv.config();

const { apiLimiter } = require('./middleware/rateLimiter');
const { errorResponse } = require('./utils/response');

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ 
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);

// ─── Routes (all prefixed /api) ───────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/customers',     require('./routes/customers'));
app.use('/api/drivers',       require('./routes/drivers'));
app.use('/api/bookings',      require('./routes/bookings'));
app.use('/api/payments',      require('./routes/payments'));
app.use('/api/pricing',       require('./routes/pricing'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports',       require('./routes/reports'));

// ─── Health Check ─────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'CabPro API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, message: 'CabPro Backend API v1.0', docs: '/api/health' });
});

// ─── 404 ──────────────────────────────────────────────────────────────────
app.use((req, res) => {
  return errorResponse(res, `Route ${req.originalUrl} not found`, 404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  return errorResponse(
    res, 
    process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error', 
    500
  );
});

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚖  CabPro API Server  →  http://0.0.0.0:${PORT}`);
  console.log(`📋  Health check      →  http://localhost:${PORT}/api/health\n`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use by another process.`);
    console.error(`👉 Stop the existing process or set a different PORT in .env\n`);
  } else {
    console.error('\n❌ Server error:', err.message);
  }
});
