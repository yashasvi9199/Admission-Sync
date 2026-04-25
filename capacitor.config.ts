import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.office.attendance',
  appName: 'Office Attendance',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      // Future configuration for Geolocation plugins can go here
    }
  }
};

export default config;
