import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Users, Utensils, CheckCircle, XCircle, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Meal, MealRegistration } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { DonutChart, BarChart } from '../../components/ui/Chart';
import { cn, formatTime } from '../../lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    registeredToday: 0,
    verifiedToday: 0,
    absentToday: 0,
    totalFines: 0
  });
  
  const [mealStats, setMealStats] = useState({
    breakfast: 0,
    lunch: 0,
    dinner: 0
  });

  const [recentRegistrations, setRecentRegistrations] = useState<MealRegistration[]>([]);
  const [todayMeals, setTodayMeals] = useState<Meal[]>([]);

  useEffect(() => {
    const studentsUnsubscribe = onSnapshot(query(collection(db, 'users'), where('role', '==', 'student')), (snapshot) => {
      setStats(prev => ({ ...prev, totalStudents: snapshot.size }));
    }, (err) => {
      console.error("Dashboard students listener error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Access denied to Student records.");
      }
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
      
      const breakfast = regs.filter(r => r.mealType === 'breakfast').length;
      const lunch = regs.filter(r => r.mealType === 'lunch').length;
      const dinner = regs.filter(r => r.mealType === 'dinner').length;
      
      setMealStats({ breakfast, lunch, dinner });
    }, (err) => {
      console.error("Dashboard registrations listener error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Access denied to Registration records.");
      }
    });

    const mealsUnsubscribe = onSnapshot(query(collection(db, 'meals'), where('date', '==', todayStr)), (snapshot) => {
      setTodayMeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meal)));
    }, (err) => {
      console.error("Dashboard meals listener error:", err);
      if (err.code === 'permission-denied') {
        toast.error("Access denied to Meal records.");
      }
    });

    return () => {
      studentsUnsubscribe();
      registrationsUnsubscribe();
      mealsUnsubscribe();
    };
  }, []);

  const donutData = [
    { label: 'Verified', value: stats.verifiedToday, color: '#059669' }, // emerald-600
    { label: 'Pending', value: stats.registeredToday - stats.verifiedToday - stats.absentToday, color: '#f59e0b' }, // amber-500
    { label: 'Absent', value: stats.absentToday, color: '#ef4444' } // red-500
  ];

  const barData = [
    { label: 'Breakfast', value: mealStats.breakfast, color: '#0f766e' },
    { label: 'Lunch', value: mealStats.lunch, color: '#0f766e' },
    { label: 'Dinner', value: mealStats.dinner, color: '#0f766e' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-700 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">Metrics Terminal</h3>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Real-time operational intelligence portal.</p>
        </div>
        <div className="flex items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-600 font-bold text-[9px] sm:text-[10px] tracking-widest uppercase shadow-sm shadow-emerald-100/50">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            System Live
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-5">
        <StatCard icon={<Users size={18} />} title="Students" value={stats.totalStudents} color="slate" />
        <StatCard icon={<Utensils size={18}/>} title="Bookings" value={stats.registeredToday} color="blue" />
        <StatCard icon={<CheckCircle size={18}/>} title="Verified" value={stats.verifiedToday} color="emerald" trend="+Live" trendUp={true} />
        <StatCard icon={<XCircle size={18}/>} title="Absent" value={stats.absentToday} color="red" />
        <StatCard icon={<AlertTriangle size={18}/>} title="Fines" value={`₹${stats.totalFines}`} color="amber" />
      </div>

      {/* Charts & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Verification Status Donut */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col items-center">
          <div className="flex justify-between items-center w-full mb-6 sm:mb-8">
            <h4 className="font-bold text-slate-800 text-[10px] sm:text-xs tracking-wider uppercase">Verification Flow</h4>
            <span className="text-[9px] sm:text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">Today</span>
          </div>
          <div className="relative py-4">
            <DonutChart data={donutData} size={window.innerWidth < 640 ? 140 : 180} />
          </div>
          <div className="mt-6 sm:mt-8 grid grid-cols-3 w-full gap-2 border-t border-slate-50 pt-6">
            {donutData.map((d, i) => (
              <div key={i} className="flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                  <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest">{d.label}</span>
                </div>
                <span className="text-base sm:text-xl font-bold text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Meal History Bar Chart */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6 flex flex-col">
           <h4 className="font-bold text-slate-800 text-[10px] sm:text-xs tracking-wider uppercase mb-6 sm:mb-8">Registration Volume</h4>
           <div className="flex-1 flex items-center justify-center min-h-[160px] sm:min-h-[180px]">
             {mealStats.breakfast === 0 && mealStats.lunch === 0 && mealStats.dinner === 0 ? (
               <div className="text-slate-300 text-[10px] sm:text-xs italic font-medium">No registrations data available</div>
             ) : (
               <BarChart data={barData} height={180} />
             )}
           </div>
        </div>

        {/* Schedule Timeline */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">
          <h4 className="font-bold text-slate-800 text-[10px] sm:text-xs tracking-wider uppercase mb-6 sm:mb-8 flex items-center gap-2">
            Schedule Stream
            <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
          </h4>
          <div className="space-y-3">
            {todayMeals.length === 0 ? (
               <div className="p-8 bg-slate-50 rounded-2xl text-center text-slate-400 text-[10px] sm:text-xs italic border border-dashed border-slate-200">
                 No operational schedule set.
               </div>
            ) : (
               todayMeals.map((meal) => (
                 <div key={meal.id} className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-all group border-l-4 border-l-slate-200">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 capitalize text-sm sm:text-base">{meal.type}</p>
                      <div className="flex items-center gap-1.5 mt-1 sm:mt-1.5">
                        <Utensils size={10} className="text-slate-300" />
                        <p className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                           {meal.startTime ? formatTime(meal.startTime) + ' - ' : ''}
                           {formatTime(meal.closingTime)}
                        </p>
                      </div>
                    </div>
                    <div className={cn(
                      "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full shrink-0 ml-4",
                      meal.availability ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"
                      )}
                    />
                 </div>
               ))
            )}
          </div>
        </div>

      </div>

      {/* Activity Monitor */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-5 sm:p-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-800 text-xs sm:text-sm tracking-wider uppercase">Live Activity Stream</h4>
            <span className="w-1 h-1 bg-primary rounded-full"></span>
          </div>
          <button className="text-[9px] sm:text-[10px] font-bold text-primary uppercase tracking-widest hover:text-accent transition-all flex items-center gap-1.5 group">
            Global Logs <ArrowUpRight size={10} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
        <div className="divide-y divide-slate-50">
          {recentRegistrations.length === 0 ? (
            <div className="p-12 sm:p-16 text-center text-slate-300 text-xs sm:text-sm font-medium italic">No signal found from terminal endpoints.</div>
          ) : (
            recentRegistrations.map((reg) => (
              <div key={reg.id} className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs sm:text-sm shadow-inner group-hover:bg-primary group-hover:text-white transition-colors">
                    {reg.userName?.[0] || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">{reg.userName}</p>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5 truncate">{reg.mealType} • {reg.userRegisterNumber}</p>
                  </div>
                </div>
                <div className={cn(
                  "px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest border shrink-0 ml-4",
                  reg.status === 'VERIFIED' ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-50" : 
                  reg.status === 'ABSENT' ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {reg.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
