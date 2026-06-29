import React, { useState } from 'react';
import { Sliders, MapPin, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { User, AttendanceRecord, OfficeSettings } from '../../types';
import { fetchExactLocation, fetchDetailedAddress } from '../../utils/geolocation';

interface LogsTabProps {
  activeUser: User;
  users: User[];
  records: AttendanceRecord[];
  officeSettings: OfficeSettings;
  onAdminCreateLog: (userId: string, type: 'in' | 'out', timestamp: number, address: string) => void;
  onEditRecord: (recordId: string, updates: Partial<AttendanceRecord>) => void;
  onDeleteRecords: (recordIds: string[]) => void;
  lampOn: boolean;
}

export default function LogsTab({
  activeUser,
  users,
  records,
  officeSettings,
  onAdminCreateLog,
  onEditRecord,
  onDeleteRecords,
  lampOn
}: LogsTabProps) {
  // Filter state: default to admin's own ID
  const [selectedUserFilter, setSelectedUserFilter] = useState(activeUser.id);
  const [showNewLogForm, setShowNewLogForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  
  // Location capture status
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // Form states
  const [newLogUserId, setNewLogUserId] = useState('');
  const [newLogType, setNewLogType] = useState<'in' | 'out'>('in');
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogHour, setNewLogHour] = useState('09');
  const [newLogMin, setNewLogMin] = useState('00');
  const [newLogPeriod, setNewLogPeriod] = useState('AM');
  const [newLogAddress, setNewLogAddress] = useState('');

  // Edit states
  const [editLogType, setEditLogType] = useState<'in' | 'out'>('in');
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogHour, setEditLogHour] = useState('09');
  const [editLogMin, setEditLogMin] = useState('00');
  const [editLogPeriod, setEditLogPeriod] = useState('AM');
  const [editLogAddress, setEditLogAddress] = useState('');

  // Format users with admin first
  const sortedUsers = [
    activeUser,
    ...users.filter(u => u.id !== activeUser.id)
  ];

  // Filter records based on role
  const displayedRecords = activeUser.role === 'Admin'
    ? records.filter(r => r.userId === selectedUserFilter)
    : records.filter(r => r.userId === activeUser.id);

  // Time conversion helpers
  const get24HTimeStr = (hour: string, min: string, period: string) => {
    let h = parseInt(hour);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${min}:00`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogUserId) return;
    const time24 = get24HTimeStr(newLogHour, newLogMin, newLogPeriod);
    const datetime = new Date(`${newLogDate}T${time24}`);
    onAdminCreateLog(newLogUserId, newLogType, datetime.getTime(), newLogAddress);
    setShowNewLogForm(false);
    setNewLogUserId('');
    setNewLogAddress('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const time24 = get24HTimeStr(editLogHour, editLogMin, editLogPeriod);
    const datetime = new Date(`${editLogDate}T${time24}`);
    onEditRecord(editingRecord.id, {
      type: editLogType,
      timestamp: datetime.getTime(),
      address: editLogAddress
    });
    setEditingRecord(null);
  };

  const handleFetchLocation = async (form: 'new' | 'edit') => {
    setIsFetchingLocation(true);
    try {
      const loc = await fetchExactLocation(false, officeSettings.latitude, officeSettings.longitude);
      const addr = await fetchDetailedAddress(loc.latitude, loc.longitude);
      if (form === 'new') {
        setNewLogAddress(addr);
      } else {
        setEditLogAddress(addr);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const format12HourTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
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
                  setNewLogUserId(u.id);
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

      <div className="flex justify-between items-center px-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          {activeUser.role === 'Admin' ? 'Workforce Logs Feed' : 'Your Attendance Logs'}
        </span>
        {activeUser.role === 'Admin' && (
          <div className="flex gap-1.5">
            <button
              onClick={() => {
                setShowNewLogForm(!showNewLogForm);
                setEditingRecord(null);
                if (!newLogUserId) setNewLogUserId(selectedUserFilter);
              }}
              className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
            >
              {showNewLogForm ? 'Close Form' : 'New Log'}
            </button>
            {selectedRecordIds.length > 0 && (
              <button
                onClick={() => {
                  onDeleteRecords(selectedRecordIds);
                  setSelectedRecordIds([]);
                }}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
              >
                Delete ({selectedRecordIds.length})
              </button>
            )}
          </div>
        )}
      </div>

      {/* Manual Create Form */}
      {activeUser.role === 'Admin' && showNewLogForm && (
        <form onSubmit={handleCreateSubmit} className="p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-xs">
          <span className="text-[9px] font-black uppercase text-indigo-400 block">Create Manual Log</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Select User</label>
              <select
                value={newLogUserId}
                onChange={(e) => setNewLogUserId(e.target.value)}
                className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                required
              >
                <option value="">-- Choose User --</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName} (@{u.username})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Action Type</label>
              <select
                value={newLogType}
                onChange={(e) => setNewLogType(e.target.value as any)}
                className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
              >
                <option value="in">Clock In</option>
                <option value="out">Clock Out</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Date</label>
              <input
                type="date"
                value={newLogDate}
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                onChange={(e) => setNewLogDate(e.target.value)}
                className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Time (12-Hour)</label>
              <div className="grid grid-cols-3 gap-0.5">
                <select value={newLogHour} onChange={(e) => setNewLogHour(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={newLogMin} onChange={(e) => setNewLogMin(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={newLogPeriod} onChange={(e) => setNewLogPeriod(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Location / Address</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Click blue button to pinpoint..."
                value={newLogAddress}
                onChange={(e) => setNewLogAddress(e.target.value)}
                className="flex-1 p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleFetchLocation('new')}
                disabled={isFetchingLocation}
                className="px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer"
                title="Fetch Current Location"
              >
                <MapPin className={`w-3.5 h-3.5 ${isFetchingLocation ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
          <button type="submit" className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm">
            Submit Manual Entry
          </button>
        </form>
      )}

      {/* Edit Form */}
      {activeUser.role === 'Admin' && editingRecord && (
        <form onSubmit={handleEditSubmit} className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
          <span className="text-[9px] font-black uppercase text-amber-500 block">Edit Log: {editingRecord.name}</span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Action Type</label>
              <select
                value={editLogType}
                onChange={(e) => setEditLogType(e.target.value as any)}
                className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
              >
                <option value="in">Clock In</option>
                <option value="out">Clock Out</option>
              </select>
            </div>
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Location / Address</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editLogAddress}
                  onChange={(e) => setEditLogAddress(e.target.value)}
                  className="flex-1 p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => handleFetchLocation('edit')}
                  disabled={isFetchingLocation}
                  className="px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex items-center justify-center shrink-0 cursor-pointer"
                  title="Fetch Current Location"
                >
                  <MapPin className={`w-3.5 h-3.5 ${isFetchingLocation ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Date</label>
              <input
                type="date"
                value={editLogDate}
                onClick={(e) => { try { e.currentTarget.showPicker(); } catch {} }}
                onChange={(e) => setEditLogDate(e.target.value)}
                className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Time (12-Hour)</label>
              <div className="grid grid-cols-3 gap-0.5">
                <select value={editLogHour} onChange={(e) => setEditLogHour(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={editLogMin} onChange={(e) => setEditLogMin(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={editLogPeriod} onChange={(e) => setEditLogPeriod(e.target.value)} className="p-1 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditingRecord(null)} className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black uppercase rounded-lg">
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Logs Feed List */}
      <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px]">
        {displayedRecords.length === 0 ? (
          <div className={`p-6 rounded-2xl border text-center text-xs font-bold ${lampOn ? 'bg-slate-100/50 border-slate-200 text-slate-400' : 'bg-slate-900/30 border-slate-800 text-slate-500'}`}>
            No log entries found for this employee.
          </div>
        ) : (
          displayedRecords.map(rec => {
            const hasAddress = rec.address && rec.address !== '' && !rec.address.startsWith('HQ Office Area') && !rec.address.startsWith('Office Geofence');
            const showCoords = !hasAddress;
            const isSelected = selectedRecordIds.includes(rec.id);
            
            return (
              <div 
                key={rec.id}
                className={`p-3 rounded-2xl border flex gap-3 transition-all duration-300 text-xs shadow-sm items-start ${
                  isSelected
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : lampOn 
                      ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-slate-200/50 hover:bg-slate-100' 
                      : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-850/60'
                }`}
              >
                {activeUser.role === 'Admin' && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedRecordIds(prev => 
                        prev.includes(rec.id) ? prev.filter(x => x !== rec.id) : [...prev, rec.id]
                      );
                    }}
                    className="mt-1 w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                )}

                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                        lampOn ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/40'
                      }`}>
                        {rec.name}
                      </span>
                      {activeUser.role === 'Admin' && (
                        <button
                          onClick={() => {
                            const recDate = new Date(rec.timestamp);
                            let hr = recDate.getHours();
                            const min = recDate.getMinutes().toString().padStart(2, '0');
                            const period = hr >= 12 ? 'PM' : 'AM';
                            hr = hr % 12;
                            if (hr === 0) hr = 12;
                            const hrStr = hr.toString().padStart(2, '0');

                            setEditingRecord(rec);
                            setEditLogType(rec.type);
                            setEditLogDate(recDate.toISOString().split('T')[0]);
                            setEditLogHour(hrStr);
                            setEditLogMin(min);
                            setEditLogPeriod(period);
                            setEditLogAddress(rec.address || '');
                            setShowNewLogForm(false);
                          }}
                          className="text-[9px] text-amber-500 hover:underline font-bold"
                        >
                          [Edit]
                        </button>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                      rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                    }`}>
                      {rec.type === 'in' ? 'Clock In' : 'Clock Out'}
                    </span>
                  </div>

                  <div className="text-[10px] font-bold pb-1 flex justify-between items-center opacity-80 border-b border-dashed border-slate-200 dark:border-slate-800">
                    <span>{new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' })}</span>
                    <span className="text-indigo-400">{format12HourTime(rec.timestamp)}</span>
                  </div>

                  <div className="flex flex-col gap-0.5 text-[10px] text-slate-400">
                    {showCoords ? (
                      <p className="font-mono text-[9px] bg-slate-950/20 p-1 rounded border border-slate-850 text-center">
                        Coords: {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}
                      </p>
                    ) : (
                      <p className="leading-normal">{rec.address}</p>
                    )}
                    {rec.distanceFromOffice !== undefined && (
                      <span className={`font-black text-[9px] uppercase mt-1 self-end ${rec.isRemote ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {rec.isRemote ? 'Remote workplace' : `Verified in bounds (${rec.distanceFromOffice}m)`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
