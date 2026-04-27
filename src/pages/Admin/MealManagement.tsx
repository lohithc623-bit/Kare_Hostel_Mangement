import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, getDocs, where, writeBatch } from 'firebase/firestore';
import { Utensils, Clock, CheckCircle2, XCircle, Save, AlertCircle, Calendar as CalendarIcon, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Meal, MealType } from '../../types';
import { toast } from 'react-hot-toast';
import { cn } from '../../lib/utils';

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
      const mealsData: any = { breakfast: null, lunch: null, dinner: null };
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
      const mealId = `${selectedDate}-${type}`;
      const regsRef = collection(db, 'registrations');
      const q = query(regsRef, where('mealId', '==', mealId), where('status', '==', 'REGISTERED'));
      const snapshot = await getDocs(q);

      const batch = writeBatch(db);
      snapshot.docs.forEach(regDoc => {
        batch.update(regDoc.ref, {
          status: 'ABSENT',
          fineAmount: 50,
          updatedAt: new Date().toISOString()
        });
      });

      // Update meal stats
      batch.update(doc(db, 'meals', mealId), {
        availability: false,
        absentCount: snapshot.size,
        fineCount: snapshot.size
      });

      await batch.commit();
      toast.success(`Meal closed. Applied fines to ${snapshot.size} students.`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold tracking-tight text-[#141414]">Meal Management</h3>
          <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Configure menus and control registration</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl p-2 px-4 shadow-sm">
          <CalendarIcon size={16} className="text-gray-400" />
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-bold uppercase tracking-widest bg-transparent focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {mealTypes.map((type) => (
          <MealCard 
            key={type}
            type={type}
            meal={meals[type]}
            onUpdate={(data) => handleUpdateMeal(type, data)}
            onClose={() => closeMealAndApplyFines(type)}
            loading={loading}
          />
        ))}
      </div>

      <div className="bg-orange-50 border border-orange-100 rounded-3xl p-8 flex gap-6">
        <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-600/20">
          <AlertCircle size={24} />
        </div>
        <div>
          <h4 className="font-bold text-orange-900 uppercase text-xs tracking-[0.2em] mb-2">Automated Rules</h4>
          <p className="text-sm text-orange-800 leading-relaxed mb-4">
            The system applies certain automatic rules to ensure smooth operation. Admin override is available for extreme cases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 p-3 rounded-xl border border-orange-200">
              <p className="text-[10px] font-bold text-orange-900 uppercase mb-1">Registration Deadlines</p>
              <p className="text-[10px] text-orange-700">Breakfast: 10 PM | Lunch: 9 AM | Dinner: 4 PM</p>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-orange-200">
              <p className="text-[10px] font-bold text-orange-900 uppercase mb-1">Absence Fine</p>
              <p className="text-[10px] text-orange-700">₹50 per missed meal without cancellation</p>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-orange-200">
              <p className="text-[10px] font-bold text-orange-900 uppercase mb-1">Mess Types</p>
              <p className="text-[10px] text-orange-700">Student menu defaults based on profile selection</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MealCard({ type, meal, onUpdate, onClose, loading }: any) {
  const [menu, setMenu] = useState('');
  const [time, setTime] = useState('');

  useEffect(() => {
    if (meal) {
      setMenu(meal.menu);
      setTime(meal.closingTime);
    } else {
      setMenu('');
      setTime('');
    }
  }, [meal]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm flex flex-col"
    >
      <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
        <h4 className="font-bold text-gray-900 uppercase text-xs tracking-[0.2em]">{type}</h4>
        <div className={cn(
          "w-3 h-3 rounded-full",
          meal?.availability ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"
        )}></div>
      </div>

      <div className="p-6 space-y-4 flex-1">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Food Menu</label>
          <textarea 
            className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all font-serif"
            placeholder="Enter menu items separated by comma..."
            value={menu}
            onChange={(e) => setMenu(e.target.value)}
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-1 block">Closing Time</label>
          <div className="relative">
            <input 
              type="time"
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm px-10 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
            <Clock className="absolute left-3.5 top-3.5 text-gray-400" size={16} />
          </div>
        </div>

        {meal && (
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="bg-gray-50 p-2 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Registered</p>
              <p className="text-sm font-bold text-gray-900">{meal.registeredCount}</p>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl text-center">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Verified</p>
              <p className="text-sm font-bold text-green-600">{meal.verifiedCount}</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-2">
        <button 
          onClick={() => onUpdate({ menu, closingTime: time })}
          className="flex-1 bg-white border border-gray-200 hover:border-orange-500 hover:text-orange-600 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
        >
          <Save size={14} />
          Save Settings
        </button>
        {meal && meal.availability && (
          <button 
            disabled={loading}
            onClick={onClose}
            className="flex-1 bg-red-600 text-white hover:bg-red-700 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
          >
            {loading ? <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <><XCircle size={14} /> Close Meal</>}
          </button>
        )}
      </div>
    </motion.div>
  );
}
