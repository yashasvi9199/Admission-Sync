import React, { useState } from 'react';
import { User, Shift, AttendanceRecord } from '../../types';
import { Calendar } from 'lucide-react';

interface TardinessSubTabProps {
  lampOn: boolean;
  users: User[];
  records: AttendanceRecord[];
  shifts: Shift[];
}

export default function TardinessSubTab({
  lampOn,
  users,
  records,
  shifts
}: TardinessSubTabProps) {
  const [selectedTardyUser, setSelectedTardyUser] = useState(users[0]?.id || '');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedTardyDetail, setSelectedTardyDetail] = useState<{
    dateStr: string;
    punchIn: string;
    shiftStart: string;
    shiftEnd: string;
    distance: number;
    address: string;
  } | null>(null);

  const getTardyRecordsForUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return [];
    
    const shift = shifts.find(s => s.id === user.shiftId);
    if (!shift) return [];

    return records.filter(rec => {
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
    const matchRec = records.find(rec => {
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

  const renderCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const tardyPunches = getTardyRecordsForUser(selectedTardyUser);
    const tardyDays = tardyPunches.map(p => new Date(p.timestamp).getDate());

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`pad-${i}`} className="h-7 w-7"></div>);
    }
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
          className={`h-7 w-7 rounded-full text-[10px] font-black flex items-center justify-center transition-all cursor-pointer ${
            isLate 
              ? 'border-2 border-red-500 bg-red-500/10 text-red-500 animate-pulse' 
              : lampOn ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'
          }`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4 pr-0.5">
      <div>
        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Select Employee</label>
        <select
          value={selectedTardyUser}
          onChange={(e) => {
            setSelectedTardyUser(e.target.value);
            setSelectedTardyDetail(null);
          }}
          className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${
            lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-slate-200'
          }`}
        >
          <option value="">-- Choose Employee --</option>
          {users.map(u => (
            <option key={u.id} value={u.id}>{u.firstName} {u.lastName} (@{u.username})</option>
          ))}
        </select>
      </div>

      <div className={`p-4 rounded-3xl border ${lampOn ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-950/60 border-slate-850 text-slate-200'}`}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[10px] font-black uppercase tracking-wider">Attendance Month Grid</span>
          </div>
          <div className="flex gap-1.5 items-center">
            <button
              type="button"
              onClick={() => {
                setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
                setSelectedTardyDetail(null);
              }}
              className={`p-1 px-2 rounded text-[9px] font-black cursor-pointer ${lampOn ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-800'}`}
            >
              &lt;
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider">
              {calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => {
                setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
                setSelectedTardyDetail(null);
              }}
              className={`p-1 px-2 rounded text-[9px] font-black cursor-pointer ${lampOn ? 'text-slate-700 hover:bg-slate-200' : 'text-slate-200 hover:bg-slate-800'}`}
            >
              &gt;
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[8px] font-bold text-slate-500 uppercase mb-1">
          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
        </div>

        <div className="grid grid-cols-7 gap-1 justify-items-center">
          {renderCalendarDays()}
        </div>
      </div>

      {selectedTardyDetail ? (
        <div className="p-4 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-2 text-xs animate-shake">
          <div className="flex justify-between items-center border-b border-red-500/10 pb-2">
            <span className="font-black text-red-400 uppercase tracking-widest text-[9px]">Tardy Detail Log</span>
            <span className="text-[9px] text-slate-400 font-bold">{selectedTardyDetail.dateStr}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[8px]">Punch-In Time</span>
              <span className={`font-bold ${lampOn ? 'text-slate-800' : 'text-white'}`}>{selectedTardyDetail.punchIn}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-bold uppercase text-[8px]">Shift Bounds</span>
              <span className={`font-bold ${lampOn ? 'text-slate-800' : 'text-white'}`}>{selectedTardyDetail.shiftStart} - {selectedTardyDetail.shiftEnd}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-bold uppercase text-[8px]">Distance from HQ</span>
              <span className={`font-bold ${lampOn ? 'text-slate-800' : 'text-white'}`}>{selectedTardyDetail.distance} meters (Grace exceeded)</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-400 block font-bold uppercase text-[8px]">Address</span>
              <span className={`italic ${lampOn ? 'text-slate-600' : 'text-slate-350'}`}>"{selectedTardyDetail.address}"</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={`p-3 rounded-2xl border text-center text-slate-500 text-[9px] font-black uppercase ${lampOn ? 'border-slate-200' : 'border-slate-850'}`}>
          Click any red-circled date above to inspect late punch stats.
        </div>
      )}
    </div>
  );
}
