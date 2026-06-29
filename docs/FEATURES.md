# Features Registry - AeroPunchin

Project feature index. For setup and usage instructions, see [GUIDE.md](./GUIDE.md) and [HOW_TO.md](./HOW_TO.md).

## Core User Features

- **CLICK TO CLOCK-IN / CLICK TO CLOCK-OUT**:
  - Interactive standing lamp interface.
  - Tapping/clicking the stage cord triggers shift attendance toggle.
- **Break Tracking**:
  - Toggles for **Lunch**, **Coffee**, and **Personal** breaks.
  - Computes and records active break durations on the database.
- **Offline Syncing**:
  - Allows fully disconnected operation.
  - Punches and breaks are queued locally in local storage.
  - When connection is restored, a bulk sync operation updates the Turso/SQLite database via Pages function.
- **Leave Requests Portal**:
  - Regular staff can file leave requests (Annual, Sick, Casual, Other).
  - Managers can approve or reject requests in real-time.
- **Compulsory Passwords Validation**:
  - User registration and sign-in requires strong password credentials.
  - Live check-list on the registration form checks criteria (4+ letters, 1+ number, 1+ special character) and strikes through met rules.
  - Side-by-side confirm password field validation with visual mismatch indicators (red cross `×`).

## Managers & Admin Features

- **Admin Grid Menu Dashboard**:
  - Redesigned Admin Panel layout utilizing a modern grid dashboard menu (Users, Shifts Configs, HQ & Geofencing, Tardiness Visuals) instead of cluttered top-aligned tabs.
- **Live Roster Dashboard**:
  - Managers get a bird's-eye view of who is currently clocked in, who is on break, and who is absent.
- **CSV & PDF/Print Exporting**:
  - Bulk export tool formatting attendance records for spreadsheet accounting or print-outs.
- **Chronic Tardiness Flagging**:
  - Calendar month-grid checklist highlighting employees consistently clocking in past their shift grace periods.
  - Detailed tardiness inspection cards adapting text visibility themes dynamically based on light/dark modes.
- **Shift Timings Editor**:
  - Ability to create, customize, and delete shift timing presets using a custom 12-hour clock picker.
- **Timestamp Correction**:
  - Admins can manually edit and select timestamps in the Logs feed to resolve user timing errors.
- **Roster Password Reset**:
  - Admins can manually reset passwords for themselves or any other workforce profile.
- **Workforce Logs Avatars Filter**:
  - Row of round employee avatar icons at the top of logs allowing administrators to filter check-in history.

## Automated Logic & Alerts

- **Midnight Auto-Punchout**:
  - Automatically clocks out users who remained clocked in past midnight to keep shift durations accurate.
- **Missing Punch Alerts**:
  - Alerts users who have been clocked in for more than 9 hours to clock out immediately.
- **Pre-Shift Reminders**:
  - Sends notifications 15 minutes before the employee's scheduled shift start.
- **Floating Sticky Toasts**:
  - Visual floating success/error alerts overlayed at the top of the container during punches and updates.
