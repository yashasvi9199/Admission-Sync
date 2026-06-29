import { StateCreator } from 'zustand';
import { AeroPunchinState } from '../useStore';
import { LeaveRequest } from '@/src/types';

export interface LeaveSlice {
  leaves: LeaveRequest[];
  requestLeave: (startDate: string, endDate: string, reason: string, isOnline: boolean) => { error?: string };
  updateLeaveStatus: (leaveId: string, status: 'approved' | 'rejected') => void;
}

export const createLeaveSlice: StateCreator<
  AeroPunchinState,
  [],
  [],
  LeaveSlice
> = (set, get) => ({
  leaves: [],

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

    get().executeSql('UPDATE leave_requests SET status = ?, approved_by = ? WHERE id = ?;', [
      status,
      activeUser.id,
      leaveId
    ]);
  }
});
