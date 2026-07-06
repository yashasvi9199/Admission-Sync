import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getStoredShifts } from './storage';

describe('storage', () => {
  describe('getStoredShifts', () => {
    beforeEach(() => {
      // Mock localStorage
      const store: Record<string, string> = {};
      const mockStorage = {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          store[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete store[key];
        }),
        clear: vi.fn(() => {
          Object.keys(store).forEach((key) => delete store[key]);
        }),
        length: 0,
        key: vi.fn(() => null),
      };
      vi.stubGlobal('localStorage', mockStorage);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('should return DEFAULT_SHIFTS and set them in localStorage if not present', () => {
      const shifts = getStoredShifts();
      expect(shifts.length).toBe(2);
      expect(shifts[0].id).toBe('shift-morning');
      expect(localStorage.getItem).toHaveBeenCalledWith('ap_shifts');
      expect(localStorage.setItem).toHaveBeenCalledWith('ap_shifts', expect.any(String));
      expect(JSON.parse(localStorage.getItem('ap_shifts')!)).toEqual(shifts);
    });

    it('should return parsed shifts from localStorage if present', () => {
      const mockShifts = [{ id: 'test-shift', name: 'Test Shift', startTime: '10:00', endTime: '18:00', gracePeriodMins: 30 }];
      localStorage.setItem('ap_shifts', JSON.stringify(mockShifts));

      const shifts = getStoredShifts();

      expect(shifts).toEqual(mockShifts);
      expect(localStorage.getItem).toHaveBeenCalledWith('ap_shifts');
      expect(localStorage.setItem).toHaveBeenCalledTimes(1); // Only called in setup
    });
  });
});
