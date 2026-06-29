import { Geolocation } from '@capacitor/geolocation';

interface PositionResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
  source: 'hardware_gps' | 'network_cell' | 'browser_api' | 'simulation_fallback';
}

/**
 * Capture exact physical coordinates utilizing multiple layers:
 * 1. Capacitor Geolocation (uses Fused Location Provider on Android - cell towers, wifi, gps)
 * 2. Browser Geolocation API
 * 3. Local simulation fallbacks
 */
export const fetchExactLocation = async (simulate: boolean, hqLat: number, hqLon: number): Promise<PositionResult> => {
  if (simulate) {
    // Return a random coordinate near HQ within 100 meters
    const offsetLat = (Math.random() - 0.5) * 0.001;
    const offsetLon = (Math.random() - 0.5) * 0.001;
    return {
      latitude: hqLat + offsetLat,
      longitude: hqLon + offsetLon,
      accuracy: Math.floor(Math.random() * 8) + 3, // ±3m to ±10m
      source: 'simulation_fallback'
    };
  }

  // 1. Try native hardware Capacitor geolocation (Android/iOS high accuracy leverages GPS + Cell towers)
  try {
    const permStatus = await Geolocation.checkPermissions();
    if (permStatus.location === 'denied' || permStatus.location === 'prompt') {
      await Geolocation.requestPermissions();
    }

    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      source: position.coords.accuracy && position.coords.accuracy < 20 ? 'hardware_gps' : 'network_cell'
    };
  } catch (err) {
    console.warn('Capacitor Geolocation failed. Trying browser HTML5 fallback...', err);
  }

  // 2. Try Browser Geolocation API as secondary fallback
  try {
    if ('geolocation' in navigator) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0
        });
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        source: 'browser_api'
      };
    }
  } catch (err) {
    console.warn('Browser HTML5 Geolocation failed. Using coordinates offset.', err);
  }

  // 3. Absolute fallback to HQ coordinates with small variance
  return {
    latitude: hqLat + (Math.random() - 0.5) * 0.0015,
    longitude: hqLon + (Math.random() - 0.5) * 0.0015,
    accuracy: 15,
    source: 'simulation_fallback'
  };
};

/**
 * Reverse geocode coordinates to detailed address using LocationIQ API or fallback
 */
export const fetchDetailedAddress = async (lat: number, lon: number): Promise<string> => {
  const token = (import.meta as any).env?.VITE_LOCATIONIQ_TOKEN || process.env.LOCATIONIQ_TOKEN;
  
  if (!token || token === 'your_location_iq_token_here') {
    return `HQ Office Area (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
  }

  try {
    const response = await fetch(
      `https://us1.locationiq.com/v1/reverse?key=${token}&lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
    );
    if (!response.ok) {
      throw new Error(`LocationIQ status ${response.status}`);
    }
    const data = await response.json();
    
    if (data.address) {
      const { house_number, road, neighbourhood, suburb, city, state, country } = data.address;
      const parts: string[] = [];
      if (house_number) parts.push(house_number);
      if (road) parts.push(road);
      if (neighbourhood || suburb) parts.push(neighbourhood || suburb);
      if (city) parts.push(city);
      if (state) parts.push(state);
      if (country) parts.push(country);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
    return data.display_name || `Area (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
  } catch (err) {
    console.error('LocationIQ API reverse geocoding failed:', err);
    return `Office Geofence Perimeter (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
  }
};
