import React, { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updatePassword,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Shield, Key } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL || 'lohithc623@gmail.com';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (err: any) {
        if (email === adminEmail && password === 'admin2026' && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            name: 'Lohith C',
            email: email,
            role: 'admin',
            firstLogin: true,
            createdAt: new Date().toISOString()
          });
          toast.success("Admin Profile Initialized");
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const profileDoc = await getDoc(doc(db, 'users', user.uid));
      let profile;

      if (!profileDoc.exists()) {
        if (user.email === adminEmail) {
          profile = {
            name: user.displayName || 'Admin',
            email: user.email,
            role: 'admin',
            createdAt: new Date().toISOString()
          };
          await setDoc(doc(db, 'users', user.uid), profile);
          toast.success("Admin Account created successfully");
        } else {
          // Do nothing. Student must be pre-registered by Admin.
          // useAuth will handle checking their existence.
        }
      }

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Google authentication failed");
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
      <div className="center-screen" style={{ backgroundImage: 'url("/hostel_login_bg.png")', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[4px]" />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card relative w-full max-w-md p-10"
        >
          <div className="flex items-center gap-3 mb-6">
            <Key size={32} className="text-accent" />
            <h2 className="text-3xl font-serif font-medium">Reset Password</h2>
          </div>
          <p className="text-text-secondary mb-8 text-sm leading-relaxed">
            Please change your default password before continuing.
          </p>
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-text-secondary uppercase tracking-widest mb-2 ml-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="premium-input"
                placeholder="••••••••"
              />
            </div>
            <button
              disabled={loading}
              className="premium-button"
            >
              Update & Continue
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="center-screen relative overflow-hidden" 
      style={{ 
        backgroundImage: 'url("/hostel_login_bg.png")', 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}>
      
      {/* Premium Overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/95 via-white/50 to-transparent sm:from-white/90" />
      <div className="absolute inset-0 bg-emerald-900/5" />

      {/* Header Overlay - Floating */}
      <header className="absolute top-0 left-0 w-full flex items-center justify-between px-6 py-6 sm:px-10 sm:py-8 z-20">
        <button className="text-xs sm:text-sm font-semibold text-text-primary hover:opacity-70 transition-opacity">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-emerald-600 sm:w-6 sm:h-6" />
          <span className="text-base sm:text-lg font-bold tracking-[0.2em] font-serif text-text-primary uppercase">HostelMeal</span>
        </div>
        <button className="text-xs sm:text-sm font-semibold text-text-primary hover:opacity-70 transition-opacity">
          Support
        </button>
      </header>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card relative w-full max-w-[440px] px-6 py-8 sm:p-10 z-10"
      >
        <div className="text-center mb-8 sm:mb-10">
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-2 sm:mb-3">Welcome</h2>
          <p className="text-slate-500 text-xs sm:text-sm">Secure access to your meal journey</p>
        </div>

        {/* Google Sign-In Only */}
        <div className="mb-6 sm:mb-8">
          <button 
            onClick={handleGoogleLogin}
            className="premium-button google-button"
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="truncate">Continue with Google</span>
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6 sm:mb-8">
          <div className="flex-1 h-[1px] bg-slate-100" />
          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-widest px-2">or</span>
          <div className="flex-1 h-[1px] bg-slate-100" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] ml-1">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="premium-input"
              placeholder="name@university.edu"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] ml-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="premium-input"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="premium-button mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-500">
          Authorized personnel only. <button type="button" className="text-emerald-600 font-bold hover:underline ml-1">Request Access</button>
        </p>
      </motion.div>

      {/* Footer Overlay */}
      <footer className="absolute bottom-0 w-full py-4 text-center z-20">
        <p className="text-[8px] sm:text-[9px] text-slate-400 uppercase tracking-[0.3em] font-medium px-4">
          &copy; 2026 HostelMeal &bull; Secure Management System
        </p>
      </footer>
    </div>
  );
}
