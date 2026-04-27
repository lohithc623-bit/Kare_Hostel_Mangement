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
import { Menu } from 'lucide-react';
import { cn } from './lib/utils';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const { user, profile, loading } = useAuth();
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
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isAdmin = profile?.role === 'admin' || profile?.role === 'staff';

  const renderContent = () => {
    if (isAdmin) {
      switch (currentPath) {
        case '/admin': return <AdminDashboard />;
        case '/admin/students': return <StudentsList />;
        case '/admin/staff': return <StaffList />;
        case '/admin/meals': return <MealManagement />;
        case '/admin/verify': return <QRScanner />;
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
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        currentPath={currentPath}
      />
      
      <main className="lg:ml-64 transition-all pb-12">
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center justify-between px-8">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 lg:hidden rounded-md hover:bg-gray-100 -ml-4 mr-2"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              {isAdmin ? "Admin Dashboard" : "Student Portal"}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-orange-50 text-orange-700 text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-orange-100 hidden md:block">
              Today: {new Date().toDateString()}
            </div>
          </div>
        </header>

        <div className="p-8">
          {renderContent()}
        </div>
      </main>
      <Toaster position="bottom-right" />
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
