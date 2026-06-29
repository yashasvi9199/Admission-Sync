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

## Android APK Builds

### Prerequisites
Ensure the following are installed before running any APK build commands:
- **Java 17+** (required by Gradle): `java -version`
- **Android SDK** with `Build-Tools` and `Platform-Tools`
- `ANDROID_HOME` environment variable pointing to your SDK root (e.g. `/home/<user>/Android/Sdk`)

Add to your `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

After setting `ANDROID_HOME`, create `android/local.properties` (this file is gitignored — every dev must create it locally):
```bash
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties
```

### Fix: `gradlew: Permission Denied`
The Gradle wrapper script must be executable. Run once on a fresh clone:
```bash
chmod +x android/gradlew
```
> **Note**: The `npm run apk` and `npm run debug-apk` scripts already include `chmod +x android/gradlew` automatically, so this is only needed for manual Gradle calls.

---

### Creating a Release Keystore
A keystore is required to sign the release APK for distribution. Generate one with `keytool` (bundled with Java):

```bash
keytool -genkeypair \
  -v \
  -keystore android/app/aeropunchin-release.keystore \
  -alias aeropunchin \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

You will be prompted for:
- **Keystore password** (remember this — you'll need it every build)
- **Key alias password** (can be the same as keystore password)
- **Your name / organization / location** (fill in or press Enter to skip)

> ⚠️ **Keep `aeropunchin-release.keystore` backed up securely.** Losing it means you can never update the same app on the Play Store. It is excluded from `.gitignore` pattern `*.keystore` by a specific exception rule — but do NOT commit it to a public repository.

---

### Configuring Gradle to Sign with the Keystore
Open `android/app/build.gradle` and add a `signingConfigs` block inside `android {}`:

```groovy
android {
    // ... existing config ...

    signingConfigs {
        release {
            storeFile file("aeropunchin-release.keystore")
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "your-keystore-password"
            keyAlias "aeropunchin"
            keyPassword System.getenv("KEY_PASSWORD") ?: "your-key-password"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

> **Tip**: Use environment variables `KEYSTORE_PASSWORD` and `KEY_PASSWORD` instead of hardcoding passwords. Add them to your `.env` or CI secrets.

---

### Building a Release APK
```bash
npm run apk
```
Output APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

### Building a Debug APK
```bash
npm run debug-apk
```
Output APK will be at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing APK to a Connected Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
# or for debug:
adb install android/app/build/outputs/apk/debug/app-debug.apk
```
