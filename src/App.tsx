import React, { useState, useEffect } from 'react';
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
  Sliders,
  Trash2,
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Info,
  Sparkles,
  Settings,
  LogOut,
  Calendar,
  Coffee,
  Utensils,
  Bell,
  Check,
  UserCheck
} from 'lucide-react';
import SideLamp from './components/SideLamp';
import AdminPanel from './components/AdminPanel';
import { 
  User as DbUser, 
  Shift, 
  AttendanceRecord, 
  BreakRecord, 
  LeaveRequest, 
  getStoredUsers, 
  getStoredShifts, 
  getStoredAttendance, 
  getStoredBreaks, 
  getStoredLeaves, 
  getStoredOfflineQueue,
  getActiveUser,
  registerUser,
  loginUser,
  logoutUser,
  updateUserRole,
  updateUserShift,
  addShift,
  addAttendanceRecord,
  editAttendanceTimestamp,
  toggleBreak,
  getActiveBreak,
  submitLeave,
  updateLeaveStatus,
  syncQueue,
  performMidnightAutoPunchOut
} from './db/localDb';

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
  // App state
  const [activeUser, setActiveUser] = useState<DbUser | null>(null);
  const [users, setUsers] = useState<DbUser[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [breaks, setBreaks] = useState<BreakRecord[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  // Authentication form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regRole, setRegRole] = useState<'Admin' | 'Sales' | 'Developer' | 'HR' | 'Manager' | 'User'>('User');
  const [regShiftId, setRegShiftId] = useState('');
  const [loginUsernameVal, setLoginUsernameVal] = useState('');
  const [loginPasswordVal, setLoginPasswordVal] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Connectivity
  const [isOnline, setIsOnline] = useState(true);

  // Main navigation
  const [activeTab, setActiveTab] = useState<'attendance' | 'logs' | 'hours' | 'leaves' | 'admin'>('attendance');

  // Office configuration (defaults)
  const [officeLat, setOfficeLat] = useState(40.7128);
  const [officeLon, setOfficeLon] = useState(-74.0060);
  const [officeName, setOfficeName] = useState('New York HQ');
  const [geofenceRadius, setGeofenceRadius] = useState(100);

  // Simulation controls
  const [simulateOffice, setSimulateOffice] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Leave Form state
  const [leaveType, setLeaveType] = useState<'annual' | 'sick' | 'casual' | 'other'>('annual');
  const [leaveStart, setLeaveStart] = useState('');
  const [leaveEnd, setLeaveEnd] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load configuration and run checkups
  useEffect(() => {
    // Run midnight punchout check
    performMidnightAutoPunchOut();

    // Load presets
    const savedLat = localStorage.getItem('officeLat');
    const savedLon = localStorage.getItem('officeLon');
    const savedName = localStorage.getItem('officeName');
    const savedRadius = localStorage.getItem('geofenceRadius');
    if (savedLat) setOfficeLat(parseFloat(savedLat));
    if (savedLon) setOfficeLon(parseFloat(savedLon));
    if (savedName) setOfficeName(savedName);
    if (savedRadius) setGeofenceRadius(parseInt(savedRadius, 10));

    // Reload local database states
    refreshDbStates();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const refreshDbStates = () => {
    setActiveUser(getActiveUser());
    setUsers(getStoredUsers());
    setRecords(getStoredAttendance());
    setBreaks(getStoredBreaks());
    setLeaves(getStoredLeaves());
    setShifts(getStoredShifts());
    setOfflineQueueCount(getStoredOfflineQueue().length);
  };

  // Sync state if connectivity returns online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
      refreshDbStates();
    }
  }, [isOnline]);

  // Check username preview on typing names
  const getUsernamePreview = () => {
    if (!regFirstName.trim() || !regLastName.trim()) return '';
    // Mock preview (simplified collisionless version for UI feedback)
    const first = regFirstName.trim().toLowerCase().replace(/[^a-z]/g, '');
    const last = regLastName.trim().toLowerCase().replace(/[^a-z]/g, '');
    return last.length > 0 ? last[0] + first.substring(0, 4) : first.substring(0, 4);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { user, error } = registerUser(regFirstName, regLastName, regRole, regShiftId || shifts[0]?.id);
    if (error) {
      setAuthError(error);
      return;
    }
    // Auto-login
    loginUser(user.username);
    setRegFirstName('');
    setRegLastName('');
    refreshDbStates();
    setActiveTab('attendance');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { user, error } = loginUser(loginUsernameVal, loginPasswordVal);
    if (error) {
      setAuthError(error);
      return;
    }
    setLoginUsernameVal('');
    setLoginPasswordVal('');
    refreshDbStates();
    setActiveTab('attendance');
  };

  const handleLogout = () => {
    logoutUser();
    refreshDbStates();
  };

  // Determine current active status
  const getEmployeeStatus = (): 'in' | 'out' => {
    if (!activeUser) return 'out';
    const userPunches = records.filter(r => r.userId === activeUser.id);
    if (userPunches.length === 0) return 'out';
    const sorted = [...userPunches].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].type;
  };

  const currentStatus = getEmployeeStatus();
  const currentBreak = activeUser ? getActiveBreak(activeUser.id) : null;

  // Punch actions
  const handleCheckInOut = async () => {
    if (!activeUser) return;
    setIsLogging(true);
    setError(null);
    setSuccessMsg(null);

    const nextType: 'in' | 'out' = currentStatus === 'in' ? 'out' : 'in';

    try {
      let latitude = officeLat;
      let longitude = officeLon;
      let usedRealGPS = false;
      let accuracy: number | undefined = undefined;

      if (!simulateOffice) {
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

          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          accuracy = position.coords.accuracy;
          usedRealGPS = true;
        } catch (locErr) {
          console.warn('Physical GPS failed, falling back to simulated HQ coords.', locErr);
          setSimulateOffice(true);
          latitude = officeLat + (Math.random() - 0.5) * 0.001;
          longitude = officeLon + (Math.random() - 0.5) * 0.001;
        }
      } else {
        // Generate coordinates close to HQ
        latitude = officeLat + (Math.random() - 0.5) * 0.001;
        longitude = officeLon + (Math.random() - 0.5) * 0.001;
        accuracy = Math.floor(Math.random() * 8) + 4;
      }

      // Check distance
      const distance = calculateDistanceInMeters(latitude, longitude, officeLat, officeLon);
      const isRemote = distance > geofenceRadius;

      // Sales Role bypasses geofence limits. Regular users are blocked if out of geofence bounds and not simulating
      if (activeUser.role !== 'Sales' && isRemote && !simulateOffice) {
        throw new Error(`Geofence Blocked: You are currently ${Math.round(distance)}m from HQ. Only Sales role can punch from anywhere.`);
      }

      const addressText = isRemote 
        ? `Remote Area (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
        : `${officeName} Area (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;

      addAttendanceRecord(activeUser.id, {
        timestamp: Date.now(),
        type: nextType,
        latitude,
        longitude,
        address: addressText,
        distanceFromOffice: Math.round(distance),
        isRemote,
        accuracy
      }, isOnline);

      refreshDbStates();
      setSuccessMsg(`Successfully clocked ${nextType.toUpperCase()}! ${isRemote ? 'Remote Punch Registered' : 'HQ Geofence Verified'}`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Location verification failed.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleToggleBreakAction = (type: 'lunch' | 'coffee' | 'personal') => {
    if (!activeUser) return;
    toggleBreak(activeUser.id, type, isOnline);
    refreshDbStates();
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser || !leaveStart || !leaveEnd || !leaveReason.trim()) return;

    submitLeave(activeUser.id, leaveType, leaveStart, leaveEnd, leaveReason.trim(), isOnline);
    setLeaveStart('');
    setLeaveEnd('');
    setLeaveReason('');
    refreshDbStates();
    setSuccessMsg('Leave request submitted and pending approval.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleEditRecordTimestamp = (recordId: string, inputString: string) => {
    const newDate = new Date(inputString);
    if (isNaN(newDate.getTime())) return;
    editAttendanceTimestamp(recordId, newDate.getTime());
    refreshDbStates();
  };

  // Compile calculations for Hours Tab (Overtime)
  const getUserWorkSummary = () => {
    if (!activeUser) return { regularMs: 0, overtimeMs: 0, sessions: [] };

    const userPunches = records.filter(r => r.userId === activeUser.id);
    const sorted = [...userPunches].sort((a, b) => a.timestamp - b.timestamp);
    const sessions: { date: string; duration: number; regular: number; overtime: number }[] = [];

    let currentIn: AttendanceRecord | null = null;

    sorted.forEach(p => {
      if (p.type === 'in') {
        currentIn = p;
      } else if (p.type === 'out' && currentIn) {
        const durationMs = p.timestamp - currentIn.timestamp;
        const durationHrs = durationMs / 3600000;
        
        let regularHrs = Math.min(durationHrs, 8);
        let overtimeHrs = Math.max(0, durationHrs - 8);

        sessions.push({
          date: new Date(currentIn.timestamp).toLocaleDateString(),
          duration: durationMs,
          regular: regularHrs * 3600000,
          overtime: overtimeHrs * 3600000
        });

        currentIn = null;
      }
    });

    if (currentIn) {
      const runningMs = Date.now() - currentIn.timestamp;
      const runningHrs = runningMs / 3600000;
      let regularHrs = Math.min(runningHrs, 8);
      let overtimeHrs = Math.max(0, runningHrs - 8);
      sessions.push({
        date: new Date(currentIn.timestamp).toLocaleDateString(),
        duration: runningMs,
        regular: regularHrs * 3600000,
        overtime: overtimeHrs * 3600000
      });
    }

    const totalRegular = sessions.reduce((acc, curr) => acc + curr.regular, 0);
    const totalOvertime = sessions.reduce((acc, curr) => acc + curr.overtime, 0);

    return {
      regularMs: totalRegular,
      overtimeMs: totalOvertime,
      sessions: sessions.reverse()
    };
  };

  // Missing Punch Alarm Check (> 9 hours punched in)
  const checkMissingPunch = () => {
    if (!activeUser || currentStatus !== 'in') return false;
    const userPunches = records.filter(r => r.userId === activeUser.id);
    const lastIn = [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!lastIn) return false;
    
    const diffHours = (Date.now() - lastIn.timestamp) / 3600000;
    return diffHours > 9;
  };

  // Pre-Shift Reminder Check (15 mins before user shift)
  const checkPreShiftReminder = () => {
    if (!activeUser || currentStatus === 'in') return false;
    const shift = shifts.find(s => s.id === activeUser.shiftId);
    if (!shift) return false;

    const [shHours, shMins] = shift.startTime.split(':').map(Number);
    const shiftTimeToday = new Date();
    shiftTimeToday.setHours(shHours, shMins, 0, 0);

    const diffMins = (shiftTimeToday.getTime() - Date.now()) / 60000;
    // Highlight if within 0 to 15 minutes before shift start
    return diffMins > 0 && diffMins <= 15;
  };

  const workSummary = getUserWorkSummary();
  const showMissingPunchBanner = checkMissingPunch();
  const showPreShiftReminder = checkPreShiftReminder();

  return (
    <div className={`min-h-screen flex items-center justify-center font-sans p-0 sm:p-6 transition-colors duration-500 ease-in-out ${
      currentStatus === 'in' 
        ? 'bg-[#E2E8F0] text-slate-900' 
        : 'bg-[#030712] text-[#E2E8F0]'
    }`}>
      
      {/* Smartphone Frame */}
      <div className={`relative w-full sm:max-w-[410px] h-screen sm:h-[860px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border transition-all duration-500 ${
        currentStatus === 'in' 
          ? 'bg-white border-slate-300 shadow-slate-400/40' 
          : 'bg-[#0F172A] border-slate-800 shadow-black/80'
      }`}>
        
        {/* Mock Statusbar */}
        <div className={`px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-black tracking-widest uppercase transition-colors ${
          currentStatus === 'in' ? 'text-slate-500 bg-slate-50' : 'text-slate-400 bg-slate-950/40'
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
          currentStatus === 'in' ? 'bg-slate-50/80 border-slate-200' : 'bg-[#1E293B]/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md shadow-indigo-600/30">
              A
            </div>
            <div>
              <h1 className={`text-sm font-black tracking-tight ${currentStatus === 'in' ? 'text-slate-800' : 'text-slate-100'}`}>
                AeroPunchin
              </h1>
              <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest -mt-0.5">Automated Attendance</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Alert Queue Count */}
            {offlineQueueCount > 0 && (
              <button 
                onClick={() => { syncQueue(); refreshDbStates(); }}
                className="text-[9px] font-black bg-amber-500 hover:bg-amber-600 text-slate-950 px-2 py-0.5 rounded-full animate-bounce"
              >
                Sync ({offlineQueueCount})
              </button>
            )}

            {/* Offline/Online toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`text-[9px] font-bold px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${
                isOnline 
                  ? 'bg-emerald-50 border-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400' 
                  : 'bg-rose-50 border-rose-100 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-rose-500 animate-pulse" />
                  <span>Offline</span>
                </>
              )}
            </button>

            {activeUser && (
              <button 
                onClick={handleLogout}
                title="Logout"
                className={`p-1.5 rounded-full border ${currentStatus === 'in' ? 'border-slate-200 text-slate-500 hover:bg-slate-100' : 'border-slate-800 text-slate-400 hover:bg-slate-800'}`}
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </header>

        {/* Banners & Geolocation Alerts */}
        {showMissingPunchBanner && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-2.5 text-amber-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 leading-tight">
            <Bell className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Missing Punch: Active for &gt;9 hrs! Clock out or edit timestamps.</span>
          </div>
        )}

        {showPreShiftReminder && (
          <div className="bg-indigo-500/10 border-b border-indigo-500/20 p-2.5 text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 leading-tight">
            <Bell className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Shift starts in 15 mins! Clock in as you approach the building.</span>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
          
          {/* AUTHENTICATION VIEW */}
          {!activeUser ? (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className={`p-5 rounded-3xl border transition-all ${
                currentStatus === 'in' ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
              }`}>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black tracking-tight text-indigo-500">Welcome to AeroPunchin</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">First user becomes Admin automatically</p>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. yhaldiya"
                        value={loginUsernameVal}
                        onChange={(e) => setLoginUsernameVal(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:ring-1 focus:ring-indigo-500 transition-colors ${
                          currentStatus === 'in' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Password (optional)
                      </label>
                      <input
                        type="password"
                        placeholder="e.g. admin"
                        value={loginPasswordVal}
                        onChange={(e) => setLoginPasswordVal(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:ring-1 focus:ring-indigo-500 transition-colors ${
                          currentStatus === 'in' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/20"
                    >
                      Authenticate Sign In
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold">
                      Need a profile?{' '}
                      <button 
                        type="button" 
                        onClick={() => setAuthMode('register')} 
                        className="text-indigo-400 hover:underline"
                      >
                        Register Profile
                      </button>
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          First Name
                        </label>
                        <input
                          type="text"
                          placeholder="John"
                          value={regFirstName}
                          onChange={(e) => setRegFirstName(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                            currentStatus === 'in' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                          Last Name
                        </label>
                        <input
                          type="text"
                          placeholder="Doe"
                          value={regLastName}
                          onChange={(e) => setRegLastName(e.target.value)}
                          className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                            currentStatus === 'in' ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Select Core Role
                      </label>
                      <select
                        value={regRole}
                        onChange={(e) => setRegRole(e.target.value as any)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                          currentStatus === 'in' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <option value="User">User (Developer/Regular)</option>
                        <option value="Sales">Sales Role (Clock from anywhere)</option>
                        <option value="HR">HR Dept</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">
                        Assign Initial Shift
                      </label>
                      <select
                        value={regShiftId}
                        onChange={(e) => setRegShiftId(e.target.value)}
                        className={`w-full p-2.5 rounded-xl border text-xs font-bold ${
                          currentStatus === 'in' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                        }`}
                      >
                        <option value="">-- Choose Shift --</option>
                        {shifts.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                        ))}
                      </select>
                    </div>

                    {/* Live Preview of generateUsername */}
                    {getUsernamePreview() && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                        Generated Username Preview: <span className="underline font-black">{getUsernamePreview()}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-indigo-600/20"
                    >
                      Complete Registration
                    </button>
                    <p className="text-center text-[10px] text-slate-400 font-bold">
                      Already have username?{' '}
                      <button 
                        type="button" 
                        onClick={() => setAuthMode('login')} 
                        className="text-indigo-400 hover:underline"
                      >
                        Log In
                      </button>
                    </p>
                  </form>
                )}

                {authError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-1 animate-shake">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ATTENDANCE WORKFLOW (LAMP STAGE) */}
              {activeTab === 'attendance' && (
                <>
                  {/* Dashboard Profile Overview */}
                  <div className={`rounded-2xl p-3 border transition-all ${
                    currentStatus === 'in' ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black">
                          <UserCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span className={`text-[10px] font-black uppercase block ${currentStatus === 'in' ? 'text-slate-800' : 'text-slate-100'}`}>
                            {activeUser.firstName} {activeUser.lastName}
                          </span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest -mt-0.5">
                            Role: {activeUser.role} &bull; @{activeUser.username}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          currentStatus === 'in'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {currentStatus === 'in' ? 'Active' : 'Off-Duty'}
                        </span>
                      </div>
                    </div>

                    {/* Simulated HQ Presence switch */}
                    <div className="mt-2.5 pt-2.5 border-t border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Simulate HQ Location
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

                  {/* Interactive Lamp Stage */}
                  <div className={`relative flex-1 rounded-3xl border flex flex-col items-center justify-center p-3 overflow-hidden min-h-[340px] transition-all duration-500 ${
                    currentStatus === 'in' 
                      ? 'bg-radial from-amber-50/40 via-white to-slate-50 border-slate-200' 
                      : 'bg-gradient-to-b from-[#0F172A] to-[#020617] border-slate-800'
                  }`}>
                    {/* Status labels */}
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
                        Office Light On/Off
                      </p>
                      <p className={`text-xs font-black uppercase mt-0.5 transition-colors ${
                        currentStatus === 'in' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}>
                        {currentStatus === 'in' ? 'ON' : 'OFF'}
                      </p>
                    </div>

                    <div className="absolute bottom-4 left-4 text-left pointer-events-none z-10 select-none">
                      <p className={`text-[10px] font-black uppercase mt-0.5 ${
                        currentStatus === 'in' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                      }`}>
                        HQ Geofence : {geofenceRadius}M perimeter
                      </p>
                    </div>

                    <div className="absolute bottom-4 right-4 text-right pointer-events-none z-10">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                        Cord Action
                      </p>
                      <span className={`inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border transition-all duration-300 ${
                        currentStatus === 'in' 
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/40 dark:text-indigo-300' 
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 dark:text-yellow-400 animate-pulse'
                      }`}>
                        {currentStatus === 'in' ? 'CLICK TO CLOCK-OUT' : 'CLICK TO CLOCK-IN'}
                      </span>
                    </div>

                    {/* Lamp Component */}
                    <div className="w-full h-[300px] flex items-center justify-center">
                      <SideLamp 
                        lampOn={currentStatus === 'in'} 
                        onToggle={handleCheckInOut} 
                        disabled={isLogging} 
                      />
                    </div>

                    {/* Logging Overlay */}
                    {isLogging && (
                      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-30">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Verifying Geofence...</span>
                      </div>
                    )}
                  </div>

                  {/* BREAK TRACKING PANEL (Only active when punched in) */}
                  {currentStatus === 'in' && (
                    <div className={`p-4 rounded-2xl border transition-all ${
                      currentStatus === 'in' ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
                    }`}>
                      <div className="flex items-center justify-between text-[9px] font-black text-slate-400 border-b border-dashed border-slate-200 dark:border-slate-800 pb-2 mb-3">
                        <span>BREAK STATUS PANEL</span>
                        <span className={currentBreak ? "text-amber-500 font-black animate-pulse" : "text-emerald-500 font-black"}>
                          {currentBreak ? `ON ${currentBreak.type.toUpperCase()} BREAK` : "WORKING"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handleToggleBreakAction('lunch')}
                          className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                            currentBreak?.type === 'lunch'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <Utensils className="w-3.5 h-3.5" />
                          <span>Lunch</span>
                        </button>
                        <button
                          onClick={() => handleToggleBreakAction('coffee')}
                          className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                            currentBreak?.type === 'coffee'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <Coffee className="w-3.5 h-3.5" />
                          <span>Coffee</span>
                        </button>
                        <button
                          onClick={() => handleToggleBreakAction('personal')}
                          className={`p-2 rounded-xl border text-[10px] font-bold flex flex-col items-center gap-1 transition-all ${
                            currentBreak?.type === 'personal'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-500'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>Personal</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Feedback alerts */}
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
                </>
              )}

              {/* LOGS ACTIVITY VIEW */}
              {activeTab === 'logs' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Company Log Feed</span>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[500px]">
                    {records.map(rec => (
                      <div 
                        key={rec.id}
                        className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs transition-colors ${
                          currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B]/40 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                            currentStatus === 'in' ? 'bg-indigo-50 text-indigo-700' : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/40'
                          }`}>
                            {rec.name}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                            rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                          }`}>
                            {rec.type === 'in' ? 'Check In' : 'Check Out'}
                          </span>
                        </div>

                        {/* Date display & Admin timestamp editor */}
                        {activeUser.role === 'Admin' || activeUser.role === 'Manager' ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-400">Timestamp:</span>
                            <input
                              type="datetime-local"
                              defaultValue={new Date(rec.timestamp - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                              onChange={(e) => handleEditRecordTimestamp(rec.id, e.target.value)}
                              className={`p-1 rounded text-[10px] font-mono border ${
                                currentStatus === 'in' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'
                              }`}
                            />
                          </div>
                        ) : (
                          <p className={`font-semibold ${currentStatus === 'in' ? 'text-slate-700' : 'text-slate-200'}`}>
                            {new Date(rec.timestamp).toLocaleString()}
                          </p>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
                          <span className="font-mono">{rec.latitude.toFixed(4)}, {rec.longitude.toFixed(4)}</span>
                          <span className={rec.isRemote ? 'text-amber-500 font-bold' : 'text-emerald-500 font-bold'}>
                            {rec.isRemote ? 'Remote' : `${rec.distanceFromOffice}m from HQ`}
                          </span>
                        </div>

                        {rec.address && <p className="text-[10px] text-slate-400 leading-normal">{rec.address}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* HOURS TAB (Calculates regular and overtime) */}
              {activeTab === 'hours' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${currentStatus === 'in' ? 'text-slate-700' : 'text-slate-200'}`}>
                      Shift Duration & Overtime Calculations
                    </h4>
                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">8h Standard Shift Length limit</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-indigo-500/5 border border-indigo-500/10 text-center">
                      <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Regular Hours</span>
                      <span className="text-lg font-black text-white">
                        {(workSummary.regularMs / 3600000).toFixed(2)}h
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center animate-pulse">
                      <span className="text-[9px] font-black uppercase text-amber-500 block mb-1">Overtime Hours</span>
                      <span className="text-lg font-black text-amber-500">
                        {(workSummary.overtimeMs / 3600000).toFixed(2)}h
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[350px]">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Daily Breakdown</span>
                    {workSummary.sessions.map((sess, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-xl border flex flex-col gap-1 text-xs ${
                          currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span>{sess.date}</span>
                          <span>Total: {(sess.duration / 3600000).toFixed(2)}h</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-dashed border-slate-200 dark:border-slate-800">
                          <span>Regular: {(sess.regular / 3600000).toFixed(2)}h</span>
                          <span className={sess.overtime > 0 ? "text-amber-500 font-bold" : ""}>
                            Overtime: {(sess.overtime / 3600000).toFixed(2)}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* LEAVE PORTAL */}
              {activeTab === 'leaves' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${currentStatus === 'in' ? 'text-slate-700' : 'text-slate-200'}`}>
                      Leave Requests Hub
                    </h4>
                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">Submit & monitor leaves requests</p>
                  </div>

                  {/* Submit request form */}
                  <form onSubmit={handleLeaveSubmit} className="p-3.5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                    <span className="text-[9px] font-black uppercase text-indigo-400 block">File Leave Request</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className={`w-full p-2 rounded text-xs ${
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={leaveEnd}
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className={`w-full p-2 rounded text-xs ${
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-800 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Leave Type</label>
                        <select
                          value={leaveType}
                          onChange={(e) => setLeaveType(e.target.value as any)}
                          className={`w-full p-2 rounded text-xs ${
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-850' : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}
                        >
                          <option value="annual">Annual</option>
                          <option value="sick">Sick</option>
                          <option value="casual">Casual</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Reason Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Family function, rest"
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className={`w-full p-2 rounded text-xs ${
                          currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-850' : 'bg-slate-950 border-slate-800 text-white'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-colors"
                    >
                      Submit Leave Request
                    </button>
                  </form>

                  {/* Users leaves list */}
                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px]">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">My Submitted Leaves</span>
                    {leaves.filter(l => l.userId === activeUser.id).map(l => (
                      <div 
                        key={l.id}
                        className={`p-2.5 rounded-xl border flex justify-between items-center text-xs ${
                          currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold uppercase text-[9px] text-indigo-400">{l.type} Leave</span>
                          <p className="text-[8px] text-slate-400 mt-0.5">Dates: {l.startDate} to {l.endDate}</p>
                          <p className="italic text-[9px] text-slate-300">"{l.reason}"</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          l.status === 'approved' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : l.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADMIN SETTINGS VIEW */}
              {activeTab === 'admin' && (
                <AdminPanel
                  lampOn={currentStatus === 'in'}
                  officeName={officeName}
                  officeLat={officeLat}
                  officeLon={officeLon}
                  geofenceRadius={geofenceRadius}
                  users={users}
                  attendanceRecords={records}
                  breaks={breaks}
                  leaves={leaves}
                  shifts={shifts}
                  onSaveSettings={(name, lat, lon, radius) => {
                    setOfficeName(name);
                    setOfficeLat(lat);
                    setOfficeLon(lon);
                    setGeofenceRadius(radius);
                    localStorage.setItem('officeLat', lat.toString());
                    localStorage.setItem('officeLon', lon.toString());
                    localStorage.setItem('officeName', name);
                    localStorage.setItem('geofenceRadius', radius.toString());
                    refreshDbStates();
                  }}
                  onUpdateUserRole={(userId, role) => {
                    updateUserRole(userId, role);
                    refreshDbStates();
                  }}
                  onUpdateUserShift={(userId, shiftId) => {
                    updateUserShift(userId, shiftId);
                    refreshDbStates();
                  }}
                  onCreateShift={(name, start, end, grace) => {
                    addShift(name, start, end, grace);
                    refreshDbStates();
                  }}
                  onApproveRejectLeave={(leaveId, status) => {
                    updateLeaveStatus(leaveId, status, activeUser.id);
                    refreshDbStates();
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Smartphone Navigation Bar */}
        {activeUser && (
          <nav className={`border-t flex justify-around py-3 px-1 shrink-0 transition-all duration-500 ${
            currentStatus === 'in' ? 'bg-slate-50 border-slate-250' : 'bg-[#0B0F19] border-slate-850'
          }`}>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'attendance' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Attendance</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'logs' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('hours')}
              className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'hours' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Hours</span>
            </button>

            <button
              onClick={() => setActiveTab('leaves')}
              className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'leaves' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-350'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Leaves</span>
            </button>

            {(activeUser.role === 'Admin' || activeUser.role === 'Manager') && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all ${
                  activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-350'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span className="text-[8px] font-black uppercase tracking-wider">Admin</span>
              </button>
            )}
          </nav>
        )}

      </div>
    </div>
  );
}
