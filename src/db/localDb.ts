// AeroPunchin client-side database engine utilizing localStorage
// Simulates a Supabase Postgres back-end with offline capabilities

export interface Shift {
  id: string;
  name: string;
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "17:00"
  gracePeriodMins: number;
}

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  role: 'Admin' | 'Sales' | 'Developer' | 'HR' | 'Manager' | 'User';
  shiftId: string;
  createdAt: number;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  name: string; // Cached display name
  timestamp: number;
  type: 'in' | 'out';
  latitude: number;
  longitude: number;
  address: string;
  distanceFromOffice?: number;
  isRemote: boolean;
  accuracy?: number;
  synced: boolean;
}

export interface BreakRecord {
  id: string;
  userId: string;
  type: 'lunch' | 'coffee' | 'personal';
  startTime: number;
  endTime: number | null;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  employeeName: string;
  type: 'annual' | 'sick' | 'casual' | 'other';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string; // Admin userId
  createdAt: number;
}

export interface OfflineAction {
  id: string;
  type: 'punch' | 'break_start' | 'break_end' | 'leave_request';
  payload: any;
  timestamp: number;
}

// Initial Shifts
const DEFAULT_SHIFTS: Shift[] = [
  { id: 'shift-morning', name: 'Morning Shift', startTime: '09:00', endTime: '17:00', gracePeriodMins: 15 },
  { id: 'shift-night', name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriodMins: 15 }
];

// Helper functions for storage retrieval & updates
export const getStoredUsers = (): User[] => {
  const data = localStorage.getItem('ap_users');
  return data ? JSON.parse(data) : [];
};

export const getStoredShifts = (): Shift[] => {
  const data = localStorage.getItem('ap_shifts');
  if (!data) {
    localStorage.setItem('ap_shifts', JSON.stringify(DEFAULT_SHIFTS));
    return DEFAULT_SHIFTS;
  }
  return JSON.parse(data);
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem('ap_attendance');
  return data ? JSON.parse(data) : [];
};

export const getStoredBreaks = (): BreakRecord[] => {
  const data = localStorage.getItem('ap_breaks');
  return data ? JSON.parse(data) : [];
};

export const getStoredLeaves = (): LeaveRequest[] => {
  const data = localStorage.getItem('ap_leaves');
  return data ? JSON.parse(data) : [];
};

export const getStoredOfflineQueue = (): OfflineAction[] => {
  const data = localStorage.getItem('ap_offline_queue');
  return data ? JSON.parse(data) : [];
};

// State modification logic
export const generateUsername = (firstName: string, lastName: string): string => {
  const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z]/g, '');
  const firstPart = cleanFirst.substring(0, 4);
  const users = getStoredUsers();
  const existingUsernames = users.map(u => u.username);

  // Default: first initial of last name + 4 letters of first name
  let username = '';
  if (cleanLast.length > 0) {
    username = cleanLast[0] + firstPart;
  } else {
    username = firstPart;
  }

  // Collision detected -> use 2 initials of last name + 4 letters of first name
  if (existingUsernames.includes(username)) {
    if (cleanLast.length > 1) {
      username = cleanLast.substring(0, 2) + firstPart;
    } else if (cleanLast.length > 0) {
      username = cleanLast + 'x' + firstPart;
    } else {
      username = firstPart + '2';
    }
  }

  // Deep collision fallback -> append running counter
  let counter = 2;
  let finalUsername = username;
  while (existingUsernames.includes(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
  }

  return finalUsername;
};

export const registerUser = (firstName: string, lastName: string, role: string, shiftId: string): { user: User; error?: string } => {
  const users = getStoredUsers();
  
  // Clean names
  const cleanFirst = firstName.trim();
  const cleanLast = lastName.trim();

  if (!cleanFirst || !cleanLast) {
    return { user: {} as User, error: 'First and Last name must be specified.' };
  }

  const username = generateUsername(cleanFirst, cleanLast);
  
  // First user automatically becomes Admin, subsequent users become the selected role (or User default)
  const isFirstUser = users.length === 0;
  const finalRole = isFirstUser ? 'Admin' : (role as any || 'User');
  const finalShiftId = shiftId || DEFAULT_SHIFTS[0].id;

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

  return { user: newUser };
};

export const loginUser = (username: string, password?: string): { user: User | null; error?: string } => {
  const users = getStoredUsers();

  // Local development bypass check
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
    return { user: found };
  }

  const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
  
  if (!found) {
    return { user: null, error: 'Invalid username. Please check your credentials or register.' };
  }

  localStorage.setItem('ap_active_user_id', found.id);
  return { user: found };
};

