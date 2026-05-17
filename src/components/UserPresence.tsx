import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserPresenceProps {
  userId: string;
  className?: string;
  hideLabel?: boolean;
  hideActiveText?: boolean;
}

export function UserPresence({ userId, className = "", hideLabel = false, hideActiveText = false }: UserPresenceProps) {
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

  const activeThreshold = 300000; // 5 minutes
  const trulyOnline = isOnline && lastActive && (now - lastActive < activeThreshold);

  if (hideLabel) {
    if (trulyOnline) {
      return <div className={`rounded-full bg-green-500 ${className}`} />;
    }
    return <div className={`rounded-full bg-zinc-500 ${className}`} />;
  }

  const formatLastActive = (time: number) => {
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'aktywny teraz';
    if (diffMins < 60) return `${diffMins} min.`;
    
    const hours = Math.floor(diffMins / 60);
    return `${hours}h`;
  };

  if (trulyOnline) {
    if (hideActiveText) return null;
    return (
      <span className={`text-[11px] font-medium text-green-500 tracking-tight ${className}`}>
        Aktywny teraz
      </span>
    );
  }

  if (lastActive) {
    return (
      <span className={`text-[11px] font-medium text-gray-500 tracking-tight ${className}`}>
        {formatLastActive(lastActive)}
      </span>
    );
  }

  return null;
}

