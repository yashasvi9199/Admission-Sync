import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest, OfflineAction } from '../types';

const DEFAULT_SHIFTS: Shift[] = [
  { id: 'shift-morning', name: 'Morning Shift', startTime: '09:00', endTime: '17:00', gracePeriodMins: 15 },
  { id: 'shift-night', name: 'Night Shift', startTime: '22:00', endTime: '06:00', gracePeriodMins: 15 }
];

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

export const generateUsername = (firstName: string, lastName: string): string => {
  const cleanFirst = firstName.trim().toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.trim().toLowerCase().replace(/[^a-z]/g, '');
  const firstPart = cleanFirst.substring(0, 4);
  const users = getStoredUsers();
  const existingUsernames = users.map(u => u.username);

  let username = '';
  if (cleanLast.length > 0) {
    username = cleanLast[0] + firstPart;
  } else {
    username = firstPart;
  }

  if (existingUsernames.includes(username)) {
    if (cleanLast.length > 1) {
      username = cleanLast.substring(0, 2) + firstPart;
    } else if (cleanLast.length > 0) {
      username = cleanLast + 'x' + firstPart;
    } else {
      username = firstPart + '2';
    }
  }

  let counter = 2;
  let finalUsername = username;
  while (existingUsernames.includes(finalUsername)) {
    finalUsername = `${username}${counter}`;
    counter++;
  }

  return finalUsername;
};
