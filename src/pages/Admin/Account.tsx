import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Building2, Save, User, Shield, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { AccountSettings } from '../../types';

export default function Account() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [settings, setSettings] = useState<AccountSettings>({
    hostelName: '',
    inchargeName: '',
    mobile: '',
    address: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'account'));
        if (docSnap.exists()) {
          setSettings(docSnap.data() as AccountSettings);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setInitialLoad(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || profile.role !== 'admin') {
      toast.error("Only administrators can update these settings.");
      return;
    }

    setLoading(true);
    try {
      const docRef = doc(db, 'settings', 'account');
      const docSnap = await getDoc(docRef);
      
      const payload = { ...settings, updatedAt: new Date().toISOString() };
      
      if (docSnap.exists()) {
        await updateDoc(docRef, payload);
      } else {
        await setDoc(docRef, payload);
      }
      toast.success("Hostel settings updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 sm:space-y-10 animate-in fade-in duration-500 max-w-5xl mx-auto px-1 sm:px-0">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl rotate-3 sm:rotate-0">
            <User size={24} />
          </div>
          <div>
            <h3 className="text-2xl sm:text-3xl font-serif font-black text-slate-900 tracking-tight leading-none mb-1">Account Terminal</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Hostel configuration & identity hub</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 sm:gap-10">
        
        {/* Administrator Profile Side Panel */}
        <div className="lg:col-span-4 space-y-6 sm:space-y-8">
          <div className="bg-white rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-sm flex flex-col items-center text-center relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-900 text-white rounded-[40px] flex items-center justify-center text-4xl font-serif font-black shadow-2xl mb-6 ring-8 ring-slate-50 group-hover:scale-105 transition-transform duration-500">
                {profile?.name?.[0] || 'A'}
              </div>
              <h4 className="font-serif font-black text-slate-900 text-xl sm:text-2xl mb-1 tracking-tight">{profile?.name}</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mb-6">{profile?.email}</p>
              
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-2.5 rounded-2xl border border-emerald-100/50 shadow-sm mx-auto w-fit">
                <Shield size={14} />
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{profile?.role}</span>
              </div>
            </div>
            
            {/* Aesthetic Detail */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
          </div>

          <div className="bg-blue-50/50 backdrop-blur-sm border border-blue-100/70 p-6 sm:p-8 rounded-[32px] flex flex-col sm:flex-row lg:flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
              <Info size={24} />
            </div>
            <div>
              <h5 className="font-black text-blue-900 text-[10px] uppercase tracking-[0.1em] mb-2">Architectural Integrity</h5>
              <p className="text-[11px] text-blue-800 leading-relaxed font-medium uppercase tracking-tight">
                Global configurations are synchronized in real-time. Changes to the hostel identity are propagated across all student-facing terminals and reporting modules instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Global Hostel Settings Form Panel */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-[32px] sm:rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 sm:px-10 sm:py-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-4">
              <Building2 className="text-slate-400" size={24} />
              <div>
                <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-[0.2em] leading-none mb-1">Hostel Configuration</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Primary data for certification & receipts</p>
              </div>
            </div>

            {initialLoad ? (
               <div className="p-20 text-center text-slate-300 font-bold uppercase tracking-widest text-[11px] italic">Initialising environment...</div>
            ) : (
              <form onSubmit={handleSave} className="p-8 sm:p-12 space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Hostel / Institution Identity</label>
                  <div className="group">
                    <input 
                      required
                      value={settings.hostelName}
                      onChange={(e) => setSettings({...settings, hostelName: e.target.value})}
                      className="premium-input bg-slate-50/50 border-slate-200 hover:bg-white transition-all text-base font-medium h-14 sm:h-16 rounded-2xl"
                      placeholder="e.g. MH2 Mega Mess Terminal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Chief Warden / Controller</label>
                    <input 
                      required
                      value={settings.inchargeName}
                      onChange={(e) => setSettings({...settings, inchargeName: e.target.value})}
                      className="premium-input bg-slate-50/50 border-slate-200 h-14 sm:h-16 rounded-2xl"
                      placeholder="Full Name"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Emergency Contact Mobile</label>
                    <input 
                      required
                      value={settings.mobile}
                      onChange={(e) => setSettings({...settings, mobile: e.target.value})}
                      className="premium-input bg-slate-50/50 border-slate-200 font-mono h-14 sm:h-16 rounded-2xl"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1">Official Registered Address</label>
                  <textarea 
                    required
                    value={settings.address}
                    onChange={(e) => setSettings({...settings, address: e.target.value})}
                    className="w-full h-32 bg-slate-50/50 border border-slate-200 rounded-[24px] p-6 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 transition-all resize-none shadow-inner"
                    placeholder="Enter complete facility address..."
                  />
                </div>

                <div className="pt-8 border-t border-slate-50">
                  <button 
                    type="submit"
                    disabled={loading || profile?.role !== 'admin'}
                    className="w-full sm:w-fit sm:min-w-[240px] px-10 py-5 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.15em] hover:bg-slate-800 disabled:opacity-50 active:scale-95 transition-all shadow-2xl flex items-center justify-center gap-3"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <><Save size={18} /> Deploy Configuration</>
                    )}
                  </button>
                  {profile?.role !== 'admin' && (
                    <p className="mt-4 text-[9px] text-rose-500 font-bold uppercase tracking-widest text-center sm:text-left">
                      Authorization failure: Administrative privileges required.
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
