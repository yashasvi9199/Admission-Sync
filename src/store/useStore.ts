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
  offlineQueue: OfflineAction[];
  
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
  changeUserRole: (userId: string, role: User['role']) => void;
  changeUserShift: (userId: string, shiftId: string) => void;
  createNewShift: (name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  updateOfficeSettings: (settings: Partial<OfficeSettings>) => void;
  processOfflineQueue: () => void;
  checkMidnightAutoPunchOut: () => void;
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

  refreshStates: () => {
    const activeUserId = localStorage.getItem('ap_active_user_id');
    const allUsers = getStoredUsers();
    const active = allUsers.find(u => u.id === activeUserId) || null;

    // Load office settings
    let office = DEFAULT_OFFICE_SETTINGS;
    const savedOffice = localStorage.getItem('ap_office_settings');
    if (savedOffice) {
      try {
        office = JSON.parse(savedOffice);
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
      offlineQueue: getStoredOfflineQueue()
    });
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
      synced: isOnline
    };

    if (isOnline) {
      const records = [newRecord, ...get().records];
      localStorage.setItem('ap_attendance', JSON.stringify(records));
      set({ records });
    } else {
      const queue = [...get().offlineQueue, {
        id: crypto.randomUUID(),
        type: 'punch',
        payload: newRecord,
        timestamp: Date.now()
      } as OfflineAction];
      localStorage.setItem('ap_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
    }
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

      if (!isOnline) {
        const queue = [...get().offlineQueue, {
          id: crypto.randomUUID(),
          type: 'break_end',
          payload: { userId: activeUser.id, breakId: active.id },
          timestamp: now
        } as OfflineAction];
        localStorage.setItem('ap_offline_queue', JSON.stringify(queue));
        set({ offlineQueue: queue });
      }
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

      if (!isOnline) {
        const queue = [...get().offlineQueue, {
          id: crypto.randomUUID(),
          type: 'break_start',
          payload: newBreak,
          timestamp: Date.now()
        } as OfflineAction];
        localStorage.setItem('ap_offline_queue', JSON.stringify(queue));
        set({ offlineQueue: queue });
      }
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

    if (isOnline) {
      const leaves = [newRequest, ...get().leaves];
      localStorage.setItem('ap_leaves', JSON.stringify(leaves));
      set({ leaves });
    } else {
      const queue = [...get().offlineQueue, {
        id: crypto.randomUUID(),
        type: 'leave_request',
        payload: newRequest,
        timestamp: Date.now()
      } as OfflineAction];
      localStorage.setItem('ap_offline_queue', JSON.stringify(queue));
      set({ offlineQueue: queue });
    }
    return {};
  },

  updateLeaveStatus: (leaveId, status) => {
    const { activeUser, leaves } = get();
    if (!activeUser) return;

    const updated = leaves.map(l => l.id === leaveId ? { ...l, status, approvedBy: activeUser.id } : l);
    localStorage.setItem('ap_leaves', JSON.stringify(updated));
    set({ leaves: updated });
  },

  editRecordTimestamp: (recordId, newTimestamp) => {
    const updated = get().records.map(rec => rec.id === recordId ? { ...rec, timestamp: newTimestamp } : rec);
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });
  },

  changeUserRole: (userId, role) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, role } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });
  },

  changeUserShift: (userId, shiftId) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, shiftId } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });
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
  },

  updateOfficeSettings: (settings) => {
    const updated = { ...get().officeSettings, ...settings };
    localStorage.setItem('ap_office_settings', JSON.stringify(updated));
    set({ officeSettings: updated });
  },

  processOfflineQueue: () => {
    const queue = get().offlineQueue;
    if (queue.length === 0) return;

    const currentAttendance = [...get().records];
    const currentLeaves = [...get().leaves];
    const currentBreaks = [...get().breaks];

    queue.forEach(action => {
      if (action.type === 'punch') {
        const record = { ...action.payload, synced: true };
        if (!currentAttendance.find(a => a.id === record.id)) {
          currentAttendance.unshift(record);
        }
      } else if (action.type === 'break_start') {
        const br = action.payload;
        if (!currentBreaks.find(b => b.id === br.id)) {
          currentBreaks.push(br);
        }
      } else if (action.type === 'break_end') {
        const { breakId } = action.payload;
        const idx = currentBreaks.findIndex(b => b.id === breakId);
        if (idx !== -1) {
          currentBreaks[idx].endTime = action.timestamp;
        }
      } else if (action.type === 'leave_request') {
        const lv = action.payload;
        if (!currentLeaves.find(l => l.id === lv.id)) {
          currentLeaves.unshift(lv);
        }
      }
    });

    localStorage.setItem('ap_attendance', JSON.stringify(currentAttendance));
    localStorage.setItem('ap_leaves', JSON.stringify(currentLeaves));
    localStorage.setItem('ap_breaks', JSON.stringify(currentBreaks));
    localStorage.setItem('ap_offline_queue', JSON.stringify([]));

    set({
      records: currentAttendance,
      leaves: currentLeaves,
      breaks: currentBreaks,
      offlineQueue: []
    });
  },

  checkMidnightAutoPunchOut: () => {
    const attendance = get().records;
    const activePunches = attendance.filter(rec => rec.type === 'in');
    if (activePunches.length === 0) return;

    const office = get().officeSettings;
    const [outHours, outMins] = office.autoPunchOutTime.split(':').map(Number);

    const updatedAttendance = [...attendance];
    let changes = false;

    activePunches.forEach(punch => {
      const userPunches = attendance.filter(rec => rec.userId === punch.userId && rec.timestamp > punch.timestamp);
      const hasOut = userPunches.some(p => p.type === 'out');

      if (!hasOut) {
        const punchDate = new Date(punch.timestamp);
        const today = new Date();
        
        // Auto-punchout occurs if the punch timestamp has passed the auto punchout threshold for that day
        const punchLimitToday = new Date(punchDate);
        punchLimitToday.setHours(outHours, outMins, 0, 0);

        // If current time is past the punch limit of the punch date + 24 hours, or simply on next day past threshold
        const isNextDay = today.toDateString() !== punchDate.toDateString();
        const isPastThresholdToday = today.getHours() > outHours || (today.getHours() === outHours && today.getMinutes() >= outMins);

        if (isNextDay || isPastThresholdToday) {
          const autoOutTime = new Date(punchDate);
          autoOutTime.setHours(outHours, outMins, 0, 0);

          const autoOut: AttendanceRecord = {
            id: crypto.randomUUID(),
            userId: punch.userId,
            name: punch.name,
            timestamp: autoOutTime.getTime(),
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
  }
}));
