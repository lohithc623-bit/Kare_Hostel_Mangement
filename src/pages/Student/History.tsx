import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { History as HistoryIcon, Utensils, CheckCircle, XCircle, Clock } from 'lucide-react';
import { MealRegistration } from '../../types';
import { cn, formatDate, formatTime } from '../../lib/utils';

export default function History() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<MealRegistration[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MealRegistration)));
    });
    return () => unsubscribe();
  }, [profile]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#141414]">Attendance History</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Timeline of your mess hall activity</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date & Meal</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Activity Log</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 italic text-sm">No mess activity recorded yet.</td>
                </tr>
              ) : (
                history.map((reg) => (
                  <tr key={reg.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 uppercase">
                          <Utensils size={14} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 uppercase tracking-tighter">{reg.mealType} • {formatDate(reg.date)}</p>
                          <p className="text-[10px] text-gray-400 uppercase">Booking ID: {reg.id.slice(-8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        reg.status === 'VERIFIED' ? "bg-green-100 text-green-700" :
                        reg.status === 'ABSENT' ? "bg-red-100 text-red-700" : "bg-orange-100 text-orange-700"
                      )}>
                        {reg.status === 'VERIFIED' ? <CheckCircle size={12} /> : 
                         reg.status === 'ABSENT' ? <XCircle size={12} /> : <Clock size={12} />}
                        {reg.status}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        {reg.status === 'VERIFIED' ? `Verified at ${formatTime(reg.verifiedAt!)}` : 
                         reg.status === 'ABSENT' ? `Flagged at ${formatTime(reg.updatedAt || reg.timestamp)}` : 
                         `Booked at ${formatTime(reg.timestamp)}`}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
