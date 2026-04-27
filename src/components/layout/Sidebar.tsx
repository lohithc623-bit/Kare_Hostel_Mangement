import React from 'react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { LayoutDashboard, Users, UserCog, Utensils, LogOut, Menu, X, QrCode, CreditCard, History } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const adminLinks = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/staff', label: 'Staff', icon: UserCog },
  { href: '/admin/meals', label: 'Meals', icon: Utensils },
  { href: '/admin/verify', label: 'Verify QR', icon: QrCode },
];

const studentLinks = [
  { href: '/student', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/student/register', label: 'Meal Booking', icon: Utensils },
  { href: '/student/history', label: 'History', icon: History },
  { href: '/student/fines', label: 'Fines', icon: CreditCard },
];

export default function Sidebar({ isOpen, setIsOpen, currentPath }: { isOpen: boolean; setIsOpen: (v: boolean) => void; currentPath: string }) {
  const { profile } = useAuth();
  const links = profile?.role === 'admin' || profile?.role === 'staff' ? adminLinks : studentLinks;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: isOpen ? 0 : -300 }}
        className={cn(
          "fixed top-0 left-0 bottom-0 w-64 bg-white text-gray-900 z-50 transition-all lg:translate-x-0 border-r border-gray-200",
          !isOpen && "lg:block"
        )}
      >
        <div className="p-6 border-b border-gray-100 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white text-[10px] font-bold">HM</div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">HostelMeal</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none">Management</p>
            </div>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                currentPath === link.href 
                  ? "bg-blue-50 text-blue-700 shadow-sm" 
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <link.icon size={18} />
              {link.label}
            </a>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm uppercase">
              {profile?.name?.[0] || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-gray-900 uppercase">{profile?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase truncate">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => signOut(auth)}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </motion.aside>
    </>
  );
}
