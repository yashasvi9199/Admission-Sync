# Sync State Tracker

- **Date**: 2026-06-29
- **Core Changes**: Refactored the entire project structure into OOP slices under 300 lines of code. Implemented 12-hour custom selectors, compulsory passwords validations, grid Admin Dashboard, admin password resets, horizontal round avatars list, Wrangler proxy setups, and sticky toast banners. Verified compiles and builds cleanly.
- **Next Immediate Objectives**: Await client interaction/testing on staging and local dev servers.

- **Date**: 2026-07-01
- **Core Changes**: Fixed login in native Capacitor app by using Capacitor.isNativePlatform(). Fixed midnight auto punchout database persistence. Dynamic shift duration support in HoursTab. Replaced logs feed with a monthly calendar-based selector UI for filtering and CRUD logs. Added cache-busting for updates, manual redirect follow logic in Java downloads, and unknown apps install settings prompt.
- **Next Immediate Objectives**: Request user testing of the updater on a device with unknown package installer permissions.
