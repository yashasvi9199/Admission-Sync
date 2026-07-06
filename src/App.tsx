import React, { useState, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Capacitor } from '@capacitor/core';
import { 
  Clock, Sliders, BarChart3, Calendar, Settings, 
  Signal, Wifi, Battery, AlertTriangle, CheckCircle, LogOut, Check, X
} from 'lucide-react';

import { useStore } from '@/src/store/useStore';
import { fetchExactLocation, fetchDetailedAddress } from '@/src/utils/geolocation';
import AttendanceTab from '@/src/components/attendance/AttendanceTab';
import LogsTab from '@/src/components/logs/LogsTab';
import HoursTab from '@/src/components/hours/HoursTab';
import LeavesTab from '@/src/components/leaves/LeavesTab';
import AdminTab from '@/src/components/admin/AdminTab';

function calculateDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function App() {
  const { activeUser, users, records, breaks, leaves, shifts, officeSettings, offlineQueue } = useStore(useShallow(state => ({
    activeUser: state.activeUser,
    users: state.users,
    records: state.records,
    breaks: state.breaks,
    leaves: state.leaves,
    shifts: state.shifts,
    officeSettings: state.officeSettings,
    offlineQueue: state.offlineQueue,
  })));

  const refreshStates = useStore(state => state.refreshStates);
  const login = useStore(state => state.login);
  const logout = useStore(state => state.logout);
  const register = useStore(state => state.register);
  const adminCreateUser = useStore(state => state.adminCreateUser);
  const punchShift = useStore(state => state.punchShift);
  const triggerBreak = useStore(state => state.triggerBreak);
  const requestLeave = useStore(state => state.requestLeave);
  const updateLeaveStatus = useStore(state => state.updateLeaveStatus);
  const editRecord = useStore(state => state.editRecord);
  const deleteRecords = useStore(state => state.deleteRecords);
  const adminCreateLog = useStore(state => state.adminCreateLog);
  const changeUserRole = useStore(state => state.changeUserRole);
  const changeUserShift = useStore(state => state.changeUserShift);
  const createNewShift = useStore(state => state.createNewShift);
  const updateShift = useStore(state => state.updateShift);
  const deleteShift = useStore(state => state.deleteShift);
  const updateOfficeSettings = useStore(state => state.updateOfficeSettings);
  const processOfflineQueue = useStore(state => state.processOfflineQueue);
  const checkMidnightAutoPunchOut = useStore(state => state.checkMidnightAutoPunchOut);
  const adminResetPassword = useStore(state => state.adminResetPassword);

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regRole, setRegRole] = useState<'Admin' | 'Sales' | 'Developer' | 'HR' | 'Manager' | 'User'>('User');
  const [regShiftId, setRegShiftId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [activeTab, setActiveTab] = useState<'attendance' | 'logs' | 'hours' | 'leaves' | 'admin'>('attendance');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLogging, setIsLogging] = useState(false);
  const [simulateOffice, setSimulateOffice] = useState(false);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [toastError, setToastError] = useState<string | null>(null);

  const showSuccessToast = (msg: string) => {
    setToastMsg(msg);
    setToastError(null);
    setTimeout(() => setToastMsg(prev => prev === msg ? null : prev), 4000);
  };

  const showErrorToast = (msg: string) => {
    setToastError(msg);
    setToastMsg(null);
    setTimeout(() => setToastError(prev => prev === msg ? null : prev), 4000);
  };

  // Self-Updater and Notification logic states
  const [updateInfo, setUpdateInfo] = useState<{ version: string; url: string; notes: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const isNewerVersion = (local: string, remote: string) => {
    const localParts = local.split('.').map(Number);
    const remoteParts = remote.split('.').map(Number);
    for (let i = 0; i < Math.max(localParts.length, remoteParts.length); i++) {
      const l = localParts[i] || 0;
      const r = remoteParts[i] || 0;
      if (r > l) return true;
      if (l > r) return false;
    }
    return false;
  };

  const checkForUpdates = async () => {
    if (Capacitor.getPlatform() !== 'android') {
      console.log("Not on Android, skipping update check.");
      return;
    }
    try {
      console.log("Checking for updates...");
      const { Updater } = (Capacitor as any).Plugins;
      if (!Updater) {
        console.warn("Updater plugin not found on Capacitor.Plugins");
        return;
      }

      const appVerResult = await Updater.getAppVersion();
      const currentVersion = appVerResult.version;
      console.log("Local App Version:", currentVersion);

      const response = await fetch(`https://api.github.com/repos/yashasvi9199/Admission-Sync/releases/latest?t=${Date.now()}`);
      if (!response.ok) {
        console.warn("GitHub API error: status", response.status, response.statusText);
        return;
      }
      const release = await response.json();
      
      const latestTag = release.tag_name;
      const latestVersion = latestTag.replace(/^v/, '');
      console.log("Latest Remote Version:", latestVersion);

      if (isNewerVersion(currentVersion, latestVersion)) {
        console.log("New version detected! Remote version is newer than local.");
        const apkAsset = release.assets.find((asset: any) => asset.name.endsWith('.apk'));
        if (apkAsset) {
          console.log("Found APK asset:", apkAsset.browser_download_url);
          setUpdateInfo({
            version: latestVersion,
            url: apkAsset.browser_download_url,
            notes: release.body || ''
          });
        } else {
          console.warn("No APK asset found in the latest release.");
        }
      } else {
        console.log("App is up-to-date.");
      }
    } catch (e) {
      console.error("Error checking for updates:", e);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo) return;
    setIsUpdating(true);
    setUpdateError(null);
    try {
      const { Updater } = (Capacitor as any).Plugins;
      await Updater.installApk({ url: updateInfo.url });
      showSuccessToast("Update downloaded! Launching installer...");
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error && e.message ? e.message : "Failed to download update APK.";
      setUpdateError(message);
      showErrorToast("Update installation failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const setupShiftNotifications = async () => {
    if (Capacitor.getPlatform() !== 'android' || !activeUser) return;
    try {
      const { AppNotification } = (Capacitor as any).Plugins;
      if (!AppNotification) return;

      const permResult = await AppNotification.requestPermission();
      if (!permResult.granted) {
        console.warn("Notification permissions not granted.");
        return;
      }

      const userShift = shifts.find(s => s.id === activeUser.shiftId) || shifts[0];
      if (userShift) {
        await AppNotification.scheduleShiftNotifications({
          shiftStart: userShift.startTime,
          shiftEnd: userShift.endTime
        });
        console.log("Successfully scheduled shift notification alarms.");
      }
    } catch (e) {
      console.error("Error setting up shift alarms", e);
    }
  };

  useEffect(() => {
    refreshStates();
    checkForUpdates();
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    const midPunchTimer = setInterval(() => checkMidnightAutoPunchOut(), 60000);
    return () => { clearInterval(clockTimer); clearInterval(midPunchTimer); };
  }, []);

  useEffect(() => {
    if (activeUser) {
      setupShiftNotifications();
    }
  }, [activeUser, shifts]);

  const currentStatus = (() => {
    if (!activeUser) return 'out';
    const userPunches = records.filter(r => r.userId === activeUser.id);
    if (userPunches.length === 0) return 'out';
    return [...userPunches].sort((a, b) => b.timestamp - a.timestamp)[0].type;
  })();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const { user, error } = login(loginUsername, loginPassword);
    if (error) {
      showErrorToast(error);
    } else if (user) {
      showSuccessToast(`Sign-in verified for @${user.username}`);
      setLoginUsername('');
      setLoginPassword('');
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regPassword !== regConfirmPassword) {
      showErrorToast('Confirm password mismatch.');
      return;
    }
    const { user, error } = register(regFirstName, regLastName, regRole, regShiftId || shifts[0]?.id, regPassword);
    if (error) {
      showErrorToast(error);
    } else if (user) {
      showSuccessToast(`Profile provisioned: @${user.username}`);
      setRegFirstName('');
      setRegLastName('');
      setRegPassword('');
      setRegConfirmPassword('');
    }
  };

  const handleCheckInOut = async () => {
    if (!activeUser) return;
    setIsLogging(true);
    const nextType: 'in' | 'out' = currentStatus === 'in' ? 'out' : 'in';
    try {
      const location = await fetchExactLocation(simulateOffice, officeSettings.latitude, officeSettings.longitude);
      const distance = calculateDistanceInMeters(location.latitude, location.longitude, officeSettings.latitude, officeSettings.longitude);
      const isRemote = distance > officeSettings.geofenceRadius;

      if (activeUser.role !== 'Sales' && isRemote && !simulateOffice) {
        throw new Error(`Geofence Restrained: You are ${Math.round(distance)}m away. Punching blocked.`);
      }

      const address = await fetchDetailedAddress(location.latitude, location.longitude);
      punchShift(nextType, location.latitude, location.longitude, address, Math.round(distance), isRemote, location.accuracy, true);
      showSuccessToast(`Successfully clocked ${nextType.toUpperCase()}!`);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : 'Location verification failed.';
      showErrorToast(message);
    } finally {
      setIsLogging(false);
    }
  };

  const handleCaptureCoordinatesCallback = async () => {
    const loc = await fetchExactLocation(false, officeSettings.latitude, officeSettings.longitude);
    const address = await fetchDetailedAddress(loc.latitude, loc.longitude);
    return { latitude: loc.latitude, longitude: loc.longitude, address };
  };

  // Password rules
  const meetsLetters = (regPassword.match(/[a-zA-Z]/g) || []).length >= 4;
  const meetsNumber = /\d/.test(regPassword);
  const meetsSpecial = /[^a-zA-Z0-9]/.test(regPassword);
  const isPasswordValid = meetsLetters && meetsNumber && meetsSpecial;
  const passwordsMatch = regPassword === regConfirmPassword;

  return (
    <div className={`min-h-screen flex items-center justify-center font-sans p-0 sm:p-6 transition-colors duration-500 ease-in-out ${
      currentStatus === 'in' ? 'bg-[#F1F5F9] text-[#1E293B]' : 'bg-[#030712] text-[#E2E8F0]'
    }`}>
      <div className={`relative w-full sm:max-w-[410px] h-screen sm:h-[860px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden border transition-all duration-500 ${
        currentStatus === 'in' ? 'bg-white border-slate-350 shadow-slate-400/40' : 'bg-[#0F172A] border-slate-800 shadow-black/80'
      }`}>
        {/* Sticky Pop-up Toast Notifications */}
        {(toastMsg || toastError) && (
          <div className="absolute top-12 left-4 right-4 z-50 animate-bounce">
            <div className={`p-3 rounded-2xl border shadow-lg flex items-start gap-2.5 backdrop-blur-md ${
              toastMsg ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-rose-500/90 border-rose-400 text-white'
            }`}>
              {toastMsg ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-[9px] font-black uppercase tracking-wider">{toastMsg ? 'Success' : 'Error'}</p>
                <p className="text-xs font-bold leading-tight mt-0.5">{toastMsg || toastError}</p>
              </div>
              <button onClick={() => { setToastMsg(null); setToastError(null); }} className="text-white/75 hover:text-white font-black text-xs cursor-pointer">×</button>
            </div>
          </div>
        )}

        {/* Statusbar */}
        <div className={`px-6 pt-3 pb-1 flex justify-between items-center text-[11px] font-black tracking-widest uppercase transition-colors ${
          currentStatus === 'in' ? 'text-slate-500 bg-slate-50' : 'text-slate-400 bg-slate-950/40'
        }`}>
          <div>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
          <div className="flex items-center gap-1.5"><Signal className="w-3.5 h-3.5" /><Wifi className="w-3.5 h-3.5" /><Battery className="w-4 h-4" /></div>
        </div>

        {/* Header */}
        <header className={`px-5 py-3 border-b flex justify-between items-center shrink-0 transition-all ${
          currentStatus === 'in' ? 'bg-slate-50/80 border-slate-200' : 'bg-[#1E293B]/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 w-8 h-8 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md">A</div>
            <div>
              <h1 className={`text-sm font-black tracking-tight ${currentStatus === 'in' ? 'text-slate-800' : 'text-slate-100'}`}>AeroPunchin</h1>
              {activeUser && <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">@{activeUser.username} ({activeUser.role})</span>}
            </div>
          </div>
          {activeUser && <button onClick={logout} className="p-1.5 rounded-full border border-slate-800 text-slate-400 hover:bg-slate-800 cursor-pointer"><LogOut className="w-4 h-4" /></button>}
        </header>

        {/* Tab Routing content */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col min-h-0 select-none">
          {!activeUser ? (
            <div className="flex-1 flex flex-col justify-center space-y-4">
              <div className={`p-5 rounded-3xl border transition-all ${currentStatus === 'in' ? 'bg-slate-50 border-slate-200' : 'bg-[#1E293B]/70 border-slate-800'}`}>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-black tracking-tight text-indigo-500">Welcome to AeroPunchin</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">First user becomes Admin automatically</p>
                </div>

                {authMode === 'login' ? (
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Username</label>
                      <input type="text" placeholder="e.g. yhaldiya" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Password</label>
                      <input type="password" placeholder="••••••••" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={`w-full p-2.5 rounded-xl border text-xs font-bold focus:outline-none ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                    </div>
                    <button type="submit" className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer">Sign In</button>
                    <p className="text-center text-[10px] text-slate-400 font-bold">Need a profile? <button type="button" onClick={() => setAuthMode('register')} className="text-indigo-400 hover:underline cursor-pointer">Register Profile</button></p>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="text" placeholder="First Name" value={regFirstName} onChange={(e) => setRegFirstName(e.target.value)} className={`p-2.5 rounded-xl border text-xs font-bold ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                      <input type="text" placeholder="Last Name" value={regLastName} onChange={(e) => setRegLastName(e.target.value)} className={`p-2.5 rounded-xl border text-xs font-bold ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Role</label>
                      <select value={regRole} onChange={(e) => setRegRole(e.target.value as any)} className={`w-full p-2.5 rounded-xl border text-xs font-bold ${currentStatus === 'in' ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-950 border-slate-800 text-slate-200'}`}>
                        <option value="User">User (Developer/Regular)</option>
                        <option value="Sales">Sales Role (Clock from anywhere)</option>
                        <option value="HR">HR Dept</option>
                        <option value="Manager">Manager</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-5 gap-2.5">
                      <div className="col-span-3 space-y-2">
                        <input type="password" placeholder="Password" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} className={`w-full p-2 rounded-xl text-xs font-bold border ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                        <div className="relative">
                          <input type="password" placeholder="Confirm Password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} className={`w-full p-2 pr-6 rounded-xl text-xs font-bold border ${currentStatus === 'in' ? 'bg-white border-slate-250 text-slate-800' : 'bg-slate-950 border-slate-850 text-white'}`} required />
                          {regConfirmPassword.length > 0 && <span className="absolute right-2 top-1/2 -translate-y-1/2">{passwordsMatch ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <X className="w-3.5 h-3.5 text-rose-500" />}</span>}
                        </div>
                      </div>
                      <div className="col-span-2 p-1.5 rounded-xl bg-slate-950/20 text-[8px] text-slate-500 font-bold uppercase self-center leading-relaxed">
                        <div className={meetsLetters ? 'line-through text-slate-600' : 'text-slate-400'}>&bull; 4+ Letters</div>
                        <div className={meetsNumber ? 'line-through text-slate-600' : 'text-slate-400'}>&bull; 1+ Num</div>
                        <div className={meetsSpecial ? 'line-through text-slate-600' : 'text-slate-400'}>&bull; 1+ Spec</div>
                      </div>
                    </div>
                    <button type="submit" disabled={!isPasswordValid || !passwordsMatch} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer disabled:opacity-50">Complete Registration</button>
                    <p className="text-center text-[10px] text-slate-400 font-bold">Have a profile? <button type="button" onClick={() => setAuthMode('login')} className="text-indigo-400 hover:underline cursor-pointer">Sign In</button></p>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'attendance' && (
                <AttendanceTab lampOn={currentStatus === 'in'} onToggle={handleCheckInOut} isLogging={isLogging} showMissingPunch={currentStatus === 'in' && records.filter(r => r.userId === activeUser.id).length > 0 && (Date.now() - [...records.filter(r => r.userId === activeUser.id)].sort((a, b) => b.timestamp - a.timestamp)[0].timestamp > 32400000)} showPreShiftReminder={(() => { const sh = shifts.find(s => s.id === activeUser.shiftId) || shifts[0]; if (!sh) return false; const [shHrs, shMins] = sh.startTime.split(':').map(Number); const now = new Date(); const shiftTime = new Date(); shiftTime.setHours(shHrs, shMins, 0, 0); const diff = shiftTime.getTime() - now.getTime(); return diff > 0 && diff < 900000; })()} shiftName={shifts.find(s => s.id === activeUser.shiftId)?.name || 'Default Shift'} />
              )}
              {activeTab === 'logs' && (
                <LogsTab activeUser={activeUser} users={users} records={records} officeSettings={officeSettings} onAdminCreateLog={adminCreateLog} onEditRecord={editRecord} onDeleteRecords={deleteRecords} lampOn={currentStatus === 'in'} />
              )}
              {activeTab === 'hours' && (
                <HoursTab activeUser={activeUser} users={users} records={records} shifts={shifts} lampOn={currentStatus === 'in'} />
              )}
              {activeTab === 'leaves' && (
                <LeavesTab activeUser={activeUser} leaves={leaves} onRequestLeave={requestLeave} isOnline={true} lampOn={currentStatus === 'in'} />
              )}
              {activeTab === 'admin' && (
                <AdminTab 
                  lampOn={currentStatus === 'in'} 
                  officeSettings={officeSettings} 
                  users={users} 
                  records={records} 
                  breaks={breaks} 
                  leaves={leaves} 
                  shifts={shifts} 
                  activeUserId={activeUser.id} 
                  onUpdateUserRole={changeUserRole} 
                  onUpdateUserShift={changeUserShift} 
                  onCreateShift={createNewShift} 
                  onUpdateShift={updateShift} 
                  onDeleteShift={deleteShift} 
                  onSaveOfficeSettings={(name, lat, lon, radius, autoOut, wrkDays) => updateOfficeSettings({
                    name, latitude: lat, longitude: lon, geofenceRadius: radius, autoPunchOutTime: autoOut, workingDays: wrkDays
                  })} 
                  onApproveRejectLeave={updateLeaveStatus} 
                  onAdminResetPassword={adminResetPassword} 
                  onCaptureCoordinates={handleCaptureCoordinatesCallback}
                  onAdminCreateUser={adminCreateUser}
                />
              )}
            </>
          )}
        </div>

        {/* Navigation Bar */}
        {activeUser && (
          <nav className={`border-t flex justify-around py-3 px-1 shrink-0 transition-all duration-500 select-none ${
            currentStatus === 'in' ? 'bg-slate-50 border-slate-250' : 'bg-[#0B0F19] border-slate-850'
          }`}>
            <button onClick={() => setActiveTab('attendance')} className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'attendance' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}><Clock className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-wider">Attendance</span></button>
            <button onClick={() => setActiveTab('logs')} className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'logs' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}><Sliders className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-wider">Logs</span></button>
            <button onClick={() => setActiveTab('hours')} className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'hours' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}><BarChart3 className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-wider">Hours</span></button>
            <button onClick={() => setActiveTab('leaves')} className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'leaves' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}><Calendar className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-wider">Leaves</span></button>
            {(activeUser.role === 'Admin' || activeUser.role === 'Manager') && (
              <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${activeTab === 'admin' ? 'text-indigo-500' : 'text-slate-400 hover:text-slate-300'}`}><Settings className="w-4 h-4" /><span className="text-[8px] font-black uppercase tracking-wider">Admin</span></button>
            )}
          </nav>
        )}
      </div>

      {/* Self-Update Prompter Modal */}
      {updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm p-5 rounded-3xl border border-indigo-500/20 bg-[#0B0F19] text-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-indigo-400">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">Software Update Available</span>
            </div>
            
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Version v{updateInfo.version}</h3>
              <p className="text-[10px] text-slate-400 font-bold leading-normal">
                A new version of AeroPunchin is ready for download.
              </p>
            </div>

            {updateInfo.notes && (
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-[10px] max-h-32 overflow-y-auto space-y-1 font-medium leading-relaxed">
                <span className="text-[9px] font-black uppercase text-slate-500 block">Release Notes:</span>
                <p className="whitespace-pre-line text-slate-300">{updateInfo.notes}</p>
              </div>
            )}

            {updateError && (
              <p className="text-[10px] text-rose-500 font-bold bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
                {updateError}
              </p>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setUpdateInfo(null)}
                disabled={isUpdating}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50 text-center"
              >
                Later
              </button>
              <button
                onClick={handleInstallUpdate}
                disabled={isUpdating}
                className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase transition-all cursor-pointer disabled:opacity-50 text-center flex items-center justify-center gap-1.5"
              >
                {isUpdating ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    Installing...
                  </>
                ) : (
                  'Update Now'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
