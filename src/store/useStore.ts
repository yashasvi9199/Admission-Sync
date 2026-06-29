import { create } from 'zustand';
import { 
  User, 
  Shift, 
  AttendanceRecord, 
  BreakRecord, 
  LeaveRequest, 
  OfflineAction,
  getStoredUsers,
  getStoredShifts,
  getStoredAttendance,
  getStoredBreaks,
  getStoredLeaves,
  getStoredOfflineQueue,
  generateUsername
} from '../db/localDb';
import { queryTurso } from '../utils/turso';

export interface TursoOfflineAction {
  id: string;
  sql: string;
  args: any[];
}

interface OfficeSettings {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  autoPunchOutTime: string; // "HH:MM" e.g., "00:00"
  workingDays: string[]; // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri"]
}

interface AeroPunchinState {
  activeUser: User | null;
  users: User[];
  records: AttendanceRecord[];
  breaks: BreakRecord[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  officeSettings: OfficeSettings;
  offlineQueue: TursoOfflineAction[];
  
  // Actions
  refreshStates: () => void;
  login: (username: string, password?: string) => { user: User | null; error?: string };
  logout: () => void;
  register: (firstName: string, lastName: string, role: string, shiftId: string) => { user: User; error?: string };
  adminCreateUser: (firstName: string, lastName: string, role: User['role'], shiftId: string) => { user: User; error?: string };
  punchShift: (type: 'in' | 'out', latitude: number, longitude: number, address: string, distanceFromOffice: number, isRemote: boolean, accuracy: number | undefined, isOnline: boolean) => void;
  triggerBreak: (type: 'lunch' | 'coffee' | 'personal', isOnline: boolean) => void;
  requestLeave: (startDate: string, endDate: string, reason: string, isOnline: boolean) => { error?: string };
  updateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected') => void;
  editRecordTimestamp: (recordId: string, newTimestamp: number) => void;
  editRecord: (recordId: string, updates: Partial<AttendanceRecord>) => void;
  deleteRecords: (recordIds: string[]) => void;
  adminCreateLog: (userId: string, type: 'in' | 'out', timestamp: number, address: string) => void;
  changeUserRole: (userId: string, role: User['role']) => void;
  changeUserShift: (userId: string, shiftId: string) => void;
  createNewShift: (name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  updateOfficeSettings: (settings: Partial<OfficeSettings>) => void;
  processOfflineQueue: () => void;
  checkMidnightAutoPunchOut: () => void;
  executeSql: (sql: string, args?: any[]) => Promise<void>;
}

const DEFAULT_OFFICE_SETTINGS: OfficeSettings = {
  id: 'default-office',
  name: 'New York HQ',
  latitude: 40.712800,
  longitude: -74.006000,
  geofenceRadius: 100,
  autoPunchOutTime: '00:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
};

export const useStore = create<AeroPunchinState>((set, get) => ({
  activeUser: null,
  users: [],
  records: [],
  breaks: [],
  leaves: [],
  shifts: [],
  officeSettings: DEFAULT_OFFICE_SETTINGS,
  offlineQueue: [],

  refreshStates: async () => {
    const activeUserId = localStorage.getItem('ap_active_user_id');
    const allUsers = getStoredUsers();
    const active = allUsers.find(u => u.id === activeUserId) || null;

    // Load office settings
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

    // Set local states first for immediate responsiveness
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

    // Fresh remote synchronization
    try {
      const [remoteShifts, remoteUsers, remoteRecords, remoteBreaks, remoteLeaves, remoteSettings] = await Promise.all([
        queryTurso('SELECT * FROM shifts;'),
        queryTurso('SELECT * FROM users;'),
        queryTurso('SELECT * FROM attendance_records;'),
        queryTurso('SELECT * FROM breaks;'),
        queryTurso('SELECT * FROM leave_requests;'),
        queryTurso('SELECT * FROM office_settings;')
      ]);

      if (remoteShifts) {
        const mappedShifts = remoteShifts.map((s: any) => ({
          id: s.id,
          name: s.name,
          startTime: s.start_time,
          endTime: s.end_time,
          gracePeriodMins: Number(s.grace_period_mins || 15)
        }));
        localStorage.setItem('ap_shifts', JSON.stringify(mappedShifts));
        set({ shifts: mappedShifts });
      }

      if (remoteUsers) {
        const mappedUsers = remoteUsers.map((u: any) => ({
          id: u.id,
          username: u.username,
          firstName: u.first_name,
          lastName: u.last_name,
          role: u.role,
          shiftId: u.shift_id,
          createdAt: Number(u.created_at || Date.now())
        }));
        localStorage.setItem('ap_users', JSON.stringify(mappedUsers));
        const updatedActive = mappedUsers.find((u: any) => u.id === activeUserId) || null;
        set({ users: mappedUsers, activeUser: updatedActive });
      }

      if (remoteRecords) {
        const mappedRecords = remoteRecords.map((r: any) => ({
          id: r.id,
          userId: r.user_id,
          name: remoteUsers?.find((u: any) => u.id === r.user_id) 
            ? `${remoteUsers.find((u: any) => u.id === r.user_id).first_name} ${remoteUsers.find((u: any) => u.id === r.user_id).last_name}` 
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
        set({ records: mappedRecords });
      }

      if (remoteBreaks) {
        const mappedBreaks = remoteBreaks.map((b: any) => ({
          id: b.id,
          userId: b.user_id,
          type: b.type,
          startTime: Number(b.start_time),
          endTime: b.end_time ? Number(b.end_time) : null
        }));
        localStorage.setItem('ap_breaks', JSON.stringify(mappedBreaks));
        set({ breaks: mappedBreaks });
      }

      if (remoteLeaves) {
        const mappedLeaves = remoteLeaves.map((l: any) => ({
          id: l.id,
          userId: l.user_id,
          employeeName: remoteUsers?.find((u: any) => u.id === l.user_id) 
            ? `${remoteUsers.find((u: any) => u.id === l.user_id).first_name} ${remoteUsers.find((u: any) => u.id === l.user_id).last_name}` 
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
        const s = remoteSettings[0];
        const mappedSettings = {
          id: s.id,
          name: s.name,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          geofenceRadius: Number(s.geofence_radius),
          autoPunchOutTime: s.auto_punch_out_time || '00:00',
          workingDays: s.working_days ? s.working_days.split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        };
        localStorage.setItem('ap_office_settings', JSON.stringify(mappedSettings));
        set({ officeSettings: mappedSettings });
      }
    } catch (err) {
      console.warn('Failed to sync states from Turso, operating offline.', err);
    }
  },

  login: (username, password) => {
    const users = getStoredUsers();
    
    // Dev bypass check
    if (username.trim().toLowerCase() === 'admin' && password === 'admin') {
      let found = users.find(u => u.username.toLowerCase() === 'admin');
      if (!found) {
        const newAdmin: User = {
          id: 'admin-bypass-id',
          username: 'admin',
          firstName: 'System',
          lastName: 'Admin',
          role: 'Admin',
          shiftId: 'shift-morning',
          createdAt: Date.now()
        };
        users.push(newAdmin);
        localStorage.setItem('ap_users', JSON.stringify(users));
        found = newAdmin;
      }
      localStorage.setItem('ap_active_user_id', found.id);
      get().refreshStates();
      return { user: found };
    }

    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) {
      return { user: null, error: 'Invalid username. Please check your credentials.' };
    }

    localStorage.setItem('ap_active_user_id', found.id);
    get().refreshStates();
    return { user: found };
  },

  logout: () => {
    localStorage.removeItem('ap_active_user_id');
    set({ activeUser: null });
  },

  register: (firstName, lastName, role, shiftId) => {
    const users = getStoredUsers();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      return { user: {} as User, error: 'First and Last name must be specified.' };
    }

    const username = generateUsername(cleanFirst, cleanLast);
    const isFirstUser = users.length === 0;
    const finalRole = isFirstUser ? 'Admin' : (role as any || 'User');
    const finalShiftId = shiftId || getStoredShifts()[0]?.id || 'shift-morning';

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      firstName: cleanFirst,
      lastName: cleanLast,
      role: finalRole,
      shiftId: finalShiftId,
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem('ap_users', JSON.stringify(users));
    localStorage.setItem('ap_active_user_id', newUser.id);
    
    // Remote Sync to Turso
    get().executeSql('INSERT OR REPLACE INTO users (id, username, first_name, last_name, role, shift_id) VALUES (?, ?, ?, ?, ?, ?);', [
      newUser.id,
      newUser.username,
      newUser.firstName,
      newUser.lastName,
      newUser.role,
      newUser.shiftId
    ]);

    get().refreshStates();
    return { user: newUser };
  },

  adminCreateUser: (firstName, lastName, role, shiftId) => {
    const users = getStoredUsers();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();

    if (!cleanFirst || !cleanLast) {
      return { user: {} as User, error: 'First and Last name must be specified.' };
    }

    const username = generateUsername(cleanFirst, cleanLast);
    const finalShiftId = shiftId || getStoredShifts()[0]?.id || 'shift-morning';

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      firstName: cleanFirst,
      lastName: cleanLast,
      role,
      shiftId: finalShiftId,
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem('ap_users', JSON.stringify(users));

    // Remote Sync to Turso
    get().executeSql('INSERT OR REPLACE INTO users (id, username, first_name, last_name, role, shift_id) VALUES (?, ?, ?, ?, ?, ?);', [
      newUser.id,
      newUser.username,
      newUser.firstName,
      newUser.lastName,
      newUser.role,
      newUser.shiftId
    ]);

    get().refreshStates();
    return { user: newUser };
  },

  punchShift: (type, latitude, longitude, address, distanceFromOffice, isRemote, accuracy, isOnline) => {
    const { activeUser } = get();
    if (!activeUser) return;

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId: activeUser.id,
      name: `${activeUser.firstName} ${activeUser.lastName}`,
      timestamp: Date.now(),
      type,
      latitude,
      longitude,
      address,
      distanceFromOffice,
      isRemote,
      accuracy,
      synced: true
    };

    const records = [newRecord, ...get().records];
    localStorage.setItem('ap_attendance', JSON.stringify(records));
    set({ records });

    // Remote Sync via executeSql (queues on network error)
    get().executeSql('INSERT OR REPLACE INTO attendance_records (id, user_id, type, timestamp, latitude, longitude, address, distance_from_office, is_remote, accuracy, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);', [
      newRecord.id,
      newRecord.userId,
      newRecord.type,
      newRecord.timestamp,
      newRecord.latitude,
      newRecord.longitude,
      newRecord.address,
      newRecord.distanceFromOffice || 0,
      newRecord.isRemote,
      newRecord.accuracy || 0
    ]);
  },

  triggerBreak: (type, isOnline) => {
    const { activeUser, breaks } = get();
    if (!activeUser) return;

    const active = breaks.find(b => b.userId === activeUser.id && b.endTime === null);

    if (active) {
      // Stop Break
      const now = Date.now();
      const updated = breaks.map(b => b.id === active.id ? { ...b, endTime: now } : b);
      localStorage.setItem('ap_breaks', JSON.stringify(updated));
      set({ breaks: updated });

      // Sync to Turso
      get().executeSql('UPDATE breaks SET end_time = ? WHERE id = ?;', [now, active.id]);
    } else {
      // Start Break
      const newBreak: BreakRecord = {
        id: crypto.randomUUID(),
        userId: activeUser.id,
        type,
        startTime: Date.now(),
        endTime: null
      };

      const updated = [...breaks, newBreak];
      localStorage.setItem('ap_breaks', JSON.stringify(updated));
      set({ breaks: updated });

      // Sync to Turso
      get().executeSql('INSERT OR REPLACE INTO breaks (id, user_id, type, start_time, end_time) VALUES (?, ?, ?, ?, NULL);', [
        newBreak.id,
        newBreak.userId,
        newBreak.type,
        newBreak.startTime
      ]);
    }
  },

  requestLeave: (startDate, endDate, reason, isOnline) => {
    const { activeUser } = get();
    if (!activeUser) return { error: 'No active user found.' };

    const newRequest: LeaveRequest = {
      id: crypto.randomUUID(),
      userId: activeUser.id,
      employeeName: `${activeUser.firstName} ${activeUser.lastName}`,
      type: 'other',
      startDate,
      endDate,
      reason,
      status: 'pending',
      createdAt: Date.now()
    };

    const leaves = [newRequest, ...get().leaves];
    localStorage.setItem('ap_leaves', JSON.stringify(leaves));
    set({ leaves });

    // Sync to Turso
    get().executeSql("INSERT OR REPLACE INTO leave_requests (id, user_id, type, start_date, end_date, reason, status, approved_by) VALUES (?, ?, 'other', ?, ?, ?, 'pending', NULL);", [
      newRequest.id,
      newRequest.userId,
      newRequest.startDate,
      newRequest.endDate,
      newRequest.reason
    ]);

    return {};
  },

  updateLeaveStatus: (leaveId, status) => {
    const { activeUser, leaves } = get();
    if (!activeUser) return;

    const updated = leaves.map(l => l.id === leaveId ? { ...l, status, approvedBy: activeUser.id } : l);
    localStorage.setItem('ap_leaves', JSON.stringify(updated));
    set({ leaves: updated });

    // Sync to Turso
    get().executeSql('UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?;', [
      status,
      activeUser.id,
      leaveId
    ]);
  },

  editRecordTimestamp: (recordId, newTimestamp) => {
    const updated = get().records.map(rec => rec.id === recordId ? { ...rec, timestamp: newTimestamp } : rec);
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });

    // Sync to Turso
    get().executeSql('UPDATE attendance_records SET timestamp = ? WHERE id = ?;', [newTimestamp, recordId]);
  },

  editRecord: (recordId, updates) => {
    const updated = get().records.map(rec => rec.id === recordId ? { ...rec, ...updates } : rec);
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });

    // Sync to Turso
    get().executeSql('UPDATE attendance_records SET type = ?, timestamp = ?, address = ? WHERE id = ?;', [
      updates.type,
      updates.timestamp,
      updates.address,
      recordId
    ]);
  },

  deleteRecords: (recordIds) => {
    const updated = get().records.filter(rec => !recordIds.includes(rec.id));
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });

    // Sync to Turso
    recordIds.forEach(id => {
      get().executeSql('DELETE FROM attendance_records WHERE id = ?;', [id]);
    });
  },

  adminCreateLog: (userId, type, timestamp, address) => {
    const user = get().users.find(u => u.id === userId);
    if (!user) return;
    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      userId,
      name: `${user.firstName} ${user.lastName}`,
      type,
      timestamp,
      latitude: get().officeSettings.latitude,
      longitude: get().officeSettings.longitude,
      address: address || `Manual Entry (${get().officeSettings.latitude.toFixed(5)}, ${get().officeSettings.longitude.toFixed(5)})`,
      distanceFromOffice: 0,
      isRemote: false,
      synced: true
    };
    const updated = [newRecord, ...get().records];
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });

    // Sync to Turso
    get().executeSql('INSERT OR REPLACE INTO attendance_records (id, user_id, type, timestamp, latitude, longitude, address, distance_from_office, is_remote, accuracy, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1);', [
      newRecord.id,
      newRecord.userId,
      newRecord.type,
      newRecord.timestamp,
      newRecord.latitude,
      newRecord.longitude,
      newRecord.address
    ]);
  },

  changeUserRole: (userId, role) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, role } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });

    // Sync to Turso
    get().executeSql('UPDATE users SET role = ? WHERE id = ?;', [role, userId]);
  },

  changeUserShift: (userId, shiftId) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, shiftId } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });

    // Sync to Turso
    get().executeSql('UPDATE users SET shift_id = ? WHERE id = ?;', [shiftId, userId]);
  },

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

    // Sync to Turso
    get().executeSql('INSERT OR REPLACE INTO shifts (id, name, start_time, end_time, grace_period_mins) VALUES (?, ?, ?, ?, ?);', [
      newShift.id,
      newShift.name,
      newShift.startTime,
      newShift.endTime,
      newShift.gracePeriodMins
    ]);
  },

  updateOfficeSettings: (settings) => {
    const updated = { ...get().officeSettings, ...settings };
    localStorage.setItem('ap_office_settings', JSON.stringify(updated));
    set({ officeSettings: updated });

    // Sync to Turso
    get().executeSql("INSERT OR REPLACE INTO office_settings (id, name, latitude, longitude, geofence_radius, auto_punch_out_time, working_days) VALUES ('default-office', ?, ?, ?, ?, ?, ?);", [
      updated.name,
      updated.latitude,
      updated.longitude,
      updated.geofenceRadius,
      updated.autoPunchOutTime,
      updated.workingDays.join(',')
    ]);
  },

  processOfflineQueue: async () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    const remaining: TursoOfflineAction[] = [];
    for (const action of queue) {
      try {
        await queryTurso(action.sql, action.args);
      } catch (err) {
        console.warn('Failed to sync queued action, keeping in offline queue:', action, err);
        remaining.push(action);
      }
    }

    localStorage.setItem('ap_offline_queue', JSON.stringify(remaining));
    set({ offlineQueue: remaining });

    // Mark all existing records as synced locally
    const currentAttendance = get().records.map(r => ({ ...r, synced: true }));
    localStorage.setItem('ap_attendance', JSON.stringify(currentAttendance));
    set({ records: currentAttendance });
  },

  checkMidnightAutoPunchOut: () => {
    const attendance = get().records;
    const activePunches = attendance.filter(rec => rec.type === 'in');
    if (activePunches.length === 0) return;

    const office = get().officeSettings;
    const [outHours, outMins] = (office.autoPunchOutTime || '00:00').split(':').map(Number);

    const updatedAttendance = [...attendance];
    let changes = false;

    activePunches.forEach(punch => {
      const userPunches = attendance.filter(rec => rec.userId === punch.userId && rec.timestamp > punch.timestamp);
      const hasOut = userPunches.some(p => p.type === 'out');

      if (!hasOut) {
        const punchDate = new Date(punch.timestamp);
        const today = new Date();
        
        // Define the auto-punch-out deadline for the punch-in day
        const deadline = new Date(punchDate);
        deadline.setHours(outHours, outMins, 0, 0);

        // If the deadline is before or equal to the punch-in time, it must fall on the next day
        if (deadline.getTime() <= punch.timestamp) {
          deadline.setDate(deadline.getDate() + 1);
        }

        // Auto-punchout occurs if the current time has passed the deadline
        if (today.getTime() >= deadline.getTime()) {
          const autoOut: AttendanceRecord = {
            id: crypto.randomUUID(),
            userId: punch.userId,
            name: punch.name,
            timestamp: deadline.getTime(),
            type: 'out',
            latitude: punch.latitude,
            longitude: punch.longitude,
            address: `Auto Punch-Out (Shift Limit Exceeded: ${office.autoPunchOutTime})`,
            isRemote: punch.isRemote,
            synced: true
          };

          updatedAttendance.unshift(autoOut);
          changes = true;
        }
      }
    });

    if (changes) {
      localStorage.setItem('ap_attendance', JSON.stringify(updatedAttendance));
      set({ records: updatedAttendance });
    }
  },

  executeSql: async (sql, args = []) => {
    try {
      await queryTurso(sql, args);
    } catch (err) {
      console.warn('Turso write failed, queued offline.', err);
      const queue = get().offlineQueue;
      const newAction: TursoOfflineAction = {
        id: crypto.randomUUID(),
        sql,
        args
      };
      const updatedQueue = [...queue, newAction];
      localStorage.setItem('ap_offline_queue', JSON.stringify(updatedQueue));
      set({ offlineQueue: updatedQueue });
    }
  }
}));
