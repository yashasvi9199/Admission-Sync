# Changelog - AeroPunchin

All notable changes to the **AeroPunchin** project will be documented in this file.

## [1.1.0] - 2026-06-29

### Added
- **Custom 12-Hour Time Picker**: Dropped native `<input type="time">` clock inputs in favor of custom drop-down selectors (Hour, Minute, AM/PM) for manual logs and timing preset configurations.
- **Compulsory Passwords Checklist**: Integrated strong password rules validation checkmark list (striking out met criteria: 4+ letters, 1+ number, 1+ special character) and a red cross mismatch indicator for confirm password fields.
- **Admin Password Reset**: Authorized administrators to manually reset their own password or any employee profile password directly from the Admin Panel.
- **Admin Grid Menu layout**: Overhauled the Admin Panel dashboard from cluttered top tabs into a grid of card options (Users, Shifts Configs, HQ & Geofencing, Tardiness Visuals) with full-screen back navigation overlays.
- **Horizontal User Filter row**: Added a list of round employee avatar icons at the top of logs allowing administrators to filter check-in history dynamically.
- **Wrangler serverless proxy**: Proxying the Vite HMR server port inside Wrangler dev server instances (`npm run dev`) so serverless function endpoints function locally.
- **LocationIQ capture trigger**: Placed a blue location-pin geocoder button next to coordinates to georeference using browser GPS.
- **Native Picker wrappers**: Wired all date selection fields to invoke native widgets via `.showPicker()` directly.
- **Floating Sticky Toasts**: Added alert notifications overlayed at the top of the device screen container.

### Changed
- Refactored `App.tsx` by moving tabs content into subcomponent files under the 300 lines limit.
- Migrated state architecture to Zustand Slice patterns separating offline, authentication, leave records, and timing updates.

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
- Enhanced Admin Panel with Live Roster Dashboard, Shift Timings Preset Creator, Chronic Tardiness Flagging, and CSV/PDF Print Exporters.
- Migrated Database schema to Turso/SQLite compatibility.

### Changed
- Rebranded application from Admission-Sync/PunchLine to **AeroPunchin** in packaging configurations, title bars, and branding elements.
- Renamed "Pull to clock-in" label to "CLICK TO CLOCK-IN".
- Removed staff identity entry boxes, seed demo buttons, geofence scanners, and office geographic presets.
