import React from 'react';
import { Loader2 } from 'lucide-react';
import SideLamp from '../SideLamp';

interface AttendanceTabProps {
  lampOn: boolean;
  onToggle: () => void;
  isLogging: boolean;
  showMissingPunch: boolean;
  showPreShiftReminder: boolean;
  shiftName: string;
}

export default function AttendanceTab({
  lampOn,
  onToggle,
  isLogging,
  showMissingPunch,
  showPreShiftReminder,
  shiftName
}: AttendanceTabProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {showPreShiftReminder && (
        <div className="p-3 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase rounded-2xl border border-indigo-500/25 tracking-wider animate-pulse text-center">
          ⏰ Pre-Shift Warning: Your shift starts in less than 15 mins!
        </div>
      )}

      {showMissingPunch && (
        <div className="p-3 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase rounded-2xl border border-amber-500/25 tracking-wider text-center">
          ⚠️ Missing Punch: You've been clocked in for &gt;9 hours. Please clock out!
        </div>
      )}

      <div className={`relative flex-1 rounded-3xl border flex flex-col items-center justify-center p-3 overflow-hidden min-h-[380px] transition-all duration-500 ${
        lampOn 
          ? 'bg-radial from-amber-50/45 via-white to-slate-50 border-slate-200' 
          : 'bg-gradient-to-b from-[#0F172A] to-[#020617] border-slate-800'
      }`}>
        <div className="w-full h-[330px] flex items-center justify-center">
          <SideLamp 
            lampOn={lampOn} 
            onToggle={onToggle} 
            disabled={isLogging} 
          />
        </div>

        {isLogging && (
          <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-30">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Triangulating location...</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <span className={`text-[10px] font-black uppercase tracking-widest ${lampOn ? 'text-slate-400' : 'text-slate-500'}`}>
          Active Shift: {shiftName || 'No Shift'}
        </span>
      </div>
    </div>
  );
}
