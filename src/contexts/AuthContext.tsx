import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { doc, onSnapshot, getDoc, setDoc, updateDoc, increment } from "firebase/firestore";
import { UserProfile } from "../types";

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
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        const profileRef = doc(db, 'users', currentUser.uid);
        
        const setOffline = () => {
          updateDoc(profileRef, { isOnline: false, lastActive: Date.now() }).catch(() => {});
        };

        window.addEventListener('beforeunload', setOffline);

        // Presence / Time spent tracker
        const heartbeat = setInterval(() => {
           updateDoc(profileRef, {
             lastActive: Date.now(),
             isOnline: true,
             totalTimeSpent: increment(60) // Add 60 seconds every minute
           }).catch(() => {});
        }, 60000);

        // Initial presence update
        updateDoc(profileRef, {
           lastActive: Date.now(),
           isOnline: true
        }).catch(() => {});

        const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile({ uid: snap.id, ...snap.data() } as UserProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile listen error:", error);
          setLoading(false);
        });
        
        return () => {
          window.removeEventListener('beforeunload', setOffline);
          clearInterval(heartbeat);
          setOffline();
          unsubscribeProfile();
        };
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    await signInWithPopup(auth, provider);
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
