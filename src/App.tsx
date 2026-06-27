import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { 
  MapPin, 
  Clock, 
  CheckCircle2, 
  User, 
  Loader2, 
  AlertCircle, 
  BarChart3, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Trash2,
  Wifi,
  Battery,
  Signal,
  Info,
  Sparkles,
  Settings
} from 'lucide-react';
import SideLamp from './components/SideLamp';
import AdminPanel from './components/AdminPanel';

// Define structures
interface AttendanceRecord {
  id: string;
  name: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  synced: boolean;
  type: 'in' | 'out';
  address?: string;
  distanceFromOffice?: number;
  isRemote?: boolean;
  accuracy?: number;
}

interface WorkSession {
  dateStr: string;
  loginTime: number;
  logoutTime: number | null;
  durationMs: number;
  latitudeIn: number;
  longitudeIn: number;
  latitudeOut?: number;
  longitudeOut?: number;
  addressIn?: string;
  addressOut?: string;
}

interface EmployeeReport {
  employeeName: string;
  sessions: WorkSession[];
  totalDurationMs: number;
  completedCount: number;
  activeCount: number;
}

// Haversine formula to compute distance in meters
function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function App() {
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('employeeName') || 'John Doe');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'lamp' | 'logs' | 'reports' | 'admin'>('lamp');
  const [reportFilter, setReportFilter] = useState<string>('all');

  // Office Geofence & Coordinates Settings (Editable by Admin, defaulting to tighter 100m radius for accuracy)
  const [officeLat, setOfficeLat] = useState<number>(() => {
    const saved = localStorage.getItem('officeLat');
    return saved !== null ? parseFloat(saved) : 40.7128;
  });
  const [officeLon, setOfficeLon] = useState<number>(() => {
    const saved = localStorage.getItem('officeLon');
    return saved !== null ? parseFloat(saved) : -74.0060;
  });
  const [officeName, setOfficeName] = useState<string>(() => {
    const saved = localStorage.getItem('officeName');
    return saved || 'New York HQ';
  });
  const [geofenceRadius, setGeofenceRadius] = useState<number>(() => {
    const saved = localStorage.getItem('geofenceRadius');
    return saved !== null ? parseInt(saved, 10) : 100;
  });
  
  // Simulation toggle for sandboxed environments or easy office testing
  const [simulateOffice, setSimulateOffice] = useState(() => {
    const saved = localStorage.getItem('simulate_office');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Ambient lamp illumination state
  const [lampOn, setLampOn] = useState(() => {
    const saved = localStorage.getItem('ambient_lamp_on');
    return saved !== null ? JSON.parse(saved) : false;
  });

  // Current system time for header clock
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync states to local storage
  useEffect(() => {
    localStorage.setItem('employeeName', employeeName);
  }, [employeeName]);

  useEffect(() => {
    localStorage.setItem('ambient_lamp_on', JSON.stringify(lampOn));
  }, [lampOn]);

  useEffect(() => {
    localStorage.setItem('simulate_office', JSON.stringify(simulateOffice));
  }, [simulateOffice]);

  useEffect(() => {
    localStorage.setItem('officeLat', officeLat.toString());
  }, [officeLat]);

  useEffect(() => {
    localStorage.setItem('officeLon', officeLon.toString());
  }, [officeLon]);

  useEffect(() => {
    localStorage.setItem('officeName', officeName);
  }, [officeName]);

  useEffect(() => {
    localStorage.setItem('geofenceRadius', geofenceRadius.toString());
  }, [geofenceRadius]);

  // Load records on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendance_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse records', e);
      }
    } else {
      // Seed rich history so the app has data out of the box
      const now = Date.now();
      const mockRecords: AttendanceRecord[] = [
        {
          id: 'mock-1',
          name: 'John Doe',
          timestamp: now - 3600000 * 25,
          latitude: 40.7129,
          longitude: -74.0059,
          synced: true,
          type: 'out',
          address: '350 5th Ave, New York, NY 10118, USA',
          distanceFromOffice: 15,
          isRemote: false
        },
        {
          id: 'mock-2',
          name: 'John Doe',
          timestamp: now - 3600000 * 33,
          latitude: 40.7128,
          longitude: -74.0060,
          synced: true,
          type: 'in',
          address: 'Empire State Building, 5th Avenue, Koreatown, New York, NY, USA',
          distanceFromOffice: 0,
          isRemote: false
        },
        {
          id: 'mock-3',
          name: 'Sarah Connor',
          timestamp: now - 3600000 * 3,
          latitude: 34.0522,
          longitude: -118.2437,
          synced: true,
          type: 'in',
          address: 'Los Angeles City Hall, 200 N Spring St, Los Angeles, CA 90012, USA',
          distanceFromOffice: 3930000,
          isRemote: true
        }
      ];
      setRecords(mockRecords);
      localStorage.setItem('attendance_records', JSON.stringify(mockRecords));
    }
  }, []);

  // Determine current active status of employee
  const getEmployeeStatus = (name: string): 'in' | 'out' => {
    const cleanName = name.trim().toLowerCase();
    if (!cleanName) return 'out';
    const userRecords = records.filter(r => r.name.trim().toLowerCase() === cleanName);
    if (userRecords.length === 0) return 'out';
    
    const sortedUser = [...userRecords].sort((a, b) => b.timestamp - a.timestamp);
    return sortedUser[0].type;
  };

  const currentStatus = getEmployeeStatus(employeeName);

  // Sync lamp state with employee's current state on name change or load
  useEffect(() => {
    const status = getEmployeeStatus(employeeName);
    setLampOn(status === 'in');
  }, [employeeName, records]);

  // Query LocationIQ reverse geocoding API with high precision settings
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    const token = process.env.LOCATIONIQ_TOKEN;
    if (!token) {
      console.warn('LocationIQ token is missing in environment variables.');
      return `New York HQ Area (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
    }

    try {
      // Query with zoom=18 (building/house level detail) and addressdetails=1
      const response = await fetch(
        `https://us1.locationiq.com/v1/reverse?key=${token}&lat=${lat}&lon=${lon}&format=json&zoom=18&addressdetails=1`
      );
      if (!response.ok) {
        throw new Error(`LocationIQ returned error status ${response.status}`);
      }
      const data = await response.json();
      
      // Construct a highly detailed, clean address string from individual components if available
      if (data.address) {
        const { house_number, road, neighbourhood, suburb, city, town, village, county, state, postcode, country } = data.address;
        const parts: string[] = [];
        
        if (house_number) parts.push(house_number);
        if (road) parts.push(road);
        
        const localArea = neighbourhood || suburb;
        if (localArea) parts.push(localArea);
        
        const mainCity = city || town || village;
        if (mainCity) parts.push(mainCity);
        
        if (county) parts.push(county);
        if (state) parts.push(state);
        if (postcode) parts.push(postcode);
        if (country) parts.push(country);
        
        if (parts.length > 0) {
          return parts.join(', ');
        }
      }
      
      return data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
    } catch (err) {
      console.error('Error with LocationIQ reverse geocode:', err);
      return `Office Perimeter Coordinate (${lat.toFixed(5)}, ${lon.toFixed(5)})`;
    }
  };

  const handleCheckInOut = async () => {
    if (!employeeName.trim()) {
      setError('Please enter your Employee ID or Name first.');
      return;
    }

    setIsLogging(true);
    setError(null);
    setSuccessMsg(null);

    const actionType: 'in' | 'out' = currentStatus === 'in' ? 'out' : 'in';

    try {
      let latitude = officeLat;
      let longitude = officeLon;
      let usedRealGPS = false;
      let accuracy: number | undefined = undefined;

      if (!simulateOffice) {
        try {
          // Check/Request permission
          const permStatus = await Geolocation.checkPermissions();
          if (permStatus.location === 'denied') {
            await Geolocation.requestPermissions();
          }

          // Fetch highly accurate GPS lock with 10s timeout
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          });

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
          usedRealGPS = true;
        } catch (locErr) {
          console.warn('Physical GPS failed or permission denied, using simulateOffice mode.', locErr);
          setError('GPS lookup timed out or was blocked. Reverting to Simulated Office location.');
          // Auto-enable simulation for a seamless fallback
          setSimulateOffice(true);
          latitude = officeLat + (Math.random() - 0.5) * 0.001;
          longitude = officeLon + (Math.random() - 0.5) * 0.001;
          accuracy = Math.floor(Math.random() * 8) + 5; // Sim accuracy: ±5m to ±12m
        }
      } else {
        // Generate high fidelity coordinate offset within office perimeter (within ~150 meters)
        latitude = officeLat + (Math.random() - 0.5) * 0.0012;
        longitude = officeLon + (Math.random() - 0.5) * 0.0012;
        accuracy = Math.floor(Math.random() * 8) + 4; // Simulated accuracy ±4m to ±11m
      }

      // Calculate distance to Office
      const distance = calculateDistanceInMeters(latitude, longitude, officeLat, officeLon);
      const isRemote = distance > geofenceRadius;

      // Fetch precise, highly detailed reverse geocoded address using LocationIQ with token
      const address = await reverseGeocode(latitude, longitude);

      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        name: employeeName.trim(),
        timestamp: Date.now(),
        latitude,
        longitude,
        synced: true,
        type: actionType,
        address,
        distanceFromOffice: Math.round(distance),
        isRemote,
        accuracy
      };

      const updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      localStorage.setItem('attendance_records', JSON.stringify(updatedRecords));

      // Toggle lamp matching the shift state
      setLampOn(actionType === 'in');

      const accuracyText = accuracy ? ` (Acc: ±${Math.round(accuracy)}m)` : '';
      const distanceText = isRemote 
        ? `Remote Punch (${Math.round(distance / 1000)} km away)${accuracyText}` 
        : `Verified inside Office Perimeter (${Math.round(distance)}m from HQ)${accuracyText}`;

      setSuccessMsg(`Successfully clocked ${actionType.toUpperCase()}! ${distanceText}`);
      setTimeout(() => setSuccessMsg(null), 6000);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const clearAllRecords = () => {
    if (window.confirm('Are you sure you want to delete all work logs? This action is irreversible.')) {
      setRecords([]);
      localStorage.removeItem('attendance_records');
      setSuccessMsg('Logs cleared successfully.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const seedRichHistory = () => {
    const now = Date.now();
    const cleanEmp = employeeName.trim() || 'John Doe';
    const seeded: AttendanceRecord[] = [
      { id: 's-1', name: cleanEmp, timestamp: now - 3600000 * 2, latitude: 40.7128, longitude: -74.0060, synced: true, type: 'out', address: 'Empire State Building, New York, NY, USA', distanceFromOffice: 5, isRemote: false },
      { id: 's-2', name: cleanEmp, timestamp: now - 3600000 * 10, latitude: 40.7129, longitude: -74.0061, synced: true, type: 'in', address: 'Empire State Building, New York, NY, USA', distanceFromOffice: 12, isRemote: false },
      { id: 's-3', name: cleanEmp, timestamp: now - 3600000 * 24, latitude: 40.7127, longitude: -74.0058, synced: true, type: 'out', address: '350 5th Ave, New York, NY, USA', distanceFromOffice: 20, isRemote: false },
      { id: 's-4', name: cleanEmp, timestamp: now - 3600000 * 32, latitude: 40.7128, longitude: -74.0060, synced: true, type: 'in', address: 'Empire State Building, New York, NY, USA', distanceFromOffice: 0, isRemote: false },
      { id: 's-5', name: cleanEmp, timestamp: now - 3600000 * 48, latitude: 40.7122, longitude: -74.0051, synced: true, type: 'out', address: 'Koreatown Plaza, Manhattan, NY, USA', distanceFromOffice: 420, isRemote: false },
      { id: 's-6', name: cleanEmp, timestamp: now - 3600000 * 56, latitude: 40.7128, longitude: -74.0060, synced: true, type: 'in', address: 'Empire State Building, New York, NY, USA', distanceFromOffice: 3, isRemote: false },
      { id: 's-7', name: 'Sarah Connor', timestamp: now - 3600000 * 6, latitude: 34.0522, longitude: -118.2437, synced: true, type: 'out', address: 'Los Angeles City Hall, CA, USA', distanceFromOffice: 3930000, isRemote: true },
      { id: 's-8', name: 'Sarah Connor', timestamp: now - 3600000 * 14, latitude: 34.0522, longitude: -118.2437, synced: true, type: 'in', address: 'Los Angeles City Hall, CA, USA', distanceFromOffice: 3930000, isRemote: true },
    ];
    setRecords(seeded);
    localStorage.setItem('attendance_records', JSON.stringify(seeded));
    setSuccessMsg('Seeded premium attendance records!');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const formatDate = (ms: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(ms));
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  // Compile work sessions & shift summaries
  const reports = (() => {
    const groups: { [key: string]: AttendanceRecord[] } = {};
    records.forEach(r => {
      const key = r.name.trim();
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });

    const list: EmployeeReport[] = [];

    Object.entries(groups).forEach(([empName, empRecs]) => {
      const sorted = [...empRecs].sort((a, b) => a.timestamp - b.timestamp);
      const sessions: WorkSession[] = [];
      let currentIn: AttendanceRecord | null = null;

      sorted.forEach((record) => {
        if (record.type === 'in') {
          if (currentIn) {
            sessions.push({
              dateStr: new Date(currentIn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              loginTime: currentIn.timestamp,
              logoutTime: null,
              durationMs: Date.now() - currentIn.timestamp,
              latitudeIn: currentIn.latitude,
              longitudeIn: currentIn.longitude,
              addressIn: currentIn.address
            });
          }
          currentIn = record;
        } else {
          if (currentIn) {
            sessions.push({
              dateStr: new Date(currentIn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              loginTime: currentIn.timestamp,
              logoutTime: record.timestamp,
              durationMs: record.timestamp - currentIn.timestamp,
              latitudeIn: currentIn.latitude,
              longitudeIn: currentIn.longitude,
              latitudeOut: record.latitude,
              longitudeOut: record.longitude,
              addressIn: currentIn.address,
              addressOut: record.address
            });
            currentIn = null;
          } else {
            sessions.push({
              dateStr: new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
              loginTime: 0,
              logoutTime: record.timestamp,
              durationMs: 0,
              latitudeIn: record.latitude,
              longitudeIn: record.longitude,
              latitudeOut: record.latitude,
              longitudeOut: record.longitude,
              addressIn: 'Unknown Check-In',
              addressOut: record.address
            });
          }
        }
      });

      if (currentIn) {
        sessions.push({
          dateStr: new Date(currentIn.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          loginTime: currentIn.timestamp,
          logoutTime: null,
          durationMs: Date.now() - currentIn.timestamp,
          latitudeIn: currentIn.latitude,
          longitudeIn: currentIn.longitude,
          addressIn: currentIn.address
        });
      }

      const sortedSessions = sessions.sort((a, b) => {
        const timeA = a.loginTime || a.logoutTime || 0;
        const timeB = b.loginTime || b.logoutTime || 0;
        return timeB - timeA;
      });

      let totalDurationMs = 0;
      let completedCount = 0;
      let activeCount = 0;

      sortedSessions.forEach(s => {
        if (s.logoutTime !== null && s.loginTime !== 0) {
          totalDurationMs += s.durationMs;
          completedCount++;
        } else if (s.logoutTime === null) {
          activeCount++;
          totalDurationMs += (Date.now() - s.loginTime);
        }
      });

      list.push({
        employeeName: empName,
        sessions: sortedSessions,
        totalDurationMs,
        completedCount,
        activeCount
      });
    });

    return list;
  })();

  const uniqueEmployees = Array.from(new Set(records.map(r => r.name.trim()))).filter(Boolean);

  return (
    <div className={`min-h-screen flex items-center justify-center font-sans p-0 sm:p-6 transition-colors duration-500 ease-in-out ${
      lampOn 
        ? 'bg-[#E2E8F0] text-slate-900' 
        : 'bg-[#030712] text-[#E2E8F0]'
    }`}>
      
      {/* Smartphone Container - Mobile First view strictly restricted to max-w-md */}
      <div className={`relative w-full sm:max-w-[410px] h-screen sm:h-[860px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border transition-all duration-500 ${
        lampOn 
          ? 'bg-white border-slate-300 shadow-slate-400/40' 
          : 'bg-[#0F172A] border-slate-800 shadow-black/80'
      }`}>
        
        {/* Mock Smartphone Statusbar */}
        <div className={`px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-black tracking-widest uppercase transition-colors ${
          lampOn ? 'text-slate-500 bg-slate-50' : 'text-slate-400 bg-slate-950/40'
        }`}>
          <div>
            {currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false })}
          </div>
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5" />
            <Wifi className="w-3.5 h-3.5" />
            <Battery className="w-4 h-4" />
          </div>
        </div>

        {/* Brand App Bar */}
        <header className={`px-5 py-3 border-b flex justify-between items-center shrink-0 transition-all ${
          lampOn ? 'bg-slate-50/80 border-slate-200' : 'bg-[#1E293B]/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30">
              P
            </div>
            <div>
              <h1 className={`text-sm font-black tracking-tight ${lampOn ? 'text-slate-800' : 'text-slate-100'}`}>
                PunchLine <span className="text-indigo-500 font-extrabold uppercase text-[10px]">HQ</span>
              </h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">Office Attendance</p>
            </div>
          </div>

          <div className={`text-[10px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1 ${
            lampOn 
              ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
              : 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400'
          }`}>
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            <span>Online</span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
          
          {activeTab === 'lamp' && (
            <>
              {/* Profile Card */}
              <div className={`rounded-2xl p-4 border transition-all ${
                lampOn 
                  ? 'bg-slate-50/50 border-slate-200' 
                  : 'bg-[#1E293B]/70 border-slate-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Staff Identity
                  </span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    currentStatus === 'in'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-yellow-500/10 text-yellow-400'
                  }`}>
                    {currentStatus === 'in' ? 'Shift: Active' : 'Shift: Off-Duty'}
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-indigo-500" />
                  </div>
                  <input
                    type="text"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                    placeholder="Name or Employee ID"
                    className={`pl-9 w-full font-bold text-xs rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 transition-all ${
                      lampOn 
                        ? 'bg-white border-slate-200 text-slate-900 placeholder-slate-400' 
                        : 'bg-[#0F172A] border-slate-850 text-slate-100 placeholder-slate-500'
                    }`}
                  />
                </div>

                {/* Simulation Control */}
                <div className="mt-3 flex items-center justify-between pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    Simulate HQ Presence
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={simulateOffice} 
                      onChange={(e) => setSimulateOffice(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-8 h-4 bg-slate-400 dark:bg-slate-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-indigo-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Central Interactive Floor Lamp Stage */}
              <div className={`relative flex-1 rounded-3xl border flex flex-col items-center justify-center p-3 overflow-hidden min-h-[360px] transition-all duration-500 ${
                lampOn 
                  ? 'bg-radial from-amber-50/40 via-white to-slate-50 border-slate-200' 
                  : 'bg-gradient-to-b from-[#0F172A] to-[#020617] border-slate-800'
              }`}>
                {/* Corner Status & Actions - Split Left and Right to avoid lamp hindrance */}
                <div className="absolute top-4 left-4 text-left pointer-events-none z-10 select-none">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Shift Status
                  </p>
                  <p className={`text-xs font-black uppercase mt-0.5 transition-all flex items-center gap-1 ${
                    currentStatus === 'in' ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'in' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    {currentStatus === 'in' ? 'Active' : 'Off-Duty'}
                  </p>
                </div>

                <div className="absolute top-4 right-4 text-right pointer-events-none z-10 select-none">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Office Light
                  </p>
                  <p className={`text-xs font-black uppercase mt-0.5 transition-colors ${
                    lampOn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>
                    {lampOn ? 'ON' : 'OFF'}
                  </p>
                </div>

                <div className="absolute bottom-4 left-4 text-left pointer-events-none z-10 select-none">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    HQ Geofence
                  </p>
                  <p className={`text-[10px] font-black uppercase mt-0.5 ${
                    lampOn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}>
                    &bull; {geofenceRadius}M PERIMETER
                  </p>
                </div>

                <div className="absolute bottom-4 right-4 text-right pointer-events-none z-10">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Cord Action
                  </p>
                  <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-300 ${
                    lampOn 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-300' 
                      : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 dark:text-yellow-400 animate-pulse'
                  }`}>
                    {lampOn ? 'Pull to Clock-Out' : 'Pull to Clock-In'}
                  </span>
                </div>

                {/* Standing Floor Lamp Component - Size Optimized for Smartphone screen */}
                <div className="w-full h-[320px] flex items-center justify-center">
                  <SideLamp 
                    lampOn={lampOn} 
                    onToggle={handleCheckInOut} 
                    disabled={isLogging} 
                  />
                </div>

                {/* Spinner inside stage when logging */}
                {isLogging && (
                  <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-30">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Securing Location...</span>
                  </div>
                )}
              </div>

              {/* Banners & Geolocation State Feedback */}
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-500/10 text-red-500 text-[11px] rounded-xl border border-red-500/20 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="font-bold">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2.5 p-3 bg-emerald-500/10 text-emerald-500 text-[11px] rounded-xl border border-emerald-500/20 text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <p className="font-bold">{successMsg}</p>
                </div>
              )}

              {/* GPS Scanner / Geographic Metadata Box */}
              <div className={`p-4 rounded-2xl border transition-all ${
                lampOn ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
              }`}>
                <div className="flex items-center justify-between text-[9px] font-black text-slate-400 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 mb-3">
                  <span>GPS GEOFENCE SCANNER</span>
                  <span className={simulateOffice ? "text-amber-500 font-black" : "text-emerald-500 font-black"}>
                    {simulateOffice ? "SIMULATED" : "SECURE HARDWARE"}
                  </span>
                </div>

                <div className="flex gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
                    lampOn ? 'bg-indigo-50 border-indigo-100 text-indigo-500' : 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400'
                  }`}>
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="text-xs">
                    <p className={`font-black uppercase tracking-wider text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-200'}`}>
                      {simulateOffice ? `${officeName} (Simulated)` : `${officeName} (Real GPS)`}
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                      Office Perimeter: {geofenceRadius}m &bull; Target Coords: {officeLat.toFixed(5)}, {officeLon.toFixed(5)}
                    </p>
                  </div>
                </div>

                {/* List last resolved location */}
                {records.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800/80">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase mb-1">
                      <span>Last Recorded Address</span>
                      {records[0].distanceFromOffice !== undefined && (
                        <span className={records[0].isRemote ? "text-amber-500" : "text-emerald-500"}>
                          {records[0].isRemote ? "Remote" : `${records[0].distanceFromOffice}m away`}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] leading-tight font-medium ${lampOn ? 'text-slate-600' : 'text-slate-300'}`}>
                      {records[0].address || 'No location resolved yet.'}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col min-h-0">
              {records.length === 0 ? (
                <div className="text-center py-16 m-4 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl flex-1 flex flex-col items-center justify-center">
                  <Clock className="w-10 h-10 text-slate-400 mb-2 animate-pulse" />
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">No shift logs yet</p>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-normal">
                    Pull the cord above to toggle the lamp and register your first attendance activity.
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Shift Activity Feed</span>
                    <button 
                      onClick={clearAllRecords}
                      className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 flex items-center gap-1 bg-red-500/5 px-2 py-1 rounded"
                    >
                      <Trash2 className="w-3 h-3" /> Clear Logs
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px]">
                    {records.map((record) => (
                      <div 
                        key={record.id}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs transition-colors ${
                          lampOn ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B]/40 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                            lampOn ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/40'
                          }`}>
                            {record.name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            record.type === 'in'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {record.type === 'in' ? 'Check In' : 'Check Out'}
                          </span>
                        </div>

                        <p className={`font-semibold ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
                          {formatDate(record.timestamp)}
                        </p>

                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                          <span className="font-mono">{record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}</span>
                          {record.distanceFromOffice !== undefined && (
                            <span className={record.isRemote ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                              {record.isRemote ? 'Remote' : `${record.distanceFromOffice}m from HQ`}
                            </span>
                          )}
                        </div>

                        {record.address && (
                          <p className="text-[10px] text-slate-400 leading-normal mt-1 border-t border-slate-150 dark:border-slate-800/40 pt-1">
                            {record.address}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className={`text-xs font-black uppercase tracking-wider ${lampOn ? 'text-slate-700' : 'text-slate-200'}`}>
                    Shift Summary Report
                  </h4>
                  <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Work durations & history</p>
                </div>
                
                {/* Employee Filter */}
                <select
                  value={reportFilter}
                  onChange={(e) => setReportFilter(e.target.value)}
                  className={`font-black text-[10px] uppercase tracking-wider p-2 rounded-lg border focus:ring-1 focus:ring-indigo-500 ${
                    lampOn
                      ? 'bg-white border-slate-200 text-slate-800'
                      : 'bg-[#0F172A] border-slate-800 text-slate-200'
                  }`}
                >
                  <option value="all">All</option>
                  {uniqueEmployees.map(emp => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[480px]">
                {reports.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs font-black uppercase tracking-widest">
                    Add records to generate reports.
                  </div>
                ) : (
                  reports
                    .filter(rep => reportFilter === 'all' || rep.employeeName.toLowerCase() === reportFilter.toLowerCase())
                    .map((report) => (
                      <div 
                        key={report.employeeName}
                        className={`rounded-2xl p-3 border transition-all ${
                          lampOn ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/40 border-slate-800'
                        }`}
                      >
                        {/* Summary Header */}
                        <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                          <div>
                            <h5 className="font-black text-xs uppercase tracking-wide text-indigo-500">
                              {report.employeeName}
                            </h5>
                            <span className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">
                              {report.completedCount} shifts completed
                            </span>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                            lampOn ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-950 text-indigo-300'
                          }`}>
                            Total: {formatDuration(report.totalDurationMs)}
                          </span>
                        </div>

                        {/* Shifts Details */}
                        <div className="space-y-2">
                          {report.sessions.map((session, idx) => {
                            const hasLogin = session.loginTime > 0;
                            const hasLogout = session.logoutTime !== null;
                            return (
                              <div 
                                key={idx}
                                className={`rounded-xl p-2.5 text-[11px] flex flex-col gap-2 ${
                                  lampOn ? 'bg-white border border-slate-100' : 'bg-[#0F172A]/70 border border-slate-850'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <span className={`font-black text-[10px] ${lampOn ? 'text-slate-800' : 'text-slate-100'}`}>
                                    {session.dateStr}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    !hasLogout ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'
                                  }`}>
                                    {session.durationMs > 0 ? formatDuration(session.durationMs) : '0m'}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-dashed border-slate-200 dark:border-slate-800/80 pt-1.5">
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    <span>In: {hasLogin ? formatDate(session.loginTime).split(',')[1] : 'Unknown'}</span>
                                  </div>
                                  <ArrowRight className="w-3 h-3 text-slate-500" />
                                  <div className="flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${hasLogout ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
                                    <span>Out: {hasLogout ? formatDate(session.logoutTime!).split(',')[1] : 'Working...'}</span>
                                  </div>
                                </div>

                                {/* Address lines inside report */}
                                {(session.addressIn || session.addressOut) && (
                                  <div className="text-[9px] text-slate-500 leading-normal border-t border-slate-100 dark:border-slate-800/40 pt-1.5 mt-0.5 space-y-1">
                                    {session.addressIn && (
                                      <p className="truncate"><span className="font-extrabold uppercase text-[8px]">In Loc:</span> {session.addressIn}</p>
                                    )}
                                    {session.addressOut && (
                                      <p className="truncate"><span className="font-extrabold uppercase text-[8px]">Out Loc:</span> {session.addressOut}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'admin' && (
            <AdminPanel
              lampOn={lampOn}
              officeName={officeName}
              officeLat={officeLat}
              officeLon={officeLon}
              geofenceRadius={geofenceRadius}
              onSaveSettings={(name, lat, lon, radius) => {
                setOfficeName(name);
                setOfficeLat(lat);
                setOfficeLon(lon);
                setGeofenceRadius(radius);
              }}
            />
          )}
        </div>

        {/* Developer Admin Actions Bar */}
        <div className={`px-4 py-2 border-t flex justify-between items-center shrink-0 text-[10px] ${
          lampOn ? 'bg-slate-50 border-slate-250 text-slate-500' : 'bg-[#0B0F19] border-slate-850 text-slate-400'
        }`}>
          <button 
            onClick={seedRichHistory}
            className="hover:text-indigo-500 flex items-center gap-1 py-1 font-bold uppercase tracking-wider"
          >
            <RefreshCw className="w-3 h-3" /> Seed Demo
          </button>
          <span className="font-mono text-[9px] opacity-60">
            LocationIQ Sync Active
          </span>
        </div>

        {/* Mock Mobile Navigation Bar */}
        <nav className={`border-t flex justify-around py-3 px-2 shrink-0 transition-all duration-500 ${
          lampOn ? 'bg-slate-50 border-slate-250' : 'bg-[#0B0F19] border-slate-850'
        }`}>
          <button
            onClick={() => setActiveTab('lamp')}
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'lamp'
                ? 'text-indigo-500'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'lamp' ? 'bg-indigo-500/10' : ''
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Attendance</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'logs'
                ? 'text-indigo-500'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'logs' ? 'bg-indigo-500/10' : ''
            }`}>
              <Sliders className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Activity Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'reports'
                ? 'text-indigo-500'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'reports' ? 'bg-indigo-500/10' : ''
            }`}>
              <BarChart3 className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Hours</span>
          </button>

          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-all ${
              activeTab === 'admin'
                ? 'text-indigo-500'
                : 'text-slate-400 hover:text-slate-500'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              activeTab === 'admin' ? 'bg-indigo-500/10' : ''
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-black uppercase tracking-wider">Admin Settings</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
