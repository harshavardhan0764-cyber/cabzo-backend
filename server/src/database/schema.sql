-- CabPro Full Database Schema
-- MySQL 8.0
-- Run: mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS cabpro_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cabpro_db;

-- ─── Customers (Customer records & profile) ──────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(150) NOT NULL DEFAULT 'Valued Customer',
  mobile_number VARCHAR(20) NOT NULL UNIQUE,
  email         VARCHAR(100) UNIQUE,
  address       TEXT,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_cust_mobile (mobile_number)
);

-- ─── Users (Auth table for all roles) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100),
  phone       VARCHAR(20) UNIQUE,
  email       VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255),
  role        ENUM('CUSTOMER', 'DRIVER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
  status      ENUM('ACTIVE', 'INACTIVE', 'BANNED') DEFAULT 'ACTIVE',
  profile_photo VARCHAR(500),
  address     TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_phone (phone),
  INDEX idx_role (role),
  INDEX idx_status (status)
);

-- ─── Customer Profiles ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_profiles (
  user_id     INT PRIMARY KEY,
  total_bookings INT DEFAULT 0,
  completed_bookings INT DEFAULT 0,
  cancelled_bookings INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0.00,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── Driver Profiles ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_profiles (
  user_id             INT PRIMARY KEY,
  license_number      VARCHAR(50) UNIQUE NOT NULL,
  license_expiry      DATE,
  vehicle_model       VARCHAR(100) NOT NULL,
  vehicle_type        ENUM('SEDAN', 'MPV', 'INNOVA') NOT NULL,
  vehicle_number      VARCHAR(20) UNIQUE NOT NULL,
  vehicle_color       VARCHAR(50),
  vehicle_year        YEAR,
  availability_status ENUM('AVAILABLE', 'BUSY', 'OFFLINE') DEFAULT 'OFFLINE',
  current_lat         DECIMAL(10,8),
  current_lng         DECIMAL(11,8),
  rating              DECIMAL(3,2) DEFAULT 5.00,
  total_trips         INT DEFAULT 0,
  total_earnings      DECIMAL(12,2) DEFAULT 0.00,
  documents_verified  BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ─── OTP Verifications ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_verifications (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  mobile_number VARCHAR(20) NOT NULL,
  otp_hash      VARCHAR(255) NOT NULL,
  attempt_count INT DEFAULT 0,
  verified      BOOLEAN DEFAULT FALSE,
  expires_at    DATETIME NOT NULL,
  is_used       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_phone_otp (mobile_number),
  INDEX idx_expires (expires_at)
);

-- ─── Pricing Rules (Admin-configurable) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS pricing_rules (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_type        ENUM('SEDAN', 'MPV', 'INNOVA') NOT NULL UNIQUE,
  vehicle_label       VARCHAR(50) NOT NULL,
  capacity            INT NOT NULL,
  base_rate_per_km    DECIMAL(10,2) NOT NULL,
  min_km_tn           INT NOT NULL DEFAULT 300,
  min_km_ap           INT NOT NULL DEFAULT 700,
  min_km_other        INT NOT NULL DEFAULT 300,
  extra_day_charge    DECIMAL(10,2) NOT NULL DEFAULT 400.00,
  is_active           BOOLEAN DEFAULT TRUE,
  updated_by          INT,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Bookings ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id                  VARCHAR(36) PRIMARY KEY,
  customer_id         INT NOT NULL,
  driver_id           INT,
  pickup_location     VARCHAR(500) NOT NULL,
  drop_location       VARCHAR(500) NOT NULL,
  pickup_lat          DECIMAL(10,8),
  pickup_lng          DECIMAL(11,8),
  drop_lat            DECIMAL(10,8),
  drop_lng            DECIMAL(11,8),
  pickup_datetime     DATETIME NOT NULL,
  return_datetime     DATETIME,
  vehicle_type        ENUM('SEDAN', 'MPV', 'INNOVA') NOT NULL,
  passengers          INT DEFAULT 1,
  distance_km         DECIMAL(10,2) NOT NULL,
  estimated_days      INT NOT NULL DEFAULT 1,
  destination_state   ENUM('TN', 'AP', 'OTHER') NOT NULL DEFAULT 'TN',
  base_fare           DECIMAL(10,2) NOT NULL,
  extra_day_charge    DECIMAL(10,2) DEFAULT 0.00,
  total_fare          DECIMAL(10,2) NOT NULL,
  advance_amount      DECIMAL(10,2) NOT NULL,
  balance_amount      DECIMAL(10,2) NOT NULL,
  payment_status      ENUM('PENDING', 'ADVANCE_PAID', 'FULLY_PAID', 'REFUNDED') DEFAULT 'PENDING',
  booking_status      ENUM('PAYMENT_PENDING','BOOKING_CONFIRMED','DRIVER_SEARCHING','DRIVER_ASSIGNED','TRIP_STARTED','TRIP_COMPLETED','CANCELLED') DEFAULT 'PAYMENT_PENDING',
  special_instructions TEXT,
  luggage_info        VARCHAR(500),
  cancellation_reason TEXT,
  rate_per_km         DECIMAL(10,2) NOT NULL,
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (driver_id) REFERENCES users(id),
  INDEX idx_customer (customer_id),
  INDEX idx_driver (driver_id),
  INDEX idx_status (booking_status),
  INDEX idx_payment_status (payment_status),
  INDEX idx_pickup_date (pickup_datetime)
);

-- ─── Booking Status History (Audit Trail) ────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  booking_id  VARCHAR(36) NOT NULL,
  old_status  VARCHAR(50),
  new_status  VARCHAR(50) NOT NULL,
  changed_by  INT,
  notes       TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_booking_history (booking_id)
);

-- ─── Driver Assignments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_assignments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  booking_id  VARCHAR(36) NOT NULL,
  driver_id   INT NOT NULL,
  assigned_by INT,
  action      ENUM('ASSIGNED', 'ACCEPTED', 'REJECTED') NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  FOREIGN KEY (driver_id) REFERENCES users(id),
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ─── Payments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id              VARCHAR(36) PRIMARY KEY,
  booking_id      VARCHAR(36) NOT NULL,
  user_id         INT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  payment_type    ENUM('ADVANCE', 'FINAL', 'REFUND') NOT NULL,
  status          ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED') DEFAULT 'PENDING',
  transaction_id  VARCHAR(200),
  gateway_order_id VARCHAR(200),
  gateway_payment_id VARCHAR(200),
  payment_method  VARCHAR(100),
  notes           TEXT,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booking_id) REFERENCES bookings(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_booking_payment (booking_id),
  INDEX idx_user_payment (user_id),
  INDEX idx_status_payment (status)
);

-- ─── Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        ENUM('BOOKING','PAYMENT','DRIVER','TRIP','SYSTEM','OTP') DEFAULT 'SYSTEM',
  booking_id  VARCHAR(36),
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_notif (user_id),
  INDEX idx_unread (user_id, is_read)
);

-- ─── Refresh Tokens ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token_hash)
);
