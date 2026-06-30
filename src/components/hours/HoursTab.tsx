import React, { useState } from 'react';
import { User, AttendanceRecord } from '@/src/types';

interface HoursTabProps {
  activeUser: User;
  users?: User[];
  records: AttendanceRecord[];
  lampOn: boolean;
}

export default function HoursTab({ activeUser, users = [], records, lampOn }: HoursTabProps) {
  // Filter state: default to admin's own ID
  const [selectedUserFilter, setSelectedUserFilter] = useState(activeUser.id);

  // Format users with admin first
  const sortedUsers = [
    activeUser,
    ...users.filter(u => u.id !== activeUser.id)
  ];

  const targetUserId = activeUser.role === 'Admin' ? selectedUserFilter : activeUser.id;

  // Compile calculations for Hours Tab (Overtime)
  const getUserWorkSummary = (userId: string) => {
    if (!userId) return { regularMs: 0, overtimeMs: 0, sessions: [] };

    const userPunches = records.filter(r => r.userId === userId);
    const sorted = [...userPunches].sort((a, b) => a.timestamp - b.timestamp);
    const sessions: { date: string; duration: number; regular: number; overtime: number }[] = [];

    let currentIn: AttendanceRecord | null = null;

    sorted.forEach(p => {
      if (p.type === 'in') {
        currentIn = p;
      } else if (p.type === 'out' && currentIn) {
        const durationMs = p.timestamp - currentIn.timestamp;
        const durationHrs = durationMs / 3600000;
        
        const regularHrs = Math.min(durationHrs, 8);
        const overtimeHrs = Math.max(0, durationHrs - 8);

        sessions.push({
          date: new Date(currentIn.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
          duration: durationMs,
          regular: regularHrs * 3600000,
          overtime: overtimeHrs * 3600000
        });

        currentIn = null;
      }
    });

    if (currentIn) {
      const runningMs = Date.now() - currentIn.timestamp;
      const runningHrs = runningMs / 3600000;
      const regularHrs = Math.min(runningHrs, 8);
      const overtimeHrs = Math.max(0, runningHrs - 8);
      sessions.push({
        date: new Date(currentIn.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' }),
        duration: runningMs,
        regular: regularHrs * 3600000,
        overtime: overtimeHrs * 3600000
      });
    }

    const totalRegular = sessions.reduce((acc, curr) => acc + curr.regular, 0);
    const totalOvertime = sessions.reduce((acc, curr) => acc + curr.overtime, 0);

    return {
      regularMs: totalRegular,
      overtimeMs: totalOvertime,
      sessions: sessions.reverse()
    };
  };

  const workSummary = getUserWorkSummary(targetUserId);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Admin Horizontal User Avatars Selector */}
      {activeUser.role === 'Admin' && (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {sortedUsers.map((u) => {
            const isSelected = selectedUserFilter === u.id;
            const initials = `${u.firstName[0] || ''}${u.lastName[0] || ''}`.toUpperCase();
            return (
              <button
                key={u.id}
                onClick={() => {
                  setSelectedUserFilter(u.id);
                }}
                className="flex flex-col items-center gap-1 shrink-0 cursor-pointer focus:outline-none"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  isSelected 
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500 ring-offset-2 ring-offset-[#0B0F19]' 
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}>
                  {initials}
                </div>
                <span className={`text-[9px] font-bold truncate max-w-[55px] ${isSelected ? 'text-indigo-400 font-black' : 'text-slate-500'}`}>
                  @{u.username}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <h4 className={`text-xs font-black uppercase tracking-wider ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
          Shift Performance & Overtime
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Regular Hours card */}
        <div className={`p-4 rounded-2xl border text-center shadow-md transition-all ${
          lampOn 
            ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-slate-200/50' 
            : 'bg-indigo-500/5 border-indigo-500/10 text-slate-200'
        }`}>
          <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Regular Hours</span>
          <span className={`text-xl font-black ${lampOn ? 'text-slate-800' : 'text-white'}`}>
            {(workSummary.regularMs / 3600000).toFixed(2)}h
          </span>
        </div>

        {/* Overtime card */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-center shadow-md animate-pulse">
          <span className="text-[9px] font-black uppercase text-amber-500 block mb-1">Overtime Hours</span>
          <span className="text-xl font-black text-amber-500">
            {(workSummary.overtimeMs / 3600000).toFixed(2)}h
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px]">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">Shift History Logs</span>
        {workSummary.sessions.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center text-xs font-bold ${lampOn ? 'bg-slate-100/50 border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'}`}>
            No work sessions recorded yet.
          </div>
        ) : (
          workSummary.sessions.map((sess, index) => (
            <div 
              key={index}
              className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 text-xs shadow-sm hover:scale-[0.99] transition-transform ${
                lampOn 
                  ? 'bg-slate-50 border-slate-200 text-slate-800' 
                  : 'bg-slate-900/60 border-slate-850 text-slate-200'
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>{sess.date}</span>
                <span className="text-indigo-400 font-black">Total: {(sess.duration / 3600000).toFixed(2)}h</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                <span>Regular: {(sess.regular / 3600000).toFixed(2)}h</span>
                <span className={sess.overtime > 0 ? "text-amber-500 font-bold" : ""}>
                  Overtime: {(sess.overtime / 3600000).toFixed(2)}h
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
