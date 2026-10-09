-- ============================================================================
-- CabPro PostgreSQL Database Schema
-- Production-Ready Schema for Outstation Cab Booking & Driver Management
-- Target Database: PostgreSQL 12+
-- Usage: psql -U postgres -d cabpro_db -f schema_postgres.sql
-- ============================================================================

-- Ensure database exists (Run separately if needed: CREATE DATABASE cabpro_db;)

-- ─── 1. Customers Table (Required for Phone Auth & Profile) ───────────
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR(128) UNIQUE,
    full_name VARCHAR(150) NOT NULL DEFAULT 'Valued Customer',
    mobile_number VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_firebase_uid ON customers(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON customers(mobile_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- ─── 2. OTP Verifications Table (Real MSG91 SMS OTP Records) ────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    mobile_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_verifications(mobile_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_active ON otp_verifications(mobile_number, is_used, expires_at);

-- ─── 3. Users Table (Core Auth for All Roles: Customer, Driver, Admin) ──────
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'DRIVER', 'ADMIN'
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',  -- 'ACTIVE', 'INACTIVE', 'BANNED'
    profile_photo VARCHAR(500),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── 4. Customer Profiles (Aggregated Stats) ────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_bookings INT DEFAULT 0,
    completed_bookings INT DEFAULT 0,
    cancelled_bookings INT DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0.00
);

-- ─── 5. Driver Profiles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_profiles (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    license_expiry DATE,
    vehicle_model VARCHAR(100) NOT NULL,
    vehicle_type VARCHAR(20) NOT NULL, -- 'SEDAN', 'MPV', 'INNOVA'
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_color VARCHAR(50),
    vehicle_year INT,
    availability_status VARCHAR(20) DEFAULT 'OFFLINE', -- 'AVAILABLE', 'BUSY', 'OFFLINE'
    current_lat NUMERIC(10, 8),
    current_lng NUMERIC(11, 8),
    rating NUMERIC(3, 2) DEFAULT 5.00,
    total_trips INT DEFAULT 0,
    total_earnings NUMERIC(12, 2) DEFAULT 0.00,
    documents_verified BOOLEAN DEFAULT FALSE
);

-- ─── 6. Pricing Rules (Admin Configurable) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    vehicle_type VARCHAR(20) NOT NULL UNIQUE, -- 'SEDAN', 'MPV', 'INNOVA'
    vehicle_label VARCHAR(50) NOT NULL,
    capacity INT NOT NULL,
    base_rate_per_km NUMERIC(10, 2) NOT NULL,
    min_km_tn INT NOT NULL DEFAULT 300,
    min_km_ap INT NOT NULL DEFAULT 700,
    min_km_other INT NOT NULL DEFAULT 300,
    extra_day_charge NUMERIC(10, 2) NOT NULL DEFAULT 400.00,
    is_active BOOLEAN DEFAULT TRUE,
    updated_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── 7. Bookings Table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    customer_id INT NOT NULL REFERENCES users(id),
    driver_id INT REFERENCES users(id),
    pickup_location VARCHAR(500) NOT NULL,
    drop_location VARCHAR(500) NOT NULL,
    pickup_lat NUMERIC(10, 8),
    pickup_lng NUMERIC(11, 8),
    drop_lat NUMERIC(10, 8),
    drop_lng NUMERIC(11, 8),
    pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
    return_datetime TIMESTAMP WITH TIME ZONE,
    vehicle_type VARCHAR(20) NOT NULL,
    passengers INT DEFAULT 1,
    distance_km NUMERIC(10, 2) NOT NULL,
    estimated_days INT NOT NULL DEFAULT 1,
    destination_state VARCHAR(20) NOT NULL DEFAULT 'TN',
    base_fare NUMERIC(10, 2) NOT NULL,
    extra_day_charge NUMERIC(10, 2) DEFAULT 0.00,
    total_fare NUMERIC(10, 2) NOT NULL,
    advance_amount NUMERIC(10, 2) NOT NULL,
    balance_amount NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(30) DEFAULT 'PENDING',
    booking_status VARCHAR(30) DEFAULT 'PAYMENT_PENDING',
    special_instructions TEXT,
    luggage_info VARCHAR(500),
    cancellation_reason TEXT,
    rate_per_km NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(booking_status);

-- ─── 8. Booking Status History (Audit Trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_status_history (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── 9. Driver Assignments Table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_assignments (
    id SERIAL PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id INT NOT NULL REFERENCES users(id),
    assigned_by INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'ASSIGNED', 'ACCEPTED', 'REJECTED'
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── 10. Payments Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL REFERENCES bookings(id),
    user_id INT NOT NULL REFERENCES users(id),
    amount NUMERIC(10, 2) NOT NULL,
    payment_type VARCHAR(20) NOT NULL, -- 'ADVANCE', 'FINAL', 'REFUND'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'
    transaction_id VARCHAR(200),
    gateway_order_id VARCHAR(200),
    gateway_payment_id VARCHAR(200),
    payment_method VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── 11. Notifications Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) DEFAULT 'SYSTEM',
    booking_id VARCHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─── Seed Data for PostgreSQL ───────────────────────────────────────────────
INSERT INTO pricing_rules (vehicle_type, vehicle_label, capacity, base_rate_per_km, min_km_tn, min_km_ap, min_km_other, extra_day_charge, is_active)
VALUES
('SEDAN',  'Sedan 4+1',         4,  13.00, 300, 700, 300, 400.00, TRUE),
('MPV',    'SUV / MPV 6+1',     6,  18.00, 300, 700, 300, 400.00, TRUE),
('INNOVA', 'Innova Crysta 7+1', 7,  22.00, 300, 700, 300, 700.00, TRUE)
ON CONFLICT (vehicle_type) DO NOTHING;

-- Super Admin User (Password: Admin@123)
INSERT INTO users (id, name, phone, email, password_hash, role, status)
VALUES (1, 'Super Admin', '9999999999', 'admin@cabpro.in', '$2b$10$QgiwQW8FQBUcgGE2/2Ra5.qJPAoKNH5aTubNVitL2i1RFbHeNmiz2', 'ADMIN', 'ACTIVE')
ON CONFLICT (phone) DO NOTHING;
