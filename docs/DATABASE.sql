-- -- ============================================================
-- -- Date: 2026-06-29
-- -- Time: 14:40 IST
-- -- Feature: aero-punchin-db-setup
-- -- Type: SCHEMA (Turso/SQLite)
-- -- Notes: Initialize tables, triggers, and views for Turso/SQLite
-- -- ============================================================
-- 
-- -- Create Shifts table
-- CREATE TABLE IF NOT EXISTS shifts (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     start_time TEXT NOT NULL, -- Stored as "HH:MM"
--     end_time TEXT NOT NULL, -- Stored as "HH:MM"
--     grace_period_mins INTEGER DEFAULT 15,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Users table
-- CREATE TABLE IF NOT EXISTS users (
--     id TEXT PRIMARY KEY,
--     username TEXT UNIQUE NOT NULL,
--     first_name TEXT NOT NULL,
--     last_name TEXT NOT NULL,
--     role TEXT DEFAULT 'User' NOT NULL, -- 'Admin', 'Sales', 'Developer', 'HR', 'Manager', 'User'
--     shift_id TEXT REFERENCES shifts(id) ON DELETE SET NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Attendance Records table
-- CREATE TABLE IF NOT EXISTS attendance_records (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
--     timestamp INTEGER NOT NULL, -- Stored as epoch milliseconds
--     latitude REAL NOT NULL,
--     longitude REAL NOT NULL,
--     address TEXT,
--     distance_from_office REAL,
--     is_remote INTEGER DEFAULT 0 NOT NULL, -- 0 for false, 1 for true
--     accuracy REAL,
--     synced INTEGER DEFAULT 1 NOT NULL, -- 0 for false, 1 for true
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Breaks table
-- CREATE TABLE IF NOT EXISTS breaks (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT CHECK (type IN ('lunch', 'coffee', 'personal')) NOT NULL,
--     start_time INTEGER NOT NULL, -- Epoch milliseconds
--     end_time INTEGER, -- Epoch milliseconds
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Leave Requests table
-- CREATE TABLE IF NOT EXISTS leave_requests (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT CHECK (type IN ('annual', 'sick', 'casual', 'other')) NOT NULL,
--     start_date TEXT NOT NULL, -- ISO Date "YYYY-MM-DD"
--     end_date TEXT NOT NULL, -- ISO Date "YYYY-MM-DD"
--     reason TEXT NOT NULL,
--     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
--     approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Indexes for performance optimizations
-- CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
-- CREATE INDEX IF NOT EXISTS idx_breaks_user ON breaks(user_id);
-- CREATE INDEX IF NOT EXISTS idx_leaves_user ON leave_requests(user_id);
-- 
-- -- Views for Manager Reporting
-- DROP VIEW IF EXISTS view_live_roster;
-- CREATE VIEW view_live_roster AS
-- SELECT 
--     u.id as user_id,
--     u.username,
--     u.first_name,
--     u.last_name,
--     u.role,
--     (SELECT ar.type FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action,
--     (SELECT ar.timestamp FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action_time,
--     (SELECT ar.is_remote FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as is_remote,
--     (SELECT b.type FROM breaks b WHERE b.user_id = u.id AND b.end_time IS NULL ORDER BY b.start_time DESC LIMIT 1) as active_break
-- FROM users u;
-- 
-- -- Seed Data for Shifts
-- INSERT OR IGNORE INTO shifts (id, name, start_time, end_time, grace_period_mins)
-- VALUES 
-- ('shift-morning', 'Morning Shift', '09:00', '17:00', 15),
-- ('shift-night', 'Night Shift', '22:00', '06:00', 15);

-- -- ============================================================
-- -- Date: 2026-06-29
-- -- Time: 17:15 IST
-- -- Feature: aero-punchin-turso-upgrade
-- -- Type: SUPERSEDES
-- -- Notes: Relocate tables to Turso, add office_settings table, and remove leave types
-- -- ============================================================
-- 
-- -- Create Shifts table (Turso SQLite syntax)
-- CREATE TABLE IF NOT EXISTS shifts (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     start_time TEXT NOT NULL, -- "HH:MM" e.g., "09:00"
--     end_time TEXT NOT NULL, -- "HH:MM" e.g., "17:00"
--     grace_period_mins INTEGER DEFAULT 15,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Users table
-- CREATE TABLE IF NOT EXISTS users (
--     id TEXT PRIMARY KEY,
--     username TEXT UNIQUE NOT NULL,
--     first_name TEXT NOT NULL,
--     last_name TEXT NOT NULL,
--     role TEXT DEFAULT 'User' NOT NULL, -- 'Admin', 'Sales', 'Developer', 'HR', 'Manager', 'User'
--     shift_id TEXT REFERENCES shifts(id) ON DELETE SET NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Attendance Records table
-- CREATE TABLE IF NOT EXISTS attendance_records (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
--     timestamp INTEGER NOT NULL, -- Epoch milliseconds
--     latitude REAL NOT NULL,
--     longitude REAL NOT NULL,
--     address TEXT,
--     distance_from_office REAL,
--     is_remote INTEGER DEFAULT 0 NOT NULL, -- 0 for false, 1 for true
--     accuracy REAL,
--     synced INTEGER DEFAULT 1 NOT NULL, -- 0 for false, 1 for true
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Breaks table
-- CREATE TABLE IF NOT EXISTS breaks (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT CHECK (type IN ('lunch', 'coffee', 'personal')) NOT NULL,
--     start_time INTEGER NOT NULL,
--     end_time INTEGER,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Leave Requests table (without type constraints)
-- CREATE TABLE IF NOT EXISTS leave_requests (
--     id TEXT PRIMARY KEY,
--     user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
--     type TEXT DEFAULT 'other' NOT NULL,
--     start_date TEXT NOT NULL, -- ISO Date "YYYY-MM-DD"
--     end_date TEXT NOT NULL, -- ISO Date "YYYY-MM-DD"
--     reason TEXT NOT NULL,
--     status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
--     approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
--     created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Create Office Settings table
-- CREATE TABLE IF NOT EXISTS office_settings (
--     id TEXT PRIMARY KEY,
--     name TEXT NOT NULL,
--     latitude REAL NOT NULL,
--     longitude REAL NOT NULL,
--     geofence_radius REAL NOT NULL,
--     auto_punch_out_time TEXT DEFAULT '00:00' NOT NULL, -- "HH:MM" e.g., "00:00"
--     working_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri' NOT NULL, -- Comma-separated e.g., "Mon,Tue,Wed,Thu,Fri"
--     updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
-- );
-- 
-- -- Indexes for performance optimizations
-- CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
-- CREATE INDEX IF NOT EXISTS idx_breaks_user ON breaks(user_id);
-- CREATE INDEX IF NOT EXISTS idx_leaves_user ON leave_requests(user_id);
-- 
-- -- Upgraded View for Manager Reporting
-- DROP VIEW IF EXISTS view_live_roster;
-- CREATE VIEW view_live_roster AS
-- SELECT 
--     u.id as user_id,
--     u.username,
--     u.first_name,
--     u.last_name,
--     u.role,
--     (SELECT ar.type FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action,
--     (SELECT ar.timestamp FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action_time,
--     (SELECT ar.is_remote FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as is_remote,
--     (SELECT b.type FROM breaks b WHERE b.user_id = u.id AND b.end_time IS NULL ORDER BY b.start_time DESC LIMIT 1) as active_break
-- FROM users u;
-- 
-- -- Seed Data for Shifts
-- INSERT OR IGNORE INTO shifts (id, name, start_time, end_time, grace_period_mins)
-- VALUES 
-- ('shift-morning', 'Morning Shift', '09:00', '17:00', 15),
-- ('shift-night', 'Night Shift', '22:00', '06:00', 15);
-- 
-- -- Seed Data for Office Settings (Default New York HQ)
-- INSERT OR IGNORE INTO office_settings (id, name, latitude, longitude, geofence_radius, auto_punch_out_time, working_days)
-- VALUES
-- ('default-office', 'New York HQ', 40.712800, -74.006000, 100.0, '00:00', 'Mon,Tue,Wed,Thu,Fri');

-- ============================================================
-- Date: 2026-06-29
-- Time: 19:15 IST
-- Feature: user-password-requirement-jaipur-defaults
-- Type: SUPERSEDES
-- Notes: Add password column to users table and set Jaipur HQ coordinates
-- ============================================================

-- Create Shifts table (Turso SQLite syntax)
CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_time TEXT NOT NULL, -- "HH:MM" e.g., "09:00"
    end_time TEXT NOT NULL, -- "HH:MM" e.g., "17:00"
    grace_period_mins INTEGER DEFAULT 15,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Users table with password column
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'User' NOT NULL, -- 'Admin', 'Sales', 'Developer', 'HR', 'Manager', 'User'
    shift_id TEXT REFERENCES shifts(id) ON DELETE SET NULL,
    password TEXT NOT NULL DEFAULT '123456',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Attendance Records table
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('in', 'out')) NOT NULL,
    timestamp INTEGER NOT NULL, -- Epoch milliseconds
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    address TEXT,
    distance_from_office REAL,
    is_remote INTEGER DEFAULT 0 NOT NULL,
    accuracy REAL,
    synced INTEGER DEFAULT 1 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Breaks table
CREATE TABLE IF NOT EXISTS breaks (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('lunch', 'coffee', 'personal')) NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Leave Requests table
CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    type TEXT DEFAULT 'other' NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
    approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create Office Settings table
CREATE TABLE IF NOT EXISTS office_settings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    geofence_radius REAL NOT NULL,
    auto_punch_out_time TEXT DEFAULT '00:00' NOT NULL,
    working_days TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri' NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance_records(user_id);
CREATE INDEX IF NOT EXISTS idx_breaks_user ON breaks(user_id);
CREATE INDEX IF NOT EXISTS idx_leaves_user ON leave_requests(user_id);

-- Upgraded View for Manager Reporting
DROP VIEW IF EXISTS view_live_roster;
CREATE VIEW view_live_roster AS
SELECT 
    u.id as user_id,
    u.username,
    u.first_name,
    u.last_name,
    u.role,
    (SELECT ar.type FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action,
    (SELECT ar.timestamp FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as last_action_time,
    (SELECT ar.is_remote FROM attendance_records ar WHERE ar.user_id = u.id ORDER BY ar.timestamp DESC LIMIT 1) as is_remote,
    (SELECT b.type FROM breaks b WHERE b.user_id = u.id AND b.end_time IS NULL ORDER BY b.start_time DESC LIMIT 1) as active_break
FROM users u;

-- Seed Data for Shifts
INSERT OR IGNORE INTO shifts (id, name, start_time, end_time, grace_period_mins)
VALUES 
('shift-morning', 'Morning Shift', '09:00', '17:00', 15),
('shift-night', 'Night Shift', '22:00', '06:00', 15);

-- Seed Data for Office Settings (Default Jaipur HQ: 26.8461261, 75.7426874)
INSERT OR IGNORE INTO office_settings (id, name, latitude, longitude, geofence_radius, auto_punch_out_time, working_days)
VALUES
('default-office', 'Jaipur HQ', 26.8461261, 75.7426874, 100.0, '00:00', 'Mon,Tue,Wed,Thu,Fri');
