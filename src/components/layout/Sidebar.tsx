import React from 'react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Users, UserCog, Utensils, LogOut, Menu, X, QrCode, CreditCard, History, Shield, CalendarDays } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const adminLinks = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users, adminOnly: true },
  { href: '/admin/staff', label: 'Staff', icon: UserCog, adminOnly: true },
  { href: '/admin/meals', label: 'Meals', icon: Utensils },
  { href: '/admin/verify', label: 'Verify QR', icon: QrCode },
  { href: '/admin/account', label: 'Settings', icon: UserCog },
];

const studentLinks = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/register', label: 'Meals Booking', icon: Utensils },
  { href: '/student/history', label: 'History', icon: History },
  { href: '/student/fines', label: 'Fines', icon: CreditCard },
];

export default function Sidebar({ isOpen, setIsOpen, currentPath }: { isOpen: boolean; setIsOpen: (v: boolean) => void; currentPath: string }) {
  const { profile } = useAuth();
  const isAdminRole = profile?.role === 'admin';
  const isStaffOrAdmin = profile?.role === 'admin' || profile?.role === 'staff';
  
  // Staff see filtered admin links (no Students/Staff management)
  const links = isStaffOrAdmin 
    ? adminLinks.filter(link => !link.adminOnly || isAdminRole)
    : studentLinks;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-white text-slate-900 z-50 transition-transform duration-300 ease-in-out border-r border-slate-100 shadow-[20px_0_40px_rgba(0,0,0,0.02)]",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-8 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-950 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Shield size={18} />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-[0.2em] text-slate-900 uppercase font-serif">HostelMeal</h1>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Portal</p>
            </div>
          </div>
        </div>

        <nav className="p-6 pt-2 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all group",
                currentPath === link.href 
                  ? "bg-slate-950 text-white shadow-xl shadow-slate-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <link.icon size={18} className={cn(
                "transition-transform group-hover:scale-110",
                currentPath === link.href ? "text-white" : "text-slate-400"
              )} />
              {link.label}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100 mb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-900 font-bold border border-slate-100">
              {profile?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-slate-900 uppercase">{profile?.name}</p>
              <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">{profile?.role}</p>
            </div>
          </div>
          
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 w-full px-5 py-3 rounded-2xl text-xs font-bold text-red-500 hover:bg-red-50 transition-all active:scale-95 bg-transparent"
          >
            <LogOut size={16} />
            LOGOUT SYSTEM
          </button>
        </div>
      </aside>
    </>
  );
}
