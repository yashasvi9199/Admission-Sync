import { create } from 'zustand';
import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest, OfficeSettings, TursoOfflineAction } from '../types';
import { getStoredUsers, getStoredShifts, getStoredAttendance, getStoredBreaks, getStoredLeaves } from '../db/storage';
import { queryTurso } from '../utils/turso';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createAttendanceSlice, AttendanceSlice } from './slices/attendanceSlice';
import { createLeaveSlice, LeaveSlice } from './slices/leaveSlice';
import { createSettingsSlice, SettingsSlice } from './slices/settingsSlice';
import { createOfflineSlice, OfflineSlice } from './slices/offlineSlice';

export interface AeroPunchinState extends AuthSlice, AttendanceSlice, LeaveSlice, SettingsSlice, OfflineSlice {
  refreshStates: () => void;
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

export const useStore = create<AeroPunchinState>((set, get, ...a) => ({
  ...createOfflineSlice(set, get, ...a),
  ...createAuthSlice(set, get, ...a),
  ...createAttendanceSlice(set, get, ...a),
  ...createLeaveSlice(set, get, ...a),
  ...createSettingsSlice(set, get, ...a),

  refreshStates: async () => {
    const activeUserId = localStorage.getItem('ap_active_user_id');
    const allUsers = getStoredUsers();
    const active = allUsers.find(u => u.id === activeUserId) || null;

    let office = DEFAULT_OFFICE_SETTINGS;
    const savedOffice = localStorage.getItem('ap_office_settings');
    if (savedOffice) {
      try {
        const parsed = JSON.parse(savedOffice);
        office = { ...DEFAULT_OFFICE_SETTINGS, ...parsed };
      } catch (e) {
        console.error('Failed to parse office settings', e);
      }
    } else {
      localStorage.setItem('ap_office_settings', JSON.stringify(DEFAULT_OFFICE_SETTINGS));
    }

    set({
      activeUser: active,
      users: allUsers,
      records: getStoredAttendance(),
      breaks: getStoredBreaks(),
      leaves: getStoredLeaves(),
      shifts: getStoredShifts(),
      officeSettings: office,
      offlineQueue: JSON.parse(localStorage.getItem('ap_offline_queue') || '[]')
    });

    try {
      const [remoteShifts, remoteUsers, remoteRecords, remoteBreaks, remoteLeaves, remoteSettings] = await Promise.all([
        queryTurso<Record<string, any>>('SELECT * FROM shifts;'),
        queryTurso<Record<string, any>>('SELECT * FROM users;'),
        queryTurso<Record<string, any>>('SELECT * FROM attendance_records;'),
        queryTurso<Record<string, any>>('SELECT * FROM breaks;'),
        queryTurso<Record<string, any>>('SELECT * FROM leave_requests;'),
        queryTurso<Record<string, any>>('SELECT * FROM office_settings;')
      ]);

      if (remoteShifts) {
        const mappedShifts = remoteShifts.map((s: Record<string, any>) => ({
          id: s.id,
          name: s.name,
          startTime: s.start_time,
          endTime: s.end_time,
          gracePeriodMins: Number(s.grace_period_mins || 15)
        }));
        localStorage.setItem('ap_shifts', JSON.stringify(mappedShifts));
        set({ shifts: mappedShifts as Shift[] });
      }

      if (remoteUsers) {
        const mappedUsers = remoteUsers.map((u: Record<string, any>) => ({
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          shiftId: u.shift_id,
          password: u.password || '123456',
          createdAt: Number(u.created_at || Date.now())
        }));
        localStorage.setItem('ap_users', JSON.stringify(mappedUsers));
        const updatedActive = mappedUsers.find((u) => u.id === activeUserId) || null;
        set({ users: mappedUsers as User[], activeUser: updatedActive as User | null });
      }

      if (remoteRecords) {
        const mappedRecords = remoteRecords.map((r: Record<string, any>) => ({
          id: r.id,
          userId: r.user_id,
          name: remoteUsers?.find((u: Record<string, any>) => u.id === r.user_id)
            ? `${remoteUsers.find((u: Record<string, any>) => u.id === r.user_id)?.first_name} ${remoteUsers.find((u: Record<string, any>) => u.id === r.user_id)?.last_name}`
            : 'Unknown',
          timestamp: Number(r.timestamp),
          type: r.type,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          address: r.address,
          distanceFromOffice: r.distance_from_office ? Number(r.distance_from_office) : undefined,
          isRemote: Boolean(r.is_remote),
          accuracy: r.accuracy ? Number(r.accuracy) : undefined,
          synced: Boolean(r.synced)
        }));
        localStorage.setItem('ap_attendance', JSON.stringify(mappedRecords));
        set({ records: mappedRecords as AttendanceRecord[] });
      }

      if (remoteBreaks) {
        const mappedBreaks = remoteBreaks.map((b: Record<string, any>) => ({
          id: b.id,
          userId: b.user_id,
          type: b.type,
          startTime: Number(b.start_time),
          endTime: b.end_time ? Number(b.end_time) : null
        }));
        localStorage.setItem('ap_breaks', JSON.stringify(mappedBreaks));
        set({ breaks: mappedBreaks as BreakRecord[] });
      }

      if (remoteLeaves) {
        const mappedLeaves = remoteLeaves.map((l: Record<string, any>) => ({
          id: l.id,
          userId: l.user_id,
          employeeName: remoteUsers?.find((u: Record<string, any>) => u.id === l.user_id)
            ? `${remoteUsers.find((u: Record<string, any>) => u.id === l.user_id)?.first_name} ${remoteUsers.find((u: Record<string, any>) => u.id === l.user_id)?.last_name}`
            : 'Unknown',
          type: l.type,
          startDate: l.start_date,
          endDate: l.end_date,
          reason: l.reason,
          status: l.status,
          approvedBy: l.approved_by,
          createdAt: Number(l.created_at || Date.now())
        }));
        localStorage.setItem('ap_leaves', JSON.stringify(mappedLeaves));
        set({ leaves: mappedLeaves });
      }

      if (remoteSettings && remoteSettings[0]) {
        const s = remoteSettings[0] as Record<string, any>;
        const mappedSettings = {
          id: s.id as string,
          name: s.name as string,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          geofenceRadius: Number(s.geofence_radius),
          autoPunchOutTime: (s.auto_punch_out_time as string) || '00:00',
          workingDays: s.working_days ? (s.working_days as string).split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        };
        localStorage.setItem('ap_office_settings', JSON.stringify(mappedSettings));
        set({ officeSettings: mappedSettings });
      }
    } catch (err) {
      console.warn('Failed to sync states from Turso, operating offline.', err);
    }
  }
}));
