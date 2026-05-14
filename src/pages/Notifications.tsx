import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Notification } from '../types';
import { Bell, Check, Trash2 } from 'lucide-react';

export function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const notsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(notsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNots: Notification[] = [];
      snapshot.forEach(docSnap => {
        newNots.push({ id: docSnap.id, ...docSnap.data() } as Notification);
      });
      setNotifications(newNots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string, read: boolean) => {
    if (!user) return;
    if (read) return; // already read
    try {
      await updateDoc(doc(db, 'users', user.uid, 'notifications', id), {
        read: true
      });
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'notifications', id));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  };

  if (!user) {
    return <div className="text-gray-500 font-mono text-center mt-10">Zaloguj się, aby zobaczyć powiadomienia.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <Bell className="w-8 h-8 text-neon-blue" />
        <h1 className="text-3xl font-bold font-mono text-white tracking-widest uppercase">System.Ostrzeżenia</h1>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500 font-mono animate-pulse">Analiza logów...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center p-12 bg-surface border border-gray-800 rounded-xl">
           <div className="text-gray-500 font-mono text-sm tracking-widest uppercase mb-2">Brak nowych wpisów</div>
           <p className="text-gray-600 text-xs">Twój dziennik zdarzeń jest pusty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notif => (
            <div 
              key={notif.id}
              onClick={() => markAsRead(notif.id, notif.read)}
              className={`p-4 rounded-xl border ${notif.read ? 'bg-surface border-gray-800 opacity-60' : 'bg-bg-dark border-neon-blue cursor-pointer'} transition-all flex items-start gap-4 relative group`}
            >
               {!notif.read && <div className="w-2 h-2 rounded-full bg-neon-blue mt-2 flex-shrink-0 animate-pulse"></div>}
               <div className="flex-1">
                 <p className="text-gray-200 mb-1">{notif.content}</p>
                 <span className="text-xs font-mono text-gray-500">
                   {new Date(notif.createdAt).toLocaleString()}
                 </span>
               </div>
               <button 
                 onClick={(e) => deleteNotification(notif.id, e)}
                 className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
               >
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
