# How-To Guide - AeroPunchin

This document provides recipes for standard development, operations, and deployment routines.

## Development Tasks

### Running the App Locally (Wrangler Proxy + Vite HMR)
Start the integrated local dev proxy:
```bash
npm run dev
```
Wrangler will launch on port 3000 and proxy Vite HMR server on port 3001. Open [http://localhost:3000](http://localhost:3000).

### Type Checking & Linting
Run compilation checks before committing code:
```bash
npm run lint
```

### Debugging Wrangler 500 Errors
If you see `POST /api/turso 500` or `WebSocket 101` errors during `npm run dev`:
1. Confirm `.env` has `VITE_TURSO_DATABASE_URL` and `VITE_TURSO_AUTH_TOKEN` set.
2. Confirm the dev script uses `--proxy=http://127.0.0.1:3001` (not just `--proxy=3001`).
3. Kill any stray Vite processes on port 3001 and re-run `npm run dev`.

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

## Cloudflare Pages Deployment

### Deploying Serverless Functions
To build the static frontend bundle and deploy to Cloudflare Pages (with serverless functions in `functions/` automatically compiled):
```bash
npm run build
npx wrangler pages deploy dist --project-name=aeropunchin
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
