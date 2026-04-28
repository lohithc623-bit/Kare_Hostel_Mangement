import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Utensils, AlertCircle, Calendar, ArrowRight, Clock, MapPin, Coffee, Sun, Moon, CheckCircle2, CalendarDays, Sparkles, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { MealRegistration, Meal, MealType } from '../../types';
import { cn, formatDate, formatTime } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';
import { format, addDays } from 'date-fns';

const mealIcons: Record<MealType, any> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon
};

const mealColors: Record<MealType, { bg: string; text: string; border: string; icon: string }> = {
  breakfast: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'text-amber-500' },
  lunch: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: 'text-orange-500' },
  dinner: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: 'text-indigo-500' },
};

export default function StudentDashboard({ navigate }: { navigate: (p: string) => void }) {
  const { profile } = useAuth();
  const [activeRegistration, setActiveRegistration] = useState<MealRegistration | null>(null);
  const [upcomingMeals, setUpcomingMeals] = useState<Meal[]>([]);
  const [recentHistory, setRecentHistory] = useState<MealRegistration[]>([]);
  const [stats, setStats] = useState({
    totalMeals: 0,
    attendedMeals: 0,
    totalFines: 0
  });

  useEffect(() => {
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    // Active registration for today
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      where('date', '==', today),
      where('status', 'in', ['REGISTERED', 'VERIFIED'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveRegistration({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as MealRegistration);
      } else {
        setActiveRegistration(null);
      }
    });

    // Upcoming meals (today & tomorrow) from admin schedule
    const mealsQuery = query(collection(db, 'meals'), where('date', 'in', [today, tomorrow]));
    const mealsUnsubscribe = onSnapshot(mealsQuery, (snapshot) => {
      const meals = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Meal))
        .filter(m => m.availability)
        .sort((a, b) => {
          // Sort: today first, then by meal type order
          const order: Record<MealType, number> = { breakfast: 0, lunch: 1, dinner: 2 };
          if (a.date !== b.date) return a.date < b.date ? -1 : 1;
          return order[a.type] - order[b.type];
        });
      setUpcomingMeals(meals);
    });

    // Stats
    const statsQuery = query(collection(db, 'registrations'), where('userId', '==', profile.uid));
    const statsUnsubscribe = onSnapshot(statsQuery, (snapshot) => {
      const allRegs = snapshot.docs.map(d => d.data() as MealRegistration);
      setStats({
        totalMeals: allRegs.length,
        attendedMeals: allRegs.filter(r => r.status === 'VERIFIED').length,
        totalFines: allRegs.reduce((sum, r) => sum + (r.fineAmount || 0), 0)
      });
    });

    // Recent verification history (last 5)
    const histQuery = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      where('status', '==', 'VERIFIED')
    );
    const histUnsubscribe = onSnapshot(histQuery, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MealRegistration));
      data.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setRecentHistory(data.slice(0, 5));
    }, (error) => {
      console.warn("Error fetching recent history:", error);
    });

    return () => {
      unsubscribe();
      mealsUnsubscribe();
      statsUnsubscribe();
      histUnsubscribe();
    };
  }, [profile]);

  if (!profile) return null;

  const getCurrentMealPhase = (): MealType => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 15) return 'lunch';
    return 'dinner';
  };

  return (
    <div className="space-y-4 sm:space-y-8 max-w-5xl mx-auto animate-in fade-in duration-500 px-1 sm:px-0">
      <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
        
        {/* Main Content Area */}
        <div className="flex-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
          {/* Identity Card */}
          <div className="glass-card p-5 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
              <div>
                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 sm:mb-2">Student Identity</p>
                <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 truncate">{profile.name}</h3>
                <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-1 tracking-tight">{profile.registerNumber}</p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <div className="bg-slate-50 border border-slate-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Utensils size={12} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Preference</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-900 leading-none truncate">{profile.messType}</p>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <MapPin size={12} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-[8px] sm:text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Room</p>
                    <p className="text-[10px] sm:text-xs font-bold text-slate-900 leading-none truncate">{profile.roomNumber}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 xs:grid-cols-3 gap-3 sm:gap-6">
            <div className="glass-card p-4 sm:p-6 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 sm:mb-2">Total Passed</p>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">{stats.totalMeals}</h3>
            </div>
            <div className="bg-emerald-50 border border-emerald-100 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col items-center justify-center text-center">
              <p className="text-[9px] sm:text-[10px] text-emerald-600 font-bold uppercase tracking-widest mb-1 sm:mb-2">Attended</p>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-emerald-700">{stats.attendedMeals}</h3>
            </div>
            <div className="bg-rose-50 border border-rose-100 p-4 sm:p-6 rounded-[20px] sm:rounded-[24px] flex flex-col items-center justify-center text-center">
              <p className="text-[9px] sm:text-[10px] text-rose-600 font-bold uppercase tracking-widest mb-1 sm:mb-2">Fines</p>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-rose-700">₹{stats.totalFines}</h3>
            </div>
          </div>

          {/* Upcoming Meals Schedule Widget */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <CalendarDays size={16} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-slate-900 text-sm sm:text-base">Upcoming Meals</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Admin schedule</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/student/register')}
                className="hidden xs:flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors group bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100"
              >
                Schedule
                <ChevronRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {upcomingMeals.length === 0 ? (
                <div className="py-6 sm:py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3">
                    <Utensils size={18} className="text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium">No meals scheduled yet.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:gap-3">
                  {upcomingMeals.slice(0, 4).map((meal) => {
                    const Icon = mealIcons[meal.type];
                    const color = mealColors[meal.type];
                    const isToday = meal.date === new Date().toISOString().split('T')[0];
                    const isCurrent = isToday && getCurrentMealPhase() === meal.type;
                    
                    return (
                      <motion.div 
                        key={meal.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer hover:shadow-md group",
                          isCurrent 
                            ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200 shadow-sm shadow-emerald-100" 
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                        onClick={() => navigate('/student/register')}
                      >
                        <div className={cn(
                          "w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
                          isCurrent ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : `${color.bg} ${color.icon}`
                        )}>
                          <Icon size={16} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs sm:text-sm font-bold text-slate-900 capitalize">{meal.type}</h5>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[7px] font-bold uppercase tracking-widest rounded-full animate-pulse">Now</span>
                            )}
                            <span className={cn(
                              "text-[8px] font-bold uppercase tracking-widest ml-auto shrink-0",
                              isToday ? "text-blue-500" : "text-slate-400"
                            )}>
                              {isToday ? 'Today' : 'Tomorrow'}
                            </span>
                          </div>
                          <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 truncate font-medium italic">
                            {meal.menu || 'To be announced'}
                          </p>
                        </div>

                        <div className="text-right shrink-0 ml-1 hidden sm:block">
                          {(meal.startTime || meal.closingTime) && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                              <Clock size={10} />
                              {meal.closingTime || meal.startTime}
                            </div>
                          )}
                        </div>

                        <ChevronRight size={12} className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {upcomingMeals.length > 0 && (
              <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('/student/register')}
                  className="w-full bg-slate-950 text-white p-4 sm:p-5 rounded-xl sm:rounded-2xl group relative overflow-hidden shadow-xl shadow-slate-900/10 border border-slate-800 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 sm:gap-4 text-left">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-white/10 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="font-serif text-base sm:text-lg font-bold leading-tight">View Full Schedule</h4>
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5">Explore the menu terminal</p>
                    </div>
                  </div>
                  <ArrowRight className="group-hover:translate-x-2 transition-transform text-emerald-400" size={20} />
                </motion.button>
              </div>
            )}
          </div>

          {/* Recent History - Compact on Mobile */}
          {recentHistory.length > 0 && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 sm:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-slate-900 text-sm sm:text-base">History</h4>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Recent check-ins</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate('/student/history')}
                  className="text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-slate-700 transition-colors"
                >
                  View All
                </button>
              </div>
              <div className="divide-y divide-slate-50">
                {recentHistory.map((reg) => {
                  const Icon = mealIcons[reg.mealType];
                  const color = mealColors[reg.mealType];
                  return (
                    <div key={reg.id} className="px-5 sm:px-8 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center", color.bg, color.icon)}>
                          <Icon size={12} />
                        </div>
                        <div>
                          <p className="text-[11px] sm:text-xs font-bold text-slate-900 capitalize">{reg.mealType}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">{formatDate(reg.date)}</p>
                        </div>
                      </div>
                      <span className="text-[8px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
                        ✓ Verified
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* QR Pass Node Area */}
        <div className="w-full lg:w-[320px] space-y-4 sm:space-y-6 order-1 lg:order-2">
          <div className="glass-card p-6 sm:p-8 flex flex-col items-center relative overflow-hidden">
            <h4 className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 sm:mb-6">Digital Access Pass</h4>
            
            <div className="w-full aspect-square bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-slate-100 p-4 sm:p-6 flex flex-col items-center justify-center shadow-inner relative">
              <div className="flex flex-col items-center z-10 relative">
                <div className={cn(
                  "bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl shadow-sm border",
                  activeRegistration ? "border-emerald-200 shadow-emerald-500/20" : "border-slate-100"
                )}>
                  <QRCodeSVG 
                    value={profile.uid} 
                    size={window.innerWidth < 640 ? 120 : 160}
                    fgColor="#0f172a"
                  />
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold font-mono mt-4 sm:mt-6 text-slate-400 uppercase tracking-widest truncate max-w-full px-2">
                  ID: {profile.registerNumber?.slice(-8) || profile.uid.slice(0, 8)}
                </p>
              </div>
            </div>

            <div className="mt-6 sm:mt-8 w-full space-y-4">
              <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                <span>Verification State</span>
                <span className={cn(
                  "px-2.5 py-1 rounded-full text-[8px] sm:text-[9px] shadow-sm border",
                  activeRegistration?.status === 'VERIFIED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                  activeRegistration?.status === 'REGISTERED' ? "bg-amber-50 text-amber-600 border-amber-100" :
                  "bg-slate-100 text-slate-400 border-slate-200"
                )}>
                  {activeRegistration?.status || 'INACTIVE'}
                </span>
              </div>
              {!activeRegistration ? (
                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl sm:rounded-2xl text-center space-y-3">
                  <p className="text-[10px] sm:text-[11px] font-medium text-slate-600 leading-relaxed">No active meal slot reserved for today's service phase.</p>
                  <button 
                    onClick={() => navigate('/student/register')}
                    className="w-full bg-slate-950 text-white rounded-lg sm:rounded-xl py-2 px-4 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
                  >
                    Reserve Now
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100/50 rounded-xl sm:rounded-2xl p-4 border border-slate-200/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 capitalize italic">
                      {activeRegistration.mealType} Slot
                    </span>
                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                    <Calendar size={12} className="text-slate-400" />
                    {formatDate(activeRegistration.date)}
                  </div>
                </div>
              )}
            </div>
            
            {activeRegistration?.status === 'VERIFIED' && (
              <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[1px] pointer-events-none rounded-[24px]"></div>
            )}
          </div>

          <div className="bg-slate-950 rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 text-white shadow-2xl shadow-slate-950/20 relative overflow-hidden border border-slate-800">
            <h5 className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-2 sm:mb-3 flex items-center gap-2">
              <CheckCircle2 size={12} />
              Gate Terminal
            </h5>
            <p className="text-xs sm:text-sm leading-relaxed font-serif italic mb-4 sm:mb-6 text-slate-300">
              "Present this pass at the gate for lightning-fast verification."
            </p>
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase text-slate-500 tracking-widest">
              <Clock size={12} />
              {formatTime(new Date())}
            </div>
            <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-emerald-500/10 blur-3xl rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
