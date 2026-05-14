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

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsOnline(!!data.isOnline);
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        } else {
          setAvatarUrl(null);
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  const renderDot = () => {
    if (!isOnline) return null;
    return (
      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-bg-dark rounded-full z-10" title="Dostępny" />
    );
  };

  return (
    <div className="relative inline-block">
      {avatarUrl ? (
        <img 
          src={avatarUrl} 
          alt={`@${username}`} 
          className={`${className} rounded-full object-cover border border-gray-700`}
          style={style}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`${className} rounded-full flex items-center justify-center ${fallbackClassName}`} style={style}>
          {username.substring(0, 2).toUpperCase()}
        </div>
      )}
      {renderDot()}
    </div>
  );
}
