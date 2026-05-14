import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, addDoc, deleteDoc, updateDoc, writeBatch, getDocFromServer } from 'firebase/firestore';
import { Link } from 'react-router';
import { Send, Check, X, CheckCheck } from 'lucide-react';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { UserAvatar } from '../components/UserAvatar';
import { UserPresence } from '../components/UserPresence';
import { MarkdownContent } from '../components/MarkdownContent';
import { Message, TypingStatus } from '../types';
import { auth } from '../lib/firebase';

interface Friend {
  uid: string;
  username: string;
  addedAt: number;
  unreadCount?: number;
}

interface FriendRequest {
  uid: string;
  username: string;
  createdAt: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function Messages() {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [otherIsTyping, setOtherIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadListenersRef = useRef<{ [key: string]: () => void }>({});

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'friends'), (snap) => {
      const f: Friend[] = [];
      snap.forEach(d => f.push({ uid: d.id, ...d.data() } as Friend));
      
      // Clean up old unread listeners
      Object.values(unreadListenersRef.current).forEach(unsub => unsub());
      unreadListenersRef.current = {};

      // Listen for unread messages for each friend
      f.forEach((friend) => {
        const q = query(
          collection(db, 'private_messages'),
          where('participants', 'array-contains', user.uid),
          where('senderId', '==', friend.uid),
          where('seen', '==', false)
        );
        unreadListenersRef.current[friend.uid] = onSnapshot(q, (unreadSnap) => {
          setFriends(prev => {
            const newFriends = [...prev];
            const found = newFriends.find(nf => nf.uid === friend.uid);
            if (found) {
              found.unreadCount = unreadSnap.docs.length;
            }
            return newFriends;
          });
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, 'private_messages/unread');
        });
      });

      setFriends(f);
    }, (err) => {
       handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/friends`);
    });

    return () => {
      unsub();
      Object.values(unreadListenersRef.current).forEach(unsub => unsub());
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'friend_requests'), (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach(d => reqs.push({ uid: d.id, ...d.data() } as FriendRequest));
      setRequests(reqs);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/friend_requests`);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFriend) return;
    
    // Mark messages as seen when chat opens
    const qMarkSeen = query(
      collection(db, 'private_messages'),
      where('participants', 'array-contains', user.uid),
      where('senderId', '==', selectedFriend.uid),
      where('seen', '==', false)
    );

    const unsubSeen = onSnapshot(qMarkSeen, (snap) => {
      if (snap.empty) return;
      const batch = writeBatch(db);
      snap.docs.forEach(d => {
        batch.update(d.ref, { seen: true });
      });
      batch.commit().catch(err => handleFirestoreError(err, OperationType.UPDATE, 'private_messages/seen'));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'private_messages/mark_seen_query');
    });

    // Listen for other person's typing status
    const typingDocId = [user.uid, selectedFriend.uid].sort().join('_');
    const unsubTyping = onSnapshot(doc(db, 'typing_status', typingDocId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const isRecent = Date.now() - (data.lastActive || 0) < 5000;
        setOtherIsTyping(!!data[selectedFriend.uid] && isRecent);
      } else {
        setOtherIsTyping(false);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `typing_status/${typingDocId}`);
    });

    const unsubMessages = onSnapshot(query(collection(db, 'private_messages'), where('participants', 'array-contains', user.uid)), (snap) => {
      const msgs: Message[] = [];
      snap.forEach(d => {
        const data = d.data() as Message;
        if (data.participants.includes(selectedFriend.uid)) {
          msgs.push({ id: d.id, ...data });
        }
      });
      msgs.sort((a, b) => a.createdAt - b.createdAt);
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'private_messages');
    });

    return () => {
      unsubSeen();
      unsubTyping();
      unsubMessages();
    };
  }, [user, selectedFriend]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFriend || (!newMessage.trim() && !imageUrl)) return;
    
    const messageToSend = newMessage.trim();
    const imageToSend = imageUrl;

    // Clear input immediately for instant feedback
    setNewMessage('');
    setImageUrl(null);
    handleTyping(false);
    
    const participants = [user.uid, selectedFriend.uid].sort();
    try {
      const msg: any = {
        participants,
        senderId: user.uid,
        content: messageToSend,
        createdAt: Date.now(),
        seen: false
      };
      if (imageToSend) {
         msg.imageUrl = imageToSend;
      }
      await addDoc(collection(db, 'private_messages'), msg);
    } catch(err) {
      console.error(err);
      // Restore message if error occurs so user doesn't lose it
      setNewMessage(messageToSend);
      setImageUrl(imageToSend);
    }
  }

  const handleTyping = (isTyping: boolean) => {
    if (!user || !selectedFriend) return;
    const typingDocId = [user.uid, selectedFriend.uid].sort().join('_');
    const typingRef = doc(db, 'typing_status', typingDocId);
    
    setDoc(typingRef, {
      [user.uid]: isTyping,
      lastActive: Date.now()
    }, { merge: true }).catch(console.error);
  };

  const onInputChange = (val: string) => {
    setNewMessage(val);
    handleTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 3000);
  };

  const handleAcceptRequest = async (req: FriendRequest) => {
    if (!user || !profile) return;
    try {
      // Add to my friends
      await setDoc(doc(db, 'users', user.uid, 'friends', req.uid), {
        username: req.username,
        addedAt: Date.now()
      });
      // Add me to their friends
      await setDoc(doc(db, 'users', req.uid, 'friends', user.uid), {
        username: profile.username,
        addedAt: Date.now()
      });
      // Delete request
      await deleteDoc(doc(db, 'users', user.uid, 'friend_requests', req.uid));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeclineRequest = async (reqUid: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'friend_requests', reqUid));
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) {
    return <div className="text-center text-gray-500 font-sans py-12">Zaloguj się, aby rozmawiać</div>;
  }

  return (
    <div className="flex flex-col sm:flex-row gap-6 h-[70vh]">
      {/* Friends List and Requests */}
      <div className="w-full sm:w-1/3 flex flex-col gap-4 overflow-hidden">
        {requests.length > 0 && (
          <div className="bg-surface border border-gray-800 rounded-2xl p-4 shrink-0">
            <h2 className="text-sm font-bold text-neon-blue tracking-widest uppercase font-mono pb-2 mb-4 border-b border-gray-800">
              ZAPROSZENIA ({requests.length})
            </h2>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {requests.map(req => (
                <div key={req.uid} className="flex flex-col gap-2 p-3 bg-bg-dark rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2">
                    <UserAvatar userId={req.uid} username={req.username} className="w-6 h-6" fallbackClassName="bg-gray-700 text-[10px]" />
                    <span className="font-bold text-white text-sm">@{req.username}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleAcceptRequest(req)} className="flex-1 bg-neon-purple text-white text-xs font-bold py-1.5 rounded uppercase hover:brightness-110 flex items-center justify-center gap-1">
                      <Check className="w-3 h-3" /> Akceptuj
                    </button>
                    <button onClick={() => handleDeclineRequest(req.uid)} className="flex-1 bg-gray-800 text-gray-400 text-xs font-bold py-1.5 rounded uppercase hover:text-white hover:bg-gray-700 flex items-center justify-center gap-1">
                      <X className="w-3 h-3" /> Odrzuć
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface border border-gray-800 rounded-2xl p-4 flex-1 overflow-y-auto shadow-[0_0_20px_rgba(0,0,0,0.3)]">
          <h2 className="text-sm font-bold text-text-dim tracking-widest uppercase font-sans pb-2 mb-4 border-b border-gray-800">
            Znajomi
          </h2>
          {friends.length === 0 ? (
            <p className="text-xs text-gray-500 font-mono">Nie znaleziono połączonych węzłów. Wyszukaj użytkowników, aby ich dodać.</p>
          ) : (
            friends.map(f => (
              <button
                key={f.uid}
                onClick={() => setSelectedFriend(f)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-colors flex items-center gap-3 ${selectedFriend?.uid === f.uid ? 'bg-gray-800 border border-neon-blue' : 'hover:bg-gray-900 border border-transparent'}`}
              >
                <UserAvatar userId={f.uid} username={f.username} className="w-10 h-10 flex-shrink-0" />
                <div className="flex-1 overflow-hidden">
                  <div className="flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white truncate">{f.username}</span>
                      {f.unreadCount && f.unreadCount > 0 ? (
                        <span className="bg-neon-blue text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center ml-2">
                          {f.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <UserPresence userId={f.uid} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-surface border border-gray-800 rounded-2xl flex flex-col overflow-hidden relative shadow-[0_0_30px_rgba(0,0,0,0.5)]">
         <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue"></div>
         {selectedFriend ? (
           <>
             <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-bg-dark/50">
               <div className="flex items-center gap-3">
                 <UserAvatar userId={selectedFriend.uid} username={selectedFriend.username} className="w-8 h-8" />
                 <span className="font-bold">Czatujesz z <Link to={`/u/${selectedFriend.username}`} className="text-neon-blue hover:underline">@{selectedFriend.username}</Link></span>
               </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.length === 0 ? (
                 <p className="text-center text-gray-500 font-sans text-sm mt-10">Brak historii wiadomości.</p>
               ) : (
                 messages.map((msg, index) => {
                   const isMe = msg.senderId === user.uid;
                   const isLast = index === messages.length - 1;
                   return (
                     <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                       <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-neon-purple text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                         {msg.imageUrl && (
                           <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-lg mb-2 max-h-60 object-contain" />
                         )}
                         <MarkdownContent content={msg.content} mentionColor={isMe ? 'purple' : 'blue'} />
                       </div>
                       {isMe && isLast && (
                         <div className="flex items-center gap-1 mt-1 px-1">
                           {msg.seen ? (
                             <>
                               <span className="text-[10px] text-gray-500 font-mono uppercase">Wyświetlono</span>
                               <CheckCheck className="w-3 h-3 text-neon-blue" />
                             </>
                           ) : (
                             <>
                               <span className="text-[10px] text-gray-500 font-mono uppercase">Dostarczono</span>
                               <Check className="w-3 h-3 text-gray-600" />
                             </>
                           )}
                         </div>
                       )}
                     </div>
                   );
                 })
               )}
               {otherIsTyping && (
                 <div className="flex justify-start">
                   <div className="bg-gray-800/50 text-gray-400 text-xs py-2 px-4 rounded-xl font-mono animate-pulse">
                     @{selectedFriend.username} pisze...
                   </div>
                 </div>
               )}
               <div ref={messagesEndRef} />
             </div>

             <form onSubmit={handleSend} className="p-4 border-t border-gray-800 bg-bg-dark/50 flex flex-col gap-2">
                {imageUrl && (
                  <div className="relative self-start pl-2">
                    <img src={imageUrl} alt="preview" className="max-h-24 rounded-lg object-contain border border-gray-700" />
                    <button 
                      type="button" 
                      onClick={() => setImageUrl(null)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex items-center justify-center pl-2">
                    <ImageUploadButton onImageSelected={setImageUrl} />
                  </div>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Napisz wiadomość..."
                    className="flex-1 bg-transparent border-2 border-gray-800 rounded-xl px-4 py-2 outline-none focus:border-neon-blue font-sans text-white"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() && !imageUrl}
                    className="bg-neon-blue p-3 rounded-xl text-black hover:brightness-110 disabled:opacity-50 transition-all font-bold"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
             </form>
           </>
         ) : (
           <div className="flex-1 flex items-center justify-center text-gray-500 font-sans text-sm px-4 text-center">
             Wybierz znajomego, aby rozpocząć rozmowę.
           </div>
         )}
      </div>
    </div>
  );
}
