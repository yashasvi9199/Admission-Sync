import React, { useState } from 'react';
import { Users, Clock, MapPin, AlertTriangle, ArrowLeft } from 'lucide-react';
import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest, OfficeSettings } from '../../types';
import UsersSubTab from './UsersSubTab';
import ShiftsSubTab from './ShiftsSubTab';
import OfficeSettingsSubTab from './OfficeSettingsSubTab';
import TardinessSubTab from './TardinessSubTab';

interface AdminTabProps {
  lampOn: boolean;
  officeSettings: OfficeSettings;
  users: User[];
  records: AttendanceRecord[];
  breaks: BreakRecord[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  activeUserId: string;
  onUpdateUserRole: (userId: string, role: User['role']) => void;
  onUpdateUserShift: (userId: string, shiftId: string) => void;
  onCreateShift: (name: string, start: string, end: string, grace: number) => void;
  onUpdateShift: (shiftId: string, name: string, start: string, end: string, grace: number) => void;
  onDeleteShift: (shiftId: string) => void;
  onSaveOfficeSettings: (name: string, lat: number, lon: number, radius: number, autoOut: string, wrkDays: string[]) => void;
  onApproveRejectLeave: (leaveId: string, status: 'approved' | 'rejected') => void;
  onAdminResetPassword: (userId: string, newPassword: string) => void;
  onAdminCreateUser: (firstName: string, lastName: string, role: User['role'], shiftId: string, password?: string) => { user: User; error?: string };
  onCaptureCoordinates: () => Promise<{ latitude: number; longitude: number; address: string }>;
}

export default function AdminTab(props: AdminTabProps) {
  const [subView, setSubView] = useState<'users' | 'shifts' | 'office' | 'tardiness' | null>(null);

  if (subView === 'users') {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <button onClick={() => setSubView(null)} className="flex items-center gap-1.5 text-xs text-indigo-400 font-black uppercase hover:underline cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <UsersSubTab {...props} />
      </div>
    );
  }

  if (subView === 'shifts') {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <button onClick={() => setSubView(null)} className="flex items-center gap-1.5 text-xs text-indigo-400 font-black uppercase hover:underline cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <ShiftsSubTab {...props} />
      </div>
    );
  }

  if (subView === 'office') {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <button onClick={() => setSubView(null)} className="flex items-center gap-1.5 text-xs text-indigo-400 font-black uppercase hover:underline cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <OfficeSettingsSubTab {...props} />
      </div>
    );
  }

  if (subView === 'tardiness') {
    return (
      <div className="flex-1 flex flex-col min-h-0 space-y-3">
        <button onClick={() => setSubView(null)} className="flex items-center gap-1.5 text-xs text-indigo-400 font-black uppercase hover:underline cursor-pointer">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </button>
        <TardinessSubTab {...props} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      <div>
        <h4 className={`text-xs font-black uppercase tracking-wider ${props.lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
          Admin Management Portal
        </h4>
        <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Select a category to manage operations</p>
      </div>

      <div className="grid grid-cols-2 gap-3 flex-1 overflow-y-auto max-h-[500px]">
        {/* Users Card */}
        <button
          onClick={() => setSubView('users')}
          className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] ${
            props.lampOn 
              ? 'bg-slate-50 border-slate-250 text-slate-800 hover:bg-slate-100 shadow-slate-200/50' 
              : 'bg-slate-900/60 border-slate-850 text-white hover:bg-slate-850/60'
          }`}
        >
          <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-500">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Users & Profiles</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Manage roster, roles & resets</span>
          </div>
        </button>

        {/* Shifts Card */}
        <button
          onClick={() => setSubView('shifts')}
          className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] ${
            props.lampOn 
              ? 'bg-slate-50 border-slate-250 text-slate-800 hover:bg-slate-100 shadow-slate-200/50' 
              : 'bg-slate-900/60 border-slate-850 text-white hover:bg-slate-850/60'
          }`}
        >
          <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Shift Configs</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Configure and assign shift presets</span>
          </div>
        </button>

        {/* Office Settings Card */}
        <button
          onClick={() => setSubView('office')}
          className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] ${
            props.lampOn 
              ? 'bg-slate-50 border-slate-250 text-slate-800 hover:bg-slate-100 shadow-slate-200/50' 
              : 'bg-slate-900/60 border-slate-850 text-white hover:bg-slate-850/60'
          }`}
        >
          <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">HQ & Geofencing</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Change coordinates & perimeter</span>
          </div>
        </button>

        {/* Tardiness Card */}
        <button
          onClick={() => setSubView('tardiness')}
          className={`p-4 rounded-3xl border flex flex-col items-center justify-center gap-2 text-center transition-all cursor-pointer hover:scale-[1.02] ${
            props.lampOn 
              ? 'bg-slate-50 border-slate-250 text-slate-800 hover:bg-slate-100 shadow-slate-200/50' 
              : 'bg-slate-900/60 border-slate-850 text-white hover:bg-slate-850/60'
          }`}
        >
          <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider block">Tardiness Visuals</span>
            <span className="text-[8px] text-slate-400 block mt-0.5">Monthly late punch inspection</span>
          </div>
        </button>
      </div>
    </div>
  );
}
