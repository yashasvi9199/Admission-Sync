import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchExactLocation, fetchDetailedAddress } from './geolocation';
import { Geolocation } from '@capacitor/geolocation';

// Mock Capacitor Geolocation
vi.mock('@capacitor/geolocation', () => {
  return {
    Geolocation: {
      checkPermissions: vi.fn(),
      requestPermissions: vi.fn(),
      getCurrentPosition: vi.fn(),
    }
  };
});

describe('fetchExactLocation', () => {
  const hqLat = 40.7128;
  const hqLon = -74.0060;

  let originalNavigatorGeolocation: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Store original to restore later
    originalNavigatorGeolocation = (global as any).navigator?.geolocation;

    if (!(global as any).navigator) {
        (global as any).navigator = {};
    }

    // Default mock implementation for browser API to avoid errors if not explicitly mocked
    const mockGeolocation = {
      getCurrentPosition: vi.fn()
    };

    Object.defineProperty((global as any).navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true
    });
  });

  afterEach(() => {
    if (originalNavigatorGeolocation !== undefined) {
      Object.defineProperty((global as any).navigator, 'geolocation', {
        value: originalNavigatorGeolocation,
        configurable: true
      });
    } else {
      delete (global as any).navigator.geolocation;
    }
  });

  it('should return simulation fallback when simulate is true', async () => {
    const result = await fetchExactLocation(true, hqLat, hqLon);
    expect(result.source).toBe('simulation_fallback');
    expect(Math.abs(result.latitude - hqLat)).toBeLessThan(0.001);
    expect(Math.abs(result.longitude - hqLon)).toBeLessThan(0.001);
    expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('should use hardware_gps when Capacitor Geolocation succeeds with high accuracy (< 20)', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: { latitude: 10, longitude: 20, accuracy: 15, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: 123
    });

    const result = await fetchExactLocation(false, hqLat, hqLon);
    expect(result.source).toBe('hardware_gps');
    expect(result.latitude).toBe(10);
    expect(result.longitude).toBe(20);
    expect(result.accuracy).toBe(15);
  });

  it('should use network_cell when Capacitor Geolocation succeeds with low accuracy (>= 20)', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: { latitude: 10, longitude: 20, accuracy: 25, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: 123
    });

    const result = await fetchExactLocation(false, hqLat, hqLon);
    expect(result.source).toBe('network_cell');
    expect(result.latitude).toBe(10);
    expect(result.longitude).toBe(20);
    expect(result.accuracy).toBe(25);
  });

  it('should request permissions if checkPermissions returns denied', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'denied', coarseLocation: 'denied' });
    vi.mocked(Geolocation.requestPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockResolvedValue({
      coords: { latitude: 10, longitude: 20, accuracy: 15, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
      timestamp: 123
    });

    await fetchExactLocation(false, hqLat, hqLon);
    expect(Geolocation.requestPermissions).toHaveBeenCalled();
  });

  it('should fallback to browser API if Capacitor Geolocation throws', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('Capacitor failed'));

    const mockGetCurrentPosition = vi.fn((successCb, errorCb, options) => {
      successCb({
        coords: { latitude: 30, longitude: 40, accuracy: 50 },
        timestamp: 456
      });
    });

    Object.defineProperty((global as any).navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true
    });

    const result = await fetchExactLocation(false, hqLat, hqLon);
    expect(result.source).toBe('browser_api');
    expect(result.latitude).toBe(30);
    expect(result.longitude).toBe(40);
    expect(result.accuracy).toBe(50);
  });

  it('should fallback to simulation if both Capacitor and Browser APIs throw', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('Capacitor failed'));

    const mockGetCurrentPosition = vi.fn((successCb, errorCb, options) => {
      errorCb(new Error('Browser failed'));
    });

    Object.defineProperty((global as any).navigator, 'geolocation', {
      value: { getCurrentPosition: mockGetCurrentPosition },
      configurable: true
    });

    const result = await fetchExactLocation(false, hqLat, hqLon);
    expect(result.source).toBe('simulation_fallback');
    // Math.random() - 0.5 can be up to ±0.5, so 0.5 * 0.0015 = 0.00075, which is < 0.0015
    expect(Math.abs(result.latitude - hqLat)).toBeLessThan(0.0015);
    expect(Math.abs(result.longitude - hqLon)).toBeLessThan(0.0015);
    expect(result.accuracy).toBe(15);
  });

  it('should fallback to simulation if navigator.geolocation is not available', async () => {
    vi.mocked(Geolocation.checkPermissions).mockResolvedValue({ location: 'granted', coarseLocation: 'granted' });
    vi.mocked(Geolocation.getCurrentPosition).mockRejectedValue(new Error('Capacitor failed'));

    delete (global as any).navigator.geolocation;

    const result = await fetchExactLocation(false, hqLat, hqLon);
    expect(result.source).toBe('simulation_fallback');
  });
});

describe('fetchDetailedAddress', () => {
  const mockLat = 40.7128;
  const mockLon = -74.0060;

  const originalProcessEnv = process.env;
  const originalImportMeta = import.meta;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    // Default mock implementation to avoid errors in tests that don't need it
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ display_name: 'Mocked Address' }),
    });

    // Reset env vars before each test
    process.env = { ...originalProcessEnv };
    process.env.LOCATIONIQ_TOKEN = '';

    (import.meta as any).env = { VITE_LOCATIONIQ_TOKEN: '' };
  });

  afterEach(() => {
    vi.resetAllMocks();
    process.env = originalProcessEnv;
    (import.meta as any).env = originalImportMeta.env;
  });

  it('should return default HQ Office Area if LocationIQ token is missing or default', async () => {
    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(result).toBe(`HQ Office Area (${mockLat.toFixed(5)}, ${mockLon.toFixed(5)})`);
    expect(global.fetch).not.toHaveBeenCalled();

    process.env.LOCATIONIQ_TOKEN = 'your_location_iq_token_here';
    const result2 = await fetchDetailedAddress(mockLat, mockLon);
    expect(result2).toBe(`HQ Office Area (${mockLat.toFixed(5)}, ${mockLon.toFixed(5)})`);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should call LocationIQ API and return formatted address', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    const mockAddress = {
      house_number: '123',
      road: 'Main St',
      city: 'New York',
      state: 'NY',
      country: 'USA'
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ address: mockAddress }),
    });

    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(global.fetch).toHaveBeenCalledWith(
      `https://us1.locationiq.com/v1/reverse?key=valid_token&lat=${mockLat}&lon=${mockLon}&format=json&zoom=18&addressdetails=1`
    );
    expect(result).toBe('123, Main St, New York, NY, USA');
  });

  it('should return display_name if address details are missing', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ display_name: 'Fallback Display Name' }),
    });

    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(result).toBe('Fallback Display Name');
  });

  it('should return coordinates fallback if address and display_name are missing', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({}),
    });

    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(result).toBe(`Area (${mockLat.toFixed(5)}, ${mockLon.toFixed(5)})`);
  });

  it('should return Office Geofence Perimeter if fetch fails', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(result).toBe(`Office Geofence Perimeter (${mockLat.toFixed(5)}, ${mockLon.toFixed(5)})`);
  });

  it('should return Office Geofence Perimeter if API response is not ok', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401
    });

    const result = await fetchDetailedAddress(mockLat, mockLon);
    expect(result).toBe(`Office Geofence Perimeter (${mockLat.toFixed(5)}, ${mockLon.toFixed(5)})`);
  });
});
