# AeroPunchin 🕰️

AeroPunchin is a premium, mobile-first shift attendance and productivity management platform designed for modern corporate teams. Built around an interactive Scandinavian-minimalist standing floor lamp UI, it merges elegant ambient designs with robust offline-first synchronization, role-based privileges, leave portals, break counters, and manager dashboards.

---

## 🏗️ Architecture & Core Concepts

AeroPunchin operates as a hybrid client-side web application capable of running entirely offline:
1. **Interactive UI Thread**: Tapping the cord of the floor lamp toggles the user's shift. The ambient lighting system cascades dynamically based on state.
2. **Local DB Engine (`src/db/localDb.ts`)**: Simulates a relational SQL database utilizing `localStorage` schemas. Handles auto-username generation, shift timing presets, and break/leave transactions.
3. **Offline Sync Queue**: Operations executed while offline are queued in memory. On connection recovery, they are bulk synced and saved to the master database.
4. **Role-Based Access Control**:
   - **Sales**: Can clock-in/out from anywhere, bypassing the geofence validations.
   - **Admin/Manager**: Accesses dashboard subtabs (Live Roster, Shift Presets, Tardiness Flagging, Leave Requests, and CSV/PDF Data Exporters) and can edit attendance timestamps.
   - **HR/Developer/User**: Constrained by the active office geofence (100m default), accesses hours summary, break status toggles, and leave request filing.

---

## 📁 Repository Structure

All documentation and structural schemas reside in the `docs/` folder:
- **[DATABASE.sql](./docs/DATABASE.sql)**: Complete SQLite/libSQL setup queries compatible with Turso.
- **[FEATURES.md](./docs/FEATURES.md)**: Index of all active user and administrator features.
- **[GUIDE.md](./docs/GUIDE.md)**: Onboarding setup manual from zero.
- **[HOW_TO.md](./docs/HOW_TO.md)**: Actionable recipes for compilation, cleaning, and database hosting.
- **[CHANGELOG.md](./docs/CHANGELOG.md)**: Chronological list of version releases and updates.

---

## 🚀 Getting Started

### Prerequisites
Ensure you have [Node.js](https://nodejs.org/) (v18.0.0+) installed on your machine.

### Installation
1. Clone this repository:
   ```bash
   git clone <repo-url>
   cd Admission-Sync
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Copy environment sample:
   ```bash
   cp .env.example .env
   ```
   *Note: If `LOCATIONIQ_TOKEN` is missing, the application defaults to safe fallback simulated coordinates.*

### Run Locally
Launch the Vite development environment:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Verification & Building
Run TypeScript checkups:
```bash
npm run lint
```
Build static production build:
```bash
npm run build
```
Sync assets with Capacitor:
```bash
npx cap sync
```
