import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Sidebar from './components/layout/Sidebar';
import Login from './pages/Auth/Login';
import AdminDashboard from './pages/Admin/Dashboard';
import StudentsList from './pages/Admin/StudentsList';
import StaffList from './pages/Admin/StaffList';
import MealManagement from './pages/Admin/MealManagement';
import QRScanner from './pages/Admin/QRScanner';
import StudentDashboard from './pages/Student/Dashboard';
import MealBooking from './pages/Student/MealBooking';
import History from './pages/Student/History';
import Fines from './pages/Student/Fines';
import Account from './pages/Admin/Account';
import { Menu, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'react-hot-toast';
import { auth } from './lib/firebase';

function AppContent() {
  const { user, profile, loading, unregistered } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Simple routing
  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    setIsSidebarOpen(false);
  };

  if (loading) {
    return (
      <div className="center-screen bg-slate-50">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-slate-900 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (unregistered) {
    return (
      <div className="center-screen bg-slate-50 flex-col px-6">
        <div className="bg-white p-8 rounded-[24px] max-w-md w-full shadow-xl shadow-slate-200/50 text-center border border-slate-100">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 mb-2">Student Not Found</h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Your Google Account is not registered in the system. Please scan the administration QR code to register your ID and Room Number before accessing the terminal.
          </p>
          <button 
            onClick={() => auth.signOut()}
            className="w-full bg-slate-900 text-white font-bold uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';
  const isStaff = profile?.role === 'staff';
  const isStaffOrAdmin = isAdmin || isStaff;

  const renderContent = () => {
    if (isStaffOrAdmin) {
      switch (currentPath) {
        case '/admin': return <AdminDashboard />;
        // Admin-only routes — staff gets redirected to dashboard
        case '/admin/students': return isAdmin ? <StudentsList /> : <AdminDashboard />;
        case '/admin/staff': return isAdmin ? <StaffList /> : <AdminDashboard />;
        case '/admin/meals': return <MealManagement />;
        case '/admin/verify': return <QRScanner />;
        case '/admin/account': return <Account />;
        default: return <AdminDashboard />;
      }
    } else {
      switch (currentPath) {
        case '/student': return <StudentDashboard navigate={navigate} />;
        case '/student/register': return <MealBooking />;
        case '/student/history': return <History />;
        case '/student/fines': return <Fines />;
        default: return <StudentDashboard navigate={navigate} />;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        currentPath={currentPath}
      />
      
      <main className="lg:ml-64 transition-all pb-12 min-h-screen">
        <header className="h-16 sm:h-20 bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-10">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 sm:p-2.5 lg:hidden rounded-xl sm:rounded-2xl hover:bg-slate-100 -ml-1 sm:-ml-4 mr-2 transition-colors"
          >
            <Menu size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 truncate">
              {isStaffOrAdmin ? "Metrics Hub" : "Student Terminal"}
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            {/* User Profile Mini - Mobile visible */}
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold sm:hidden">
              {profile?.name?.[0] || 'U'}
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: '16px',
            fontSize: '12px',
            padding: '12px 20px',
          },
        }} 
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
