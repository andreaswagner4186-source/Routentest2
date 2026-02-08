
import React, { useState, useEffect, useRef } from 'react';
import { Stop, Customer, ViewType } from './types';
import { optimizeRoute, transcribeAddress } from './services/geminiService';
import { optimizeRouteNearestNeighbor, getDistance } from './utils/geoUtils';
import { 
  MapPin, 
  Truck, 
  BookUser, 
  FileUp, 
  CheckCircle2, 
  Circle, 
  Navigation, 
  Trash2, 
  ChevronRight, 
  BarChart3,
  Plus,
  Clock,
  Map as MapIcon,
  Check,
  Zap,
  Mic,
  Loader2,
  MapPinned,
  Flag,
  RotateCcw,
  Navigation2
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const MapPreview: React.FC<{ stops: Stop[], startPoint: any, endPoint: any }> = ({ stops, startPoint, endPoint }) => {
  return (
    <div className="relative w-full h-48 bg-slate-200 rounded-2xl overflow-hidden border border-slate-300 shadow-inner mb-6 flex items-center justify-center">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(90deg, #4f46e5 1px, transparent 1px), linear-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      
      <div className="relative w-full h-full p-8">
         <svg className="absolute inset-0 w-full h-full pointer-events-none">
           {stops.length > 1 && stops.map((_, i) => {
             if (i === stops.length - 1) return null;
             const x1 = 20 + (i * 15) % 60;
             const y1 = 20 + (i * 25) % 60;
             const x2 = 20 + ((i + 1) * 15) % 60;
             const y2 = 20 + ((i + 1) * 25) % 60;
             return (
               <line 
                 key={i} 
                 x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`} 
                 stroke="#6366f1" strokeWidth="3" strokeDasharray="6,4" 
               />
             );
           })}
         </svg>
         
         <div className="absolute w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20" style={{ left: '10%', top: '50%' }}>
            <MapPinned size={10} className="text-white" />
         </div>

         {stops.map((s, i) => (
           <div 
             key={s.id}
             className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center text-[8px] font-bold text-white z-10
               ${s.status === 'completed' ? 'bg-green-500' : 'bg-indigo-600'}`}
             style={{ 
               left: `${20 + (i * 15) % 60}%`, 
               top: `${20 + (i * 25) % 60}%` 
             }}
           >
             {i + 1}
           </div>
         ))}

         {endPoint.address && (
           <div className="absolute w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center z-20" style={{ left: '90%', top: '50%' }}>
              <Flag size={10} className="text-white" />
           </div>
         )}
      </div>
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-slate-600 shadow-sm border border-slate-200">
        Live-Ansicht
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>('route');
  const [stops, setStops] = useState<Stop[]>([]);
  const [customers] = useState<Customer[]>([
    { id: '1', name: 'Apotheke Zentral', address: 'Alexanderplatz 1, 10178 Berlin' },
    { id: '2', name: 'Bio Markt', address: 'Schönhauser Allee 80, 10439 Berlin' },
    { id: '3', name: 'Kiosk West', address: 'Kantstraße 10, 10623 Berlin' }
  ]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [newStopAddress, setNewStopAddress] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number}>({ lat: 52.5200, lng: 13.4050 });

  const [startPoint, setStartPoint] = useState({ address: 'Aktueller Standort', lat: 52.5200, lng: 13.4050 });
  const [endPoint, setEndPoint] = useState({ address: '', lat: 0, lng: 0 });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (stops.length === 0) {
      setStops([
        { id: 'd1', address: 'Alexanderplatz 1, 10178 Berlin', customerName: 'Apotheke Zentral', status: 'pending', order: 0, lat: 52.5219, lng: 13.4132 },
        { id: 'd2', address: 'Schönhauser Allee 80, 10439 Berlin', customerName: 'Bio Markt', status: 'pending', order: 1, lat: 52.5407, lng: 13.4116 },
        { id: 'd3', address: 'Kantstraße 10, 10623 Berlin', customerName: 'Kiosk West', status: 'pending', order: 2, lat: 52.5061, lng: 13.3159 },
      ]);
    }
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setStartPoint(prev => prev.address === 'Aktueller Standort' ? { ...prev, ...loc } : prev);
        },
        (err) => console.warn("Geolocation denied", err)
      );
    }
  }, []);

  const getETA = (index: number) => {
    const now = new Date();
    const eta = new Date(now.getTime() + (index + 1) * 15 * 60000);
    return eta.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const addStop = (address: string, customerName?: string) => {
    if (!address.trim()) return;
    const newStop: Stop = {
      id: Math.random().toString(36).substr(2, 9),
      address,
      customerName,
      status: 'pending',
      order: stops.length,
      lat: userLocation.lat + (Math.random() - 0.5) * 0.1,
      lng: userLocation.lng + (Math.random() - 0.5) * 0.1
    };
    setStops([...stops, newStop]);
    setNewStopAddress('');
  };

  const openNavigation = (address: string) => {
    // Using origin=My+Location ensures turn-by-turn starts from the current live GPS position
    const url = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${encodeURIComponent(address)}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const navigateToNext = () => {
    const nextStop = stops.find(s => s.status === 'pending');
    if (nextStop) {
      openNavigation(nextStop.address);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          const address = await transcribeAddress(base64Audio);
          if (address) setNewStopAddress(address);
          setIsTranscribing(false);
        };
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setIsRecording(true);
      setTimeout(() => { if (recorder.state === 'recording') stopRecording(); }, 5000);
    } catch (err) { console.error("Recording error:", err); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleOptimizeAI = async () => {
    if (stops.length < 2) return;
    setIsOptimizing(true);
    try {
      const optimizedIds = await optimizeRoute(stops, startPoint, endPoint.address ? endPoint : undefined);
      const optimizedStops = [...stops].sort((a, b) => {
        const aIdx = optimizedIds.indexOf(a.id);
        const bIdx = optimizedIds.indexOf(b.id);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      }).map((s, idx) => ({ ...s, order: idx }));
      setStops(optimizedStops);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleOptimizeLocal = () => {
    if (stops.length < 2) return;
    const optimized = optimizeRouteNearestNeighbor(stops, startPoint, endPoint.address ? endPoint : undefined);
    setStops(optimized.map((s, i) => ({ ...s, order: i })));
  };

  const resetEndpoints = () => {
    setStartPoint({ address: 'Aktueller Standort', ...userLocation });
    setEndPoint({ address: '', lat: 0, lng: 0 });
  };

  const toggleStopStatus = (id: string) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'completed' ? 'pending' : 'completed' } : s));
  };

  const deleteStop = (id: string) => {
    setStops(prev => prev.filter(s => s.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim() !== '');
      const newStops: Stop[] = lines.slice(1).map((line, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        address: line.split(',')[0]?.trim() || 'Unbekannt',
        customerName: line.split(',')[1]?.trim() || '',
        status: 'pending' as any,
        order: stops.length + i,
        lat: userLocation.lat + (Math.random() - 0.5) * 0.05,
        lng: userLocation.lng + (Math.random() - 0.5) * 0.05
      }));
      setStops(prev => [...prev, ...newStops]);
      setActiveView('route');
    };
    reader.readAsText(file);
  };

  const statsData = [
    { name: 'Erledigt', value: stops.filter(s => s.status === 'completed').length },
    { name: 'Offen', value: stops.filter(s => s.status === 'pending').length },
  ];
  const COLORS = ['#22c55e', '#f1f5f9'];

  const nextStop = stops.find(s => s.status === 'pending');

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-slate-50 border-x border-slate-200 shadow-2xl overflow-hidden">
      <header className="bg-indigo-700 text-white px-5 py-4 shadow-lg shrink-0 z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <Truck size={22} strokeWidth={2.5} />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase">Routify Pro</h1>
          </div>
          <div className="flex items-center gap-2">
             <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
             <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Bereit</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {activeView === 'dashboard' && (
          <div className="p-5 space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
              <h2 className="text-lg font-black text-slate-800 mb-1">Tagesübersicht</h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statsData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                      {statsData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-around mt-2">
                <div>
                  <p className="text-3xl font-black text-green-600">{statsData[0].value}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Erledigt</p>
                </div>
                <div className="h-10 w-px bg-slate-100 self-center"></div>
                <div>
                  <p className="text-3xl font-black text-slate-300">{statsData[1].value}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Offen</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setActiveView('import')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <FileUp size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">Import</span>
              </button>
              <button onClick={() => setActiveView('addressbook')} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <BookUser size={24} />
                </div>
                <span className="text-xs font-bold text-slate-700">Kunden</span>
              </button>
            </div>

            <div className="bg-indigo-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
              <h3 className="font-black text-xl mb-1 flex items-center gap-2">
                <Navigation2 size={20} /> Nächster Halt
              </h3>
              {nextStop ? (
                <>
                  <p className="text-indigo-100 text-sm mb-4 line-clamp-1">{nextStop.address}</p>
                  <button 
                    onClick={() => openNavigation(nextStop.address)} 
                    className="w-full bg-white text-indigo-700 font-black py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    NAVIGATION STARTEN <ChevronRight size={20} />
                  </button>
                </>
              ) : (
                <p className="text-indigo-200 text-sm">Keine Lieferungen mehr.</p>
              )}
            </div>
          </div>
        )}

        {activeView === 'route' && (
          <div className="p-5 animate-in slide-in-from-bottom-4 duration-500">
            <MapPreview stops={stops} startPoint={startPoint} endPoint={endPoint} />

            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-6 space-y-3">
               <div className="flex justify-between items-center px-1">
                 <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Routen-Konfiguration</h3>
                 <button onClick={resetEndpoints} className="text-indigo-600 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 px-2 py-1 rounded-lg transition">
                    <RotateCcw size={12} strokeWidth={3} /> Reset
                 </button>
               </div>
               
               <div className="space-y-2">
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500">
                      <MapPinned size={14} strokeWidth={3} />
                    </div>
                    <input 
                      type="text" 
                      value={startPoint.address}
                      onChange={(e) => setStartPoint({ ...startPoint, address: e.target.value })}
                      placeholder="Startpunkt..."
                      className="w-full bg-slate-50 pl-11 pr-4 py-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"
                    />
                  </div>
                  
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500">
                      <Flag size={14} strokeWidth={3} />
                    </div>
                    <input 
                      type="text" 
                      value={endPoint.address}
                      onChange={(e) => setEndPoint({ ...endPoint, address: e.target.value })}
                      placeholder="Endpunkt (optional)..."
                      className="w-full bg-slate-50 pl-11 pr-4 py-3 rounded-xl border border-slate-100 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-100 transition"
                    />
                  </div>
               </div>
            </div>

            <div className="flex justify-between items-end mb-6">
              <div>
                <h2 className="text-2xl font-black text-slate-800">Route</h2>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {stops.filter(s => s.status === 'pending').length} Stops übrig
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleOptimizeLocal} title="Local Optimizer" className="bg-slate-200 text-slate-600 p-2.5 rounded-xl active:scale-95 transition">
                  <Zap size={18} strokeWidth={3} />
                </button>
                <button onClick={handleOptimizeAI} disabled={isOptimizing || stops.length < 2} className="bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-indigo-200 active:scale-95 transition disabled:opacity-50 flex items-center gap-2">
                  {isOptimizing ? 'AI...' : 'AI OPTIMIZE'}
                </button>
              </div>
            </div>

            <div className="space-y-4">
               {/* Quick Action Navigation */}
               {nextStop && (
                 <button 
                  onClick={navigateToNext}
                  className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 active:bg-indigo-700 transition-all border-b-4 border-indigo-800"
                 >
                   <Navigation2 size={18} fill="currentColor" /> JETZT ZUM NÄCHSTEN STOP
                 </button>
               )}

               <div className="flex gap-2 relative">
                <input 
                  type="text" 
                  value={newStopAddress}
                  onChange={(e) => setNewStopAddress(e.target.value)}
                  placeholder={isTranscribing ? "Verarbeite Sprache..." : "Adresse suchen..."}
                  className={`flex-1 bg-white pl-5 pr-12 py-4 rounded-2xl border border-slate-200 shadow-sm font-medium text-sm focus:ring-4 focus:ring-indigo-100 transition outline-none ${isTranscribing ? 'animate-pulse bg-indigo-50' : ''}`}
                  onKeyPress={(e) => e.key === 'Enter' && addStop(newStopAddress)}
                  disabled={isTranscribing}
                />
                <button 
                  onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording}
                  disabled={isTranscribing}
                  className={`absolute right-[70px] top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 text-white scale-110 shadow-lg' : 'bg-indigo-50 text-indigo-600'}`}
                >
                  {isTranscribing ? <Loader2 size={20} className="animate-spin" /> : isRecording ? <Mic size={20} className="animate-bounce" /> : <Mic size={20} />}
                </button>
                <button onClick={() => addStop(newStopAddress)} disabled={isTranscribing || !newStopAddress} className="bg-slate-800 text-white w-14 rounded-2xl flex items-center justify-center shadow-md disabled:opacity-50">
                  <Plus size={24} strokeWidth={3} />
                </button>
              </div>
              
              <div className="space-y-3 mt-6">
                {stops.length === 0 && <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-300 font-black uppercase text-xs tracking-widest">Keine Stopps</div>}
                {stops.map((stop, index) => {
                  const isCompleted = stop.status === 'completed';
                  return (
                    <div key={stop.id} className={`bg-white p-5 rounded-3xl shadow-sm border border-slate-100 relative transition-all duration-300 ${isCompleted ? 'opacity-50 saturate-0 scale-95' : 'hover:border-indigo-300'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-inner ${isCompleted ? 'bg-slate-100 text-slate-400' : 'bg-indigo-50 text-indigo-700'}`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-slate-800 text-base truncate">{stop.customerName || 'Hauszustellung'}</h4>
                            {!isCompleted && <div className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <Clock size={10} strokeWidth={3} /><span className="text-[10px] font-black">{getETA(index)}</span>
                            </div>}
                          </div>
                          <p className="text-xs font-bold text-slate-500 line-clamp-1 mb-4">{stop.address}</p>
                          <div className="flex gap-2">
                             <button onClick={() => toggleStopStatus(stop.id)} className={`flex-1 py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border transition-colors ${isCompleted ? 'bg-slate-50 text-slate-400' : 'bg-green-500 text-white border-green-400'}`}>
                              {isCompleted ? <Check size={16} strokeWidth={3} /> : 'ERLEDIGT'}
                            </button>
                            {!isCompleted && <button onClick={() => openNavigation(stop.address)} className="bg-indigo-700 text-white w-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all"><Navigation size={20} strokeWidth={2.5} /></button>}
                            <button onClick={() => deleteStop(stop.id)} className="text-slate-300 p-2 hover:text-red-400 transition"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeView === 'addressbook' && (
          <div className="p-5 space-y-4 animate-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Kunden</h2>
            {customers.map(customer => (
              <div key={customer.id} className="bg-white p-5 rounded-3xl border border-slate-100 flex justify-between items-center group shadow-sm">
                <div className="min-w-0 pr-4">
                  <h4 className="font-black text-slate-800 truncate">{customer.name}</h4>
                  <p className="text-xs font-bold text-slate-400 truncate">{customer.address}</p>
                </div>
                <button onClick={() => { addStop(customer.address, customer.name); setActiveView('route'); }} className="bg-indigo-50 text-indigo-700 w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition"><Plus size={24} strokeWidth={3} /></button>
              </div>
            ))}
          </div>
        )}

        {activeView === 'import' && (
          <div className="p-5 space-y-6 animate-in slide-in-from-left-4 duration-500">
            <h2 className="text-2xl font-black text-slate-800">CSV Import</h2>
            <div className="bg-white p-10 rounded-[2.5rem] border-4 border-dashed border-slate-100 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto"><FileUp size={40} /></div>
              <div><p className="font-black text-slate-700 text-lg">Datei hochladen</p><p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">Adresse, Kundenname</p></div>
              <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
              <label htmlFor="csv-upload" className="block w-full bg-slate-800 text-white font-black py-5 rounded-3xl cursor-pointer shadow-xl shadow-slate-200">DATEI WÄHLEN</label>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-slate-200 px-8 py-4 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        <button onClick={() => setActiveView('dashboard')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><BarChart3 size={24} strokeWidth={activeView === 'dashboard' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-widest">Status</span></button>
        <button onClick={() => setActiveView('route')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'route' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><MapPin size={24} strokeWidth={activeView === 'route' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-widest">Route</span></button>
        <button onClick={() => setActiveView('addressbook')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'addressbook' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><BookUser size={24} strokeWidth={activeView === 'addressbook' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-widest">Kunden</span></button>
        <button onClick={() => setActiveView('import')} className={`flex flex-col items-center gap-1 transition-all ${activeView === 'import' ? 'text-indigo-600 scale-110' : 'text-slate-300'}`}><FileUp size={24} strokeWidth={activeView === 'import' ? 3 : 2} /><span className="text-[9px] font-black uppercase tracking-widest">Import</span></button>
      </nav>
    </div>
  );
};

export default App;
