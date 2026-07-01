# Release Ledger

## [v1.2.0] - 2026-06-29
- **Title**: AeroPunchin v1.2.0
- **Wrangler WebSocket 101 error**: Changed `--proxy=3001` to `--proxy=http://127.0.0.1:3001` in the dev script to force IPv4 loopback and prevent Miniflare from attempting WebSocket upgrades on an unresolvable `localhost` address.
- **Cloudflare Functions env var lookup**: `functions/api/turso.ts` now falls back to `VITE_TURSO_DATABASE_URL` / `VITE_TURSO_AUTH_TOKEN` when the non-prefixed variables are absent, matching the secrets exposed in `.env` during local Wrangler dev.
- **Module import path depth violation**: Replaced all `../../types` relative imports (depth > 1) with the `@/src/types` path alias across all components and store slices.
- **Admin Panel cards**: Removed `hover:scale-[1.02]` zoom effect from all four selection cards (Users, Shifts Configs, HQ & Geofencing, Tardiness Visuals) in the Admin Tab grid menu.
- **Custom 12-Hour Time Picker**: Dropped native `<input type="time">` clock inputs in favor of custom drop-down selectors (Hour, Minute, AM/PM) for manual logs and timing preset configurations.
- **Compulsory Passwords Checklist**: Integrated strong password rules validation checkmark list (striking out met criteria: 4+ letters, 1+ number, 1+ special character) and a red cross mismatch indicator for confirm password fields.
- **Admin Password Reset**: Authorized administrators to manually reset their own password or any employee profile password directly from the Admin Panel.
- **Admin Grid Menu layout**: Overhauled the Admin Panel dashboard from cluttered top tabs into a grid of card options (Users, Shifts Configs, HQ & Geofencing, Tardiness Visuals) with full-screen back navigation overlays.
- **Horizontal User Filter row**: Added a list of round employee avatar icons at the top of logs allowing administrators to filter check-in history dynamically.
- **Wrangler serverless proxy**: Proxying the Vite HMR server port inside Wrangler dev server instances (`npm run dev`) so serverless function endpoints function locally.
- **LocationIQ capture trigger**: Placed a blue location-pin geocoder button next to coordinates to georeference using browser GPS.
- **Native Picker wrappers**: Wired all date selection fields to invoke native widgets via `.showPicker()` directly.
- **Floating Sticky Toasts**: Added alert notifications overlayed at the top of the device screen container.
- Refactored `App.tsx` by moving tabs content into subcomponent files under the 300 lines limit.
- Migrated state architecture to Zustand Slice patterns separating offline, authentication, leave records, and timing updates.

## [v1.3.0] - 2026-06-30
- **Title**: AeroPunchin v1.3.0
- **GitHub Release Automation**: Created `.github/workflows/release.yml` and parser script `.github/scripts/release-helper.py` to auto-publish GitHub Releases, push git tags, and update the release ledger when the changelog is updated.
- **Signed APK Release**: Configured Android Gradle build parameters to support secure release signing loaded from gitignored local environment properties.
- **Admin User Filter in Hours**: Integrated employee profile selector bar at the top of the Hours tab for administrators to view and check shift history logs of any user.

## [v1.3.1] - 2026-06-30
- **Title**: AeroPunchin v1.3.1
- **Self-Update Prompting**: Created native `UpdaterPlugin` that automatically prompts the user to download and install new APK updates from GitHub releases directly within the app when a new release is published.
- **Native Shift Reminders**: Integrated native `AppNotificationPlugin` and `AlarmReceiver` broadcast alarms that schedule high-priority daily push notifications reminder alerts for shift punch-in and punch-out.

## [v1.4.0] - 2026-07-01
- **Title**: AeroPunchin v1.4.0
- **Capacitor Native Login**: Corrected environment detection by using `Capacitor.isNativePlatform()` to allow logins on native mobile app builds.
- **Midnight Auto-Punchout Database Sync**: Added database execution queries (`executeSql`) for auto-punchout records to prevent local logs from being overwritten during server synchronizations.
- **Dynamic Shift Hours calculation**: Passed timing presets from store to calculate daily regular/overtime durations dynamically in HoursTab based on user's assigned shift hours rather than a fixed 8 hours.
- **Calendar Logs View**: Replaced flat check-in history feed with a monthly date-grid calendar selector interface supporting date-specific CRUD and multi-record deletions.


