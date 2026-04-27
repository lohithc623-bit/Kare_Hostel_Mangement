import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { CreditCard, AlertCircle, Info, Calendar } from 'lucide-react';
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
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-[#141414] rounded-[2rem] p-10 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-4">Financial Overview</p>
          <h3 className="text-4xl font-bold tracking-tight mb-2">₹{totalFine.toLocaleString()}</h3>
          <p className="text-gray-400 text-sm uppercase tracking-widest font-mono">Total Outstanding Fines</p>
          
          <div className="flex items-center gap-4 mt-10">
            <button className="px-6 py-3 bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
              Clear Dues
            </button>
            <button className="px-6 py-3 bg-white/10 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-white/20 transition-all">
              Statement
            </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-orange-600/10 to-transparent"></div>
        <div className="absolute -bottom-12 -right-12 p-8 opacity-10">
          <CreditCard size={180} />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Fine History</h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{fines.length} incidents</span>
        </div>

        <div className="space-y-3">
          {fines.length === 0 ? (
            <div className="p-12 bg-white rounded-3xl border border-gray-100 text-center text-gray-400 italic text-sm">
              Great! You have no recorded fines. Keep attending your meals!
            </div>
          ) : (
            fines.map((fine) => (
              <div key={fine.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:border-red-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                    <AlertCircle size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">Missed {fine.mealType}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-widest mt-0.5">
                      <Calendar size={10} />
                      {formatDate(fine.date)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600 tracking-tighter">₹{fine.fineAmount}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Penalty fee</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl flex gap-4">
        <div className="text-blue-600 shrink-0">
          <Info size={20} />
        </div>
        <div>
          <h5 className="text-[11px] font-bold text-blue-900 uppercase tracking-widest mb-1">How to avoid fines?</h5>
          <p className="text-xs text-blue-800 leading-relaxed">
            Ensure you cancel your meal booking before the respective deadlines if you are unable to attend. Each missed registered meal attracts a ₹50 penalty which must be settled before the semester end examinations.
          </p>
        </div>
      </div>
    </div>
  );
}
