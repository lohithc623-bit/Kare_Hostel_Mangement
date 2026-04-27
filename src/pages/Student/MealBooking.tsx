import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { Utensils, Clock, CheckCircle2, XCircle, Calendar, AlertTriangle, Coffee, Sun, Moon, CalendarDays, Timer, Users, Sparkles, ChevronDown, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Meal, MealType, MealRegistration } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { isAfter, setHours, setMinutes, format, addDays } from 'date-fns';

const mealConfig: Record<MealType, { icon: any; gradient: string; bg: string; border: string; accent: string; lightBg: string }> = {
  breakfast: {
    icon: Coffee,
    gradient: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    accent: 'text-amber-600',
    lightBg: 'bg-amber-500/5',
  },
  lunch: {
    icon: Sun,
    gradient: 'from-orange-500 to-red-500',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
    accent: 'text-orange-600',
    lightBg: 'bg-orange-500/5',
  },
  dinner: {
    icon: Moon,
    gradient: 'from-indigo-500 to-violet-500',
    bg: 'bg-indigo-50',
    border: 'border-indigo-100',
    accent: 'text-indigo-600',
    lightBg: 'bg-indigo-500/5',
  },
};

export default function MealBooking() {
  const { profile } = useAuth();
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal>>({});
  const [userRegistrations, setUserRegistrations] = useState<Record<string, MealRegistration>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profile) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    const mealsQuery = query(collection(db, 'meals'), where('date', 'in', [today, tomorrow]));
    const unsubscribeMeals = onSnapshot(mealsQuery, (snapshot) => {
      const data: any = {};
      snapshot.docs.forEach(d => data[d.id] = d.data());
      setTodayMeals(data);
    });

    const regsQuery = query(collection(db, 'registrations'), where('userId', '==', profile.uid), where('date', 'in', [today, tomorrow]));
    const unsubscribeRegs = onSnapshot(regsQuery, (snapshot) => {
      const data: any = {};
      snapshot.docs.forEach(d => data[d.data().mealId] = { id: d.id, ...d.data() });
      setUserRegistrations(data);
    });

    return () => {
      unsubscribeMeals();
      unsubscribeRegs();
    };
  }, [profile]);

  const checkDeadline = (mealType: MealType, mealDate: string, mealStartTime?: string) => {
    const now = new Date();
    const dateObj = new Date(mealDate);
    
    // Default hours to subtract from start time for deadline calculation
    const bufferHours = { breakfast: 10, lunch: 3, dinner: 3 };

    if (!mealStartTime) {
      // Fallback to static deadlines if admin hasn't set timing
      if (mealType === 'breakfast') {
        const deadline = setMinutes(setHours(addDays(dateObj, -1), 22), 0);
        return !isAfter(now, deadline);
      } else if (mealType === 'lunch') {
        const deadline = setMinutes(setHours(dateObj, 9), 0);
        return !isAfter(now, deadline);
      } else if (mealType === 'dinner') {
        const deadline = setMinutes(setHours(dateObj, 16), 0);
        return !isAfter(now, deadline);
      }
      return false;
    }

    // Dynamic deadline: X hours before startTime
    const [hours, minutes] = mealStartTime.split(':').map(Number);
    let deadline = setMinutes(setHours(dateObj, hours - bufferHours[mealType]), minutes);
    
    // For breakfast, if it becomes too early, cap it at 22:00 night before
    if (mealType === 'breakfast') {
       deadline = setMinutes(setHours(addDays(dateObj, -1), 21), 0); // 21:00 night before
    }

    return !isAfter(now, deadline);
  };

  const handleBooking = async (type: MealType, date: string) => {
    if (!profile) return;
    const mealId = `${date}-${type}`;
    const regId = `${profile.uid}-${mealId}`;
    
    setLoading(prev => ({ ...prev, [mealId]: true }));
    try {
      if (userRegistrations[mealId]) {
        await deleteDoc(doc(db, 'registrations', regId));
        await updateDoc(doc(db, 'meals', mealId), {
          registeredCount: increment(-1)
        });
        toast.success("Booking cancelled successfully");
      } else {
        await setDoc(doc(db, 'registrations', regId), {
          userId: profile.uid,
          userName: profile.name,
          userRegisterNumber: profile.registerNumber,
          userRoomNumber: profile.roomNumber,
          mealId,
          mealType: type,
          date,
          status: 'REGISTERED',
          fineAmount: 0,
          timestamp: new Date().toISOString()
        });
        
        const mealDoc = await getDoc(doc(db, 'meals', mealId));
        if (!mealDoc.exists()) {
          await setDoc(doc(db, 'meals', mealId), {
            id: mealId,
            type,
            date,
            menu: 'Menu not set by admin yet.',
            availability: true,
            closingTime: '',
            registeredCount: 1,
            verifiedCount: 0,
            absentCount: 0,
            fineCount: 0
          });
        } else {
          await updateDoc(doc(db, 'meals', mealId), {
            registeredCount: increment(1)
          });
        }
        
        toast.success("Meal booked successfully!");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(prev => ({ ...prev, [mealId]: false }));
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');

  const getCurrentMealPhase = (): MealType => {
    const h = new Date().getHours();
    if (h < 10) return 'breakfast';
    if (h < 15) return 'lunch';
    return 'dinner';
  };

  const formatOffsetTime = (timeStr: string, offsetHours: number) => {
    if (!timeStr) return '';
    try {
      const [h, m] = timeStr.split(':').map(Number);
      let newH = h + offsetHours;
      if (newH < 0) newH = 24 + newH;
      if (newH >= 24) newH = newH - 24;
      return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2 sm:mb-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
              <CalendarDays size={20} />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-serif font-bold text-slate-900">Meals Schedule</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pre-booking terminal</p>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 sm:ml-[52px] leading-relaxed max-w-2xl">Discover upcoming service phases and reserve your slot before the automated portal closes for the day.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <Calendar size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-700">{format(new Date(), 'EEEE, MMM d')}</span>
        </div>
      </div>

      {/* Schedule Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <ScheduleCard 
          type="breakfast"
          date={tomorrow}
          dateLabel="Tomorrow"
          meal={todayMeals[`${tomorrow}-breakfast`]}
          registration={userRegistrations[`${tomorrow}-breakfast`]}
          isAllowed={checkDeadline('breakfast', tomorrow, todayMeals[`${tomorrow}-breakfast`]?.startTime)}
          onBook={() => handleBooking('breakfast', tomorrow)}
          loading={loading[`${tomorrow}-breakfast`]}
          deadlineInfo="Before 21:00 (Tonight)"
          isCurrent={false}
        />
        <ScheduleCard 
          type="lunch"
          date={today}
          dateLabel="Today"
          meal={todayMeals[`${today}-lunch`]}
          registration={userRegistrations[`${today}-lunch`]}
          isAllowed={checkDeadline('lunch', today, todayMeals[`${today}-lunch`]?.startTime)}
          onBook={() => handleBooking('lunch', today)}
          loading={loading[`${today}-lunch`]}
          deadlineInfo={todayMeals[`${today}-lunch`]?.startTime ? `Before ${formatOffsetTime(todayMeals[`${today}-lunch`].startTime, -3)}` : "Before 09:00"}
          isCurrent={getCurrentMealPhase() === 'lunch'}
        />
        <ScheduleCard 
          type="dinner"
          date={today}
          dateLabel="Today"
          meal={todayMeals[`${today}-dinner`]}
          registration={userRegistrations[`${today}-dinner`]}
          isAllowed={checkDeadline('dinner', today, todayMeals[`${today}-dinner`]?.startTime)}
          onBook={() => handleBooking('dinner', today)}
          loading={loading[`${today}-dinner`]}
          deadlineInfo={todayMeals[`${today}-dinner`]?.startTime ? `Before ${formatOffsetTime(todayMeals[`${today}-dinner`].startTime, -3)}` : "Before 17:00"}
          isCurrent={getCurrentMealPhase() === 'dinner'}
        />
      </div>

      {/* Policy Card */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 sm:p-6 flex items-center gap-3 bg-amber-50/30 border-b border-amber-100/50">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-xs sm:text-sm">Compliance & Policies</h4>
            <p className="text-[8px] sm:text-[10px] text-slate-500 uppercase tracking-widest font-bold">Rules terminal</p>
          </div>
        </div>
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="flex gap-3 sm:gap-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0 mt-0.5">
              <XCircle size={14} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mb-1">Missed Slots & Penalties</p>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                A penalty of <span className="text-rose-500 font-bold">₹50</span> applies if you reserve a slot but fail to verify your entry at the gate.
              </p>
            </div>
          </div>
          <div className="flex gap-3 sm:gap-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={14} />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-bold text-slate-900 mb-1">Entry Verification</p>
              <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
                You MUST present your digital <span className="text-emerald-600 font-bold">QR PASS</span>. Unverified entries are considered as missed meals.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({ type, date, dateLabel, meal, registration, isAllowed, onBook, loading, deadlineInfo, isCurrent }: any) {
  const config = mealConfig[type as MealType];
  const Icon = config.icon;
  const isRegistered = !!registration;
  const isVerified = registration?.status === 'VERIFIED';
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col transition-all",
        isCurrent 
          ? "shadow-xl shadow-emerald-100 ring-2 ring-emerald-200"
          : "shadow-sm border border-slate-200",
        "bg-white"
      )}
    >
      {/* Card Header */}
      <div className="relative">
        <div className={cn(
          "h-1.5 w-full bg-gradient-to-r",
          isRegistered ? "from-emerald-400 to-teal-400" : config.gradient
        )} />
        <div className="p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm border",
              isRegistered 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : `${config.bg} ${config.accent} ${config.border}`
            )}>
              <Icon size={window.innerWidth < 640 ? 18 : 22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-slate-900 text-sm sm:text-base capitalize">{type}</h4>
                {isCurrent && (
                  <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold uppercase tracking-widest rounded-full">Live</span>
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dateLabel}</p>
            </div>
          </div>
          {isRegistered && (
            <div className={cn(
              "px-2 sm:px-3 py-1 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-wider border shrink-0 ml-2",
              isVerified 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-amber-50 text-amber-600 border-amber-100"
            )}>
              {isVerified ? '✓ Verified' : 'Booked'}
            </div>
          )}
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 flex-1 space-y-4">
        {/* Menu */}
        <div>
          <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 flex items-center gap-1.5">
            <Utensils size={10} />
            Daily Menu
          </label>
          <div className={cn(
            "rounded-xl sm:rounded-2xl p-3 sm:p-4 min-h-[4rem] sm:min-h-[4.5rem] flex items-center justify-center border",
            meal?.menu ? `${config.lightBg} ${config.border}` : "bg-slate-50 border-slate-100"
          )}>
            <p className={cn(
              "text-[11px] sm:text-xs text-center leading-relaxed",
              meal?.menu ? "text-slate-700 font-medium" : "text-slate-400 italic"
            )}>
              {meal?.menu || 'Menu to be announced'}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <Clock size={12} className="text-slate-400" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time</p>
              <p className="text-[10px] font-bold text-slate-800 truncate">
                {meal?.startTime && meal?.closingTime ? `${meal.startTime}—${meal.closingTime}` : 'Not set'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
            <Users size={12} className="text-slate-400" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Pool</p>
              <p className="text-[10px] text-slate-800 font-bold">{meal?.registeredCount ?? 0} pax</p>
            </div>
          </div>
        </div>

        {/* Deadlines */}
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 p-2.5 bg-rose-50/50 rounded-xl border border-rose-100/50">
            <Timer size={12} className="text-rose-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-rose-400 uppercase tracking-widest leading-none mb-1">Booking Ends</p>
              <p className="text-[10px] text-rose-800 font-bold truncate">{deadlineInfo}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100/50">
            <ShieldCheck size={12} className="text-blue-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest leading-none mb-1">Entry Ends</p>
              <p className="text-[10px] text-blue-800 font-bold truncate">{meal?.closingTime || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 bg-slate-50/30 border-t border-slate-100">
        <motion.button 
          whileHover={!isVerified && isAllowed ? { scale: 1.01 } : {}}
          whileTap={!isVerified && isAllowed ? { scale: 0.98 } : {}}
          disabled={loading || isVerified || (!isAllowed && !isRegistered)}
          onClick={onBook}
          className={cn(
            "w-full py-3 sm:py-3.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
            isVerified
              ? "bg-emerald-100 text-emerald-700 cursor-not-allowed"
              : isRegistered 
                ? "bg-white border border-rose-200 text-rose-500 hover:bg-rose-50" 
                : isAllowed
                  ? `bg-slate-900 text-white shadow-lg`
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          ) : isVerified ? (
            <>
              <CheckCircle2 size={12} />
              Verified
            </>
          ) : isRegistered ? (
            <>
              <XCircle size={12} />
              Cancel Slot
            </>
          ) : isAllowed ? (
            <>
              <CheckCircle2 size={12} />
              Reserve Slot
            </>
          ) : (
            <>
              <XCircle size={12} />
              Closed
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
