import React, { useState } from 'react';
import { Shift } from '../../types';
import { CalendarRange, Trash2, Edit2, Check, X } from 'lucide-react';

interface ShiftsSubTabProps {
  lampOn: boolean;
  shifts: Shift[];
  onCreateShift: (name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  onUpdateShift: (shiftId: string, name: string, startTime: string, endTime: string, gracePeriodMins: number) => void;
  onDeleteShift: (shiftId: string) => void;
}

export default function ShiftsSubTab({
  lampOn,
  shifts,
  onCreateShift,
  onUpdateShift,
  onDeleteShift
}: ShiftsSubTabProps) {
  // New Shift state
  const [newName, setNewName] = useState('');
  const [newStartHour, setNewStartHour] = useState('09');
  const [newStartMin, setNewStartMin] = useState('00');
  const [newStartPeriod, setNewStartPeriod] = useState('AM');
  const [newEndHour, setNewEndHour] = useState('05');
  const [newEndMin, setNewEndMin] = useState('00');
  const [newEndPeriod, setNewEndPeriod] = useState('PM');
  const [newGrace, setNewGrace] = useState('15');

  // Edit Shift state
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStartHour, setEditStartHour] = useState('09');
  const [editStartMin, setEditStartMin] = useState('00');
  const [editStartPeriod, setEditStartPeriod] = useState('AM');
  const [editEndHour, setEditEndHour] = useState('05');
  const [editEndMin, setEditEndMin] = useState('00');
  const [editEndPeriod, setEditEndPeriod] = useState('PM');
  const [editGrace, setEditGrace] = useState('15');

  const convertTo24HStr = (h: string, m: string, p: string) => {
    let hr = parseInt(h);
    if (p === 'PM' && hr < 12) hr += 12;
    if (p === 'AM' && hr === 12) hr = 0;
    return `${hr.toString().padStart(2, '0')}:${m}`;
  };

