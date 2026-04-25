import { useState, useEffect } from 'react';
import { Geolocation } from '@capacitor/geolocation';
import { MapPin, Clock, CheckCircle2, User, Loader2, AlertCircle } from 'lucide-react';

interface AttendanceRecord {
  id: string;
  name: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  synced: boolean;
}

export default function App() {
  const [employeeName, setEmployeeName] = useState(() => localStorage.getItem('employeeName') || '');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    // Load records from local storage on mount
    const saved = localStorage.getItem('attendance_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse records', e);
      }
    }
  }, []);

  useEffect(() => {
    // Sync name to local storage whenever it changes
    localStorage.setItem('employeeName', employeeName);
  }, [employeeName]);

  const handleCheckIn = async () => {
    if (!employeeName.trim()) {
      setError('Please enter your name or Employee ID first.');
      return;
    }

    setIsLogging(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // Ensure permissions are granted
      const permStatus = await Geolocation.checkPermissions();
      if (permStatus.location === 'denied') {
        const reqStatus = await Geolocation.requestPermissions();
        if (reqStatus.location === 'denied') {
          throw new Error('Location permissions are required to check in.');
        }
      }

      // Fetch accurate location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });

      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        name: employeeName,
        timestamp: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        synced: false // Flag to potentially sync to a remote DB later
      };

      const updatedRecords = [newRecord, ...records];
      setRecords(updatedRecords);
      localStorage.setItem('attendance_records', JSON.stringify(updatedRecords));
      
      setSuccessMsg('Successfully checked in!');
      setTimeout(() => setSuccessMsg(null), 3000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to capture location. Please try again.');
    } finally {
      setIsLogging(false);
    }
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

  return (
    <div className="min-h-screen bg-[#F1F3F6] flex flex-col font-sans text-slate-900 selection:bg-indigo-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">A</div>
          <h1 className="text-lg font-bold tracking-tight text-slate-800">Attendance<span className="text-indigo-600">Sync</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 hidden sm:flex">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse block"></div>
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Ready / Location Active</span>
          </div>
          {/* Fallback for smaller screens to still show a ready dot */}
          <div className="sm:hidden flex items-center justify-center w-8 h-8 bg-emerald-50 rounded-full border border-emerald-100">
             <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse block"></div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-8">
            {/* Left Column wrapper (for desktop) / Top for mobile */}
            <div className="w-full lg:w-5/12 flex flex-col gap-6">

              {/* User Configuration Area */}
              <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Employee Info</span>
                <div className="relative mt-2">
                   {/* Input matching the dense vibe */}
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <User className="h-5 w-5 text-slate-400" />
                   </div>
                   <input
                     type="text"
                     value={employeeName}
                     onChange={(e) => setEmployeeName(e.target.value)}
                     placeholder="Enter your Name or ID"
                     className="pl-10 w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 block p-3 transition-colors"
                   />
                </div>
                {error && (
                  <div className="flex items-start gap-2 p-3 mt-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 max-w-full w-full">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-2 p-3 mt-2 bg-emerald-50 text-emerald-700 text-sm rounded-lg border border-emerald-100 max-w-full w-full justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-medium">{successMsg}</p>
                  </div>
                )}
              </section>

              {/* Action Area */}
              <section className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col items-center text-center">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Status: {isLogging ? 'Logging...' : 'Ready'}</span>
                 <h2 className="text-3xl font-extrabold text-slate-800 mb-8">Ready for work?</h2>

                 <div className="relative group">
                   <div className="absolute inset-0 bg-indigo-600 blur-2xl opacity-20 rounded-full"></div>
                   <button 
                     onClick={handleCheckIn}
                     disabled={isLogging}
                     className={`relative w-48 h-48 rounded-full text-white flex flex-col items-center justify-center shadow-xl border-8 border-white transition-all duration-300 transform ${
                       isLogging ? 'bg-indigo-400 cursor-not-allowed scale-95' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                     }`}
                   >
                     {isLogging ? (
                        <>
                          <Loader2 className="w-12 h-12 animate-spin mb-2" />
                          <span className="text-xl font-black uppercase tracking-tight">Syncing...</span>
                        </>
                      ) : (
                        <>
                          <MapPin className="w-12 h-12 mb-2 group-hover:-translate-y-1 transition-transform" />
                          <span className="text-xl font-black uppercase tracking-tight">Punch In</span>
                        </>
                      )}
                   </button>
                 </div>
                 
                 <div className="mt-10 w-full">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-500 border-b border-slate-100 pb-2">
                      <span>LOCATION VERIFICATION</span>
                      <span className="text-emerald-500">SECURE</span>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100">
                        <MapPin className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">GPS Active</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider">Device location enabled</p>
                      </div>
                    </div>
                 </div>
              </section>
            </div>

            {/* Right Column: High Density Information Grid format for Logs */}
            <div className="w-full lg:w-7/12 flex flex-col gap-4">
               <div className="flex items-center justify-between px-2 sm:px-0">
                 <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">Recent Activity</h3>
                 <span className="text-xs font-bold text-indigo-600 cursor-pointer hover:underline">{records.length} Logs recorded</span>
               </div>

               <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
                  {records.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl m-4 border border-slate-200 border-dashed">
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No recent attendance records.</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-12 gap-2 px-4 sm:px-6 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl text-[10px] font-bold text-slate-400 uppercase tracking-wider sticky top-0">
                        <div className="col-span-5 sm:col-span-4">DATE / TIME</div>
                        <div className="col-span-3 sm:col-span-3">EMPLOYEE</div>
                        <div className="col-span-4 sm:col-span-3 hidden sm:block">GPS CORD</div>
                        <div className="col-span-4 sm:col-span-2 text-right">STATUS</div>
                      </div>

                      <div className="flex-1 overflow-y-auto max-h-[400px] lg:max-h-[600px] divide-y divide-slate-50">
                        {records.map((record) => (
                           <div key={record.id} className="grid grid-cols-12 items-center gap-2 px-4 sm:px-6 py-4 hover:bg-slate-50 transition-colors">
                              <div className="col-span-5 sm:col-span-4 flex flex-col">
                                <span className="text-xs font-bold text-slate-700">{formatDate(record.timestamp).split(',')[0]}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{formatDate(record.timestamp).split(',')[1]}</span>
                              </div>
                              <div className="col-span-3 sm:col-span-3">
                                <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded font-bold text-[9px] uppercase tracking-wider truncate inline-block max-w-[80px] sm:max-w-full">
                                  {record.name}
                                </span>
                              </div>
                              <div className="col-span-4 sm:col-span-3 font-mono text-slate-500 text-[10px] hidden sm:block">
                                {record.latitude.toFixed(2)}, {record.longitude.toFixed(2)}
                              </div>
                              <div className="col-span-4 sm:col-span-2 text-right flex justify-end">
                                <span className="text-emerald-500 font-bold text-[10px] uppercase tracking-widest">Verified</span>
                              </div>
                           </div>
                        ))}
                      </div>
                    </>
                  )}
                  {/* Footer status line from theme */}
                  <div className="p-4 bg-slate-50 rounded-b-2xl border-t border-slate-100 flex justify-between mt-auto shrink-0">
                     <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Continuous sync active</span>
                     </div>
                     <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">v2.4.1-stable</span>
                  </div>
               </div>
            </div>

      </main>
    </div>
  );
}
