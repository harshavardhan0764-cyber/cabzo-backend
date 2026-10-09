-- CabPro Database Seed Data
-- Run AFTER schema.sql
-- mysql -u root -p cabpro_db < seed.sql

USE cabpro_db;

-- ─── Admin User ────────────────────────────────────────────────────────────
-- Default: admin@cabpro.in / Admin@123
INSERT IGNORE INTO users (id, name, phone, email, password_hash, role, status) VALUES
(1, 'Super Admin', '9999999999', 'admin@cabpro.in', '$2b$10$QgiwQW8FQBUcgGE2/2Ra5.qJPAoKNH5aTubNVitL2i1RFbHeNmiz2', 'ADMIN', 'ACTIVE');

-- ─── Sample Customers ──────────────────────────────────────────────────────
INSERT IGNORE INTO users (id, name, phone, email, role, status) VALUES
(2, 'Ravi Kumar', '9876543210', 'ravi.kumar@gmail.com', 'CUSTOMER', 'ACTIVE'),
(3, 'Priya Sharma', '9845012345', 'priya.sharma@gmail.com', 'CUSTOMER', 'ACTIVE'),
(4, 'Arun Babu', '9731234567', 'arun.babu@gmail.com', 'CUSTOMER', 'ACTIVE');

INSERT IGNORE INTO customer_profiles (user_id, total_bookings, completed_bookings, cancelled_bookings, total_spent) VALUES
(2, 5, 4, 1, 18750.00),
(3, 2, 2, 0, 7200.00),
(4, 1, 0, 0, 0.00);

-- ─── Sample Drivers ────────────────────────────────────────────────────────
INSERT IGNORE INTO users (id, name, phone, email, role, status) VALUES
(5, 'Murugan S', '9123456789', 'murugan.s@driver.cabpro.in', 'DRIVER', 'ACTIVE'),
(6, 'Senthil Kumar', '9234567890', 'senthil.k@driver.cabpro.in', 'DRIVER', 'ACTIVE'),
(7, 'Balasubramanian R', '9345678901', 'bala.r@driver.cabpro.in', 'DRIVER', 'ACTIVE');

INSERT IGNORE INTO driver_profiles 
(user_id, license_number, license_expiry, vehicle_model, vehicle_type, vehicle_number, vehicle_color, vehicle_year, availability_status, rating, total_trips, documents_verified) VALUES
(5, 'TN1219950012345', '2028-06-30', 'Toyota Etios', 'SEDAN', 'TN 01 AB 1234', 'White', 2022, 'AVAILABLE', 4.80, 142, TRUE),
(6, 'TN0720000056789', '2027-12-31', 'Maruti Suzuki Ertiga', 'MPV', 'TN 09 CD 5678', 'Silver', 2023, 'AVAILABLE', 4.90, 98, TRUE),
(7, 'TN1220050098765', '2029-03-15', 'Toyota Innova Crysta', 'INNOVA', 'TN 22 EF 9012', 'Pearl White', 2021, 'OFFLINE', 4.70, 215, TRUE);

-- ─── Pricing Rules (Admin-configurable) ────────────────────────────────────
INSERT IGNORE INTO pricing_rules 
(vehicle_type, vehicle_label, capacity, base_rate_per_km, min_km_tn, min_km_ap, min_km_other, extra_day_charge, is_active, updated_by) VALUES
('SEDAN',  'Sedan 4+1',         4,  13.00, 300, 700, 300, 400.00, TRUE, 1),
('MPV',    'SUV / MPV 6+1',     6,  18.00, 300, 700, 300, 400.00, TRUE, 1),
('INNOVA', 'Innova Crysta 7+1', 7,  22.00, 300, 700, 300, 700.00, TRUE, 1);

-- ─── Welcome Notifications ──────────────────────────────────────────────────
INSERT IGNORE INTO notifications (user_id, title, message, type) VALUES
(2, 'Welcome to CabPro!', 'Your account is verified. Book your first outstation trip today.', 'SYSTEM'),
(3, 'Welcome to CabPro!', 'Your account is verified. Book your first outstation trip today.', 'SYSTEM'),
(5, 'Driver Account Activated', 'Your driver profile is verified. Go online to start accepting rides.', 'SYSTEM'),
(6, 'Driver Account Activated', 'Your driver profile is verified. Go online to start accepting rides.', 'SYSTEM');
