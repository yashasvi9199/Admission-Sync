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
  - Punches and breaks are queued locally in `ap_offline_queue`.
  - When connection is restored, a bulk sync operation updates the Turso/SQLite database.
- **Leave Requests Portal**:
  - Regular staff can file leave requests (Annual, Sick, Casual, Other).
  - Managers can approve or reject requests in real-time.

## Managers & Admin Features

- **Live Roster Dashboard**:
  - Managers get a bird's-eye view of who is currently clocked in, who is on break, and who is absent.
- **CSV & PDF/Print Exporting**:
  - Bulk export tool formatting attendance records for spreadsheet accounting or print-outs.
- **Chronic Tardiness Flagging**:
  - Highlights employees consistently clocking in past their shift grace periods.
- **Shift Timings Editor**:
  - Ability to create and customize shift timings for all users.
- **Timestamp Correction**:
  - Admins can manually edit timestamps in the Logs tab to resolve user errors.

## Automated Logic & Alerts

- **Midnight Auto-Punchout**:
  - Automatically clocks out users who remained clocked in past midnight to keep shift durations accurate.
- **Missing Punch Alerts**:
  - Alerts users who have been clocked in for more than 9 hours to clock out immediately.
- **Pre-Shift Reminders**:
  - Sends notifications 15 minutes before the employee's scheduled shift start.
