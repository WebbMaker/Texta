import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { UserProfile } from "../types";
import { OWNER_EMAIL } from "../constants";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Generate a session ID for guest tracking
    let sessionId = sessionStorage.getItem('presence_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('presence_session_id', sessionId);
    }

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const isAdmin = currentUser.email === OWNER_EMAIL;
            
            if (isAdmin && data.role !== 'owner') {
              updateDoc(profileRef, { role: 'owner' }).catch(() => {});
            }

            setProfile({ uid: snap.id, ...data, role: isAdmin ? 'owner' : data.role } as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listen error:", error);
          setLoading(false);
        });
        
        return () => {
          unsubscribeProfile();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Unified Presence Logic (Users & Guests)
    const presenceRef = doc(db, 'presence', sessionId);

    const updatePresence = (active: boolean) => {
      setDoc(presenceRef, {
        uid: auth.currentUser?.uid || null,
        isOnline: active,
        lastActive: Date.now(),
        updatedAt: Date.now()
      }, { merge: true }).catch(() => {});

      // For logged in users, also update the users collection
      if (auth.currentUser) {
        updateDoc(doc(db, 'users', auth.currentUser.uid), {
          isOnline: active,
          lastActive: Date.now()
        }).catch(() => {});
      }
    };

    const handleVisibilityChange = () => {
      updatePresence(document.visibilityState === 'visible');
    };

    const handleUnload = () => {
      updatePresence(false);
    };

    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initial heartbeats
    updatePresence(true);
    const heartbeat = setInterval(() => {
      if (document.visibilityState === 'visible') {
        updatePresence(true);
        
        // Track time for logged in users
        if (auth.currentUser) {
          updateDoc(doc(db, 'users', auth.currentUser.uid), {
            totalTimeSpent: increment(60)
          }).catch(() => {});
        }
      }
    }, 60000);

    return () => {
      unsubscribeAuth();
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
      updatePresence(false);
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code !== 'auth/cancelled-popup-request' && error.code !== 'auth/popup-closed-by-user') {
        console.error("Auth error:", error);
      }
    }
  };

  const signOut = async () => {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { isOnline: false, lastActive: Date.now() }).catch(() => {});
    }
    await fbSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