  const parse24HTo12HParts = (timeStr: string) => {
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr || '0');
    const m = mStr || '00';
    const period = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return {
      hour: h.toString().padStart(2, '0'),
      min: m,
      period
    };
  };

  const format12HourShiftTime = (timeStr: string) => {
    const { hour, min, period } = parse24HTo12HParts(timeStr);
    return `${hour}:${min} ${period}`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const start24 = convertTo24HStr(newStartHour, newStartMin, newStartPeriod);
    const end24 = convertTo24HStr(newEndHour, newEndMin, newEndPeriod);
    onCreateShift(newName.trim(), start24, end24, parseInt(newGrace));
    setNewName('');
    alert('Shift template created!');
  };

  const handleEditClick = (shift: Shift) => {
    const startParts = parse24HTo12HParts(shift.startTime);
    const endParts = parse24HTo12HParts(shift.endTime);

    setEditingShiftId(shift.id);
    setEditName(shift.name);
    setEditStartHour(startParts.hour);
    setEditStartMin(startParts.min);
    setEditStartPeriod(startParts.period);
    setEditEndHour(endParts.hour);
    setEditEndMin(endParts.min);
    setEditEndPeriod(endParts.period);
    setEditGrace(shift.gracePeriodMins.toString());
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShiftId || !editName.trim()) return;
    const start24 = convertTo24HStr(editStartHour, editStartMin, editStartPeriod);
    const end24 = convertTo24HStr(editEndHour, editEndMin, editEndPeriod);
    onUpdateShift(editingShiftId, editName.trim(), start24, end24, parseInt(editGrace));
    setEditingShiftId(null);
    alert('Shift template updated!');
  };

  return (
    <div className="space-y-4 pr-0.5">
      {/* Create New Shift Preset */}
      {editingShiftId === null ? (
        <form onSubmit={handleCreateSubmit} className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
            <CalendarRange className="w-3.5 h-3.5" /> Configure Preset Shift
          </span>
          
          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Preset Name</label>
            <input
              type="text"
              placeholder="e.g. Early Morning"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-850 text-white'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-950/20 p-2.5 rounded-2xl border border-slate-900">
            <div>
              <label className="block text-[8px] uppercase text-indigo-400 font-black mb-1">Shift Start</label>
              <div className="flex gap-0.5 justify-center">
                <select value={newStartHour} onChange={(e) => setNewStartHour(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={newStartMin} onChange={(e) => setNewStartMin(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={newStartPeriod} onChange={(e) => setNewStartPeriod(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[8px] uppercase text-indigo-400 font-black mb-1">Shift End</label>
              <div className="flex gap-0.5 justify-center">
                <select value={newEndHour} onChange={(e) => setNewEndHour(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={newEndMin} onChange={(e) => setNewEndMin(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={newEndPeriod} onChange={(e) => setNewEndPeriod(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Grace Period (Minutes)</label>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={newGrace}
              onChange={(e) => setNewGrace(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[9px] font-black text-indigo-400 mt-1 block text-right">{newGrace} Mins Grace</span>
          </div>

          <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer">
            Create Timing Preset
          </button>
        </form>
      ) : (
        /* Edit Shift Form */
        <form onSubmit={handleUpdateSubmit} className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-3">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 flex items-center gap-1">
            <Edit2 className="w-3.5 h-3.5" /> Edit Shift: {editName}
          </span>
          
          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Preset Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                lampOn ? 'bg-white border-slate-250' : 'bg-slate-950 border-slate-850 text-white'
              }`}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-950/20 p-2.5 rounded-2xl border border-slate-900">
            <div>
              <label className="block text-[8px] uppercase text-amber-500 font-black mb-1">Shift Start</label>
              <div className="flex gap-0.5 justify-center">
                <select value={editStartHour} onChange={(e) => setEditStartHour(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={editStartMin} onChange={(e) => setEditStartMin(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={editStartPeriod} onChange={(e) => setEditStartPeriod(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[8px] uppercase text-amber-500 font-black mb-1">Shift End</label>
              <div className="flex gap-0.5 justify-center">
                <select value={editEndHour} onChange={(e) => setEditEndHour(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={editEndMin} onChange={(e) => setEditEndMin(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={editEndPeriod} onChange={(e) => setEditEndPeriod(e.target.value)} className="p-1 rounded bg-[#1E293B] text-white text-xs border border-slate-800">
                  <option value="AM">AM</option>
                  <option value="PM">PM</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Grace Period (Minutes)</label>
            <input
              type="range"
              min="0"
              max="60"
              step="5"
              value={editGrace}
              onChange={(e) => setEditGrace(e.target.value)}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <span className="text-[9px] font-black text-amber-500 mt-1 block text-right">{editGrace} Mins Grace</span>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => setEditingShiftId(null)} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black uppercase rounded-lg">
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* Shifts presets list */}
      <div className="space-y-2 max-h-[350px] overflow-y-auto">
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">Configured Preset Shifts</span>
        {shifts.map(s => (
          <div 
            key={s.id}
            className={`p-3 rounded-2xl border flex justify-between items-center transition-all ${
              lampOn ? 'bg-slate-50 border-slate-200 text-slate-800' : 'bg-slate-900/60 border-slate-850 text-slate-200'
            }`}
          >
            <div>
              <span className="font-black uppercase text-[10px] text-indigo-400 block">{s.name}</span>
              <span className="text-[9px] font-bold text-slate-400">
                {format12HourShiftTime(s.startTime)} to {format12HourShiftTime(s.endTime)}
              </span>
              <span className="text-[8px] text-slate-500 block">({s.gracePeriodMins} min grace period)</span>
            </div>
            
            <div className="flex gap-1">
              <button
                onClick={() => handleEditClick(s)}
                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg transition-all cursor-pointer"
                title="Edit Shift"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              {shifts.length > 1 && (
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete shift preset "${s.name}"?`)) {
                      onDeleteShift(s.id);
                    }
                  }}
                  className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-lg transition-all cursor-pointer"
                  title="Delete Shift"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
