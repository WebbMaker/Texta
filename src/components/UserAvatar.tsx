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
    </div>
  );
}
