import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchDetailedAddress } from './geolocation';

describe('fetchDetailedAddress', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
    // suppress console.error for clean test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should return HQ Office Area if token is missing', async () => {
    delete process.env.LOCATIONIQ_TOKEN;
    const result = await fetchDetailedAddress(40.7128, -74.0060);
    expect(result).toBe('HQ Office Area (40.71280, -74.00600)');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should return successful address when fetch is OK', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    const mockData = {
      address: {
        house_number: '123',
        road: 'Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA'
      }
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockData
    });

    const result = await fetchDetailedAddress(40.7128, -74.0060);
    expect(result).toBe('123, Main St, New York, NY, USA');
  });

  it('should fallback to Office Geofence Perimeter on non-200 response', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500
    });

    const result = await fetchDetailedAddress(40.7128, -74.0060);
    expect(result).toBe('Office Geofence Perimeter (40.71280, -74.00600)');
    expect(console.error).toHaveBeenCalled();
  });

  it('should fallback to Office Geofence Perimeter on fetch error', async () => {
    process.env.LOCATIONIQ_TOKEN = 'valid_token';
    (global.fetch as any).mockRejectedValue(new Error('Network failure'));

    const result = await fetchDetailedAddress(40.7128, -74.0060);
    expect(result).toBe('Office Geofence Perimeter (40.71280, -74.00600)');
    expect(console.error).toHaveBeenCalled();
  });
});
