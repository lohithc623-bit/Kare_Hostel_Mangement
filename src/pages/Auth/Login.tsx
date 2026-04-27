import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { LogIn, Shield, Users, Key, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Login() {
  const [isAdminPortal, setIsAdminPortal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Special case for default admin
      const isDefaultAdmin = email === 'balajidamineni@gmail.com';
      
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        // If admin doesn't exist and using default credentials, create them
        if (isDefaultAdmin && password === 'admin2026' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          // Initialize admin profile
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: 'Balaji Damineni',
            email: email,
            role: 'admin',
            firstLogin: true,
            createdAt: new Date().toISOString()
          });
          toast.success("Default Admin Account Initialized");
        } else {
          throw err;
        }
      }

      const user = userCredential.user;
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!profileDoc.exists()) {
        toast.error("User profile not found in database.");
        return;
      }

      const profile = profileDoc.data();

      // Role check for portal integrity
      if (isAdminPortal && profile.role === 'student') {
        toast.error("Access Denied: Use Student Portal for student accounts.");
        setLoading(false);
        return;
      }
      if (!isAdminPortal && (profile.role === 'admin' || profile.role === 'staff')) {
        toast.error("Access Denied: Use Admin Terminal for staff accounts.");
        setLoading(false);
        return;
      }

      if (profile.firstLogin) {
        setShowReset(true);
      } else {
        toast.success(`Welcome back, ${profile.name}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setLoading(true);

    try {
      await updatePassword(auth.currentUser, newPassword);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        firstLogin: false
      });
      toast.success("Password updated successfully");
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showReset) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6 text-orange-600">
            <Key size={32} />
            <h2 className="text-2xl font-bold">New Security Required</h2>
          </div>
          <p className="text-gray-600 mb-8 text-sm">
            This is your first login. For security reasons, please change your default password before continuing.
          </p>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              disabled={loading}
              className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            >
              Update & Continue
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="mb-8 text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={cn(
            "inline-flex items-center justify-center w-12 h-12 rounded-lg text-white mb-4 shadow-md transition-colors",
            isAdminPortal ? "bg-red-600" : "bg-blue-600"
          )}
        >
          <Shield size={24} />
        </motion.div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">HostelMeal</h1>
        <p className={cn(
          "font-mono text-[10px] uppercase tracking-widest mt-1",
          isAdminPortal ? "text-red-600" : "text-blue-600"
        )}>
          {isAdminPortal ? "Admin Terminal" : "Student Portal"}
        </p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white rounded-xl p-8 shadow-sm border border-gray-200 relative overflow-hidden"
      >
        <div className={cn(
          "absolute top-0 left-0 w-full h-1 transition-colors",
          isAdminPortal ? "bg-red-600" : "bg-blue-600"
        )} />
        
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setIsAdminPortal(false)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
              !isAdminPortal ? "bg-white text-blue-600 shadow-sm" : "text-gray-400"
            )}
          >
            Student
          </button>
          <button 
            onClick={() => setIsAdminPortal(true)}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold uppercase tracking-widest rounded-md transition-all",
              isAdminPortal ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
            )}
          >
            Admin
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Sign In</h2>
          <p className="text-gray-500 text-xs mt-1 italic">
            Enter your {isAdminPortal ? "staff" : "university"} credentials.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-300",
                  isAdminPortal ? "focus:ring-1 focus:ring-red-600" : "focus:ring-1 focus:ring-blue-600"
                )}
                placeholder="name@university.edu"
              />
              <Users className="absolute right-3 top-2.5 text-gray-300" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-0.5">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none transition-all text-sm text-gray-900 placeholder:text-gray-300",
                  isAdminPortal ? "focus:ring-1 focus:ring-red-600" : "focus:ring-1 focus:ring-blue-600"
                )}
                placeholder="••••••••"
              />
              <Key className="absolute right-3 top-2.5 text-gray-300" size={16} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm text-sm",
              isAdminPortal ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            )}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <LogIn size={16} />
                Access System
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
            Authorized Personnel Only
          </p>
        </div>
      </motion.div>

      <p className="mt-8 text-gray-400 text-[9px] uppercase tracking-[0.2em] font-medium">
        &copy; 2026 Admin Solutions
      </p>
    </div>
  );
}
