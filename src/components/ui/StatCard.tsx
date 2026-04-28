import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  color?: 'emerald' | 'blue' | 'amber' | 'slate' | 'red';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ 
  title, value, icon, trend, trendUp = true, color = 'emerald', className 
}) => {
  const [displayValue, setDisplayValue] = useState<number | string>(value);

  // Simple count-up animation
  useEffect(() => {
    if (typeof value === 'string') {
      setDisplayValue(value);
      return;
    }

    let start = 0;
    const duration = 1000;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    let startTime: number | null = null;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutQuart
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeProgress * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  const colorVariants = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("glass-card p-6 flex flex-col gap-4", className)}
    >
      <div className="flex items-center justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center border", colorVariants[color])}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase",
            trendUp ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          )}>
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-4xl font-bold text-slate-900 tracking-tight mb-1 animate-count-up">
          {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
        </h3>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-medium">
          {title}
        </p>
      </div>
    </motion.div>
  );
};
