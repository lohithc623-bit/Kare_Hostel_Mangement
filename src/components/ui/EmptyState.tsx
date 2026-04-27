import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon, title, description, action, className 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("flex flex-col items-center justify-center p-12 text-center bg-slate-50 rounded-[24px] border border-slate-100 border-dashed", className)}
    >
      <div className="w-16 h-16 rounded-full bg-white text-slate-400 flex items-center justify-center shadow-sm mb-6">
        {icon}
      </div>
      <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  );
};
