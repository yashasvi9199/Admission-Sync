import { StateCreator } from 'zustand';
import { AeroPunchinState } from '../useStore';
import { User } from '@/src/types';
import { getStoredUsers, getStoredShifts, generateUsername } from '../../db/storage';

export interface AuthSlice {
  activeUser: User | null;
  users: User[];
  login: (username: string, password?: string) => { user: User | null; error?: string };
  logout: () => void;
  register: (firstName: string, lastName: string, role: string, shiftId: string, password?: string) => { user: User; error?: string };
  adminCreateUser: (firstName: string, lastName: string, role: User['role'], shiftId: string, password?: string) => { user: User; error?: string };
  changeUserRole: (userId: string, role: User['role']) => void;
  changeUserShift: (userId: string, shiftId: string) => void;
  adminResetPassword: (userId: string, newPassword: string) => void;
}

export const createAuthSlice: StateCreator<
  AeroPunchinState,
  [],
  [],
  AuthSlice
> = (set, get) => ({
  activeUser: null,
  users: [],
  login: (username, password) => {
    const users = getStoredUsers();

    const found = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found) {
      return { user: null, error: 'Invalid username. Please check your credentials.' };
    }

    if (found.password && found.password !== password) {
      return { user: null, error: 'Incorrect password.' };
    }

    localStorage.setItem('ap_active_user_id', found.id);
    get().refreshStates();
    return { user: found };
  },

  logout: () => {
    localStorage.removeItem('ap_active_user_id');
    set({ activeUser: null });
  },

  register: (firstName, lastName, role, shiftId, password) => {
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
      password: password || '123456',
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem('ap_users', JSON.stringify(users));
    localStorage.setItem('ap_active_user_id', newUser.id);
    
    get().executeSql('INSERT OR REPLACE INTO users (id, username, first_name, last_name, role, shift_id, password) VALUES (?, ?, ?, ?, ?, ?, ?);', [
      newUser.id,
      newUser.username,
      newUser.firstName,
      newUser.lastName,
      newUser.role,
      newUser.shiftId,
      newUser.password
    ]);

    get().refreshStates();
    return { user: newUser };
  },

  adminCreateUser: (firstName, lastName, role, shiftId, password) => {
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
      password: password || '123456',
      createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem('ap_users', JSON.stringify(users));

    get().executeSql('INSERT OR REPLACE INTO users (id, username, first_name, last_name, role, shift_id, password) VALUES (?, ?, ?, ?, ?, ?, ?);', [
      newUser.id,
      newUser.username,
      newUser.firstName,
      newUser.lastName,
      newUser.role,
      newUser.shiftId,
      newUser.password
    ]);

    get().refreshStates();
    return { user: newUser };
  },

  changeUserRole: (userId, role) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, role } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });
    get().executeSql('UPDATE users SET role = ? WHERE id = ?;', [role, userId]);
  },

  changeUserShift: (userId, shiftId) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, shiftId } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });
    get().executeSql('UPDATE users SET shift_id = ? WHERE id = ?;', [shiftId, userId]);
  },

  adminResetPassword: (userId, newPassword) => {
    const updated = get().users.map(u => u.id === userId ? { ...u, password: newPassword } : u);
    localStorage.setItem('ap_users', JSON.stringify(updated));
    set({ users: updated });
    
    const active = get().activeUser;
    if (active && active.id === userId) {
      set({ activeUser: { ...active, password: newPassword } });
    }

    get().executeSql('UPDATE users SET password = ? WHERE id = ?;', [newPassword, userId]);
  }
});
