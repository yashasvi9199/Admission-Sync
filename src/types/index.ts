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
  password?: string;
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

export interface TursoOfflineAction {
  id: string;
  sql: string;
  args: (string | number | boolean | null | undefined)[];
}

export interface OfficeSettings {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  geofenceRadius: number;
  autoPunchOutTime: string; // "HH:MM" e.g., "00:00"
  workingDays: string[]; // e.g. ["Mon", "Tue", "Wed", "Thu", "Fri"]
}
