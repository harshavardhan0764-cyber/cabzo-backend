-- OTP Migration: update otp_verifications table to match new auth system
-- Run this if you already have the DB from schema.sql

USE cabpro_db;

-- Drop old 'otps' table if it exists (old schema used this name)
DROP TABLE IF EXISTS otps;

-- Recreate otp_verifications with all required columns
CREATE TABLE IF NOT EXISTS otp_verifications (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  mobile_number  VARCHAR(15) NOT NULL,
  otp_hash       VARCHAR(255) NOT NULL,
  expires_at     DATETIME NOT NULL,
  attempt_count  INT DEFAULT 0,
  verified       BOOLEAN DEFAULT FALSE,
  is_used        BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_mobile_otp     (mobile_number),
  INDEX idx_otp_expires    (expires_at),
  INDEX idx_otp_active     (mobile_number, is_used)
);

-- Auto-cleanup: scheduled event to purge expired OTPs every hour
-- (Enable MySQL Event Scheduler: SET GLOBAL event_scheduler = ON;)
DROP EVENT IF EXISTS cleanup_expired_otps;
CREATE EVENT IF NOT EXISTS cleanup_expired_otps
  ON SCHEDULE EVERY 1 HOUR
  DO
    DELETE FROM otp_verifications WHERE expires_at < NOW() - INTERVAL 1 HOUR;