export const logoutUser = (): void => {
  localStorage.removeItem('ap_active_user_id');
};

export const getActiveUser = (): User | null => {
  const activeId = localStorage.getItem('ap_active_user_id');
  if (!activeId) return null;
  const users = getStoredUsers();
  return users.find(u => u.id === activeId) || null;
};

// Roster operations
export const updateUserRole = (userId: string, newRole: User['role']): void => {
  const users = getStoredUsers();
  const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
  localStorage.setItem('ap_users', JSON.stringify(updated));
};

export const updateUserShift = (userId: string, shiftId: string): void => {
  const users = getStoredUsers();
  const updated = users.map(u => u.id === userId ? { ...u, shiftId } : u);
  localStorage.setItem('ap_users', JSON.stringify(updated));
};

export const addShift = (name: string, startTime: string, endTime: string, gracePeriodMins: number): Shift => {
  const shifts = getStoredShifts();
  const newShift: Shift = {
    id: `shift-${crypto.randomUUID().substring(0, 8)}`,
    name,
    startTime,
    endTime,
    gracePeriodMins
  };
  shifts.push(newShift);
  localStorage.setItem('ap_shifts', JSON.stringify(shifts));
  return newShift;
};

// Attendance Operations
export const addAttendanceRecord = (userId: string, record: Omit<AttendanceRecord, 'id' | 'userId' | 'name' | 'synced'>, isOnline: boolean): AttendanceRecord => {
  const users = getStoredUsers();
  const user = users.find(u => u.id === userId);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

  const newRecord: AttendanceRecord = {
    id: crypto.randomUUID(),
    userId,
    name: displayName,
    synced: isOnline,
    ...record
  };

  if (isOnline) {
    const attendance = getStoredAttendance();
    localStorage.setItem('ap_attendance', JSON.stringify([newRecord, ...attendance]));
  } else {
    // Add to queue
    const queue = getStoredOfflineQueue();
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type: 'punch',
      payload: newRecord,
      timestamp: Date.now()
    };
    localStorage.setItem('ap_offline_queue', JSON.stringify([...queue, action]));
  }

  return newRecord;
};

export const editAttendanceTimestamp = (recordId: string, newTimestamp: number): void => {
  const attendance = getStoredAttendance();
  const updated = attendance.map(rec => rec.id === recordId ? { ...rec, timestamp: newTimestamp } : rec);
  localStorage.setItem('ap_attendance', JSON.stringify(updated));
};

// Break tracking
export const toggleBreak = (userId: string, type: 'lunch' | 'coffee' | 'personal', isOnline: boolean): { activeBreak: BreakRecord | null; error?: string } => {
  const breaks = getStoredBreaks();
  const active = breaks.find(b => b.userId === userId && b.endTime === null);

  if (active) {
    // End active break
    if (isOnline) {
      const updated = breaks.map(b => b.id === active.id ? { ...b, endTime: Date.now() } : b);
      localStorage.setItem('ap_breaks', JSON.stringify(updated));
      return { activeBreak: null };
    } else {
      const queue = getStoredOfflineQueue();
      const action: OfflineAction = {
        id: crypto.randomUUID(),
        type: 'break_end',
        payload: { userId, breakId: active.id },
        timestamp: Date.now()
      };
      localStorage.setItem('ap_offline_queue', JSON.stringify([...queue, action]));
      
      // Update local state temporarily to show ended break
      const updated = breaks.map(b => b.id === active.id ? { ...b, endTime: Date.now() } : b);
      localStorage.setItem('ap_breaks', JSON.stringify(updated));
      return { activeBreak: null };
    }
  } else {
    // Start new break
    const newBreak: BreakRecord = {
      id: crypto.randomUUID(),
      userId,
      type,
      startTime: Date.now(),
      endTime: null
    };

    if (isOnline) {
      breaks.push(newBreak);
      localStorage.setItem('ap_breaks', JSON.stringify(breaks));
      return { activeBreak: newBreak };
    } else {
      const queue = getStoredOfflineQueue();
      const action: OfflineAction = {
        id: crypto.randomUUID(),
        type: 'break_start',
        payload: newBreak,
        timestamp: Date.now()
      };
      localStorage.setItem('ap_offline_queue', JSON.stringify([...queue, action]));
      
      breaks.push(newBreak);
      localStorage.setItem('ap_breaks', JSON.stringify(breaks));
      return { activeBreak: newBreak };
    }
  }
};

