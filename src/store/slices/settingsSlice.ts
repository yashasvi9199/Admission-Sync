import { StateCreator } from 'zustand';
import { AeroPunchinState } from '../useStore';
import { Shift, OfficeSettings } from '../../types';

export interface SettingsSlice {
  shifts: Shift[];
  officeSettings: OfficeSettings;
  createNewShift: (name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  deleteShift: (shiftId: string) => void;
  updateShift: (shiftId: string, name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  updateOfficeSettings: (settings: Partial<OfficeSettings>) => void;
}

const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  id: 'default-office',
  name: 'Jaipur HQ',
  latitude: 26.8461261,
  longitude: 75.7426874,
  geofenceRadius: 100,
  autoPunchOutTime: '00:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
};

export const createSettingsSlice: StateCreator<
  AeroPunchinState,
  [],
  [],
  SettingsSlice
> = (set, get) => ({
  shifts: [],
  officeSettings: DEFAULT_OFFICE_SETTINGS,

  createNewShift: (name, startTime, endTime, gracePeriodMins) => {
    const shifts = get().shifts;
    const newShift: Shift = {
      id: `shift-${crypto.randomUUID().substring(0, 8)}`,
      name,
      startTime,
      endTime,
      gracePeriodMins
    };
    const updated = [...shifts, newShift];
    localStorage.setItem('ap_shifts', JSON.stringify(updated));
    set({ shifts: updated });

    get().executeSql('INSERT OR REPLACE INTO shifts (id, name, start_time, end_time, grace_period_mins) VALUES (?, ?, ?, ?, ?);', [
      newShift.id,
      newShift.name,
      newShift.startTime,
      newShift.endTime,
      newShift.gracePeriodMins
    ]);
  },

  deleteShift: (shiftId) => {
    const updated = get().shifts.filter(s => s.id !== shiftId);
    localStorage.setItem('ap_shifts', JSON.stringify(updated));
    set({ shifts: updated });
    get().executeSql('DELETE FROM shifts WHERE id = ?;', [shiftId]);
  },

  updateShift: (shiftId, name, startTime, endTime, gracePeriodMins) => {
    const updated = get().shifts.map(s => s.id === shiftId ? { ...s, name, startTime, endTime, gracePeriodMins } : s);
    localStorage.setItem('ap_shifts', JSON.stringify(updated));
    set({ shifts: updated });
    get().executeSql('UPDATE shifts SET name = ?, start_time = ?, end_time = ?, grace_period_mins = ? WHERE id = ?;', [
      name,
      startTime,
      endTime,
      gracePeriodMins,
      shiftId
    ]);
  },

  updateOfficeSettings: (settings) => {
    const updated = { ...get().officeSettings, ...settings };
    localStorage.setItem('ap_office_settings', JSON.stringify(updated));
    set({ officeSettings: updated });

    get().executeSql("INSERT OR REPLACE INTO office_settings (id, name, latitude, longitude, geofence_radius, auto_punch_out_time, working_days) VALUES ('default-office', ?, ?, ?, ?, ?, ?);", [
      updated.name,
      updated.latitude,
      updated.longitude,
      updated.geofenceRadius,
      updated.autoPunchOutTime,
      updated.workingDays.join(',')
    ]);
  }
});
