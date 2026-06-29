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
3. Initialize the development environment:
   ```bash
   npm run dev
   ```

## 4. Environment Configuration
Create a `.env` file in the project root:
```env
LOCATIONIQ_TOKEN="your_location_iq_token_here"
```
*Note: A mock/simulated GPS coordinates mode is enabled in the UI for local sandboxed testing without real tokens.*

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
To start the local Vite development server:
```bash
npm run dev
```
The application will launch at [http://localhost:3000](http://localhost:3000).

## 7. Account Creation Flow
1. Select the **Register** link on the login screen.
2. Enter your **First Name** and **Last Name**.
3. Select your core role (User, Sales, HR, etc.).
4. The system automatically creates a username: `first letter of second name + first 4 letters of first name` (e.g. `djohn` for John Doe).
5. The very first user created registers as an **Admin** automatically. All subsequent profiles register as standard **User** profiles.

## 8. Common Tasks & Operations
- **Log Attendance**: Pull or click the cord in the lamp stage to clock in or out.
- **Track Breaks**: While clocked in, choose Lunch, Coffee, or Personal break. Toggle again to end the break.
- **File Leaves**: Navigate to the **Leaves** tab, fill in the date range and reason, and submit.
- **Approve Leaves**: Log in as Admin, navigate to **Admin settings > Leaves**, and select Approve or Reject.
- **Export Data**: Log in as Admin, select Roster tab, and click **Export CSV** or **Export PDF/Print**.

## 9. Mobile App Integration
This project is configured with Capacitor.
- For Android build compilation:
  ```bash
  npx cap sync
  npx cap open android
  ```

## 10. Troubleshooting & Syncing
- **Offline Syncing**: When offline, a red banner appears. Punches are stored locally in the sync queue. Clicking **Sync Queue** once connection is restored uploads the data.
- **Midnight Auto-Punchout**: If you forget to clock out, the system automatically checks out at 23:59:59 of that day.
