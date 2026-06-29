import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aeropunchin.app',
  appName: 'AeroPunchin',
  webDir: 'dist',
  plugins: {
    Geolocation: {
      // Future configuration for Geolocation plugins can go here
    }
  }
};

export default config;
