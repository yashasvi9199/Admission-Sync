import React, { useState, useEffect } from 'react';
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
  Wifi,
  WifiOff,
  Battery,
  Signal,
  Sparkles,
  Settings,
  LogOut,
  Calendar,
  Bell,
  Check,
  UserCheck
} from 'lucide-react';
import SideLamp from './components/SideLamp';
import AdminPanel from './components/AdminPanel';
import { useStore } from './store/useStore';
import { fetchExactLocation, fetchDetailedAddress } from './utils/geolocation';
import { AttendanceRecord } from './db/localDb';

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
  // Access Zustand store
  const {
    activeUser,
    users,
    records,
    breaks,
    leaves,
    shifts,
    officeSettings,
    offlineQueue,
    refreshStates,
    login,
    logout,
    register,
    adminCreateUser,
    punchShift,
    triggerBreak,
    requestLeave,
    updateLeaveStatus,
    editRecordTimestamp,
    editRecord,
    deleteRecords,
    adminCreateLog,
    changeUserRole,
    changeUserShift,
    createNewShift,
    updateOfficeSettings,
    processOfflineQueue,
    checkMidnightAutoPunchOut
  } = useStore();

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

  // Simulation controls
  const [simulateOffice, setSimulateOffice] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Leave Form state
  const [leaveStart, setLeaveStart] = useState(() => new Date().toISOString().split('T')[0]); // Default to today's date
  const [leaveEnd, setLeaveEnd] = useState(''); // Default empty/non-numeric
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveError, setLeaveError] = useState<string | null>(null);

  // Admin Logs Management states
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([]);
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [showNewLogForm, setShowNewLogForm] = useState(false);

  // New Log form fields
  const [newLogUserId, setNewLogUserId] = useState('');
  const [newLogType, setNewLogType] = useState<'in' | 'out'>('in');
  const [newLogDate, setNewLogDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newLogTime, setNewLogTime] = useState('09:00');
  const [newLogAddress, setNewLogAddress] = useState('');

  // Edit Log form fields
  const [editLogType, setEditLogType] = useState<'in' | 'out'>('in');
  const [editLogDate, setEditLogDate] = useState('');
  const [editLogTime, setEditLogTime] = useState('');
  const [editLogAddress, setEditLogAddress] = useState('');

  const handleAdminCreateLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogUserId) return;
    const datetime = new Date(`${newLogDate}T${newLogTime}`);
    adminCreateLog(newLogUserId, newLogType, datetime.getTime(), newLogAddress);
    setShowNewLogForm(false);
    setNewLogUserId('');
    setNewLogAddress('');
  };

  const handleAdminEditLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    const datetime = new Date(`${editLogDate}T${editLogTime}`);
    editRecord(editingRecord.id, {
      type: editLogType,
      timestamp: datetime.getTime(),
      address: editLogAddress
    });
    setEditingRecord(null);
  };

  const handleDeleteSelectedLogs = () => {
    if (selectedRecordIds.length === 0) return;
    deleteRecords(selectedRecordIds);
    setSelectedRecordIds([]);
  };

  const handleToggleSelectRecord = (id: string) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllRecords = () => {
    if (selectedRecordIds.length === records.length) {
      setSelectedRecordIds([]);
    } else {
      setSelectedRecordIds(records.map(r => r.id));
    }
  };

  // Clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load and refresh state triggers
  useEffect(() => {
    refreshStates();
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Run midnight check on refresh
  useEffect(() => {
    checkMidnightAutoPunchOut();
  }, [records]);

  // Bulk sync queue when toggling Online
  useEffect(() => {
    if (isOnline) {
      processOfflineQueue();
    }
  }, [isOnline]);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { user, error } = register(regFirstName, regLastName, regRole, regShiftId || shifts[0]?.id);
    if (error) {
      setAuthError(error);
      return;
    }
    setRegFirstName('');
    setRegLastName('');
    setActiveTab('attendance');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const { user, error } = login(loginUsernameVal, loginPasswordVal);
    if (error) {
      setAuthError(error);
      return;
    }
    setLoginUsernameVal('');
    setLoginPasswordVal('');
    setActiveTab('attendance');
  };

  const handleLogout = () => {
    logout();
    setActiveTab('attendance');
  };

  // Determine current punch status
  const currentStatus = (() => {
    if (!activeUser) return 'out';
    const userPunches = records.filter(r => r.userId === activeUser.id);
    if (userPunches.length === 0) return 'out';
    const sorted = [...userPunches].sort((a, b) => b.timestamp - a.timestamp);
    return sorted[0].type;
  })();

  const handleCheckInOut = async () => {
    if (!activeUser) return;
    setIsLogging(true);
    setError(null);
    setSuccessMsg(null);

    const nextType: 'in' | 'out' = currentStatus === 'in' ? 'out' : 'in';

    try {
      // 1. Capture Coordinates using layered Geolocation (native hardware falling back to simulation)
      const location = await fetchExactLocation(simulateOffice, officeSettings.latitude, officeSettings.longitude);

      // 2. Perform Geofencing calculations
      const distance = calculateDistanceInMeters(
        location.latitude, 
        location.longitude, 
        officeSettings.latitude, 
        officeSettings.longitude
      );
      const isRemote = distance > officeSettings.geofenceRadius;

      // 3. Role verification (Sales role can clock from anywhere, other roles must satisfy geofencing)
      if (activeUser.role !== 'Sales' && isRemote && !simulateOffice) {
        throw new Error(
          `Geofence Restrained: You are currently ${Math.round(distance)}m from office perimeter. Punching blocked.`
        );
      }

      // 4. Reverse Geocode address details via LocationIQ
      const address = await fetchDetailedAddress(location.latitude, location.longitude);

      // 5. Punch to database
      punchShift(
        nextType, 
        location.latitude, 
        location.longitude, 
        address, 
        Math.round(distance), 
        isRemote, 
        location.accuracy, 
        isOnline
      );

      setSuccessMsg(`Successfully clocked ${nextType.toUpperCase()}!`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsLogging(false);
    }
  };

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError(null);

    if (!leaveStart || !leaveEnd || !leaveReason.trim()) {
      setLeaveError('Error: Please specify the leave end date and detail reason.');
      return;
    }

    const res = requestLeave(leaveStart, leaveEnd, leaveReason.trim(), isOnline);
    if (res.error) {
      setLeaveError(res.error);
      return;
    }

    // Reset date picker defaults
    setLeaveStart(new Date().toISOString().split('T')[0]);
    setLeaveEnd('');
    setLeaveReason('');
    setSuccessMsg('Leave request successfully filed and pending approval.');
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCaptureCoordinatesCallback = async () => {
    // Highly accurate triangulation callback for settings panel settings calibration
    const location = await fetchExactLocation(false, officeSettings.latitude, officeSettings.longitude);
    const address = await fetchDetailedAddress(location.latitude, location.longitude);
    return {
      latitude: location.latitude,
      longitude: location.longitude,
      address
    };
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

  // Automated Alert: Missing Punch Alerts (> 9 hours punched in)
  const isMissingPunchActive = () => {
    if (!activeUser || currentStatus !== 'in') return false;
    const userPunches = records.filter(r => r.userId === activeUser.id);
    const lastIn = [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0];
    if (!lastIn) return false;
    
    const diffHours = (Date.now() - lastIn.timestamp) / 3600000;
    return diffHours > 9;
  };

  // Automated Alert: Pre-Shift Reminder (15 mins before user shift starts)
  const isPreShiftReminderActive = () => {
    if (!activeUser || currentStatus === 'in') return false;
    const shift = shifts.find(s => s.id === activeUser.shiftId);
    if (!shift) return false;

    const [shHours, shMins] = shift.startTime.split(':').map(Number);
    const shiftTimeToday = new Date();
    shiftTimeToday.setHours(shHours, shMins, 0, 0);

    const diffMins = (shiftTimeToday.getTime() - Date.now()) / 60000;
    return diffMins > 0 && diffMins <= 15;
  };

  // Date and Time Formatting utils
  const formatDetailedDate = (ms: number) => {
    return new Date(ms).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }); // Output e.g. "02 June 2026"
  };

  const format12HourTime = (ms: number) => {
    return new Date(ms).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    }); // Output e.g. "4:15 PM"
  };

  const workSummary = getUserWorkSummary();
  const showMissingPunchBanner = isMissingPunchActive();
  const showPreShiftReminder = isPreShiftReminderActive();

  return (
    <div className={`min-h-screen flex items-center justify-center font-sans p-0 sm:p-6 transition-colors duration-500 ease-in-out ${
      currentStatus === 'in' 
        ? 'bg-[#F1F5F9] text-[#1E293B]' 
        : 'bg-[#030712] text-[#E2E8F0]'
    }`}>
      
      {/* Smartphone Outer Container */}
      <div className={`relative w-full sm:max-w-[410px] h-screen sm:h-[860px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border transition-all duration-500 ${
        currentStatus === 'in' 
          ? 'bg-white border-slate-350 shadow-slate-400/40' 
          : 'bg-[#0F172A] border-slate-800 shadow-black/80'
      }`}>
        
        {/* Mock Statusbar */}
        <div className={`px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-black tracking-widest uppercase transition-colors ${
          currentStatus === 'in' ? 'text-slate-500 bg-slate-50' : 'text-slate-400 bg-slate-950/40'
        }`}>
          <div>
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
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
            <div className="bg-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md">
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
            {offlineQueue.length > 0 && (
              <button 
                onClick={() => processOfflineQueue()}
                className="text-[9px] font-black bg-amber-500 hover:bg-amber-650 text-slate-950 px-2 py-0.5 rounded-full animate-bounce"
              >
                Sync ({offlineQueue.length})
              </button>
            )}

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

        {/* Missing Punch Banner Alert */}
        {showMissingPunchBanner && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-2.5 text-amber-500 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 leading-tight">
            <Bell className="w-4 h-4 shrink-0 animate-bounce" />
            <span>Missing Punch: Active for &gt;9 hrs! Resolve error immediately.</span>
          </div>
        )}

        {showPreShiftReminder && (
          <div className="bg-indigo-500/10 border-b border-indigo-500/20 p-2.5 text-indigo-400 text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 leading-tight">
            <Bell className="w-4 h-4 shrink-0 animate-pulse" />
            <span>Shift starts in 15 mins! Open AeroPunchin as you approach building.</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto flex flex-col p-4 space-y-4">
          
          {/* AUTH SCREEN */}
          {!activeUser ? (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className={`p-5 rounded-3xl border transition-all ${
                currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
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
                          currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
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
                          currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
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
                        className="text-indigo-400 hover:underline animate-pulse"
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
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
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
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
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
                    {regFirstName.trim() && regLastName.trim() && (
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 text-[10px] font-bold">
                        Username: <span className="underline font-black">
                          {regLastName.trim().toLowerCase()[0] + regFirstName.trim().toLowerCase().substring(0, 4)}
                        </span>
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
                  <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{authError}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ATTENDANCE PANEL (Visible to everyone) */}
              {activeTab === 'attendance' && (
                <>
                  {/* Dashboard Profile Overview */}
                  <div className={`rounded-2xl p-3 border transition-all ${
                    currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'
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

                  {/* Clean Scandinavian Lamp Stage (NO Labels, Clean minimalist interface) */}
                  <div className={`relative flex-1 rounded-3xl border flex flex-col items-center justify-center p-3 overflow-hidden min-h-[380px] transition-all duration-500 ${
                    currentStatus === 'in' 
                      ? 'bg-radial from-amber-50/45 via-white to-slate-50 border-slate-200' 
                      : 'bg-gradient-to-b from-[#0F172A] to-[#020617] border-slate-800'
                  }`}>
                    {/* Standing Floor Lamp - Single visual control component */}
                    <div className="w-full h-[330px] flex items-center justify-center">
                      <SideLamp 
                        lampOn={currentStatus === 'in'} 
                        onToggle={handleCheckInOut} 
                        disabled={isLogging} 
                      />
                    </div>

                    {isLogging && (
                      <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-30">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Triangulating location...</span>
                      </div>
                    )}
                  </div>

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

              {/* LOGS ACTIVITY VIEW (Visible to everyone, enhanced styling, edit/delete/create for Admin) */}
              {activeTab === 'logs' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-3">
                  <div className="flex justify-between items-center px-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workforce Logs Feed</span>
                    {activeUser.role === 'Admin' && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => {
                            setShowNewLogForm(!showNewLogForm);
                            setEditingRecord(null);
                          }}
                          className="px-2 py-0.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                        >
                          {showNewLogForm ? 'Close Form' : 'New Log'}
                        </button>
                        {records.length > 0 && (
                          <button
                            onClick={handleSelectAllRecords}
                            className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[9px] font-black uppercase rounded-lg"
                          >
                            {selectedRecordIds.length === records.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                        {selectedRecordIds.length > 0 && (
                          <button
                            onClick={handleDeleteSelectedLogs}
                            className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg shadow-sm"
                          >
                            Delete ({selectedRecordIds.length})
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Log Creation Form (Admin only) */}
                  {activeUser.role === 'Admin' && showNewLogForm && (
                    <form onSubmit={handleAdminCreateLogSubmit} className="p-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 space-y-2 text-xs">
                      <span className="text-[9px] font-black uppercase text-indigo-400 block">Create Manual Log Entry</span>
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
                            onChange={(e) => setNewLogDate(e.target.value)}
                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Time</label>
                          <input
                            type="time"
                            value={newLogTime}
                            onChange={(e) => setNewLogTime(e.target.value)}
                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Location / Address (optional)</label>
                        <input
                          type="text"
                          placeholder="Manual location details..."
                          value={newLogAddress}
                          onChange={(e) => setNewLogAddress(e.target.value)}
                          className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-sm"
                      >
                        Submit Manual Entry
                      </button>
                    </form>
                  )}

                  {/* Log Edit Form (Admin only) */}
                  {activeUser.role === 'Admin' && editingRecord && (
                    <form onSubmit={handleAdminEditLogSubmit} className="p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2 text-xs">
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
                          <input
                            type="text"
                            value={editLogAddress}
                            onChange={(e) => setEditLogAddress(e.target.value)}
                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Date</label>
                          <input
                            type="date"
                            value={editLogDate}
                            onChange={(e) => setEditLogDate(e.target.value)}
                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[8px] uppercase text-slate-400 font-bold mb-0.5">Time</label>
                          <input
                            type="time"
                            value={editLogTime}
                            onChange={(e) => setEditLogTime(e.target.value)}
                            className="w-full p-1.5 rounded-lg text-[10px] font-bold border bg-[#1E293B] border-slate-800 text-white focus:outline-none"
                            required
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingRecord(null)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-black uppercase rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-[9px] font-black uppercase rounded-lg"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px]">
                    {records.map(rec => {
                      const hasAddress = rec.address && rec.address !== '' && !rec.address.startsWith('HQ Office Area') && !rec.address.startsWith('Office Geofence');
                      const showCoords = !hasAddress;
                      const isSelected = selectedRecordIds.includes(rec.id);
                      
                      return (
                        <div 
                          key={rec.id}
                          className={`p-3.5 rounded-2xl border flex gap-3 transition-all duration-300 text-xs shadow-sm items-start ${
                            isSelected
                              ? 'bg-indigo-500/10 border-indigo-500/30'
                              : currentStatus === 'in' 
                                ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-slate-200/50 hover:bg-slate-100' 
                                : 'bg-slate-900/60 border-slate-800 text-slate-200 hover:bg-slate-850/60'
                          }`}
                        >
                          {/* Selection Checkbox (Admin only) */}
                          {activeUser.role === 'Admin' && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectRecord(rec.id)}
                              className="mt-1 w-3.5 h-3.5 rounded-lg border-slate-300 dark:border-slate-800 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          )}

                          <div className="flex-1 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-2.5 py-0.5 rounded-lg font-black text-[9px] uppercase tracking-wider ${
                                  currentStatus === 'in' 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/40'
                                }`}>
                                  {rec.name}
                                </span>
                                {activeUser.role === 'Admin' && (
                                  <button
                                    onClick={() => {
                                      const recDate = new Date(rec.timestamp);
                                      const dateStr = recDate.toISOString().split('T')[0];
                                      const timeStr = recDate.toTimeString().split(' ')[0].substring(0, 5); // "HH:MM"
                                      setEditingRecord(rec);
                                      setEditLogType(rec.type);
                                      setEditLogDate(dateStr);
                                      setEditLogTime(timeStr);
                                      setEditLogAddress(rec.address || '');
                                      setShowNewLogForm(false);
                                    }}
                                    className="text-[9px] text-amber-500 hover:underline font-bold"
                                  >
                                    [Edit]
                                  </button>
                                )}
                              </div>
                              <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                                rec.type === 'in' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {rec.type === 'in' ? 'Clock In' : 'Clock Out'}
                              </span>
                            </div>

                            <div className="text-[11px] font-bold border-b border-dashed border-slate-200 dark:border-slate-800/80 pb-1.5 flex justify-between items-center">
                              <span className="text-slate-400">Date: {formatDetailedDate(rec.timestamp)}</span>
                              <span className="text-indigo-400">{format12HourTime(rec.timestamp)}</span>
                            </div>

                            <div className="flex flex-col gap-1 text-[10px] text-slate-400">
                              {showCoords ? (
                                <p className="font-mono bg-slate-950/20 p-1.5 rounded-lg border border-slate-850 text-center">
                                  Coords: {rec.latitude.toFixed(5)}, {rec.longitude.toFixed(5)}
                                </p>
                              ) : (
                                <p className="leading-normal">{rec.address}</p>
                              )}

                              {rec.distanceFromOffice !== undefined && (
                                <span className={`font-black text-[9px] uppercase mt-1 self-end ${rec.isRemote ? 'text-amber-500' : 'text-emerald-500'}`}>
                                  {rec.isRemote ? 'Remote workplace' : `Verified inside geofence (${rec.distanceFromOffice}m)`}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* HOURS TAB (Improved color grading, regular hours text visible) */}
              {activeTab === 'hours' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${currentStatus === 'in' ? 'text-slate-700' : 'text-slate-200'}`}>
                      Shift Performance & Overtime
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Regular Hours card with visible colors based on theme */}
                    <div className={`p-4 rounded-2xl border text-center shadow-md transition-all ${
                      currentStatus === 'in' 
                        ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-slate-200/50' 
                        : 'bg-indigo-500/5 border-indigo-500/10 text-slate-200'
                    }`}>
                      <span className="text-[9px] font-black uppercase text-indigo-400 block mb-1">Regular Hours</span>
                      <span className={`text-xl font-black ${currentStatus === 'in' ? 'text-slate-800' : 'text-white'}`}>
                        {(workSummary.regularMs / 3600000).toFixed(2)}h
                      </span>
                    </div>

                    {/* Overtime card */}
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/15 text-center shadow-md animate-pulse">
                      <span className="text-[9px] font-black uppercase text-amber-500 block mb-1">Overtime Hours</span>
                      <span className="text-xl font-black text-amber-500">
                        {(workSummary.overtimeMs / 3600000).toFixed(2)}h
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px]">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">Shift History Logs</span>
                    {workSummary.sessions.map((sess, index) => (
                      <div 
                        key={index}
                        className={`p-3.5 rounded-2xl border flex flex-col gap-1.5 text-xs shadow-sm hover:scale-[0.99] transition-transform ${
                          currentStatus === 'in' 
                            ? 'bg-slate-50 border-slate-200 text-slate-850' 
                            : 'bg-slate-900/60 border-slate-850 text-slate-200'
                        }`}
                      >
                        <div className="flex justify-between items-center font-bold">
                          <span>{sess.date}</span>
                          <span className="text-indigo-400 font-black">Total: {(sess.duration / 3600000).toFixed(2)}h</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800">
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

              {/* LEAVES REQUEST TAB (Redesigned pickers, error handling) */}
              {activeTab === 'leaves' && (
                <div className="flex-1 flex flex-col min-h-0 space-y-4">
                  <div>
                    <h4 className={`text-xs font-black uppercase tracking-wider ${currentStatus === 'in' ? 'text-slate-700' : 'text-slate-200'}`}>
                      Leave Requests Hub
                    </h4>
                    <p className="text-[9px] text-slate-400 uppercase font-bold mt-0.5">File leave request parameters</p>
                  </div>

                  <form onSubmit={handleLeaveSubmit} className="p-4 rounded-3xl border border-indigo-500/20 bg-indigo-500/5 space-y-3.5 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-400 block">Submit Leave Request</span>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">Start Date</label>
                        <input
                          type="date"
                          value={leaveStart}
                          onChange={(e) => setLeaveStart(e.target.value)}
                          className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">End Date</label>
                        <input
                          type="date"
                          value={leaveEnd}
                          placeholder="Select End Date" // default placeholder
                          onChange={(e) => setLeaveEnd(e.target.value)}
                          className={`w-full p-2 rounded-xl text-xs font-bold border focus:outline-none ${
                            currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[8px] uppercase text-slate-400 font-black mb-0.5">Reason Description</label>
                      <input
                        type="text"
                        placeholder="Detail reason for your absence request..."
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        className={`w-full p-2.5 rounded-xl text-xs font-bold border focus:outline-none ${
                          currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'
                        }`}
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Submit Leave Request
                    </button>
                  </form>

                  {leaveError && (
                    <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-bold flex items-center gap-1.5 animate-shake">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{leaveError}</span>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto space-y-2 max-h-[220px]">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block px-0.5">My Leave Log</span>
                    {leaves.filter(l => l.userId === activeUser.id).map(l => (
                      <div 
                        key={l.id}
                        className={`p-3 rounded-2xl border flex justify-between items-center text-xs shadow-sm ${
                          currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-slate-850'
                        }`}
                      >
                        <div>
                          <span className="font-black uppercase text-[9px] text-indigo-400 block">Leave Application</span>
                          <p className="text-[8px] text-slate-400 mt-0.5 font-bold">Dates: {l.startDate} to {l.endDate}</p>
                          <p className="italic text-[10px] text-slate-200 mt-1">"{l.reason}"</p>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase ${
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

              {/* ADMIN SETTINGS VIEW (Only visible to Admin or Manager) */}
              {activeTab === 'admin' && (
                <AdminPanel
                  lampOn={currentStatus === 'in'}
                  officeName={officeSettings.name}
                  officeLat={officeSettings.latitude}
                  officeLon={officeSettings.longitude}
                  geofenceRadius={officeSettings.geofenceRadius}
                  autoPunchOutTime={officeSettings.autoPunchOutTime}
                  workingDays={officeSettings.workingDays}
                  onSaveSettings={(name, lat, lon, radius, autoOut, wrkDays) => {
                    updateOfficeSettings({
                      name,
                      latitude: lat,
                      longitude: lon,
                      geofenceRadius: radius,
                      autoPunchOutTime: autoOut,
                      workingDays: wrkDays
                    });
                    setSuccessMsg('Office configurations updated successfully.');
                    setTimeout(() => setSuccessMsg(null), 3000);
                  }}
                  activeUserId={activeUser.id}
                  users={users}
                  attendanceRecords={records}
                  breaks={breaks}
                  leaves={leaves}
                  shifts={shifts}
                  onUpdateUserRole={(userId, role) => {
                    changeUserRole(userId, role);
                  }}
                  onUpdateUserShift={(userId, shiftId) => {
                    changeUserShift(userId, shiftId);
                  }}
                  onCreateShift={(name, start, end, grace) => {
                    createNewShift(name, start, end, grace);
                  }}
                  onApproveRejectLeave={(leaveId, status) => {
                    updateLeaveStatus(leaveId, status);
                  }}
                  onAdminCreateUser={(first, last, role, shift) => {
                    return adminCreateUser(first, last, role, shift);
                  }}
                  onCaptureCoordinates={handleCaptureCoordinatesCallback}
                />
              )}
            </>
          )}
        </div>

        {/* Dynamic Navigation Bar (Leaves and Admin dynamically shown/hidden) */}
        {activeUser && (
          <nav className={`border-t flex justify-around py-3 px-1 shrink-0 transition-all duration-500 select-none ${
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
