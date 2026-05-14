import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserAvatarProps {
  userId: string;
  username: string;
  className?: string;
  fallbackClassName?: string;
  style?: React.CSSProperties;
}

export function UserAvatar({ userId, username, className = "w-10 h-10", fallbackClassName = "bg-indigo-500 font-bold font-mono text-white text-sm", style }: UserAvatarProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [lastActive, setLastActive] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000); // Update every 30s
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOnline(!!data.isOnline);
        setLastActive(data.lastActive || null);
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        } else {
          setAvatarUrl(null);
        }
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

  const renderDot = () => {
    if (!trulyOnline) return null;
    return (
      <div className="absolute bottom-[2%] right-[2%] w-[28%] h-[28%] min-w-[8px] min-h-[8px] max-w-[12px] max-h-[12px] bg-green-500 border-2 border-[#0a0a0a] rounded-full z-10 shadow-lg" title="Dostępny" />
    );
  };

  return (
    <div className={`relative inline-block flex-shrink-0 rounded-full overflow-hidden ${className}`}>
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={`@${username}`} 
          className="w-full h-full rounded-full object-cover"
          style={style}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center ${fallbackClassName}`} style={style}>
          {username.substring(0, 2).toUpperCase()}
        </div>
      )}
      {renderDot()}
    </div>
  );
}
