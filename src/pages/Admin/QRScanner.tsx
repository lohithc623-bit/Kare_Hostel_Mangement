import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, updateDoc, doc, increment, onSnapshot } from 'firebase/firestore';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, ShieldCheck, ShieldAlert, AlertCircle, RefreshCw, Volume2, Camera, CameraOff, Sparkles, User, Info, Utensils } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { MealRegistration, UserProfile } from '../../types';
import { cn, formatTime } from '../../lib/utils';
import { MealType } from '../../types';

function getCurrentMealType(): MealType {
  const currentHour = new Date().getHours();
  if (currentHour < 10 || (currentHour === 10 && new Date().getMinutes() <= 30)) return 'breakfast';
  if (currentHour < 15 || (currentHour === 15 && new Date().getMinutes() <= 30)) return 'lunch';
  return 'dinner';
}

type ScannerStatus = 'idle' | 'scanning' | 'result' | 'denied';

export default function QRScanner() {
  const [status, setStatus] = useState<ScannerStatus>('idle');
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    status: 'success' | 'error' | 'warning';
    message: string;
    data?: MealRegistration & { user?: UserProfile };
  } | null>(null);
  
  const [activeMealMode, setActiveMealMode] = useState<MealType>(getCurrentMealType());
  const [isVerifying, setIsVerifying] = useState(false);
  const [todayVerifiedCount, setTodayVerifiedCount] = useState(0);
  
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    const todayStr = new Date().toISOString().split('T')[0];
    const q = query(collection(db, 'registrations'), where('date', '==', todayStr), where('status', '==', 'VERIFIED'));
    const unsubscribe = onSnapshot(q, (snapshot) => setTodayVerifiedCount(snapshot.size));

    return () => {
      unsubscribe();
      if (html5QrCodeRef.current?.isScanning) html5QrCodeRef.current.stop();
    };
  }, []);

  const playBeep = (type: 'success' | 'error' | 'warning') => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'success') {
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    } else {
      osc.type = type === 'error' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(type === 'error' ? 300 : 400, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(); osc.stop(ctx.currentTime + 0.3);
    }
  };

  const startScanner = () => {
    setScanResult(null);
    setStatus('scanning');
  };

  useEffect(() => {
    let mounted = true;
    if (status !== 'scanning') return;

    async function initScanner() {
      // Polling for the reader element
      let element = null;
      for (let i = 0; i < 20; i++) {
        element = document.getElementById('reader');
        if (element) break;
        await new Promise(r => setTimeout(r, 100));
        if (!mounted) return;
      }

      if (!element) {
        console.error("Scanner element #reader not found");
        setStatus('denied');
        return;
      }

      try {
        if (html5QrCodeRef.current) {
          try { await html5QrCodeRef.current.stop(); } catch(e) {}
          try { html5QrCodeRef.current.clear(); } catch(e) {}
        }
        
        html5QrCodeRef.current = new Html5Qrcode("reader");
        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (err) {
        console.error("Camera start error:", err);
        setStatus('denied');
        toast.error("Camera access failed. Check browser permissions.");
      }
    }

    initScanner();
    return () => { mounted = false; };
  }, [status]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop();
    }
    setStatus('idle');
  };

  async function onScanSuccess(decodedText: string) {
    if (isVerifying) return;
    setIsVerifying(true);
    await stopScanner();
    
    try {
      const studentId = decodedText;
      const today = new Date().toISOString().split('T')[0];
      const { getDoc, getDocs, collection, query, where } = await import('firebase/firestore');
      
      // 1. Verify Student Identity
      const studentDoc = await getDoc(doc(db, 'users', studentId));
      if (!studentDoc.exists()) {
        playBeep('error');
        setScanResult({ success: false, status: 'error', message: "Identity Unknown" });
        setStatus('result');
        return;
      }
      
      const studentData = studentDoc.data() as UserProfile;
      const mealId = `${today}-${activeMealMode}`;
      const registrationId = `${studentId}-${mealId}`;

      // 2. Fetch Meal Timing to enforce 10-min grace period
      const mealDoc = await getDoc(doc(db, 'meals', mealId));
      if (mealDoc.exists()) {
        const mealData = mealDoc.data();
        if (mealData.closingTime) {
          const [closeH, closeM] = mealData.closingTime.split(':').map(Number);
          const graceDeadline = new Date();
          graceDeadline.setHours(closeH);
          graceDeadline.setMinutes(closeM + 10); // 10 mins grace
          graceDeadline.setSeconds(0);

          if (new Date() > graceDeadline) {
            playBeep('error');
            setScanResult({ 
              success: false, 
              status: 'error', 
              message: "Window Expired",
              data: { 
                userName: studentData.name, 
                userRegisterNumber: studentData.registerNumber,
                note: `Service window ended at ${mealData.closingTime}. The 10-min grace period has expired.`
              } as any
            });
            setStatus('result');
            return;
          }
        }
      }

      // 3. Initial check for selected meal registration
      const regDoc = await getDoc(doc(db, 'registrations', registrationId));
      let regData = regDoc.exists() ? regDoc.data() as MealRegistration : null;

      // 4. Intelligent Fallback: If no registration for selected meal, search for ANY registration today
      if (!regData || regData.status === 'CANCELLED') {
        const q = query(
          collection(db, 'registrations'), 
          where('userId', '==', studentId), 
          where('date', '==', today),
          where('status', 'in', ['REGISTERED', 'VERIFIED'])
        );
        const otherRegs = await getDocs(q);
        
        if (!otherRegs.empty) {
          // Found a registration for a different meal!
          const foundReg = otherRegs.docs[0].data() as MealRegistration;
          
          if (foundReg.mealType !== activeMealMode) {
            playBeep('warning');
            setScanResult({ 
              success: false, 
              status: 'warning', 
              message: `Wrong Meal Type`,
              data: { 
                ...foundReg, 
                userName: studentData.name, 
                userRegisterNumber: studentData.registerNumber,
                note: `Student is registered for ${foundReg.mealType.toUpperCase()}, not ${activeMealMode.toUpperCase()}.`
              } as any
            });
            setStatus('result');
            return;
          }
          regData = foundReg;
        } else {
          // No registrations at all today
          playBeep('error');
          setScanResult({ 
            success: false, 
            status: 'error', 
            message: "No Active Booking",
            data: { 
              userName: studentData.name, 
              userRegisterNumber: studentData.registerNumber,
              note: "No valid meal reservations found for this student today."
            } as any
          });
          setStatus('result');
          return;
        }
      }

      // 4. Double Scan Prevention
      if (regData.status === 'VERIFIED') {
        playBeep('warning');
        setScanResult({ 
          success: false, 
          status: 'warning', 
          message: "Already Verified", 
          data: { ...regData, userName: studentData.name, userRegisterNumber: studentData.registerNumber } 
        });
        setStatus('result');
        return;
      }

      // 5. Commit Verification
      const targetRegId = `${studentId}-${today}-${regData.mealType}`;
      await updateDoc(doc(db, 'registrations', targetRegId), { 
        status: 'VERIFIED', 
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'system-scanner'
      });
      
      try { 
        await updateDoc(doc(db, 'meals', regData.mealId), { 
          verifiedCount: increment(1) 
        }); 
      } catch (e) {}

      playBeep('success');
      setScanResult({ 
        success: true, 
        status: 'success', 
        message: "Access Granted", 
        data: { ...regData, userName: studentData.name, userRegisterNumber: studentData.registerNumber } 
      });
      setStatus('result');
      toast.success(`${studentData.name} verified for ${regData.mealType}`);
    } catch (err: any) {
      console.error("Verification error:", err);
      playBeep('error');
      setScanResult({ success: false, status: 'error', message: "Protocol Error" });
      setStatus('result');
    } finally {
      setIsVerifying(false);
    }
  }

  function onScanFailure() {}

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-20 animate-in fade-in duration-700 px-2 sm:px-0">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 text-emerald-600">
            <Sparkles size={14} className="animate-pulse" />
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest truncate">Verification Active</span>
          </div>
          <h3 className="text-3xl sm:text-4xl font-serif font-black text-slate-900 tracking-tight">Scanner Node</h3>
          <p className="text-slate-400 text-xs sm:text-sm font-medium hidden sm:block">Verify student meal credentials in real-time.</p>
        </div>
        <div className="bg-white border border-slate-100 shadow-sm px-4 py-2 sm:px-6 sm:py-3 rounded-2xl flex flex-col items-end shrink-0">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">Verified Today</span>
          <span className="text-xl sm:text-2xl font-black font-serif text-slate-900 leading-none mt-0.5">{todayVerifiedCount}</span>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center">
        <div className="flex bg-slate-100/50 p-1 rounded-xl sm:rounded-2xl border border-slate-200/50 backdrop-blur-sm w-full sm:w-auto">
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type) => (
            <button
              key={type}
              onClick={() => setActiveMealMode(type)}
              disabled={status === 'scanning'}
              className={cn(
                "flex-1 sm:px-8 py-3 rounded-lg sm:rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all",
                activeMealMode === type ? "bg-slate-900 text-white shadow-md sm:shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Main Card */}
      <div className="relative min-h-[440px] sm:min-h-[500px] bg-white rounded-[32px] sm:rounded-[40px] border border-slate-200 shadow-xl sm:shadow-2xl overflow-hidden flex flex-col items-center justify-center p-6 sm:p-8">
        <Volume2 className="absolute top-6 right-6 sm:top-8 sm:right-8 text-slate-200" size={20} />
        
        <AnimatePresence mode="wait">
          {status === 'denied' && (
            <motion.div key="denied" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner"><CameraOff size={32} /></div>
              <div className="space-y-2">
                <h4 className="text-xl font-serif font-bold text-slate-900">Vision Connection Failed</h4>
                <p className="text-slate-500 text-xs max-w-xs mx-auto mb-4 leading-relaxed">
                  Terminal cannot function without visual input. Please adjust browser permissions to allow camera access.
                </p>
              </div>
              <button 
                onClick={startScanner} 
                className="bg-primary text-white text-[10px] font-bold uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg active:scale-95 transition-all"
              >
                Retry Request
              </button>
            </motion.div>
          )}

          {status === 'result' && scanResult && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm space-y-8">
              <div className="text-center">
                <div className={cn(
                  "w-24 h-24 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-lg",
                  scanResult.status === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
                )}>
                  {scanResult.status === 'success' ? <ShieldCheck size={48} /> : <ShieldAlert size={48} />}
                </div>
                <h4 className="text-3xl font-serif font-black text-slate-900 mb-1 leading-tight">{scanResult.message}</h4>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{activeMealMode} protocol verified</p>
              </div>

              {scanResult.data && (
                <div className="bg-slate-50 border border-slate-100 p-6 rounded-[24px] space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                      <User size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate leading-none mt-1">
                        {scanResult.data.userName}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-slate-400 uppercase mt-1">
                        REG: {scanResult.data.userRegisterNumber}
                      </p>
                    </div>
                  </div>
                  
                  {scanResult.status === 'success' ? (
                    <div className="pt-3 border-t border-slate-200/50 flex items-center gap-2 text-emerald-600">
                      <ShieldCheck size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Authenticated & Logged</span>
                    </div>
                  ) : (
                    (scanResult.data as any).note && (
                      <div className="pt-3 border-t border-slate-200/50 flex items-start gap-2 text-rose-500">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span className="text-[10px] font-bold uppercase tracking-tight leading-relaxed">
                          {(scanResult.data as any).note}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}

              <button 
                onClick={startScanner} 
                className="w-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest py-5 rounded-2xl shadow-xl active:scale-95 transition-all outline-none"
              >
                Clear Node & Reset
              </button>
            </motion.div>
          )}

          {status === 'scanning' && (
            <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full max-w-sm space-y-8">
              <div className="relative aspect-square rounded-[40px] overflow-hidden border-[6px] border-slate-900 bg-black shadow-2xl group">
                <div id="reader" className="w-full h-full"></div>
                {/* Laser Animation */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="w-full h-1 bg-primary/40 shadow-[0_0_15px_rgba(255,59,0,0.8)] absolute top-0 animate-[shredder_3s_ease-in-out_infinite]" />
                </div>
                {/* Corner Accents */}
                <div className="absolute top-6 left-6 w-8 h-8 border-t-4 border-l-4 border-white/40 rounded-tl-xl" />
                <div className="absolute top-6 right-6 w-8 h-8 border-t-4 border-r-4 border-white/40 rounded-tr-xl" />
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-4 border-l-4 border-white/40 rounded-bl-xl" />
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-4 border-r-4 border-white/40 rounded-br-xl" />
              </div>
              <div className="text-center space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] animate-pulse">Position QR Within Viewport</h4>
                <button 
                  onClick={stopScanner} 
                  className="px-8 py-3 rounded-full text-rose-600 bg-rose-50 font-black uppercase text-[9px] tracking-widest border border-rose-100 hover:bg-rose-100 transition-colors"
                >
                  Terminate Request
                </button>
              </div>
            </motion.div>
          )}

          {status === 'idle' && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="text-center space-y-8">
              <div className="w-28 h-28 bg-slate-50 rounded-[32px] border border-slate-100 flex items-center justify-center mx-auto shadow-inner group">
                <QrCode size={48} className="text-slate-900 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="space-y-3">
                <h4 className="text-2xl font-serif font-black text-slate-900 tracking-tight">System Standby</h4>
                <p className="text-slate-400 text-xs sm:text-sm max-w-[240px] mx-auto leading-relaxed">
                  Awaiting student credentials. Ensure optimal lighting for optical recognition.
                </p>
              </div>
              <button 
                onClick={startScanner} 
                className="bg-primary text-white text-[11px] font-bold uppercase tracking-[0.15em] px-12 py-5 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 skew-x-12" />
                Initiate Scanner
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{ icon: User, color: 'text-blue-600', label: 'Student ID', text: 'Verifies UID against records.' },
          { icon: RefreshCw, color: 'text-orange-600', label: 'Auto-Reset', text: 'Standby after each cycle.' },
          { icon: ShieldCheck, color: 'text-emerald-600', label: 'Secure', text: 'Verified real-time logs.' }].map((item, idx) => (
          <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex items-start gap-4">
            <div className={cn("p-3 bg-white rounded-xl shadow-sm", item.color)}><item.icon size={20} /></div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{item.label}</p>
              <p className="text-xs text-slate-600 font-medium">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
