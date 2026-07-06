import { StateCreator } from 'zustand';
import { AeroPunchinState } from '../useStore';
import { TursoOfflineAction } from '@/src/types';
import { queryTurso } from '../../utils/turso';

export interface OfflineSlice {
  offlineQueue: TursoOfflineAction[];
  executeSql: (sql: string, args?: (string | number | boolean | null | undefined)[]) => Promise<void>;
  processOfflineQueue: () => void;
}

export const createOfflineSlice: StateCreator<
  AeroPunchinState,
  [],
  [],
  OfflineSlice
> = (set, get) => ({
  offlineQueue: [],
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

    const currentAttendance = get().records.map(r => ({ ...r, synced: true }));
    localStorage.setItem('ap_attendance', JSON.stringify(currentAttendance));
    set({ records: currentAttendance });
  }
});
