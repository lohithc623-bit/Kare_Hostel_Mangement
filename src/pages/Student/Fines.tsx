import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CreditCard, AlertCircle, Info, Calendar, ShieldCheck } from 'lucide-react';
import { MealRegistration } from '../../types';
import { cn, formatDate } from '../../lib/utils';

export default function Fines() {
  const { profile } = useAuth();
  const [fines, setFines] = useState<MealRegistration[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      where('status', '==', 'ABSENT')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFines(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MealRegistration)));
    });
    return () => unsubscribe();
  }, [profile]);

  const totalFine = fines.reduce((sum, f) => sum + (f.fineAmount || 0), 0);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto px-1 sm:px-0 animate-in fade-in duration-500">
      {/* Financial Summary Card */}
      <div className="bg-slate-900 rounded-[24px] sm:rounded-[32px] p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="relative z-10">
          <p className="text-[9px] sm:text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-3 sm:mb-4">Financial Overview</p>
          <h3 className="text-4xl sm:text-5xl font-serif font-black tracking-tight mb-2">₹{totalFine.toLocaleString()}</h3>
          <p className="text-slate-400 text-[10px] sm:text-xs uppercase tracking-[0.1em] font-medium opacity-80">Total Outstanding Balance</p>
          
          <div className="flex items-center gap-3 sm:gap-4 mt-8 sm:mt-10">
            <button className="flex-1 sm:flex-none px-6 py-3.5 sm:px-8 sm:py-4 bg-white text-slate-900 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all shadow-lg">
              Clear Dues
            </button>
            <button className="flex-1 sm:flex-none px-6 py-3.5 sm:px-8 sm:py-4 bg-white/10 text-white border border-white/10 rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-white/20 active:scale-95 transition-all">
              Statement
            </button>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-600/10 to-transparent pointer-events-none"></div>
        <div className="absolute -bottom-10 -right-10 p-8 opacity-[0.03] pointer-events-none rotate-12">
          <CreditCard size={240} />
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-black text-slate-900 uppercase text-[10px] tracking-[0.15em]">Penalty History</h4>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-full">{fines.length} incidents</span>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {fines.length === 0 ? (
            <div className="p-12 sm:p-20 bg-white rounded-[32px] border border-slate-100 text-center shadow-sm">
              <div className="w-16 h-16 rounded-[24px] bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <ShieldCheck size={32} />
              </div>
              <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Financial Health: Excellent</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-[240px] mx-auto leading-relaxed font-medium uppercase tracking-tight">You have zero outstanding penalties. Maintain consistent attendance to remain clear.</p>
            </div>
          ) : (
            fines.map((fine) => (
              <div key={fine.id} className="bg-white p-4 sm:p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-100 hover:bg-rose-50/10 transition-all">
                <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform">
                    <AlertCircle size={22} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight truncate leading-tight">Missed {fine.mealType}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      <Calendar size={10} className="shrink-0" />
                      {formatDate(fine.date)}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl sm:text-2xl font-black font-serif text-rose-600 tracking-tight">₹{fine.fineAmount}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter opacity-70">Regulatory Fine</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Advisory Section */}
      <div className="p-6 sm:p-8 bg-blue-50/50 backdrop-blur-sm border border-blue-100 rounded-[28px] sm:rounded-[32px] flex flex-col sm:flex-row gap-4 sm:items-center">
        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
          <Info size={20} />
        </div>
        <div>
          <h5 className="text-[10px] font-black text-blue-900 uppercase tracking-[0.1em] mb-1">Impact Mitigation Advisory</h5>
          <p className="text-[11px] text-blue-800 leading-relaxed font-medium uppercase tracking-tight max-w-2xl">
            Authorize meal cancellations before active deadlines if attendance is impossible. Unverified registered meals result in a mandatory ₹50 penalty. Dues must be settled to preserve academic clearance.
          </p>
        </div>
      </div>
    </div>
  );
}
