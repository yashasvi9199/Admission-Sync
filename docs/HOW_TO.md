# How-To Guide - AeroPunchin

This document provides recipes for standard development, operations, and deployment routines.

## Development Tasks

### Running the App Locally
Start the local server at port 3000:
```bash
npm run dev
```

### Type Checking & Linting
Run compilation checks before committing code:
```bash
npm run lint
```

## Database Operations

### Resetting Simulated Local DB
To wipe active states, usernames, and check-in logs, clear the browser local storage:
1. Open Chrome DevTools (`F12`).
2. Navigate to **Application > Local Storage**.
3. Right-click and choose **Clear**.
4. Reload the page.

### Deploying the Database to Turso
Create a database and load schema:
```bash
turso db create aeropunchin-db
turso db shell aeropunchin-db < docs/DATABASE.sql
```

## Mobile Configurations

### Adding Native Platforms
Add Capacitor platforms (requires Android Studio / Xcode installed):
```bash
npx cap add android
npx cap add ios
```

### Syncing Web Bundles to Native
Sync web compilation assets to the native capacitor directory:
```bash
npm run build
npx cap sync
```
