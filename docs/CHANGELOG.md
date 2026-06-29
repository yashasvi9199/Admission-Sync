# Changelog - AeroPunchin

All notable changes to the **AeroPunchin** project will be documented in this file.

## [1.0.0] - 2026-06-29

### Added
- Created brand-new frontend login and registration screen with dynamic username auto-generation.
- Implemented role-based access control (RBAC) permitting special geofence bypass rules for Sales employees, and hiding/showing admin controls.
- Implemented break tracking for Lunch, Coffee, and Personal breaks with live break indicators.
- Created offline queue manager that stores punch/break records when offline, supporting manual and automatic queue syncing on recovery.
- Added Leave Portal allowing users to request leaves and managers to approve/reject them.
- Implemented overtime calculations (threshold set to 8 hours daily) shown in the Hours tab.
- Integrated Midnight Auto-Punchout to clock out employees who forget to check out.
- Added visual banners for Missing Punch Alert (>9h clocked) and Pre-Shift Reminder (15 mins before shift).
- Enhanced Admin Panel with:
  - Live Roster Dashboard (employee location, active breaks, absentees).
  - Shift Timings Preset Creator.
  - Chronic Tardiness Flagging.
  - CSV & PDF Print Exporters.
- Migrated Database schema to Turso/SQLite compatibility.

### Changed
- Rebranded application from Admission-Sync/PunchLine to **AeroPunchin** in packaging configurations, title bars, and branding elements.
- Renamed "Pull to clock-in" label to "CLICK TO CLOCK-IN".
- Removed staff identity entry boxes, seed demo buttons, geofence scanners, and office geographic presets.
