import React, { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { 
  MapPin, 
  Compass, 
  Navigation, 
  Save, 
  Loader2, 
  Check, 
  Settings,
  AlertCircle,
  Users,
  Clock,
  Download,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  Briefcase
} from 'lucide-react';
import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest } from '../db/localDb';

interface AdminPanelProps {
  lampOn: boolean;
  officeName: string;
  officeLat: number;
  officeLon: number;
  geofenceRadius: number;
  onSaveSettings: (name: string, lat: number, lon: number, radius: number) => void;
  // Dynamic Props
  users: User[];
  attendanceRecords: AttendanceRecord[];
  breaks: BreakRecord[];
  leaves: LeaveRequest[];
  shifts: Shift[];
  onUpdateUserRole: (userId: string, role: User['role']) => void;
  onUpdateUserShift: (userId: string, shiftId: string) => void;
  onCreateShift: (name: string, start: string, end: string, grace: number) => void;
  onApproveRejectLeave: (leaveId: string, status: 'approved' | 'rejected') => void;
}

export default function AdminPanel({
  lampOn,
  officeName,
  officeLat,
  officeLon,
  geofenceRadius,
  onSaveSettings,
  users,
  attendanceRecords,
  breaks,
  leaves,
  shifts,
  onUpdateUserRole,
  onUpdateUserShift,
  onCreateShift,
  onApproveRejectLeave,
}: AdminPanelProps) {
  const [name, setName] = useState(officeName);
  const [lat, setLat] = useState(officeLat.toString());
  const [lon, setLon] = useState(officeLon.toString());
  const [radius, setRadius] = useState(geofenceRadius.toString());
  
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sub-tabs in Admin Panel
  const [adminSubTab, setAdminSubTab] = useState<'roster' | 'shifts' | 'leaves' | 'tardiness' | 'settings'>('roster');

  // New Shift state
  const [newShiftName, setNewShiftName] = useState('');
  const [newShiftStart, setNewShiftStart] = useState('09:00');
  const [newShiftEnd, setNewShiftEnd] = useState('17:00');
  const [newShiftGrace, setNewShiftGrace] = useState('15');

  // Get current device coordinates via Capacitor Geolocation
  const handleUseDeviceLocation = async () => {
    setIsLocating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'denied') {
        await Geolocation.requestPermissions();
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      setLat(position.coords.latitude.toFixed(6));
      setLon(position.coords.longitude.toFixed(6));
      setSuccessMsg('Successfully loaded precise device GPS coordinates!');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Device geolocation error:', err);
      setErrorMsg('Failed to fetch device location. Ensure GPS is enabled and permission is granted.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    const parsedRadius = parseInt(radius, 10);

    if (!name.trim()) {
      setErrorMsg('Office name or address is required.');
      return;
    }

    if (isNaN(parsedLat) || parsedLat < -90 || parsedLat > 90) {
      setErrorMsg('Latitude must be a valid number between -90 and 90.');
      return;
    }

    if (isNaN(parsedLon) || parsedLon < -180 || parsedLon > 180) {
      setErrorMsg('Longitude must be a valid number between -180 and 180.');
      return;
    }

    if (isNaN(parsedRadius) || parsedRadius < 1 || parsedRadius > 10000) {
      setErrorMsg('Geofence radius must be a positive number (between 1 and 10000 meters).');
      return;
    }

    onSaveSettings(name.trim(), parsedLat, parsedLon, parsedRadius);
    setSuccessMsg('HQ coordinates and geofence parameters updated successfully!');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCreateShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShiftName.trim()) return;
    onCreateShift(newShiftName.trim(), newShiftStart, newShiftEnd, parseInt(newShiftGrace, 10) || 0);
    setNewShiftName('');
    setSuccessMsg('New shift created successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Helper to compile current employee states for Live Roster
  const getLiveRoster = () => {
    return users.map(user => {
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
        lastAddress: lastPunch ? lastPunch.address : 'No record yet',
        breakType: activeBreak ? activeBreak.type : null
      };
    });
  };

  // Tardiness Calculations
  const getTardyUsers = () => {
    const tardyList: { user: User; record: AttendanceRecord; minutesLate: number; shift: Shift }[] = [];
    
    attendanceRecords.forEach(rec => {
      if (rec.type !== 'in') return;
      const user = users.find(u => u.id === rec.userId);
      if (!user) return;
      
      const shift = shifts.find(s => s.id === user.shiftId);
      if (!shift) return;

      const punchDate = new Date(rec.timestamp);
      const [shHours, shMins] = shift.startTime.split(':').map(Number);
      
      const shiftStartToday = new Date(punchDate);
      shiftStartToday.setHours(shHours, shMins, 0, 0);

      const diffMs = punchDate.getTime() - shiftStartToday.getTime();
      const minutesLate = Math.floor(diffMs / 60000);

      if (minutesLate > shift.gracePeriodMins) {
        tardyList.push({ user, record: rec, minutesLate, shift });
      }
    });

    return tardyList;
  };

  // CSV Exporter
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Date,Username,Name,Role,Type,Latitude,Longitude,Address,Distance (m),Remote,Accuracy\n';

    attendanceRecords.forEach(rec => {
      const user = users.find(u => u.id === rec.userId);
      const roleStr = user ? user.role : 'Unknown';
      const dateStr = new Date(rec.timestamp).toLocaleString();
      const escapedAddress = rec.address.replace(/"/g, '""');

      csvContent += `"${dateStr}","${user?.username || ''}","${rec.name}","${roleStr}","${rec.type}",${rec.latitude},${rec.longitude},"${escapedAddress}",${rec.distanceFromOffice || 0},${rec.isRemote},${rec.accuracy || 0}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `aeropunchin_attendance_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF / Print Layout Exporter
  const handleExportPrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let tableRows = '';
    attendanceRecords.forEach(rec => {
      const user = users.find(u => u.id === rec.userId);
      const dateStr = new Date(rec.timestamp).toLocaleString();
      tableRows += `
        <tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px;">${dateStr}</td>
          <td style="padding: 8px;">${user?.username || ''}</td>
          <td style="padding: 8px;">${rec.name}</td>
          <td style="padding: 8px; text-transform: uppercase;">${rec.type}</td>
          <td style="padding: 8px;">${rec.isRemote ? 'Remote' : 'Office'}</td>
          <td style="padding: 8px;">${rec.address}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>AeroPunchin Monthly Attendance Report</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { color: #4F46E5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #F3F4F6; text-align: left; padding: 10px; }
          </style>
        </head>
        <body>
          <h1>AeroPunchin Attendance Report</h1>
          <p>Generated on: ${new Date().toLocaleString()}</p>
          <p>Total Records: ${attendanceRecords.length}</p>
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Username</th>
                <th>Employee Name</th>
                <th>Action</th>
                <th>Type</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const liveRoster = getLiveRoster();
  const tardyUsers = getTardyUsers();

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-xs font-black uppercase tracking-wider ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
            AeroPunchin Manager Dashboard
          </h4>
          <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Control center and workforce live roster</p>
        </div>
        <Settings className={`w-4 h-4 ${lampOn ? 'text-indigo-600' : 'text-indigo-400'}`} />
      </div>

      {/* Admin Subtabs */}
      <div className="flex border-b border-slate-250 dark:border-slate-800 pb-1 gap-2 overflow-x-auto">
        {(['roster', 'shifts', 'leaves', 'tardiness', 'settings'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setAdminSubTab(tab)}
            className={`text-[9px] font-black uppercase tracking-wider pb-1 px-1 transition-all border-b-2 shrink-0 ${
              adminSubTab === tab
                ? 'border-indigo-500 text-indigo-500'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-0.5">
        
        {/* ROSTER TAB */}
        {adminSubTab === 'roster' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                Live Roster Occupancy
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={handleExportCSV}
                  className="p-1 px-2 text-[8px] font-bold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded flex items-center gap-1 border border-indigo-500/30"
                >
                  <Download className="w-2.5 h-2.5" /> CSV
                </button>
                <button 
                  onClick={handleExportPrint}
                  className="p-1 px-2 text-[8px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded flex items-center gap-1 border border-emerald-500/30"
                >
                  <Download className="w-2.5 h-2.5" /> PDF/Print
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {liveRoster.map(emp => (
                <div 
                  key={emp.id}
                  className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all text-xs ${
                    lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
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
                          : 'bg-slate-500/10 text-slate-400 border border-slate-800'
                    }`}>
                      {emp.status === 'present' ? 'In Office' : emp.status === 'break' ? `Break: ${emp.breakType}` : 'Absent'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-[9px] text-slate-400 pt-2 border-t border-dashed border-slate-250 dark:border-slate-800/80">
                    <span>Shift: {shifts.find(s => s.id === emp.shiftId)?.name || 'Default'}</span>
                    <span>Last active: {formatTime(emp.lastActive)}</span>
                  </div>

                  {/* Role Modification */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/40">
                    <span className="text-[8px] uppercase font-bold text-slate-500">Role Authority</span>
                    <select
                      value={emp.role}
                      onChange={(e) => onUpdateUserRole(emp.id, e.target.value as any)}
                      className={`text-[9px] font-bold p-1 rounded border ${
                        lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Sales">Sales (Anywhere Punch)</option>
                      <option value="Developer">Developer</option>
                      <option value="Manager">Manager</option>
                      <option value="User">User</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SHIFTS TAB */}
        {adminSubTab === 'shifts' && (
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
              Configure Company Shift Timings
            </span>

            {/* Create new shift */}
            <form onSubmit={handleCreateShift} className="p-3 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-2.5">
              <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400 block">Create Timing Preset</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Shift Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Shift"
                    value={newShiftName}
                    onChange={(e) => setNewShiftName(e.target.value)}
                    className={`w-full p-2 rounded text-xs ${
                      lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Grace Period (Mins)</label>
                  <input
                    type="number"
                    value={newShiftGrace}
                    onChange={(e) => setNewShiftGrace(e.target.value)}
                    className={`w-full p-2 rounded text-xs ${
                      lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Start Time</label>
                  <input
                    type="time"
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className={`w-full p-2 rounded text-xs ${
                      lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">End Time</label>
                  <input
                    type="time"
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
                    className={`w-full p-2 rounded text-xs ${
                      lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-800 text-white'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-1.5 px-3 text-[9px] font-black uppercase bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors"
              >
                Create Shift Timing
              </button>
            </form>

            {/* List current shifts & shift assignments */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Existing Shift Configs</span>
              {shifts.map(shift => (
                <div 
                  key={shift.id}
                  className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-xs ${
                    lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                      {shift.name}
                    </span>
                    <span className="text-[9px] font-bold text-indigo-400">Grace: {shift.gracePeriodMins} mins</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Active timing: {shift.startTime} to {shift.endTime}
                  </div>
                </div>
              ))}

              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block pt-2 border-t border-slate-800">Assign Shifts to Staff</span>
              {users.map(u => (
                <div 
                  key={u.id}
                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                    lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                  }`}
                >
                  <div>
                    <span className="font-bold">{u.firstName} {u.lastName}</span>
                    <p className="text-[8px] text-slate-400">@{u.username}</p>
                  </div>
                  <select
                    value={u.shiftId}
                    onChange={(e) => onUpdateUserShift(u.id, e.target.value)}
                    className={`text-[9px] font-bold p-1 rounded border ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                    }`}
                  >
                    {shifts.map(sh => (
                      <option key={sh.id} value={sh.id}>{sh.name} ({sh.startTime})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LEAVES TAB */}
        {adminSubTab === 'leaves' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
              Leaves Approval Portal
            </span>

            {leaves.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-black uppercase tracking-wider">
                No leave requests filed yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {leaves.map(req => (
                  <div 
                    key={req.id}
                    className={`p-3 rounded-xl border flex flex-col gap-2 transition-all text-xs ${
                      lampOn ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                          {req.employeeName}
                        </span>
                        <span className="text-[9px] text-indigo-400 block uppercase font-bold">{req.type} Leave</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                        req.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : req.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse'
                      }`}>
                        {req.status}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-300 bg-slate-950/40 p-2 rounded">
                      <p className="font-bold text-[8px] uppercase text-slate-500 mb-0.5">Dates: {req.startDate} to {req.endDate}</p>
                      <p className="italic">"{req.reason}"</p>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          onClick={() => onApproveRejectLeave(req.id, 'rejected')}
                          className="flex items-center gap-1 p-1 px-2 text-[9px] font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Reject
                        </button>
                        <button
                          onClick={() => onApproveRejectLeave(req.id, 'approved')}
                          className="flex items-center gap-1 p-1 px-2 text-[9px] font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TARDINESS TAB */}
        {adminSubTab === 'tardiness' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              Chronic Tardiness Flagging
            </span>

            {tardyUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-black uppercase tracking-wider">
                No tardiness flags reported today.
              </div>
            ) : (
              <div className="space-y-2">
                {tardyUsers.map((item, idx) => (
                  <div 
                    key={idx}
                    className="p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col gap-1 text-xs"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-rose-400 text-[10px] uppercase">
                        {item.user.firstName} {item.user.lastName}
                      </span>
                      <span className="text-[8px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-black">
                        LATE: {item.minutesLate} MINS
                      </span>
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Punched in at: {new Date(item.record.timestamp).toLocaleTimeString()} (Shift: {item.shift.startTime})
                    </div>
                    <div className="text-[9px] text-slate-400 italic">
                      Location: {item.record.address}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {adminSubTab === 'settings' && (
          <div className="space-y-3">
            {/* Dynamic Location Lookup Card */}
            <div className={`rounded-2xl p-4 border transition-all ${
              lampOn ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/40 border-slate-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                  lampOn ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400'
                }`}>
                  <Compass className="w-4 h-4 animate-spin-slow" />
                </div>
                <div className="flex-1">
                  <h5 className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                    Calibrate Coordinates
                  </h5>
                  <p className="text-[9px] text-slate-400 leading-normal mt-0.5 mb-2.5">
                    Automatically capture your device's exact physical GPS location to set as the active headquarters.
                  </p>
                  <button
                    type="button"
                    onClick={handleUseDeviceLocation}
                    disabled={isLocating}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[10px] font-extrabold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                  >
                    {isLocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Locating GPS...
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3.5 h-3.5" />
                        Capture Current GPS
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs Form */}
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                  HQ Name or Address Description
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New York HQ"
                  className={`w-full p-2.5 rounded-xl border text-xs font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors ${
                    lampOn 
                      ? 'bg-white border-slate-200 text-slate-800' 
                      : 'bg-[#0F172A] border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Latitude Coordinate
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 40.7128"
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors ${
                      lampOn 
                        ? 'bg-white border-slate-200 text-slate-800' 
                        : 'bg-[#0F172A] border-slate-800 text-slate-100'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                    Longitude Coordinate
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lon}
                    onChange={(e) => setLon(e.target.value)}
                    placeholder="e.g. -74.0060"
                    className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors ${
                      lampOn 
                        ? 'bg-white border-slate-200 text-slate-800' 
                        : 'bg-[#0F172A] border-slate-800 text-slate-100'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 flex justify-between">
                  <span>Geofence Perimeter (Meters)</span>
                  <span className={`font-black ${lampOn ? 'text-indigo-600' : 'text-indigo-400'}`}>
                    {radius}m Active Radius
                  </span>
                </label>
                <input
                  type="number"
                  step="1"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  placeholder="e.g. 100"
                  className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-colors ${
                    lampOn 
                      ? 'bg-white border-slate-200 text-slate-800' 
                      : 'bg-[#0F172A] border-slate-800 text-slate-100'
                  }`}
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition-all shadow-md"
              >
                <Save className="w-3 h-3" /> Save Settings
              </button>
            </form>
          </div>
        )}

        {/* Global Banner Messages inside Admin Panel */}
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
