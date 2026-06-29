# AeroPunchin Beginner's Guide

This guide is designed to get a new developer or administrator onboarded with **AeroPunchin** from scratch.

## 1. Project Overview
AeroPunchin is a mobile-first shift tracking solution that integrates a clean Scandinavian minimalist lamp design interface with robust features including role privileges, geofence validations, break trackers, leave requests, and data exports.

## 2. Requirements & Dependencies
Before setting up the project, make sure you have installed:
- **Node.js** (v18.0.0 or higher)
- **NPM** (v9.0.0 or higher)
- **libSQL / SQLite** (Turso Database backend)

## 3. Fresh Setup from Zero
Follow these steps to initialize the project locally:
1. Clone this repository to your workspace.
2. Open terminal in the directory and install required npm dependencies:
   ```bash
   npm install
   ```
3. Initialize the development environment (this starts wrangler local dev server and Vite concurrently):
   ```bash
   npm run dev
   ```

## 4. Environment Configuration
Create a `.env` file in the project root by copying the example:
```bash
cp .env.example .env
```

The following variables must be populated in `.env`:
```env
VITE_TURSO_DATABASE_URL="libsql://your-db.turso.io"
VITE_TURSO_AUTH_TOKEN="your-turso-auth-token"
VITE_LOCATIONIQ_TOKEN="your-locationiq-api-key"
VITE_GEMINI_API_KEY="your-gemini-key"
```

> **Note**: The Cloudflare Pages function (`functions/api/turso.ts`) reads these variables with the `VITE_` prefix automatically when running locally via Wrangler. No separate `wrangler.toml` secret mapping is required for dev.

## 5. Turso Database Setup
Deploying to a remote Turso DB:
1. Install Turso CLI:
   ```bash
   curl -sSfL https://get.turso.tech/install.sh | sh
   ```
2. Create a new Turso database:
   ```bash
   turso db create aeropunchin-db
   ```
3. Execute schema queries:
   ```bash
   turso db shell aeropunchin-db < docs/DATABASE.sql
   ```

## 6. Running Project Locally
To start local development with Wrangler Pages functions and Vite proxying:
```bash
npm run dev
```
The proxy dev server will launch at [http://localhost:3000](http://localhost:3000).

## 7. Account Creation Flow
1. Select the **Register Profile** link on the login screen.
2. Enter your **First Name** and **Last Name**.
3. Select your core role (User, Sales, HR, etc.).
4. Assign a password that meets the checklist constraints:
   - At least 4 letters
   - At least 1 number
   - At least 1 special character
5. Re-enter the password in the **Confirm Password** field. If there is a mismatch, a red cross `×` indicator appears.
6. The system automatically creates a username: `first letter of second name + first 4 letters of first name` (e.g. `djohn` for John Doe).
7. The very first user created registers as an **Admin** automatically. All subsequent profiles register as standard **User** profiles.

## 8. Common Tasks & Operations
- **Log Attendance**: Pull or click the cord in the lamp stage to clock in or out.
- **Track Breaks**: While clocked in, choose Lunch, Coffee, or Personal break. Toggle again to end the break.
- **File Leaves**: Navigate to the **Leaves** tab, select dates, description, and submit.
- **Approve Leaves**: Log in as Admin, navigate to **Admin > Users & Profiles**, and inspect or approve/reject leave requests.
- **Export Data**: Log in as Admin, navigate to Users subtab, and click **CSV** or **PDF** reports.
- **Reset Roster Passwords**: Log in as Admin, navigate to Admin > Users, click "Reset Account Password" on any employee card, assign a new password, and click Confirm.

## 9. Mobile App Integration
This project is configured with Capacitor.
- For Android build compilation:
  ```bash
  npx cap sync
  | npx cap open android
  ```

## 10. Troubleshooting & Syncing
- **Offline Syncing**: When offline, a red banner appears. Punches are stored locally in the sync queue. Clicking **Sync Queue** once connection is restored uploads the data.
- **Midnight Auto-Punchout**: If you forget to clock out, the system automatically checks out at the configured time (default 00:00).
- **Wrangler `TypeError: Web Socket request did not return status 101`**: This occurs when Wrangler resolves `localhost` as IPv6 (`::1`) instead of IPv4. The dev script uses `--proxy=http://127.0.0.1:3001` to explicitly force IPv4. Ensure you are running `npm run dev` unchanged.
- **`POST /api/turso 500` in dev**: Verify your `.env` file contains the `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` variables. The Cloudflare Pages function falls back to the `VITE_`-prefixed keys when the un-prefixed `TURSO_*` variables are not set.
- **TypeScript import errors with `../../types`**: All type imports must use the `@/src/types` path alias. Paths with depth > 1 (`../../`) are forbidden per governance rules.


## 11. Database Query Testing Recipes
To verify data consistency and test application features by running queries on your Turso SQLite database, connect to the database shell:
```bash
turso db shell aeropunchin-db
```
Then, execute any of the following queries:

### A. Testing User Privileges & Roster Profiles
```sql
-- Retrieve all registered employees
SELECT id, username, first_name, last_name, role, shift_id, password FROM users;

-- Find all Admin users
SELECT * FROM users WHERE role = 'Admin';
```

### B. Testing Attendance Logs & Geofencing
```sql
-- List attendance history sorted from newest to oldest
SELECT ar.id, u.first_name || ' ' || u.last_name AS name, ar.type, datetime(ar.timestamp/1000, 'unixepoch', 'localtime') AS punch_time, ar.address FROM attendance_records ar JOIN users u ON ar.user_id = u.id ORDER BY ar.timestamp DESC;

-- Identify all remote clock-ins (punched outside the office perimeter)
SELECT * FROM attendance_records WHERE is_remote = 1;
```
