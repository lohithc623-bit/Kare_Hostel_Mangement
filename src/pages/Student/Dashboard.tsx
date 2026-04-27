import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { User, CreditCard, Utensils, CheckCircle, AlertCircle, Calendar, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { MealRegistration } from '../../types';
import { cn, formatDate } from '../../lib/utils';

export default function StudentDashboard({ navigate }: { navigate: (p: string) => void }) {
  const { profile } = useAuth();
  const [activeRegistration, setActiveRegistration] = useState<MealRegistration | null>(null);
  const [stats, setStats] = useState({
    totalMeals: 0,
    attendedMeals: 0,
    totalFines: 0
  });

  useEffect(() => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      where('date', '==', today),
      where('status', 'in', ['REGISTERED', 'VERIFIED'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Find the most relevant registration for now
      if (!snapshot.empty) {
        // Typically current time would decide which meal to show, 
        // for now just show the first active one for today
        setActiveRegistration({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MealRegistration);
      } else {
        setActiveRegistration(null);
      }
    });

    const statsQuery = query(collection(db, 'registrations'), where('userId', '==', profile.uid));
    const statsUnsubscribe = onSnapshot(statsQuery, (snapshot) => {
      const allRegs = snapshot.docs.map(d => d.data() as MealRegistration);
      setStats({
        totalMeals: allRegs.length,
        attendedMeals: allRegs.filter(r => r.status === 'VERIFIED').length,
        totalFines: allRegs.reduce((sum, r) => sum + (r.fineAmount || 0), 0)
      });
    });

    return () => {
      unsubscribe();
      statsUnsubscribe();
    };
  }, [profile]);

  if (!profile) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">Student Profile</p>
              <h3 className="text-2xl font-bold text-gray-900">{profile.name}</h3>
              <p className="text-xs text-gray-500 font-mono mt-1 uppercase tracking-tight">{profile.registerNumber}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Mess Type</p>
                  <p className="text-xs font-semibold text-gray-900">{profile.messType}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Hostel Room</p>
                  <p className="text-xs font-semibold text-gray-900">{profile.roomNumber}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Total Meals</p>
              <h3 className="text-xl font-bold">{stats.totalMeals}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Attended</p>
              <h3 className="text-xl font-bold text-blue-600">{stats.attendedMeals}</h3>
            </div>
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Fines (₹)</p>
              <h3 className="text-xl font-bold text-red-600">{stats.totalFines}</h3>
            </div>
          </div>

          {!activeRegistration && (
            <button 
              onClick={() => navigate('/student/register')}
              className="w-full bg-blue-600 text-white p-5 rounded-xl group relative overflow-hidden shadow-lg shadow-blue-600/20"
            >
              <div className="relative z-10 flex items-center justify-between px-2">
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Utensils size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Book Next Meal</h4>
                    <p className="text-[10px] text-blue-100 uppercase tracking-widest mt-0.5">Secure your pass now</p>
                  </div>
                </div>
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
              </div>
            </button>
          )}
        </div>

        <div className="w-full md:w-80 space-y-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm flex flex-col items-center">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">Meal QR Pass</h4>
            
            <div className="w-full aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-100 p-6 flex flex-col items-center justify-center">
              {activeRegistration ? (
                <div className="flex flex-col items-center">
                  <QRCodeSVG 
                    value={activeRegistration.id} 
                    size={140}
                    fgColor="#141414"
                  />
                  <p className="text-[9px] font-mono mt-4 text-gray-400 uppercase">
                    PASS: {activeRegistration.id.slice(-8)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center px-4">
                  <AlertCircle size={32} className="text-gray-200 mb-4" />
                  <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">No active pass</p>
                </div>
              )}
            </div>

            <div className="mt-8 w-full space-y-3">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">
                <span>Verification</span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px]",
                  activeRegistration?.status === 'VERIFIED' ? "bg-blue-50 text-blue-600 font-bold" :
                  activeRegistration?.status === 'REGISTERED' ? "bg-orange-50 text-orange-600 font-bold" :
                  "bg-gray-50 text-gray-300"
                )}>
                  {activeRegistration?.status || 'INACTIVE'}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between border border-gray-100">
                <span className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">
                  {activeRegistration ? activeRegistration.mealType : 'Waiting for booking'}
                </span>
                <span className="text-[9px] font-bold text-gray-400 uppercase">{activeRegistration ? 'TODAY' : '-'}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-600 rounded-xl p-6 text-white shadow-md relative overflow-hidden">
            <h5 className="text-[10px] font-bold text-blue-200 uppercase tracking-widest mb-3">Notice</h5>
            <p className="text-xs leading-relaxed font-serif italic mb-4 opacity-90">
              "Show this QR pass at the entry. Real-time verification is active."
            </p>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-blue-100">
              <Calendar size={10} />
              {formatDate(new Date())}
            </div>
            <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-white/10 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
