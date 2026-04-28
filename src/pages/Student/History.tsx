import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { History as HistoryIcon, Utensils, CheckCircle, XCircle, Clock, Coffee, Sun, Moon, Timer, CalendarDays } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MealRegistration, MealType, RegistrationStatus } from '../../types';
import { cn, formatDate, formatTime } from '../../lib/utils';

const mealIcons: Record<MealType, LucideIcon> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon
};

const mealColors: Record<MealType, { bg: string; text: string; border: string; icon: string }> = {
  breakfast: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: 'text-amber-500' },
  lunch: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', icon: 'text-orange-500' },
  dinner: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', icon: 'text-indigo-500' },
};

const statusConfig: Record<RegistrationStatus, { bg: string; text: string; border: string; icon: LucideIcon; label: string }> = {
  VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', icon: CheckCircle, label: 'Verified' },
  ABSENT: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', icon: XCircle, label: 'Absent' },
  CANCELLED: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: XCircle, label: 'Cancelled' },
  REGISTERED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', icon: Clock, label: 'Pending' },
};

export default function History() {
  const { profile } = useAuth();
  const [history, setHistory] = useState<MealRegistration[]>([]);
  const [filter, setFilter] = useState<'all' | 'VERIFIED' | 'ABSENT' | 'REGISTERED'>('all');

  useEffect(() => {
    if (!profile) return;
    const q = query(
      collection(db, 'registrations'),
      where('userId', '==', profile.uid),
      orderBy('timestamp', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ id: doc.id, ...doc.data() } as MealRegistration)));
    });
    return () => unsubscribe();
  }, [profile]);

  const filteredHistory = filter === 'all' ? history : history.filter((reg: MealRegistration) => reg.status === filter);

  // Stats counters
  const verifiedCount = history.filter((reg: MealRegistration) => reg.status === 'VERIFIED').length;
  const absentCount = history.filter((reg: MealRegistration) => reg.status === 'ABSENT').length;
  const pendingCount = history.filter((reg: MealRegistration) => reg.status === 'REGISTERED').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl rotate-3 sm:rotate-0">
            <CalendarDays size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-serif font-black text-slate-900 tracking-tight leading-none mb-1">Attendance History</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em]">Complete timeline of mess activity</p>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Verified', count: verifiedCount, color: 'emerald' },
          { label: 'Absent', count: absentCount, color: 'rose' },
          { label: 'Pending', count: pendingCount, color: 'amber' }
        ].map((stat) => (
          <div key={stat.label} className={cn(
            "rounded-xl sm:rounded-2xl p-3 sm:p-5 text-center border transition-all hover:scale-[1.02]",
            stat.color === 'emerald' ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
            stat.color === 'rose' ? "bg-rose-50 border-rose-100 text-rose-700" :
            "bg-amber-50 border-amber-100 text-amber-700"
          )}>
            <p className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest mb-1 opacity-70">{stat.label}</p>
            <p className="text-xl sm:text-3xl font-black font-serif">{stat.count}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
        <div className="flex bg-white/50 backdrop-blur-sm border border-slate-200 p-1 rounded-xl sm:rounded-2xl shadow-sm min-w-max sm:min-w-0">
          {[
            { key: 'all' as const, label: 'All Log', count: history.length },
            { key: 'VERIFIED' as const, label: 'Verified', count: verifiedCount },
            { key: 'ABSENT' as const, label: 'Absent', count: absentCount },
            { key: 'REGISTERED' as const, label: 'Pending', count: pendingCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                "px-4 sm:flex-1 py-3 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2",
                filter === tab.key 
                  ? "bg-slate-900 text-white shadow-lg" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[8px] px-1.5 py-0.5 rounded-md font-mono",
                filter === tab.key ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* History List */}
      <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-sm">
        {filteredHistory.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="w-16 h-16 rounded-[24px] bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100 shadow-inner">
              <Utensils size={24} className="text-slate-200" />
            </div>
            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">No Records Detected</p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Your future meal activity logs will synthesize here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredHistory.map((reg) => {
              const Icon = mealIcons[reg.mealType] || Utensils;
              const color = mealColors[reg.mealType] || mealColors.lunch;
              const status = statusConfig[reg.status] || statusConfig.REGISTERED;
              const StatusIcon = status.icon;

              return (
                <div key={reg.id} className="px-4 sm:px-8 py-5 sm:py-6 hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-4 sm:gap-6">
                    {/* Meal Icon */}
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border transition-transform group-hover:scale-110", color.bg, color.icon, color.border)}>
                      <Icon size={20} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <p className="text-sm sm:text-base font-black text-slate-900 capitalize tracking-tight">{reg.mealType}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                        <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-tight">{formatDate(reg.date)}</p>
                      </div>
                      
                      {/* Timing Details */}
                      <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                        {reg.status === 'VERIFIED' && reg.verifiedAt && (
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                            <CheckCircle size={10} />
                            <span>Entry at {formatTime(reg.verifiedAt)}</span>
                          </div>
                        )}
                        {reg.status === 'ABSENT' && (
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-rose-500 font-bold uppercase tracking-wider">
                            <XCircle size={10} />
                            <span>Absent • ₹{reg.fineAmount || 50} Impact</span>
                          </div>
                        )}
                        {reg.status === 'REGISTERED' && (
                          <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-amber-600 font-bold uppercase tracking-wider">
                            <Clock size={10} />
                            <span>Scheduled • {formatTime(reg.timestamp)}</span>
                          </div>
                        )}
                        <span className="text-[8px] sm:text-[9px] text-slate-300 font-mono font-bold uppercase hidden sm:block">
                          TXN# {reg.id.slice(-12)}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={cn(
                      "flex items-center justify-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[8px] sm:text-[10px] font-black uppercase tracking-[0.1em] border shrink-0 transition-colors shadow-sm",
                      status.bg, status.text, status.border
                    )}>
                      <StatusIcon size={12} className="hidden sm:block" />
                      {status.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