export const getActiveBreak = (userId: string): BreakRecord | null => {
  const breaks = getStoredBreaks();
  return breaks.find(b => b.userId === userId && b.endTime === null) || null;
};

// Leave requests
export const submitLeave = (userId: string, type: LeaveRequest['type'], startDate: string, endDate: string, reason: string, isOnline: boolean): LeaveRequest => {
  const users = getStoredUsers();
  const user = users.find(u => u.id === userId);
  const employeeName = user ? `${user.firstName} ${user.lastName}` : 'Unknown';

  const newRequest: LeaveRequest = {
    id: crypto.randomUUID(),
    userId,
    employeeName,
    type,
    startDate,
    endDate,
    reason,
    status: 'pending',
    createdAt: Date.now()
  };

  if (isOnline) {
    const leaves = getStoredLeaves();
    localStorage.setItem('ap_leaves', JSON.stringify([newRequest, ...leaves]));
  } else {
    const queue = getStoredOfflineQueue();
    const action: OfflineAction = {
      id: crypto.randomUUID(),
      type: 'leave_request',
      payload: newRequest,
      timestamp: Date.now()
    };
    localStorage.setItem('ap_offline_queue', JSON.stringify([...queue, action]));
  }

  return newRequest;
};

export const updateLeaveStatus = (requestId: string, status: 'approved' | 'rejected', adminId: string): void => {
  const leaves = getStoredLeaves();
  const updated = leaves.map(l => l.id === requestId ? { ...l, status, approvedBy: adminId } : l);
  localStorage.setItem('ap_leaves', JSON.stringify(updated));
};

// Sync Offline Queue
export const syncQueue = (): void => {
  const queue = getStoredOfflineQueue();
  if (queue.length === 0) return;

  const attendance = getStoredAttendance();
  const leaves = getStoredLeaves();
  const breaks = getStoredBreaks();

  const updatedAttendance = [...attendance];
  const updatedLeaves = [...leaves];
  const updatedBreaks = [...breaks];

  queue.forEach(action => {
    if (action.type === 'punch') {
      const record = { ...action.payload, synced: true };
      // Check if already in DB to prevent duplicates
      if (!updatedAttendance.find(a => a.id === record.id)) {
        updatedAttendance.unshift(record);
      }
    } else if (action.type === 'break_start') {
      const br = action.payload;
      if (!updatedBreaks.find(b => b.id === br.id)) {
        updatedBreaks.push(br);
      }
    } else if (action.type === 'break_end') {
      const { breakId } = action.payload;
      const idx = updatedBreaks.findIndex(b => b.id === breakId);
      if (idx !== -1) {
        updatedBreaks[idx].endTime = action.timestamp;
      }
    } else if (action.type === 'leave_request') {
      const lv = action.payload;
      if (!updatedLeaves.find(l => l.id === lv.id)) {
        updatedLeaves.unshift(lv);
      }
    }
  });

  localStorage.setItem('ap_attendance', JSON.stringify(updatedAttendance));
  localStorage.setItem('ap_leaves', JSON.stringify(updatedLeaves));
  localStorage.setItem('ap_breaks', JSON.stringify(updatedBreaks));
  
  // Clear queue
  localStorage.setItem('ap_offline_queue', JSON.stringify([]));
};

// Midnight Auto Punch-Out check
export const performMidnightAutoPunchOut = (): void => {
  const attendance = getStoredAttendance();
  const activePunches = attendance.filter(rec => rec.type === 'in');
  
  if (activePunches.length === 0) return;

  const todayStr = new Date().toDateString();
  const updatedAttendance = [...attendance];
  let changes = false;

  activePunches.forEach(punch => {
    // Find if user has clocked out after this punch
    const userPunches = attendance.filter(rec => rec.userId === punch.userId && rec.timestamp > punch.timestamp);
    const hasOut = userPunches.some(p => p.type === 'out');

    if (!hasOut) {
      const punchDate = new Date(punch.timestamp);
      const punchDateStr = punchDate.toDateString();

      // If the punch was on a previous day, auto clock out at 23:59:59 of that day
      if (punchDateStr !== todayStr) {
        const outTime = new Date(punchDate);
        outTime.setHours(23, 59, 59, 999);

        const autoOut: AttendanceRecord = {
          id: crypto.randomUUID(),
          userId: punch.userId,
          name: punch.name,
          timestamp: outTime.getTime(),
          type: 'out',
          latitude: punch.latitude,
          longitude: punch.longitude,
          address: 'Auto Punch-Out (Midnight Exceeded)',
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
  }
};
