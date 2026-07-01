import React, { useState, useMemo, useEffect } from 'react';
import { Sliders, MapPin, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import { User, AttendanceRecord, OfficeSettings } from '@/src/types';
import { fetchExactLocation, fetchDetailedAddress } from '../../utils/geolocation';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

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

  // Timezone-safe helper to format Date as YYYY-MM-DD
  const getYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calendar view states
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [currentMonthYear, setCurrentMonthYear] = useState(() => {
    const d = new Date();
    return { month: d.getMonth(), year: d.getFullYear() };
  });

  // Form states
  const [newLogUserId, setNewLogUserId] = useState('');
  const [newLogType, setNewLogType] = useState<'in' | 'out'>('in');
  const [newLogDate, setNewLogDate] = useState(() => getYYYYMMDD(selectedDate));
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

  // Keep newLogDate in sync with the selected calendar date
  useEffect(() => {
    setNewLogDate(getYYYYMMDD(selectedDate));
  }, [selectedDate]);

  // Format users with admin first
  const sortedUsers = [
    activeUser,
    ...users.filter(u => u.id !== activeUser.id)
  ];

  // Filter records by selected user
  const userPunches = activeUser.role === 'Admin'
    ? records.filter(r => r.userId === selectedUserFilter)
    : records.filter(r => r.userId === activeUser.id);

  // Set of dates with logs to display dot indicator
  const datesWithLogs = useMemo(() => {
    const set = new Set<string>();
    userPunches.forEach(r => {
      const d = new Date(r.timestamp);
      set.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    });
    return set;
  }, [userPunches]);

  // Calendar helper to generate 42-grid days
  const calendarDays = useMemo(() => {
    const { month, year } = currentMonthYear;
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay();
    
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDate - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false
      });
    }
    
    const totalDays = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        day: i,
        month,
        year,
        isCurrentMonth: true
      });
    }
    
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonthYear]);

  const handlePrevMonth = () => {
    setCurrentMonthYear(prev => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const handleNextMonth = () => {
    setCurrentMonthYear(prev => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };

  // Filter displayed records based on role and selected date
  const displayedRecords = userPunches.filter(r => {
    const rDate = new Date(r.timestamp);
    return rDate.getDate() === selectedDate.getDate() &&
           rDate.getMonth() === selectedDate.getMonth() &&
           rDate.getFullYear() === selectedDate.getFullYear();
  });

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

      {/* Monthly Calendar View */}
      <div className={`p-4 rounded-3xl border transition-all duration-300 ${
        lampOn 
          ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-slate-250/30' 
          : 'bg-slate-900/60 border-slate-850 text-slate-200 shadow-black/40'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <button 
            type="button" 
            onClick={handlePrevMonth}
            className={`p-1.5 rounded-lg border hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer ${
              lampOn ? 'border-slate-300 text-slate-600 hover:bg-slate-200' : 'border-slate-800 text-slate-400'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="text-xs font-black uppercase tracking-wider">
              {MONTH_NAMES[currentMonthYear.month]} {currentMonthYear.year}
            </span>
          </div>
          <button 
            type="button" 
            onClick={handleNextMonth}
            className={`p-1.5 rounded-lg border hover:bg-slate-800 transition-colors flex items-center justify-center cursor-pointer ${
              lampOn ? 'border-slate-300 text-slate-600 hover:bg-slate-200' : 'border-slate-800 text-slate-400'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        
        {/* Days of Week Headers */}
        <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-black uppercase text-slate-500 mb-1">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, idx) => {
            const isSel = selectedDate.getDate() === d.day && 
                          selectedDate.getMonth() === d.month && 
                          selectedDate.getFullYear() === d.year;
            
            const todayObj = new Date();
            const isToday = todayObj.getDate() === d.day && 
                            todayObj.getMonth() === d.month && 
                            todayObj.getFullYear() === d.year;
            
            const hasLog = datesWithLogs.has(`${d.year}-${d.month}-${d.day}`);
            
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  const newSel = new Date(d.year, d.month, d.day);
                  setSelectedDate(newSel);
                }}
                className={`h-9 flex flex-col items-center justify-center rounded-xl text-[10px] font-bold transition-all relative cursor-pointer ${
                  isSel 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : d.isCurrentMonth
                      ? lampOn ? 'text-slate-800 hover:bg-slate-150' : 'text-slate-200 hover:bg-slate-800'
                      : 'text-slate-500 hover:opacity-80'
                } ${isToday && !isSel ? 'border border-indigo-500/50' : ''}`}
              >
                <span>{d.day}</span>
                {hasLog && (
                  <span className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSel ? 'bg-white' : 'bg-indigo-500'}`}></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

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
                            setEditLogDate(getYYYYMMDD(recDate));
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
