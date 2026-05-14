import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserPresenceProps {
  userId: string;
  className?: string;
}

export function UserPresence({ userId, className = "" }: UserPresenceProps) {
  const [isOnline, setIsOnline] = useState(false);
  const [lastActive, setLastActive] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOnline(!!data.isOnline);
        setLastActive(data.lastActive || null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const activeThreshold = 120000; // 2 minutes
  const trulyOnline = isOnline && lastActive && (now - lastActive < activeThreshold);

  const formatLastActive = (time: number) => {
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'przed chwilą';
    if (diffMins < 60) return `${diffMins} min temu`;
    
    const hours = Math.floor(diffMins / 60);
    return `${hours}h temu`;
  };

  if (trulyOnline) {
    return (
      <span className={`text-[10px] font-mono text-green-500 uppercase tracking-tighter ${className}`}>
        Aktywny teraz
      </span>
    );
  }

  if (lastActive) {
    return (
      <span className={`text-[10px] font-mono text-gray-500 uppercase tracking-tighter ${className}`}>
        {formatLastActive(lastActive)}
      </span>
    );
  }

  return null;
}
