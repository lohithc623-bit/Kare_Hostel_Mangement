import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDocs, where, writeBatch, deleteDoc } from 'firebase/firestore';
import { Utensils, Clock, XCircle, Save, AlertCircle, Calendar as CalendarIcon, Info, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Meal, MealType } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';
import { EmptyState } from '../../components/ui/EmptyState';

const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner'];

export default function MealManagement() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [meals, setMeals] = useState<Record<MealType, Meal | null>>({
    breakfast: null,
    lunch: null,
    dinner: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'meals'), where('date', '==', selectedDate));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealsData: Record<MealType, Meal | null> = { breakfast: null, lunch: null, dinner: null };
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Meal;
        mealsData[data.type] = { ...data, id: doc.id };
      });
      setMeals(mealsData);
    });
    return () => unsubscribe();
  }, [selectedDate]);

  const handleUpdateMeal = async (type: MealType, data: Partial<Meal>) => {
    const mealId = `${selectedDate}-${type}`;
    try {
      if (meals[type]) {
        await updateDoc(doc(db, 'meals', mealId), data);
      } else {
        await setDoc(doc(db, 'meals', mealId), {
          id: mealId,
          type,
          date: selectedDate,
          menu: data.menu || '',
          availability: data.availability ?? true,
          startTime: data.startTime || '',
          closingTime: data.closingTime || '',
          registeredCount: 0,
          verifiedCount: 0,
          absentCount: 0,
          fineCount: 0,
          ...data
        });
      }
      toast.success(`${type} updated for ${selectedDate}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const closeMealAndApplyFines = async (type: MealType) => {
    const meal = meals[type];
    if (!meal) return;
    if (!window.confirm(`Are you sure you want to CLOSE ${type}? This will mark all unverified students as ABSENT and apply ₹50 fine.`)) return;

    setLoading(true);
    try {
      const mealId = meal.id;
      const regsRef = collection(db, 'registrations');
      const q = query(regsRef, where('mealId', '==', mealId), where('status', '==', 'REGISTERED'));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      let fineCount = 0;
      snapshot.docs.forEach(regDoc => {
        batch.update(regDoc.ref, {
          status: 'ABSENT',
          fineAmount: 50,
          updatedAt: new Date().toISOString()
        });
        fineCount++;
      });

      // Update meal stats
      batch.update(doc(db, 'meals', mealId), {
        availability: false,
        absentCount: meal.absentCount + fineCount,
        fineCount: meal.fineCount + fineCount
      });

      await batch.commit();
      toast.success(`Meal closed. Applied fines to ${fineCount} students.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMeal = async (type: MealType) => {
    const meal = meals[type];
    if (!meal) return;
    if (!window.confirm(`Are you sure you want to completely DELETE the ${type} schedule for ${selectedDate}? All registrations for this meal will be orphaned.`)) return;
    
    try {
      await deleteDoc(doc(db, 'meals', meal.id));
      toast.success(`${type} schedule deleted successfully.`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 mb-1">Meal Management</h3>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">Configure menus and control operational phases.</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 shadow-sm min-w-fit">
          <CalendarIcon size={14} className="text-slate-400" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-700 bg-transparent focus:outline-none cursor-pointer"
          />
        </div>
      </div>

      {/* Meal Operation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {mealTypes.map((type) => (
          <MealCard 
            key={type}
            type={type}
            meal={meals[type]}
            onUpdate={(data) => handleUpdateMeal(type, data)}
            onClose={() => closeMealAndApplyFines(type)}
            onDelete={() => handleDeleteMeal(type)}
            loading={loading}
          />
        ))}
      </div>

      {/* Rules & Guidelines Terminal */}
      <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-5 sm:p-8 flex flex-col md:flex-row gap-5 sm:gap-8 overflow-hidden relative shadow-xl shadow-slate-200">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Info size={120} className="text-white" />
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20 relative z-10">
          <AlertCircle size={20} sm:size={24} />
        </div>
        <div className="relative z-10 flex-1">
          <h4 className="font-bold text-emerald-400 uppercase text-[10px] tracking-widest mb-2">Automated Compliance Terminal</h4>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-2xl">
            Operational rules are enforced via terminal logic. Manual overrides are logged for security auditing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Threshold Logic</p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-200">Breakfast: 22h-1 | Lunch: 9h | Dinner: 16h</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Penalty Protocol</p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-200">₹50 fine automatically applied for unverified bookings</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Default Logic</p>
              <p className="text-[11px] sm:text-xs font-medium text-slate-200">Student categories inherit system messtype defaults</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ type, meal, onUpdate, onClose, onDelete, loading }: any) {
  const [menu, setMenu] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (meal) {
      setMenu(meal.menu || '');
      setStartTime(meal.startTime || '');
      setEndTime(meal.closingTime || '');
    } else {
      setMenu('');
      setStartTime('');
      setEndTime('');
    }
  }, [meal]);

  const isActiveNow = () => {
    if (!meal || !meal.availability) return false;
    if (!startTime || !endTime) return false;
    const now = new Date();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    return currentTimeStr >= startTime && currentTimeStr <= endTime;
  };

  const active = isActiveNow();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col shadow-sm group hover:shadow-md transition-shadow"
    >
      <div className="p-4 sm:p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full",
            meal?.availability ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-slate-300"
          )} />
          <h4 className="font-bold text-slate-800 uppercase text-[10px] sm:text-xs tracking-widest leading-none truncate max-w-[120px]">{type}</h4>
          {active && (
            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[8px] font-bold uppercase tracking-widest">Active</span>
          )}
        </div>
        <div className="flex items-center gap-2">
           {meal && (
              <button 
                onClick={onDelete} 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all" 
                title="Delete Schedule"
              >
                <Trash2 size={16} />
              </button>
           )}
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5 flex-1">
        <div>
          <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Catering Menu</label>
          <textarea 
            className="w-full h-24 sm:h-28 bg-slate-50/50 border border-slate-100 rounded-xl p-3 sm:p-4 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all font-serif resize-none shadow-inner"
            placeholder="Describe meals for the day..."
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block truncate">Open Time</label>
            <div className="relative">
              <input 
                type="time"
                className="w-full bg-slate-50/50 border border-slate-100 shadow-inner rounded-xl py-2.5 sm:py-3 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-700"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <Clock className="absolute left-3 top-2.5 sm:top-3 text-slate-300" size={14} />
            </div>
          </div>
          <div className="min-w-0">
            <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block truncate">Close Time</label>
            <div className="relative">
              <input 
                type="time"
                className="w-full bg-slate-50/50 border border-slate-100 shadow-inner rounded-xl py-2.5 sm:py-3 pl-9 pr-3 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:bg-white transition-all text-slate-700"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
              <Clock className="absolute left-3 top-2.5 sm:top-3 text-slate-300" size={14} />
            </div>
          </div>
        </div>

        {meal && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-center">
              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Registrants</p>
              <p className="text-lg font-bold text-slate-800 mt-0.5">{meal.registeredCount}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100 text-center">
              <p className="text-[8px] text-emerald-600 font-bold uppercase tracking-widest">Present</p>
              <p className="text-lg font-bold text-emerald-700 mt-0.5">{meal.verifiedCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-slate-50 flex flex-col xs:flex-row items-center gap-3 bg-slate-50/20">
        <button 
          onClick={() => onUpdate({ menu, startTime, closingTime: endTime })}
          className="w-full xs:flex-1 bg-white border border-slate-200 hover:border-primary hover:text-primary py-3 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-slate-500 shadow-sm"
        >
          <Save size={14} />
          Sync Details
        </button>
        {meal && meal.availability && (
          <button 
            disabled={loading}
            onClick={onClose}
            className="w-full xs:flex-1 bg-rose-600 text-white hover:bg-rose-700 py-3 rounded-xl font-bold text-[9px] sm:text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><XCircle size={14} /> Close Phase</>}
          </button>
        )}
      </div>
    </motion.div>
  );
}
