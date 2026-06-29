import React, { useState } from 'react';
import { 
  MapPin, 
  Compass, 
  Navigation, 
  Save, 
  Loader2, 
  Check, 
  AlertCircle, 
  Users, 
  Clock, 
  Download, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Briefcase,
  UserPlus,
  ArrowRight,
  TrendingDown
} from 'lucide-react';
import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest } from '../db/localDb';

interface AdminPanelProps {
  lampOn: boolean;
  officeName: string;
  officeLat: number;
  officeLon: number;
  geofenceRadius: number;
  autoPunchOutTime: string;
  workingDays: string[];
  onSaveSettings: (name: string, lat: number, lon: number, radius: number, autoPunchOutTime: string, workingDays: string[]) => void;
  activeUserId: string;
  users: User[];
  attendanceRecords: AttendanceRecord[];
  breaks: BreakRecord[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  onUpdateUserRole: (userId: string, role: User['role']) => void;
  onUpdateUserShift: (userId: string, shiftId: string) => void;
  onCreateShift: (name: string, start: string, end: string, grace: number) => void;
  onApproveRejectLeave: (leaveId: string, status: 'approved' | 'rejected') => void;
  onAdminCreateUser: (firstName: string, lastName: string, role: User['role'], shiftId: string) => { user: User; error?: string };
  onCaptureCoordinates: () => Promise<{ latitude: number; longitude: number; address: string }>;
}

export default function AdminPanel({
  lampOn,
  officeName,
  officeLat,
  officeLon,
  geofenceRadius,
  autoPunchOutTime,
  workingDays,
  onSaveSettings,
  activeUserId,
  users,
  attendanceRecords,
  breaks,
  leaves,
  shifts,
  onUpdateUserRole,
  onUpdateUserShift,
  onCreateShift,
  onApproveRejectLeave,
  onAdminCreateUser,
  onCaptureCoordinates
}: AdminPanelProps) {
  // Coords settings
  const [name, setName] = useState(officeName);
  const [lat, setLat] = useState(officeLat.toString());
  const [lon, setLon] = useState(officeLon.toString());
  const [radius, setRadius] = useState(geofenceRadius.toString());
  const [punchOutTime, setPunchOutTime] = useState(autoPunchOutTime);
  const [selectedWorkingDays, setSelectedWorkingDays] = useState<string[]>(workingDays);

  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tabs
  const [adminSubTab, setAdminSubTab] = useState<'roster' | 'shifts' | 'leaves' | 'tardiness' | 'settings'>('roster');

  // Employee creation
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newRole, setNewRole] = useState<User['role']>('User');
  const [newShiftId, setNewShiftId] = useState('');

  // Shift creator
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');
  const [newShiftGrace, setNewShiftGrace] = useState('15');

