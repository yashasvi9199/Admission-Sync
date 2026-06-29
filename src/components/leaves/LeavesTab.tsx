import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { User, LeaveRequest } from '@/src/types';

interface LeavesTabProps {
  activeUser: User;
  leaves: LeaveRequest[];
  onRequestLeave: (startDate: string, endDate: string, reason: string, isOnline: boolean) => { error?: string };
  isOnline: boolean;
  lampOn: boolean;
}

export default function LeavesTab({
  activeUser,
  leaves,
  onRequestLeave,
  isOnline,
  lampOn
}: LeavesTabProps) {
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);
    setLeaveSuccess(null);

    if (!leaveStart || !leaveEnd || !leaveReason.trim()) {
      setLeaveError('Error: Please specify the leave end date and detail reason.');
      return;
    }

    const res = onRequestLeave(leaveStart, leaveEnd, leaveReason.trim(), isOnline);
    if (res.error) {
      setLeaveError(res.error);
      return;
    }

    setLeaveStart(new Date().toISOString().split('T')[0]);
    setLeaveEnd('');
    setLeaveReason('');
    setLeaveSuccess('Leave request successfully filed and pending approval.');
    setTimeout(() => setLeaveSuccess(null), 4000);
  };

  const myLeaves = leaves.filter(l => l.userId === activeUser.id);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div>
        <h4 className={`text-xs font-black uppercase tracking-wider ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
          Leave Requests Hub
        </h4>
        <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">File leave request parameters</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-3 shadow-sm">
        <span className="text-[10px] font-black uppercase text-indigo-400 block">Submit Leave Request</span>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">Start Date</label>
            <input
              type="date"
              value={leaveStart}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setLeaveStart(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                lampOn ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
            />
          </div>
          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">End Date</label>
            <input
              type="date"
              value={leaveEnd}
              onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
              onChange={(e) => setLeaveEnd(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                lampOn ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">Reason Description</label>
          <input
            type="text"
            placeholder="Detail reason for your absence request..."
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
            className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
              lampOn ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
          />
        </div>

        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
        >
          Submit Leave Request
        </button>
      </form>

      {leaveError && (
        <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-1.5 animate-shake">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{leaveError}</span>
        </div>
      )}

      {leaveSuccess && (
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{leaveSuccess}</span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px]">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">My Leave Log</span>
        {myLeaves.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center text-xs font-bold ${lampOn ? 'bg-slate-100/50 border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'}`}>
            No leave requests filed yet.
          </div>
        ) : (
          myLeaves.map(l => (
            <div 
              key={l.id}
              className={`p-3 rounded-2xl border flex justify-between items-center text-xs shadow-sm ${
                lampOn ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-850 text-slate-200'
              }`}
            >
              <div>
                <span className="font-black uppercase text-[9px] text-indigo-400 block">Leave Application</span>
                <p className="text-[8px] text-slate-400 mt-0.5 font-bold">Dates: {l.startDate} to {l.endDate}</p>
                <p className={`italic text-[10px] mt-1 ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>"{l.reason}"</p>
              </div>
              <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase ${
                l.status === 'approved' 
                  ? 'bg-emerald-500/10 text-emerald-400' 
                  : l.status === 'rejected'
                    ? 'bg-rose-500/10 text-rose-400'
                    : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {l.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
