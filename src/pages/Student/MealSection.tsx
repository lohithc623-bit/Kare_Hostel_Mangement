import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Utensils, Clock, CheckCircle2, XCircle, Calendar, AlertTriangle, Coffee, Sun, Moon, CalendarDays, Timer, Users, Sparkles, ShieldCheck, TrendingUp, Badge, ArrowRight, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Meal, MealType, MealRegistration } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { isBefore, format, addDays } from 'date-fns';

const mealConfig: Record<MealType, { icon: any; gradient: string; bg: string; border: string; accent: string; lightBg: string; bgGradient: string }> = {
  breakfast: {
    icon: Coffee,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    accent: 'text-amber-600',
    lightBg: 'bg-amber-500/5',
  },
  lunch: {
    icon: Sun,
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-500/10 to-red-500/10',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    accent: 'text-orange-600',
    lightBg: 'bg-orange-500/5',
  },
  dinner: {
    icon: Moon,
    gradient: 'from-indigo-500 to-violet-500',
    bgGradient: 'from-indigo-500/10 to-violet-500/10',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    accent: 'text-indigo-600',
    lightBg: 'bg-indigo-500/5',
  },
};

export default function MealSection() {
  const { profile } = useAuth();
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal>>({});
  const [userRegistrations, setUserRegistrations] = useState<Record<string, MealRegistration>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState<Date>(new Date());
  const [selectedTab, setSelectedTab] = useState<'today' | 'tomorrow'>('today');

  // Update current time every minute for live status
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!profile) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    const mealsQuery = query(collection(db, 'meals'), where('date', 'in', [today, tomorrow]));
    const unsubscribeMeals = onSnapshot(mealsQuery, (snapshot) => {
      const data: any = {};
      snapshot.docs.forEach(d => data[d.id] = d.data());
      setTodayMeals(data);
    }, (error) => {
      if (error.code !== 'failed-precondition') {
        console.warn('Error loading meal schedules');
      }
    });

    const regsQuery = query(collection(db, 'registrations'), where('userId', '==', profile.uid));
    const unsubscribeRegs = onSnapshot(regsQuery, (snapshot) => {
      const data: any = {};
      snapshot.docs.forEach(d => {
        const regData = d.data();
        if ((regData.date === today || regData.date === tomorrow) && (regData.status === 'REGISTERED' || regData.status === 'VERIFIED')) {
          data[regData.mealId] = { id: d.id, ...regData };
        }
      });
      setUserRegistrations(data);
    }, (error) => {
      console.warn('Error loading your bookings');
    });

    return () => {
      unsubscribeMeals();
      unsubscribeRegs();
    };
  }, [profile]);

  const getMealStatus = (mealType: MealType, mealDate: string, startTime?: string, closingTime?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const isFutureDate = mealDate > today;
    
    if (!startTime || !closingTime) {
      return isFutureDate ? 'upcoming' : 'unknown';
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = closingTime.split(':').map(Number);
    
    const mealDateObj = new Date(mealDate);
    const mealStart = new Date(mealDateObj.getFullYear(), mealDateObj.getMonth(), mealDateObj.getDate(), startH, startM);
    const mealEnd = new Date(mealDateObj.getFullYear(), mealDateObj.getMonth(), mealDateObj.getDate(), endH, endM);
    
    if (isBefore(now, mealStart)) {
      return 'upcoming';
    } else if (isBefore(now, mealEnd)) {
      return 'active';
    } else {
      return 'ended';
    }
  };

  const getMealStatusLabel = (status: string): { label: string; color: string; bgColor: string; icon: any } => {
    const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
      'upcoming': { label: 'Coming Soon', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Calendar },
      'active': { label: 'Available Now', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: CheckCircle2 },
      'ended': { label: 'Meal Ended', color: 'text-slate-500', bgColor: 'bg-slate-100', icon: XCircle },
      'unknown': { label: 'Not Scheduled', color: 'text-amber-600', bgColor: 'bg-amber-50', icon: AlertTriangle }
    };
    return statusConfig[status] || statusConfig['unknown'];
  };

  const canBookMeal = (mealType: MealType, mealDate: string, startTime?: string, registration?: MealRegistration) => {
    if (registration?.status === 'VERIFIED') return false; // Can't modify verified bookings
    const status = getMealStatus(mealType, mealDate, startTime);
    return status !== 'ended'; // Can book if meal hasn't ended yet
  };

  const handleBooking = async (type: MealType, date: string) => {
    if (!profile) return;
    const mealId = `${date}-${type}`;
    const regId = `${profile.uid}-${mealId}`;
    const regRef = doc(db, 'registrations', regId);
    
    setLoading(prev => ({ ...prev, [mealId]: true }));
    try {
      if (userRegistrations[mealId]) {
        // Cancel existing booking
        await setDoc(regRef, {
          status: 'CANCELLED',
          cancelledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        toast.success('Booking cancelled successfully');
      } else {
        // Create new booking registration
        await setDoc(regRef, {
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
        toast.success('Meal booked successfully!');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Booking failed');
    } finally {
      setLoading(prev => ({ ...prev, [mealId]: false }));
    }
  };

  const today = format(new Date(), 'yyyy-MM-dd');
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const displayDate = selectedTab === 'today' ? today : tomorrow;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
        
        {/* Header Section */}
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
                  <Utensils size={24} className="sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 font-serif">Meals Booking</h1>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">Reserve your meals and manage your bookings</p>
                </div>
              </div>
            </div>
            
            {/* Date Selector */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm self-start lg:self-auto">
              <Calendar size={16} className="text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">{format(new Date(displayDate), 'MMM d')}</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 w-fit shadow-sm">
            {['today', 'tomorrow'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab as 'today' | 'tomorrow')}
                className={cn(
                  "px-4 py-2 rounded-lg font-semibold text-sm transition-all",
                  selectedTab === tab
                    ? "bg-slate-900 text-white shadow-md"
                    : "text-slate-600 hover:bg-slate-50"
                )}
              >
                {tab === 'today' ? 'Today' : 'Tomorrow'}
              </button>
            ))}
          </div>
        </div>

        {/* Meal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(['breakfast', 'lunch', 'dinner'] as MealType[]).map((type) => {
            const mealId = `${displayDate}-${type}`;
            const meal = todayMeals[mealId];
            const registration = userRegistrations[mealId];
            const status = getMealStatus(type, displayDate, meal?.startTime, meal?.closingTime);
            const statusLabel = getMealStatusLabel(status);
            const Icon = mealConfig[type].icon;
            const canBook = canBookMeal(type, displayDate, meal?.startTime, registration);

            return (
              <MealCard
                key={type}
                type={type}
                mealId={mealId}
                meal={meal}
                registration={registration}
                status={status}
                statusLabel={statusLabel}
                Icon={Icon}
                canBook={canBook}
                loading={loading[mealId] || false}
                onBook={() => handleBooking(type, displayDate)}
              />
            );
          })}
        </div>

        {/* Policy & Rules Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl"
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Policies & Guidelines</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">Important rules for meal booking</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div className="flex gap-3 sm:gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <XCircle size={18} />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-white mb-1">Missed Slots Penalty</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    A penalty of <span className="text-rose-400 font-semibold">₹50</span> is applied if you book a meal but don't verify your entry at the gate.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-sm sm:text-base font-bold text-white mb-1">Entry Verification</p>
                  <p className="text-[11px] sm:text-xs text-slate-400 leading-relaxed">
                    You <span className="font-semibold">MUST</span> present your digital <span className="text-emerald-400 font-semibold">QR Pass</span> at the meal entry gate.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

interface MealCardProps {
  type: MealType;
  mealId: string;
  meal?: Meal;
  registration?: MealRegistration;
  status: string;
  statusLabel: { label: string; color: string; bgColor: string; icon: any };
  Icon: any;
  canBook: boolean;
  loading: boolean;
  onBook: () => void;
}

const MealCard: React.FC<MealCardProps> = ({ type, mealId, meal, registration, status, statusLabel, Icon, canBook, loading, onBook }) => {
  const config = mealConfig[type];
  const StatusIcon = statusLabel.icon;
  const isRegistered = !!registration;
  const isVerified = registration?.status === 'VERIFIED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl overflow-hidden flex flex-col transition-all duration-300",
        "bg-white border shadow-sm hover:shadow-lg",
        isVerified ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200"
      )}
    >
      {/* Header Gradient */}
      <div className={cn("h-1.5 w-full bg-gradient-to-r", config.gradient)} />

      {/* Card Content */}
      <div className="p-5 sm:p-6 space-y-4 flex-1 flex flex-col">
        {/* Top Section: Meal Type & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn(
              "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
              isRegistered ? "bg-emerald-100 text-emerald-600" : config.bg,
              !isRegistered && config.accent
            )}>
              <Icon size={24} className="sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 capitalize">{type}</h3>
              <div className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mt-1",
                statusLabel.bgColor,
                statusLabel.color
              )}>
                <StatusIcon size={12} />
                {statusLabel.label}
              </div>
            </div>
          </div>

          {isRegistered && (
            <div className={cn(
              "px-2.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0",
              isVerified
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            )}>
              {isVerified ? '✓ Verified' : '◐ Booked'}
            </div>
          )}
        </div>

        {/* Menu Section */}
        <div className="space-y-2">
          <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Utensils size={12} />
            Today's Menu
          </label>
          <div className={cn(
            "rounded-lg p-4 min-h-[3.5rem] flex items-center justify-center border",
            meal?.menu ? `${config.lightBg} ${config.border}` : "bg-slate-50 border-slate-100"
          )}>
            <p className={cn(
              "text-center text-xs sm:text-sm leading-relaxed",
              meal?.menu ? "text-slate-700 font-medium" : "text-slate-400 italic"
            )}>
              {meal?.menu || 'Menu to be announced'}
            </p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Time */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Time</p>
              <p className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">
                {meal?.startTime && meal?.closingTime ? `${meal.startTime}—${meal.closingTime}` : 'Not set'}
              </p>
            </div>
          </div>

          {/* Registration Count */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Users size={14} className="text-blue-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">Booked</p>
              <p className="text-[10px] sm:text-xs font-bold text-blue-700">{meal?.registeredCount ?? 0}</p>
            </div>
          </div>

          {/* Verified Count */}
          <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">Verified</p>
              <p className="text-[10px] sm:text-xs font-bold text-emerald-700">{meal?.verifiedCount ?? 0}</p>
            </div>
          </div>

          {/* Closing Time */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
            <ShieldCheck size={14} className="text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Entry Ends</p>
              <p className="text-[10px] sm:text-xs font-bold text-slate-700 truncate">{meal?.closingTime || 'Not set'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-slate-100 bg-slate-50/50 p-4">
        <motion.button
          whileHover={canBook && !loading ? { scale: 1.02 } : {}}
          whileTap={canBook && !loading ? { scale: 0.98 } : {}}
          disabled={loading || isVerified || !canBook}
          onClick={onBook}
          className={cn(
            "w-full py-3 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2",
            isVerified
              ? "bg-emerald-50 text-emerald-700 cursor-not-allowed border border-emerald-200"
              : isRegistered
                ? "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50"
                : canBook
                  ? "bg-slate-900 text-white shadow-lg hover:shadow-xl"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : isVerified ? (
            <>
              <CheckCircle2 size={14} />
              Verified Entry
            </>
          ) : isRegistered ? (
            <>
              <XCircle size={14} />
              Cancel Booking
            </>
          ) : canBook ? (
            <>
              <CheckCircle2 size={14} />
              Book Meal
            </>
          ) : (
            <>
              <XCircle size={14} />
              Booking Closed
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}
