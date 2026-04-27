import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, getDoc, increment, updateDoc } from 'firebase/firestore';
import { Utensils, Clock, CheckCircle2, XCircle, Calendar, AlertTriangle, Coffee, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { Meal, MealType, MealRegistration } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { isAfter, setHours, setMinutes, format, addDays } from 'date-fns';

export default function MealBooking() {
  const { profile } = useAuth();
  const [todayMeals, setTodayMeals] = useState<Record<string, Meal>>({});
  const [userRegistrations, setUserRegistrations] = useState<Record<string, MealRegistration>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profile) return;

    // Load today and tomorrow's meals (for breakfast booking)
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

  const checkDeadline = (mealType: MealType, mealDate: string) => {
    const now = new Date();
    const dateObj = new Date(mealDate);
    
    if (mealType === 'breakfast') {
      // Breakfast deadline is 10 PM of PREVIOUS day
      const deadline = setMinutes(setHours(addDays(dateObj, -1), 22), 0);
      return !isAfter(now, deadline);
    } else if (mealType === 'lunch') {
      // Lunch deadline is 9 AM of SAME day
      const deadline = setMinutes(setHours(dateObj, 9), 0);
      return !isAfter(now, deadline);
    } else if (mealType === 'dinner') {
      // Dinner deadline is 4 PM of SAME day
      const deadline = setMinutes(setHours(dateObj, 16), 0);
      return !isAfter(now, deadline);
    }
    return false;
  };

  const handleBooking = async (type: MealType, date: string) => {
    if (!profile) return;
    const mealId = `${date}-${type}`;
    const regId = `${profile.uid}-${mealId}`;
    
    setLoading(prev => ({ ...prev, [mealId]: true }));
    try {
      if (userRegistrations[mealId]) {
        // Cancel booking
        await deleteDoc(doc(db, 'registrations', regId));
        await updateDoc(doc(db, 'meals', mealId), {
          registeredCount: increment(-1)
        });
        toast.success("Booking cancelled successfully");
      } else {
        // Register booking
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
        
        // Ensure meal doc exists to track count
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h3 className="text-2xl font-bold tracking-tight text-[#141414]">Meal Booking</h3>
        <p className="text-sm text-gray-500">Select your meals below. Please respect the registration deadlines.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <BookingCard 
          icon={Coffee}
          title="Breakfast"
          date={tomorrow}
          dateLabel="Tomorrow"
          meal={todayMeals[`${tomorrow}-breakfast`]}
          registration={userRegistrations[`${tomorrow}-breakfast`]}
          isAllowed={checkDeadline('breakfast', tomorrow)}
          onBook={() => handleBooking('breakfast', tomorrow)}
          loading={loading[`${tomorrow}-breakfast`]}
          deadlineInfo="Before 10:00 PM (Tonight)"
        />
        <BookingCard 
          icon={Sun}
          title="Lunch"
          date={today}
          dateLabel="Today"
          meal={todayMeals[`${today}-lunch`]}
          registration={userRegistrations[`${today}-lunch`]}
          isAllowed={checkDeadline('lunch', today)}
          onBook={() => handleBooking('lunch', today)}
          loading={loading[`${today}-lunch`]}
          deadlineInfo="Before 9:00 AM"
        />
        <BookingCard 
          icon={Moon}
          title="Dinner"
          date={today}
          dateLabel="Today"
          meal={todayMeals[`${today}-dinner`]}
          registration={userRegistrations[`${today}-dinner`]}
          isAllowed={checkDeadline('dinner', today)}
          onBook={() => handleBooking('dinner', today)}
          loading={loading[`${today}-dinner`]}
          deadlineInfo="Before 4:00 PM"
        />
      </div>

      <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="text-orange-500" size={24} />
          <h4 className="font-bold text-gray-900 uppercase text-xs tracking-[0.2em]">Important Policy</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-900">1. Missed Meals & Fines</p>
            <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-tight">
              A fine of <span className="text-red-500 font-bold">₹50</span> will be automatically applied if you register for a meal but do not attend (Verified) without cancelling before the deadline.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold text-gray-900">2. Verification Requirement</p>
            <p className="text-xs text-gray-500 leading-relaxed uppercase tracking-tight">
              You must present your <span className="text-orange-600 font-bold">QR PASS</span> to the mess warden. Failure to verify will result in being marked as ABSENT.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ icon: Icon, title, dateLabel, meal, registration, isAllowed, onBook, loading, deadlineInfo }: any) {
  const isRegistered = !!registration;
  
  return (
    <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className={cn(
        "p-6 flex items-center justify-between",
        isRegistered ? "bg-orange-50 border-b border-orange-100" : "bg-gray-50 border-b border-gray-100"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-xl border",
            isRegistered ? "bg-orange-600 text-white border-orange-600" : "bg-white text-gray-400 border-gray-200"
          )}>
            <Icon size={18} />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 uppercase text-xs tracking-[0.1em]">{title}</h4>
            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{dateLabel}</p>
          </div>
        </div>
        {isRegistered && (
          <span className="bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
            Booked
          </span>
        )}
      </div>

      <div className="p-6 flex-1 space-y-4">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Today's Menu</label>
          <div className="bg-gray-50 rounded-2xl p-4 min-h-[5rem] flex items-center justify-center">
            <p className="text-xs text-gray-700 font-serif italic text-center">
              {meal?.menu || 'Menu details will be announced shortly.'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-2">
          <Clock size={14} className="text-gray-400 mt-0.5" />
          <div>
            <p className="text-[10px] font-bold text-gray-900 uppercase tracking-widest leading-none mb-1">Registration Deadline</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-tight">{deadlineInfo}</p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-gray-50/50 border-t border-gray-100">
        {!isAllowed && !isRegistered ? (
          <div className="w-full bg-gray-200 text-gray-500 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 cursor-not-allowed">
            <XCircle size={14} />
            Registration Closed
          </div>
        ) : (
          <button 
            disabled={loading || (!isAllowed && isRegistered && registration.status !== 'REGISTERED')}
            onClick={onBook}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              isRegistered 
                ? "bg-white border border-red-200 text-red-500 hover:bg-red-50" 
                : "bg-[#141414] text-white hover:bg-gray-800"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isRegistered ? (
              <><XCircle size={14} /> Cancel Booking</>
            ) : (
              <><CheckCircle2 size={14} /> Confirm Choice</>
            )}
          </button>
        )}
        
        {!isAllowed && isRegistered && (
          <p className="text-[10px] text-center mt-2 text-red-400 font-medium uppercase tracking-tight">
            * Deadline passed. Visit count as marked.
          </p>
        )}
      </div>
    </div>
  );
}
