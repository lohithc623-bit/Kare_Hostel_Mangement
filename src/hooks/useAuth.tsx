import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  unregistered: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true, unregistered: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unregistered, setUnregistered] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setUnregistered(false);
        setLoading(false);
      } else {
        // First try to fetch by UID (for existing admins/users)
        const profileRef = doc(db, 'users', firebaseUser.uid);
        
        const setupProfileListener = (docRef: any) => {
          return onSnapshot(docRef, (snapshot) => {
            if (snapshot.exists()) {
              setProfile({ uid: snapshot.id, ...snapshot.data() } as UserProfile);
              setUnregistered(false);
              setLoading(false);
            } else if (docRef.id === firebaseUser.uid) {
              // If UID doc missing, try Email fallback
              handleEmailFallback();
            } else {
              setUnregistered(true);
              setLoading(false);
            }
          }, (error) => {
            console.error("Profile listener error:", error);
            setLoading(false);
          });
        };

        const handleEmailFallback = async () => {
          if (!firebaseUser.email) {
            setUnregistered(true);
            setLoading(false);
            return;
          }

          const emailDocRef = doc(db, 'users', firebaseUser.email.toLowerCase());
          const { getDoc } = await import('firebase/firestore');
          
          try {
            const emailDocSnap = await getDoc(emailDocRef);
            if (emailDocSnap.exists()) {
              // Pre-registered by email found! Setup reactive listener on THIS doc
              setupProfileListener(emailDocRef);
            } else {
              setUnregistered(true);
              setLoading(false);
            }
          } catch (err) {
            console.error("Email fallback error:", err);
            setUnregistered(true);
            setLoading(false);
          }
        };

        setupProfileListener(profileRef);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading, unregistered }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
