import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Users, Utensils, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { Meal, MealRegistration } from '../../types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    registeredToday: 0,
    verifiedToday: 0,
    absentToday: 0,
    totalFines: 0
  });
  const [recentRegistrations, setRecentRegistrations] = useState<MealRegistration[]>([]);

  useEffect(() => {
    // Fetch stats
    const studentsUnsubscribe = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
    });

    const todayStr = new Date().toISOString().split('T')[0];
    const registrationsUnsubscribe = onSnapshot(query(collection(db, 'registrations'), where('date', '==', todayStr)), (snapshot) => {
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MealRegistration));
      setStats(prev => ({
        ...prev,
        registeredToday: regs.length,
        verifiedToday: regs.filter(r => r.status === 'VERIFIED').length,
        absentToday: regs.filter(r => r.status === 'ABSENT').length,
        totalFines: regs.reduce((sum, r) => sum + (r.fineAmount || 0), 0)
      }));
      setRecentRegistrations(regs.slice(0, 5));
    });

    return () => {
      studentsUnsubscribe();
      registrationsUnsubscribe();
    };
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-[#141414]">Overview</h3>
          <p className="text-sm text-gray-500">Real-time metrics for today's meal operations.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">Status</p>
          <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></span>
            SYSTEM ONLINE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard icon={Users} label="Total Students" value={stats.totalStudents} color="blue" />
        <StatCard icon={Utensils} label="Registered" value={stats.registeredToday} color="orange" />
        <StatCard icon={CheckCircle} label="Verified" value={stats.verifiedToday} color="green" />
        <StatCard icon={XCircle} label="Absent" value={stats.absentToday} color="red" />
        <StatCard icon={AlertTriangle} label="Fine Pending" value={`₹${stats.totalFines}`} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h4 className="font-bold text-gray-800">Live Verification Status</h4>
            <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">View All</button>
          </div>
          <div className="divide-y divide-gray-100">
            {recentRegistrations.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm">No activity recorded for today yet.</div>
            ) : (
              recentRegistrations.map((reg) => (
                <div key={reg.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm uppercase">
                      {reg.userName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{reg.userName}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-mono">{reg.userRegisterNumber} • {reg.mealType}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    reg.status === 'VERIFIED' ? "bg-blue-50 text-blue-700 border border-blue-100" : 
                    reg.status === 'ABSENT' ? "bg-red-50 text-red-700 border border-red-100" : "bg-orange-50 text-orange-700 border border-orange-100"
                  )}>
                    {reg.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Menu Overview</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 font-medium italic">Recent Insights</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic border-t border-gray-50 pt-3">
                "Ensure all staff members are trained on the QR scanning process to avoid delays."
              </p>
            </div>
          </div>

          <div className="bg-blue-600 rounded-xl p-5 text-white relative overflow-hidden shadow-md">
            <div className="relative z-10">
              <p className="text-xs opacity-80 mb-1">System Notification</p>
              <p className="text-sm font-bold">Meal registrations and attendance are tracked in real-time.</p>
              <button className="mt-4 w-full bg-white text-blue-600 text-xs font-bold py-2 rounded shadow-sm hover:bg-blue-50 transition-colors">Notify Students</button>
            </div>
            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-blue-500 opacity-20 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">{label}</p>
      <h3 className={cn("text-2xl font-bold", color === 'red' && "text-red-600")}>{value}</h3>
      <div className="mt-3">
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
          <div className={cn(
            "h-full rounded-full transition-all duration-1000",
            color === 'blue' ? 'bg-blue-500' :
            color === 'orange' ? 'bg-orange-500' :
            color === 'green' ? 'bg-green-500' :
            color === 'red' ? 'bg-red-500' : 'bg-amber-500'
          )} style={{ width: '70%' }}></div>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
