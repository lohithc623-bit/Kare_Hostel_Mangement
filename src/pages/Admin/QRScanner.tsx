import React, { useEffect, useState, useRef } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, increment } from 'firebase/firestore';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, ShieldCheck, ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { MealRegistration } from '../../types';
import { cn } from '../../lib/utils';

export default function QRScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanning) {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [scanning]);

  async function onScanSuccess(decodedText: string) {
    if (verifying) return;
    setVerifying(true);
    setScanning(false);
    
    try {
      // Decode QR Data (Expect JSON or a specific ID)
      // For this app, the QR code contains the registration ID
      const registrationId = decodedText;
      
      const regDocRef = doc(db, 'registrations', registrationId);
      const regDoc = await getDocs(query(collection(db, 'registrations'), where('__name__', '==', registrationId)));
      
      if (regDoc.empty) {
        setScanResult({ success: false, message: "Invalid QR Code or unknown registration." });
        return;
      }

      const regData = regDoc.docs[0].data() as MealRegistration;
      const today = new Date().toISOString().split('T')[0];

      if (regData.date !== today) {
        setScanResult({ success: false, message: `Stale QR! This registration was for ${regData.date}.` });
        return;
      }

      if (regData.status === 'VERIFIED') {
        setScanResult({ success: false, message: "Student already verified for this meal.", data: regData });
        return;
      }

      // Update registration to VERIFIED
      await updateDoc(regDoc.docs[0].ref, {
        status: 'VERIFIED',
        verifiedAt: new Date().toISOString()
      });

      // Increment meal verified count
      await updateDoc(doc(db, 'meals', regData.mealId), {
        verifiedCount: increment(1)
      });

      setScanResult({ success: true, message: "Verification Successful!", data: regData });
      toast.success("Student Verified");
    } catch (err: any) {
      console.error(err);
      setScanResult({ success: false, message: "Verification Error: " + err.message });
    } finally {
      setVerifying(false);
    }
  }

  function onScanFailure(error: any) {
    // Silently ignore failures as it scans continuously
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="text-center">
        <h3 className="text-2xl font-bold tracking-tight text-[#141414]">QR Verification</h3>
        <p className="text-sm text-gray-500 mt-1">Scan student QR codes to mark attendance.</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl p-8">
        {!scanning && !scanResult && (
          <div className="flex flex-col items-center py-12">
            <div className="w-24 h-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300 mb-6">
              <QrCode size={48} />
            </div>
            <h4 className="font-bold text-gray-900 text-lg mb-2">Ready to Scan</h4>
            <p className="text-sm text-gray-500 text-center max-w-xs mb-8">
              Point your camera at the student's QR code displayed on their dashboard.
            </p>
            <button 
              onClick={() => setScanning(true)}
              className="px-8 py-4 bg-orange-600 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all flex items-center gap-3"
            >
              <QrCode size={20} />
              Launch Scanner
            </button>
          </div>
        )}

        {scanning && (
          <div className="space-y-4">
            <div id="reader" className="overflow-hidden rounded-2xl border-4 border-[#141414] bg-black"></div>
            <button 
              onClick={() => setScanning(false)}
              className="w-full py-3 text-red-500 font-bold uppercase text-[10px] tracking-widest hover:bg-red-50 rounded-xl transition-all"
            >
              Cancel Scanning
            </button>
          </div>
        )}

        <AnimatePresence>
          {scanResult && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "p-8 rounded-3xl border text-center flex flex-col items-center",
                scanResult.success ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"
              )}
            >
              <div className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg",
                scanResult.success ? "bg-green-600 text-white shadow-green-600/20" : "bg-red-600 text-white shadow-red-600/20"
              )}>
                {scanResult.success ? <ShieldCheck size={32} /> : <ShieldAlert size={32} />}
              </div>
              
              <h4 className={cn(
                "text-2xl font-bold mb-1",
                scanResult.success ? "text-green-800" : "text-red-800"
              )}>
                {scanResult.message}
              </h4>

              {scanResult.data && (
                <div className="mt-6 p-4 bg-white/60 rounded-2xl border border-white w-full max-w-sm">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 uppercase">
                      {scanResult.data.userName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 uppercase">{scanResult.data.userName}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-widest">{scanResult.data.userRegisterNumber} • Room {scanResult.data.userRoomNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Meal Type: {scanResult.data.mealType}</span>
                    <span className="text-green-600">ID: {scanResult.data.id.slice(-6)}</span>
                  </div>
                </div>
              )}

              <button 
                onClick={() => { setScanResult(null); setScanning(true); }}
                className="mt-8 px-6 py-3 bg-[#141414] text-white rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Scan Next Student
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-6 bg-white rounded-3xl border border-gray-200 shadow-sm flex gap-4">
        <div className="text-blue-600 mt-1">
          <AlertCircle size={20} />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-1">Scanned today</p>
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Attendance marked via QR scanner is updated in real-time. Students can view their verification status immediately on their personal dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
