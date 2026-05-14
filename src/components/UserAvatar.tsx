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

  useEffect(() => {
    if (!userId) return;
    
    const unsubscribe = onSnapshot(doc(db, 'users', userId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.avatarUrl) {
          setAvatarUrl(data.avatarUrl);
        } else {
          setAvatarUrl(null);
        }
      }
    });

    return () => unsubscribe();
  }, [userId]);

  if (avatarUrl) {
    return (
      <img 
        src={avatarUrl} 
        alt={`@${username}`} 
        className={`${className} rounded-full object-cover border border-gray-700`}
        style={style}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div className={`${className} rounded-full flex items-center justify-center ${fallbackClassName}`} style={style}>
      {username.substring(0, 2).toUpperCase()}
    </div>
  );
}
