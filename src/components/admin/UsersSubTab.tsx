import React, { useState } from 'react';
import { User, Shift, AttendanceRecord, BreakRecord, LeaveRequest } from '../../types';
import { UserPlus, Download, Check, X } from 'lucide-react';

interface UsersSubTabProps {
  lampOn: boolean;
  users: User[];
  records: AttendanceRecord[];
  breaks: BreakRecord[];
  shifts: Shift[];
  activeUserId: string;
  onUpdateUserRole: (userId: string, role: User['role']) => void;
  onUpdateUserShift: (userId: string, shiftId: string) => void;
  onAdminCreateUser: (firstName: string, lastName: string, role: User['role'], shiftId: string, password?: string) => { user: User; error?: string };
  onAdminResetPassword: (userId: string, newPassword: string) => void;
}

export default function UsersSubTab({
  lampOn,
  users,
  records,
  breaks,
  shifts,
  activeUserId,
  onUpdateUserRole,
  onUpdateUserShift,
  onAdminCreateUser,
  onAdminResetPassword
}: UsersSubTabProps) {
  // New user state
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newRole, setNewRole] = useState<User['role']>('User');
  const [newShiftId, setNewShiftId] = useState(shifts[0]?.id || 'shift-morning');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Password resets list
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resetOpenUserId, setResetOpenUserId] = useState<string | null>(null);

  // Compute password validations
  const countLetters = (str: string) => (str.match(/[a-zA-Z]/g) || []).length;
  const hasNumber = (str: string) => /\d/.test(str);
  const hasSpecial = (str: string) => /[^a-zA-Z0-9]/.test(str);

  const meetsLetters = countLetters(newPassword) >= 4;
  const meetsNumber = hasNumber(newPassword);
  const meetsSpecial = hasSpecial(newPassword);
  const isPasswordValid = meetsLetters && meetsNumber && meetsSpecial;
  const passwordsMatch = newPassword === confirmPassword;

  // Compute live roster
  const liveRoster = users.map(user => {
    const userPunches = records.filter(r => r.userId === user.id);
    const lastPunch = userPunches.length > 0
      ? [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0]
      : null;

    const activeBreak = breaks.find(b => b.userId === user.id && b.endTime === null);

    let status: 'present' | 'break' | 'absent' = 'absent';
    if (lastPunch && lastPunch.type === 'in') {
      status = activeBreak ? 'break' : 'present';
    }

    return {
      ...user,
      status,
      breakType: activeBreak ? activeBreak.type : null
    };
  });

  const activeRosterCount = liveRoster.filter(r => r.status === 'present').length;
  const breakRosterCount = liveRoster.filter(r => r.status === 'break').length;

  // Exporters
  const handleExportCSV = () => {
    let csv = 'data:text/csv;charset=utf-8,Date,Employee,Role,Type,Address,Distance(m),Remote\n';
    records.forEach(r => {
      const u = users.find(usr => usr.id === r.userId);
      const dateStr = new Date(r.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const address = r.address.replace(/"/g, '""');
      csv += `"${dateStr}","${r.name}","${u?.role || 'User'}","${r.type}","${address}",${r.distanceFromOffice || 0},${r.isRemote ? 'Yes' : 'No'}\n`;
    });
    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `AeroPunchin_Roster_${Date.now()}.csv`;
    link.click();
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let rows = '';
    records.forEach(r => {
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
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newFirst.trim() || !newLast.trim()) {
      setErrorMsg('First and Last name must be specified.');
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg('Password does not meet all criteria.');
      return;
    }

    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const res = onAdminCreateUser(newFirst, newLast, newRole, newShiftId, newPassword);
    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setNewFirst('');
      setNewLast('');
      setNewPassword('');
      setConfirmPassword('');
      alert(`User profile for @${res.user.username} created successfully!`);
    }
  };

  const handleResetPasswordClick = (userId: string) => {
    const pass = resetPasswords[userId];
    if (!pass || pass.trim().length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    onAdminResetPassword(userId, pass.trim());
    setResetPasswords(prev => ({ ...prev, [userId]: '' }));
    setResetOpenUserId(null);
    alert('Password updated successfully!');
  };

  return (
    <div className="space-y-4 pr-0.5">
      <div className="flex justify-between items-center bg-indigo-500/5 p-3 rounded-2xl border border-indigo-500/10">
        <div>
          <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-400 block">HQ Roster Summary</span>
          <span className={`text-[11px] font-black ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
            {activeRosterCount} Present &bull; {breakRosterCount} On Break
          </span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExportCSV} className="p-1 px-2.5 text-[9px] font-black uppercase bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center gap-1 transition-all cursor-pointer">
            <Download className="w-3 h-3" /> CSV
          </button>
          <button onClick={handleExportPDF} className="p-1 px-2.5 text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center gap-1 transition-all cursor-pointer">
            <Download className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>

      {/* Provision Profile Form */}
      <form onSubmit={handleCreateUserSubmit} className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
          <UserPlus className="w-3.5 h-3.5" /> Provision New Employee
        </span>

        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="First Name"
            value={newFirst}
            onChange={(e) => setNewFirst(e.target.value)}
            className={`p-2 rounded-xl text-xs font-bold border focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
            required
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newLast}
            onChange={(e) => setNewLast(e.target.value)}
            className={`p-2 rounded-xl text-xs font-bold border focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as any)}
            className={`p-2 rounded-xl text-xs font-bold border focus:outline-none ${
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
            className={`p-2 rounded-xl text-xs font-bold border focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-850' : 'bg-slate-950 border-slate-850 text-slate-200'
            }`}
          >
            {shifts.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Password block with Side Validation Indicator */}
        <div className="grid grid-cols-5 gap-2.5">
          <div className="col-span-3 space-y-2">
            <input
              type="password"
              placeholder="Assign Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
              }`}
              required
            />
            <div className="relative">
              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full p-2 pr-6 rounded-xl text-xs font-bold border focus:outline-none ${
                  lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                }`}
                required
              />
              {confirmPassword.length > 0 && (
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                  {passwordsMatch ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-rose-500 font-extrabold" />
                  )}
                </span>
              )}
            </div>
          </div>
          {/* Password Validation List: small, visible dark font */}
          <div className="col-span-2 p-2 rounded-xl bg-slate-950/20 border border-slate-800 text-[8px] leading-relaxed text-slate-500 font-bold uppercase self-center">
            <span className="text-[7px] text-slate-400 block mb-1">Requirements:</span>
            <div className={meetsLetters ? 'line-through text-slate-600' : 'text-slate-400'}>
              &bull; 4+ Letters
            </div>
            <div className={meetsNumber ? 'line-through text-slate-600' : 'text-slate-400'}>
              &bull; 1+ Number
            </div>
            <div className={meetsSpecial ? 'line-through text-slate-600' : 'text-slate-400'}>
              &bull; 1+ Special Char
            </div>
          </div>
        </div>

        {errorMsg && <p className="text-[9px] text-rose-400 font-bold">{errorMsg}</p>}

        <button
          type="submit"
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
        >
          Create Account Profile
        </button>
      </form>

      {/* Roster Users List */}
      <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">HQ Employee Accounts</span>
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
                {emp.status === 'present' ? 'In HQ' : emp.status === 'break' ? `Break: ${emp.breakType}` : 'Absent'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-slate-200 dark:border-slate-800">
              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] uppercase font-bold text-slate-500">Role Authority</span>
                <select
                  value={emp.role}
                  disabled={emp.id === activeUserId}
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

              <div className="flex flex-col gap-0.5">
                <span className="text-[7px] uppercase font-bold text-slate-500">Assigned Shift</span>
                <select
                  value={emp.shiftId}
                  onChange={(e) => onUpdateUserShift(emp.id, e.target.value)}
                  className={`text-[9px] font-bold p-1 rounded-lg border focus:outline-none ${
                    lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                  }`}
                >
                  {shifts.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password Reset Section */}
            <div className="pt-1.5 flex flex-col gap-1 border-t border-dashed border-slate-200 dark:border-slate-800">
              {resetOpenUserId === emp.id ? (
                <div className="flex gap-2 items-center">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={resetPasswords[emp.id] || ''}
                    onChange={(e) => setResetPasswords(prev => ({ ...prev, [emp.id]: e.target.value }))}
                    className={`flex-1 p-1 rounded text-[9px] font-bold border focus:outline-none ${
                      lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                    }`}
                  />
                  <button
                    onClick={() => handleResetPasswordClick(emp.id)}
                    className="p-1 px-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[8px] font-black uppercase rounded cursor-pointer"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setResetOpenUserId(null)}
                    className="p-1 px-2.5 bg-slate-800 text-white text-[8px] font-black uppercase rounded cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setResetOpenUserId(emp.id)}
                  className="text-[8px] font-black uppercase text-indigo-400 self-start hover:underline cursor-pointer"
                >
                  &raquo; Reset Account Password
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
