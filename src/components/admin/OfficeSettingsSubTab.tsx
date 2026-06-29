import React, { useState } from 'react';
import { OfficeSettings } from '@/src/types';
import { Sliders, MapPin } from 'lucide-react';

interface OfficeSettingsSubTabProps {
  lampOn: boolean;
  officeSettings: OfficeSettings;
  onSaveOfficeSettings: (name: string, lat: number, lon: number, radius: number, autoOut: string, wrkDays: string[]) => void;
  onCaptureCoordinates: () => Promise<{ latitude: number; longitude: number; address: string }>;
}

export default function OfficeSettingsSubTab({
  lampOn,
  officeSettings,
  onSaveOfficeSettings,
  onCaptureCoordinates
}: OfficeSettingsSubTabProps) {
  const [name, setName] = useState(officeSettings.name);
  const [lat, setLat] = useState(officeSettings.latitude.toString());
  const [lon, setLon] = useState(officeSettings.longitude.toString());
  const [radius, setRadius] = useState(officeSettings.geofenceRadius.toString());
  
  // Custom 12-hour selectors for Auto Punch Out Time
  const parse24HTo12H = (timeStr: string) => {
    const [hStr, mStr] = (timeStr || '00:00').split(':');
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

  const initialTime = parse24HTo12H(officeSettings.autoPunchOutTime);
  const [punchOutHour, setPunchOutHour] = useState(initialTime.hour);
  const [punchOutMin, setPunchOutMin] = useState(initialTime.min);
  const [punchOutPeriod, setPunchOutPeriod] = useState(initialTime.period);

  const [selectedWorkingDays, setSelectedWorkingDays] = useState<string[]>(officeSettings.workingDays);
  const [isCalibrating, setIsCalibrating] = useState(false);

  const get24HTimeStr = (hour: string, min: string, period: string) => {
    let h = parseInt(hour);
    if (period === 'PM' && h < 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${min}`;
  };

  const handleCaptureClick = async () => {
    setIsCalibrating(true);
    try {
      const result = await onCaptureCoordinates();
      setLat(result.latitude.toString());
      setLon(result.longitude.toString());
      alert(`Jaipur Office calibrated successfully to: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const autoOut24 = get24HTimeStr(punchOutHour, punchOutMin, punchOutPeriod);
    onSaveOfficeSettings(
      name.trim(),
      parseFloat(lat),
      parseFloat(lon),
      parseFloat(radius),
      autoOut24,
      selectedWorkingDays
    );
    alert('Office configurations saved!');
  };

  const toggleWorkingDay = (day: string) => {
    setSelectedWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3.5 text-xs pr-0.5">
      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1">
        <Sliders className="w-3.5 h-3.5" /> HQ Perimeter & Geofencing
      </span>

      <div>
        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Office Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
            lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
          }`}
          required
        />
      </div>

      <div className="flex justify-between items-center bg-indigo-600/10 border border-indigo-500/20 p-2.5 rounded-2xl">
        <div className="text-[9px] font-black uppercase text-indigo-400 leading-normal">
          Calibrate HQ Coordinates
        </div>
        <button
          type="button"
          onClick={handleCaptureClick}
          disabled={isCalibrating}
          className="p-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-lg flex items-center gap-1 transition-all text-[8px] cursor-pointer shadow-sm shadow-indigo-600/20"
        >
          <MapPin className="w-3 h-3" />
          {isCalibrating ? 'Pinpointing...' : 'Capture Coordinate'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
            required
          />
        </div>
        <div>
          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
            required
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
            className={`w-full p-2.5 rounded-xl border text-xs font-mono focus:outline-none ${
              lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
            }`}
            required
          />
        </div>
        <div>
          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-1">Auto Punch Out Time</label>
          <div className="flex gap-0.5 justify-center">
            <select value={punchOutHour} onChange={(e) => setPunchOutHour(e.target.value)} className={`p-1 text-xs border rounded focus:outline-none ${lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`}>
              {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <select value={punchOutMin} onChange={(e) => setPunchOutMin(e.target.value)} className={`p-1 text-xs border rounded focus:outline-none ${lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`}>
              {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select value={punchOutPeriod} onChange={(e) => setPunchOutPeriod(e.target.value)} className={`p-1 text-xs border rounded focus:outline-none ${lampOn ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>
      </div>

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
                className={`p-1 px-2.5 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
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
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
      >
        Save Office Settings
      </button>
    </form>
  );
}
