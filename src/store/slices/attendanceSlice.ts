import { StateCreator } from 'zustand';
import { AeroPunchinState } from '../useStore';
import { AttendanceRecord, BreakRecord } from '@/src/types';

export interface AttendanceSlice {
  records: AttendanceRecord[];
  breaks: BreakRecord[];
  punchShift: (type: 'in' | 'out', latitude: number, longitude: number, address: string, distanceFromOffice: number, isRemote: boolean, accuracy: number | undefined, isOnline: boolean) => void;
  triggerBreak: (type: 'lunch' | 'coffee' | 'personal', isOnline: boolean) => void;
  editRecordTimestamp: (recordId: string, newTimestamp: number) => void;
  editRecord: (recordId: string, updates: Partial<AttendanceRecord>) => void;
  deleteRecords: (recordIds: string[]) => void;
  adminCreateLog: (userId: string, type: 'in' | 'out', timestamp: number, address: string) => void;
  checkMidnightAutoPunchOut: () => void;
}

export const createAttendanceSlice: StateCreator<
  AeroPunchinState,
  [],
  [],
  AttendanceSlice
> = (set, get) => ({
  records: [],
  breaks: [],

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
      const now = Date.now();
      const updated = breaks.map(b => b.id === active.id ? { ...b, endTime: now } : b);
      localStorage.setItem('ap_breaks', JSON.stringify(updated));
      set({ breaks: updated });
      get().executeSql('UPDATE breaks SET end_time = ? WHERE id = ?;', [now, active.id]);
    } else {
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

      get().executeSql('INSERT OR REPLACE INTO breaks (id, user_id, type, start_time, end_time) VALUES (?, ?, ?, ?, NULL);', [
        newBreak.id,
        newBreak.userId,
        newBreak.type,
        newBreak.startTime
      ]);
    }
  },

  editRecordTimestamp: (recordId, newTimestamp) => {
    const updated = get().records.map(rec => rec.id === recordId ? { ...rec, timestamp: newTimestamp } : rec);
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });
    get().executeSql('UPDATE attendance_records SET timestamp = ? WHERE id = ?;', [newTimestamp, recordId]);
  },

  editRecord: (recordId, updates) => {
    const updated = get().records.map(rec => rec.id === recordId ? { ...rec, ...updates } : rec);
    localStorage.setItem('ap_attendance', JSON.stringify(updated));
    set({ records: updated });

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

  checkMidnightAutoPunchOut: () => {
    const attendance = get().records;
    const activePunches = attendance.filter(rec => rec.type === 'in');
    if (activePunches.length === 0) return;

    const office = get().officeSettings;
    const [outHours, outMins] = (office.autoPunchOutTime || '00:00').split(':').map(Number);

    const updatedAttendance = [...attendance];
    let changes = false;

    const userOutPunches: Record<string, number[]> = {};
    for (const rec of attendance) {
      if (rec.type === 'out') {
        if (!userOutPunches[rec.userId]) {
          userOutPunches[rec.userId] = [];
        }
        userOutPunches[rec.userId].push(rec.timestamp);
      }
    }

    activePunches.forEach(punch => {
      const outTimestamps = userOutPunches[punch.userId];
      let hasOut = false;
      if (outTimestamps) {
        for (let i = 0; i < outTimestamps.length; i++) {
          if (outTimestamps[i] > punch.timestamp) {
            hasOut = true;
            break;
          }
        }
      }

      if (!hasOut) {
        const punchDate = new Date(punch.timestamp);
        const today = new Date();
        const deadline = new Date(punchDate);
        deadline.setHours(outHours, outMins, 0, 0);

        if (deadline.getTime() <= punch.timestamp) {
          deadline.setDate(deadline.getDate() + 1);
        }

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

          get().executeSql('INSERT OR REPLACE INTO attendance_records (id, user_id, type, timestamp, latitude, longitude, address, distance_from_office, is_remote, accuracy, synced) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1);', [
            autoOut.id,
            autoOut.userId,
            autoOut.type,
            autoOut.timestamp,
            autoOut.latitude,
            autoOut.longitude,
            autoOut.address,
            autoOut.distanceFromOffice || 0,
            autoOut.isRemote,
            autoOut.accuracy || 0
          ]);
        }
      }
    });

    if (changes) {
      localStorage.setItem('ap_attendance', JSON.stringify(updatedAttendance));
      set({ records: updatedAttendance });
    }
  }
});