  // Tardiness calendar states
  const [selectedTardyUser, setSelectedTardyUser] = useState<string>(activeUserId);
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedTardyDetail, setSelectedTardyDetail] = useState<{
    dateStr: string;
    punchIn: string;
    shiftStart: string;
    shiftEnd: string;
    distance: number;
    address: string;
  } | null>(null);

  // Helpers for coordinates capture
  const handleGPSCapture = async () => {
    setIsLocating(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await onCaptureCoordinates();
      setLat(res.latitude.toFixed(6));
      setLon(res.longitude.toFixed(6));
      setName(res.address);
      setSuccessMsg('Coordinates captured and reverse-geocoded successfully!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e: any) {
      setErrorMsg(e.message || 'Capture failed.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSettingsSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedRadius = parseInt(radius, 10);

    if (isNaN(parsedLat) || isNaN(parsedLon) || isNaN(parsedRadius)) {
      setErrorMsg('Please input valid numbers for coordinates and radius.');
      return;
    }

    onSaveSettings(name, parsedLat, parsedLon, parsedRadius, punchOutTime, selectedWorkingDays);
    setSuccessMsg('Global office settings updated successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!newFirst.trim() || !newLast.trim()) {
      setErrorMsg('First name and last name are required.');
      return;
    }

    const { user, error } = onAdminCreateUser(newFirst.trim(), newLast.trim(), newRole, newShiftId || shifts[0]?.id);
    if (error) {
      setErrorMsg(error);
      return;
    }

    setNewFirst('');
    setNewLast('');
    setSuccessMsg(`Profile created! Username: @${user.username}`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftName.trim()) return;
    onCreateShift(newShiftName.trim(), newShiftStart, newShiftEnd, parseInt(newShiftGrace, 10) || 0);
    setNewShiftName('');
    setSuccessMsg('Shift config added.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const toggleWorkingDay = (day: string) => {
    if (selectedWorkingDays.includes(day)) {
      setSelectedWorkingDays(selectedWorkingDays.filter(d => d !== day));
    } else {
      setSelectedWorkingDays([...selectedWorkingDays, day]);
    }
  };

  // Compile Tardiness Data
  const getTardyRecordsForUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    
    const shift = shifts.find(s => s.id === user.shiftId);
    if (!shift) return [];

    return attendanceRecords.filter(rec => {
      if (rec.userId !== userId || rec.type !== 'in') return false;
      const punchDate = new Date(rec.timestamp);
      const [shHrs, shMins] = shift.startTime.split(':').map(Number);
      
      const shiftStart = new Date(punchDate);
      shiftStart.setHours(shHrs, shMins, 0, 0);

      const diffMins = (punchDate.getTime() - shiftStart.getTime()) / 60000;
      return diffMins > shift.gracePeriodMins;
    });
  };

  const format12HourTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getTardyDetailsForDate = (date: Date) => {
    const user = users.find(u => u.id === selectedTardyUser);
    if (!user) return null;
    const shift = shifts.find(s => s.id === user.shiftId);
    if (!shift) return null;

    const matchDateStr = date.toDateString();
    const matchRec = attendanceRecords.find(rec => {
      return rec.userId === selectedTardyUser && 
             rec.type === 'in' && 
             new Date(rec.timestamp).toDateString() === matchDateStr;
    });

    if (!matchRec) return null;

    const punchInStr = format12HourTime(matchRec.timestamp);
    const [shStartHrs, shStartMins] = shift.startTime.split(':').map(Number);
    const [shEndHrs, shEndMins] = shift.endTime.split(':').map(Number);

    const start12 = new Date();
    start12.setHours(shStartHrs, shStartMins, 0);
    const start12Str = start12.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    const end12 = new Date();
    end12.setHours(shEndHrs, shEndMins, 0);
    const end12Str = end12.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    return {
      dateStr: matchDateStr,
      punchIn: punchInStr,
      shiftStart: start12Str,
      shiftEnd: end12Str,
      distance: matchRec.distanceFromOffice || 0,
      address: matchRec.address
    };
  };

  // Exporters
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Date,Employee,Role,Type,Address,Distance(m),Remote\n';
    attendanceRecords.forEach(r => {
      const user = users.find(u => u.id === r.userId);
      const dateStr = new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const address = r.address.replace(/"/g, '""');
      csv += `"${dateStr}","${r.name}","${user?.role || 'User'}","${r.type}","${address}",${r.distanceFromOffice || 0},${r.isRemote ? 'Yes' : 'No'}\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `AeroPunchin_Logs_${Date.now()}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rows = '';
    attendanceRecords.forEach(r => {
      const dateStr = new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      rows += `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px;">${dateStr}</td>
          <td style="padding: 6px;">${r.name}</td>
          <td style="padding: 6px; text-transform: uppercase;">${r.type}</td>
          <td style="padding: 6px;">${r.isRemote ? 'Remote' : 'Office'}</td>
          <td style="padding: 6px;">${r.address || ''}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>AeroPunchin Roster Report</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 30px; color: #1e293b; }
            h2 { color: #4f46e5; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { text-align: left; background: #f1f5f9; padding: 8px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>AeroPunchin Attendance Report</h2>
          <p>Export Date: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Action</th>
                <th>Workplace</th>
                <th>Address Details</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Compile monthly calendar data
  const renderCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const tardyPunches = getTardyRecordsForUser(selectedTardyUser);
    const tardyDays = tardyPunches.map(p => new Date(p.timestamp).getDate());

    const days = [];
    // Padding
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`pad-${i}`} className="h-7 w-7"></div>);
    }
    // Days
    for (let d = 1; d <= totalDays; d++) {
      const isLate = tardyDays.includes(d);
      days.push(
        <button
          key={d}
          type="button"
          onClick={() => {
            const detailDate = new Date(year, month, d);
            const detail = getTardyDetailsForDate(detailDate);
            if (detail) {
              setSelectedTardyDetail(detail);
            } else {
              setSelectedTardyDetail(null);
            }
          }}
          className={`h-7 w-7 rounded-full text-[10px] font-black flex items-center justify-center transition-all ${
            isLate 
              ? 'border-2 border-red-500 bg-red-500/10 text-red-500 animate-pulse' 
              : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  // Compile live roster occupancy
  const liveRoster = users.map(user => {
    const userPunches = attendanceRecords.filter(r => r.userId === user.id);
    const lastPunch = userPunches.length > 0 ? [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0] : null;
    const activeBreak = breaks.find(b => b.userId === user.id && b.endTime === null);

    let status: 'present' | 'break' | 'absent' = 'absent';
    if (lastPunch && lastPunch.type === 'in') {
      status = activeBreak ? 'break' : 'present';
    }

    return {
      ...user,
      status,
      lastActive: lastPunch ? lastPunch.timestamp : null,
      breakType: activeBreak ? activeBreak.type : null
    };
  });

  const activeRosterCount = liveRoster.filter(r => r.status === 'present').length;
  const breakRosterCount = liveRoster.filter(r => r.status === 'break').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      
      {/* Top Tabs */}
      <div className="flex border-b border-slate-250 dark:border-slate-800 pb-1 gap-2.5 overflow-x-auto select-none">
        {(['roster', 'shifts', 'leaves', 'tardiness', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAdminSubTab(tab)}
            className={`text-[10px] font-black uppercase tracking-wider pb-1 px-0.5 border-b-2 transition-all shrink-0 ${
              adminSubTab === tab
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-h-[480px] pr-0.5">

        {/* 1. ROSTER TAB */}
        {adminSubTab === 'roster' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-indigo-500/5 p-3 rounded-2xl border border-indigo-500/10">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 block">HQ Roster Summary</span>
                <span className="text-[11px] font-black text-slate-200">
                  {activeRosterCount} Present &bull; {breakRosterCount} On Break
                </span>
              </div>
              <div className="flex gap-2">
                <button onClick={handleExportCSV} className="p-1 px-2.5 text-[9px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1 transition-all">
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button onClick={handleExportPDF} className="p-1 px-2.5 text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1 transition-all">
                  <Download className="w-3 h-3" /> PDF
                </button>
              </div>
            </div>

            {/* Profile Creation Panel */}
            <form onSubmit={handleCreateUser} className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                Provision New Employee Profile
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="First Name"
                  value={newFirst}
                  onChange={(e) => setNewFirst(e.target.value)}
                  className={`p-2 rounded-xl text-xs font-bold border ${
                    lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  value={newLast}
                  onChange={(e) => setNewLast(e.target.value)}
                  className={`p-2 rounded-xl text-xs font-bold border ${
                    lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className={`p-2 rounded-xl text-xs font-bold border ${
                    lampOn ? 'bg-white border-slate-200 text-slate-850' : 'bg-slate-950 border-slate-850 text-slate-200'
                  }`}
                >
                  <option value="User">User role</option>
                  <option value="Admin">Admin role</option>
                  <option value="Sales">Sales role</option>
                  <option value="Manager">Manager role</option>
                  <option value="HR">HR role</option>
                </select>

                <select
                  value={newShiftId}
                  onChange={(e) => setNewShiftId(e.target.value)}
                  className={`p-2 rounded-xl text-xs font-bold border ${
                    lampOn ? 'bg-white border-slate-200 text-slate-850' : 'bg-slate-950 border-slate-850 text-slate-200'
                  }`}
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                Create Account Profile
              </button>
            </form>

            {/* Roster Users List */}
            <div className="space-y-2">
              {liveRoster.map(emp => (
                <div 
                  key={emp.id}
                  className={`p-3 rounded-2xl border flex flex-col gap-2 transition-all ${
                    lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                        {emp.firstName} {emp.lastName}
                      </span>
                      <span className="text-[8px] font-mono text-slate-400 block -mt-0.5">@{emp.username}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      emp.status === 'present' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : emp.status === 'break'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-850'
                    }`}>
                      {emp.status === 'present' ? 'In HQ' : emp.status === 'break' ? `On Break: ${emp.breakType}` : 'Absent'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-850/60">
                    <span className="text-[8px] uppercase font-bold text-slate-500">Role Authority</span>
                    <select
                      value={emp.role}
                      disabled={emp.id === activeUserId} // Prevent Admin self lockout
                      onChange={(e) => onUpdateUserRole(emp.id, e.target.value as any)}
                      className={`text-[9px] font-bold p-1 rounded-lg border focus:outline-none ${
                        lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                      } ${emp.id === activeUserId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Sales">Sales</option>
                      <option value="Developer">Developer</option>
                      <option value="Manager">Manager</option>
                      <option value="HR">HR</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. SHIFTS TAB (Innovative Slider Design) */}
        {adminSubTab === 'shifts' && (
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              Company Shift Coordinator
            </span>

            {/* Create new shift */}
            <form onSubmit={handleCreateShift} className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Add Timing Configurations</span>
              
              <div>
                <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Preset Name</label>
                <input
                  type="text"
                  placeholder="e.g. Early Morning"
                  value={newShiftName}
                  onChange={(e) => setNewShiftName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl text-xs font-bold border ${
                    lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
              </div>

              {/* Innovative range time layout */}
              <div className="grid grid-cols-2 gap-3 bg-slate-950/30 p-3 rounded-2xl border border-slate-850">
                <div>
                  <label className="block text-[8px] uppercase text-indigo-400 font-black mb-1">Shift Start</label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full bg-transparent border-0 text-white text-base font-black text-center focus:outline-none focus:ring-0"
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase text-indigo-400 font-black mb-1">Shift End</label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className="w-full bg-transparent border-0 text-white text-base font-black text-center focus:outline-none focus:ring-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Grace Period (Minutes)</label>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={newShiftGrace}
                  onChange={(e) => setNewShiftGrace(e.target.value)}
                  className="w-full h-1.5 bg-slate-850 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <span className="text-[9px] font-black text-indigo-400 mt-1 block text-right">{newShiftGrace} Mins Grace</span>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors"
              >
                Create Preset
              </button>
            </form>

            <div className="space-y-2">
              {shifts.map(shift => (
                <div 
                  key={shift.id}
                  className={`p-3 rounded-2xl border flex flex-col gap-1.5 transition-all text-xs ${
                    lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                      {shift.name}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400">Grace: {shift.gracePeriodMins} mins</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">
                    Shift Bounds: {shift.startTime} to {shift.endTime} (12h standard: {shift.startTime} - {shift.endTime})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. LEAVES TAB (Restructured and Color-coded Cards) */}
        {adminSubTab === 'leaves' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Leaves Approvals Portal
            </span>

            {leaves.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-black uppercase tracking-wider">
                No leave requests filed yet.
              </div>
            ) : (
              <div className="space-y-3">
                {leaves.map(req => {
                  const isPending = req.status === 'pending';
                  const isApproved = req.status === 'approved';
                  
                  // Color codes
                  const bgClass = isApproved 
                    ? 'bg-emerald-500/5 border-emerald-500/20' 
                    : req.status === 'rejected'
                      ? 'bg-rose-500/5 border-rose-500/20'
                      : 'bg-amber-500/5 border-amber-500/20';

                  const badgeClass = isApproved
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : req.status === 'rejected'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400 animate-pulse';

                  return (
                    <div 
                      key={req.id}
                      className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 transition-all text-xs ${bgClass}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                            {req.employeeName}
                          </span>
                          <span className="text-[8px] text-slate-400 block uppercase font-bold">Created at: {new Date(req.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${badgeClass}`}>
                          {req.status}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-300 bg-slate-950/50 p-2.5 rounded-xl border border-slate-850">
                        <p className="font-bold text-[8px] uppercase text-indigo-400 mb-0.5">Requested: {req.startDate} to {req.endDate}</p>
                        <p className="italic text-slate-200">"{req.reason}"</p>
                      </div>

                      {isPending && (
                        <div className="flex gap-2 justify-end pt-1">
                          <button
                            onClick={() => onApproveRejectLeave(req.id, 'rejected')}
                            className="flex items-center gap-1 p-1 px-2.5 text-[9px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors"
                          >
                            <XCircle className="w-3 h-3" /> Reject
                          </button>
                          <button
                            onClick={() => onApproveRejectLeave(req.id, 'approved')}
                            className="flex items-center gap-1 p-1 px-2.5 text-[9px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3" /> Approve
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. TARDINESS TAB (Dropdown + Calendar Redesign) */}
        {adminSubTab === 'tardiness' && (
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Chronic Tardiness Tracker
            </span>

            {/* Dropdown to select User or Admin */}
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Select Profile</label>
              <select
                value={selectedTardyUser}
                onChange={(e) => {
                  setSelectedTardyUser(e.target.value);
                  setSelectedTardyDetail(null);
                }}
                className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                  lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-slate-200'
                }`}
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} (@{u.username})</option>
                ))}
              </select>
            </div>

            {/* Interactive Calendar below dropdown */}
            <div className={`p-3 rounded-2xl border ${
              lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-850'
            }`}>
              <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-400 mb-2 border-b border-dashed border-slate-850 pb-2">
                <span>
                  {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <div className="flex gap-1">
                  <button 
                    type="button"
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                      setSelectedTardyDetail(null);
                    }}
                    className="p-1 px-2 hover:bg-slate-800 rounded text-[9px] font-black"
                  >
                    &lt;
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                      setSelectedTardyDetail(null);
                    }}
                    className="p-1 px-2 hover:bg-slate-800 rounded text-[9px] font-black"
                  >
                    &gt;
                  </button>
                </div>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-500 uppercase mb-1">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>

              {/* Grid of days */}
              <div className="grid grid-cols-7 gap-1 justify-items-center">
                {renderCalendarDays()}
              </div>
            </div>

            {/* Details Card displayed below calendar when clicking circled date */}
            {selectedTardyDetail ? (
              <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-2 text-xs animate-shake">
                <div className="flex justify-between items-center border-b border-red-500/10 pb-2">
                  <span className="font-black text-red-400 uppercase tracking-widest text-[9px]">Tardy Detail Log</span>
                  <span className="text-[9px] text-slate-400 font-bold">{selectedTardyDetail.dateStr}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[8px]">Punch-In Time</span>
                    <span className="font-bold text-white">{selectedTardyDetail.punchIn}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-bold uppercase text-[8px]">Shift Bounds</span>
                    <span className="font-bold text-white">{selectedTardyDetail.shiftStart} - {selectedTardyDetail.shiftEnd}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-bold uppercase text-[8px]">Distance from HQ</span>
                    <span className="font-bold text-white">{selectedTardyDetail.distance} meters (Grace exceeded)</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 block font-bold uppercase text-[8px]">Address</span>
                    <span className="text-slate-300 italic">"{selectedTardyDetail.address}"</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-2xl border border-slate-850 text-center text-slate-500 text-[9px] font-black uppercase">
                Click any red-circled date above to inspect late punch stats.
              </div>
            )}
          </div>
        )}

        {/* 5. SETTINGS TAB */}
        {adminSubTab === 'settings' && (
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-500" />
              Configure HQ Coordinates & Geofencing
            </span>

            {/* GPS capture */}
            <div className={`p-4 rounded-2xl border transition-all ${
              lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
            }`}>
              <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Fused Geolocation Hardware capture</span>
              <p className="text-[9px] text-slate-400 leading-normal mb-3">
                Uses Fused Location algorithms combining native hardware GPS chips, cell tower signals, and local WiFi details.
              </p>
              <button
                type="button"
                onClick={handleGPSCapture}
                disabled={isLocating}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-1.5"
              >
                {isLocating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Triangulating coordinates...
                  </>
                ) : (
                  <>
                    <Navigation className="w-3.5 h-3.5" />
                    Capture Current GPS
                  </>
                )}
              </button>
            </div>

            {/* Office Settings fields */}
            <form onSubmit={handleSettingsSave} className="space-y-3">
              <div>
                <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">HQ Name / Description</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                    lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Geofence Radius (m)</label>
                  <input
                    type="number"
                    value={radius}
                    onChange={(e) => setRadius(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Auto Punch Out Time</label>
                  <input
                    type="time"
                    value={punchOutTime}
                    onChange={(e) => setPunchOutTime(e.target.value)}
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Working days options */}
              <div>
                <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Working Week Days</label>
                <div className="flex flex-wrap gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                    const active = selectedWorkingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`p-1 px-2.5 rounded-lg text-[9px] font-black uppercase transition-all ${
                          active 
                            ? 'bg-indigo-600 text-white' 
                            : 'bg-slate-900 border border-slate-800 text-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
              >
                <Save className="w-3.5 h-3.5" /> Save Global Settings
              </button>
            </form>
          </div>
        )}

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-semibold flex items-center gap-1.5 leading-tight">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-semibold flex items-center gap-1.5 leading-tight animate-pulse">
            <Check className="w-3.5 h-3.5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

      </div>
    </div>
  );
}
