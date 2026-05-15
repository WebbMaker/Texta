import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Notification } from '../types';
import { Bell, Check, X, Trash2, UserPlus } from 'lucide-react';
import { Link } from 'react-router';

export function Notifications() {
  const { user, profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [friendRequests, setFriendRequests] = useState<{uid: string, username: string, sentAt: number}[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Load standard notifications
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

    // Load friend requests
    const freqRef = collection(db, 'users', user.uid, 'friend_requests');
    const qFreq = query(freqRef, orderBy('sentAt', 'desc'));
    const unsubscribeFreq = onSnapshot(qFreq, (snapshot) => {
      const newFreqs: {uid: string, username: string, sentAt: number}[] = [];
      snapshot.forEach(docSnap => {
        newFreqs.push({ uid: docSnap.id, ...(docSnap.data() as any) });
      });
      setFriendRequests(newFreqs);
    });

    return () => {
       unsubscribe();
       unsubscribeFreq();
    };
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

  const handleAcceptRequest = async (requesterUid: string, requesterUsername: string) => {
    if (!user || !profile) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'friends', requesterUid), {
        username: requesterUsername,
        addedAt: Date.now()
      });
      await setDoc(doc(db, 'users', requesterUid, 'friends', user.uid), {
        username: profile.username,
        addedAt: Date.now()
      });
      await deleteDoc(doc(db, 'users', user.uid, 'friend_requests', requesterUid));
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectRequest = async (requesterUid: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friend_requests', requesterUid));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return <div className="text-gray-500 font-mono text-center mt-10">Zaloguj się, aby zobaczyć powiadomienia.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
        <Bell className="w-8 h-8 text-neon-blue" />
        <h1 className="text-3xl font-bold font-mono text-white tracking-widest uppercase">Powiadomienia</h1>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500 font-mono animate-pulse">Analiza logów...</div>
      ) : notifications.length === 0 && friendRequests.length === 0 ? (
        <div className="text-center p-12 bg-surface border border-gray-800 rounded-xl">
           <div className="text-gray-500 font-mono text-sm tracking-widest uppercase mb-2">Brak nowych wpisów</div>
           <p className="text-gray-600 text-xs">Twój dziennik zdarzeń jest pusty.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Friend Requests */}
          {friendRequests.map(req => (
            <div 
              key={`freq-${req.uid}`}
              className="p-4 rounded-xl border bg-bg-dark border-neon-purple transition-all flex items-start gap-4 relative"
            >
               <div className="w-2 h-2 rounded-full bg-neon-purple mt-2 flex-shrink-0 animate-pulse"></div>
               <div className="flex-1">
                 <p className="text-gray-200 mb-2">
                   Użytkownik <strong>{req.username}</strong> chce dodać cię do znajomych.
                 </p>
                 <span className="text-xs font-mono text-gray-500 block mb-3">
                   {new Date(req.sentAt).toLocaleString()}
                 </span>
                 <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleAcceptRequest(req.uid, req.username)}
                      className="px-4 py-1.5 bg-neon-purple text-white text-xs font-bold uppercase tracking-widest rounded flex items-center gap-1 hover:brightness-110"
                    >
                      <Check className="w-3.5 h-3.5" /> Akceptuj
                    </button>
                    <button 
                      onClick={() => handleRejectRequest(req.uid)}
                      className="px-4 py-1.5 bg-gray-800 text-gray-300 text-xs font-bold uppercase tracking-widest rounded flex items-center gap-1 hover:bg-gray-700"
                    >
                      <X className="w-3.5 h-3.5" /> Odrzuć
                    </button>
                    <Link to={`/profile/${req.uid}`} className="px-4 py-1.5 text-neon-blue text-xs font-bold tracking-widest hover:underline ml-auto">
                      Zobacz profil
                    </Link>
                 </div>
               </div>
            </div>
          ))}

          {/* Standard Notifications */}
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
