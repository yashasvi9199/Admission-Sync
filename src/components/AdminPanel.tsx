import React, { useState } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { 
  MapPin, 
  Compass, 
  Navigation, 
  Save, 
  RotateCcw, 
  Map, 
  Target, 
  Loader2, 
  Check, 
  Settings,
  AlertCircle
} from 'lucide-react';

interface AdminPanelProps {
  lampOn: boolean;
  officeName: string;
  officeLat: number;
  officeLon: number;
  geofenceRadius: number;
  onSaveSettings: (name: string, lat: number, lon: number, radius: number) => void;
}

export default function AdminPanel({
  lampOn,
  officeName,
  officeLat,
  officeLon,
  geofenceRadius,
  onSaveSettings,
}: AdminPanelProps) {
  const [name, setName] = useState(officeName);
  const [lat, setLat] = useState(officeLat.toString());
  const [lon, setLon] = useState(officeLon.toString());
  const [radius, setRadius] = useState(geofenceRadius.toString());
  
  const [isLocating, setIsLocating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set standard geographic office presets
  const handleApplyPreset = (presetName: string, presetLat: number, presetLon: number) => {
    setName(presetName);
    setLat(presetLat.toFixed(6));
    setLon(presetLon.toFixed(6));
    setErrorMsg(null);
    setSuccessMsg(`Preset "${presetName}" values loaded. Tap Save to apply.`);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

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

  const handleReset = () => {
    setName('New York HQ');
    setLat('40.712800');
    setLon('-74.006000');
    setRadius('100');
    setErrorMsg(null);
    setSuccessMsg('Reset to default New York HQ values. Tap Save to apply.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`text-xs font-black uppercase tracking-wider ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
            Geofence Admin Panel
          </h4>
          <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Configure Corporate Office perimeter & coords</p>
        </div>
        <Settings className={`w-4 h-4 ${lampOn ? 'text-indigo-600' : 'text-indigo-400'}`} />
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-0.5">
        
        {/* Presets Quick Action */}
        <div className={`rounded-2xl p-3.5 border transition-all ${
          lampOn ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/40 border-slate-800'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-2.5">
            Office Geographic Presets
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleApplyPreset('New York HQ', 40.7128, -74.0060)}
              className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all ${
                lampOn 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              🗽 NY HQ
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('SF Tech Hub', 37.7749, -122.4194)}
              className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all ${
                lampOn 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              🌉 SF Hub
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('London Office', 51.5074, -0.1278)}
              className={`p-2 rounded-xl border text-[10px] font-bold text-center transition-all ${
                lampOn 
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100' 
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
              }`}
            >
              🎡 London
            </button>
          </div>
        </div>

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
          
          {/* Office Name/Address */}
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
            {/* Latitude */}
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

            {/* Longitude */}
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

          {/* Radius Perimeter */}
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
            <span className="text-[8px] text-slate-400 mt-1 block">
              💡 Smaller radius (e.g. 50m - 100m) ensures high-precision inside-office verification.
            </span>
          </div>

          {/* Error and Success Status Notifications */}
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

          {/* Form Action Buttons */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border flex items-center justify-center gap-1 transition-all ${
                lampOn 
                  ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700' 
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <RotateCcw className="w-3 h-3" /> Reset Default
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1 transition-all shadow-md shadow-emerald-600/20"
            >
              <Save className="w-3 h-3" /> Save Changes
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
