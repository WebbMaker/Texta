import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router';
import { Send, Check, X } from 'lucide-react';
import { ImageUploadButton } from '../components/ImageUploadButton';

interface Friend {
  uid: string;
  username: string;
  addedAt: number;
}

interface FriendRequest {
  uid: string;
  username: string;
  createdAt: number;
}

interface Message {
  id: string;
  participants: string[];
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
}

export function Messages() {
  const { user, profile } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'friends'), (snap) => {
      const f: Friend[] = [];
      snap.forEach(d => f.push({ uid: d.id, ...d.data() } as Friend));
      setFriends(f);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, 'users', user.uid, 'friend_requests'), (snap) => {
      const reqs: FriendRequest[] = [];
      snap.forEach(d => reqs.push({ uid: d.id, ...d.data() } as FriendRequest));
      setRequests(reqs);
    });
    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user || !selectedFriend) return;
    
    // We fetch all messages where participants match the sorted combo
    const participantsCombo = [user.uid, selectedFriend.uid].sort();
    
    const unsub = onSnapshot(query(collection(db, 'private_messages'), where('participants', 'array-contains', user.uid)), (snap) => {
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
    });
    return () => unsub();
  }, [user, selectedFriend]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedFriend || (!newMessage.trim() && !imageUrl)) return;
    
    const participants = [user.uid, selectedFriend.uid].sort();
    try {
      const msg: any = {
        participants,
        senderId: user.uid,
        content: newMessage.trim(),
        createdAt: Date.now()
      };
      if (imageUrl) {
         msg.imageUrl = imageUrl;
      }
      await addDoc(collection(db, 'private_messages'), msg);
      setNewMessage('');
      setImageUrl(null);
    } catch(err) {
      console.error(err);
    }
  }

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
    return <div className="text-center text-gray-500 font-mono py-12">WYMAGANA_AUTORYZACJA_SYSTEMU</div>;
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
                  <span className="font-bold text-white text-sm">@{req.username}</span>
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
          <h2 className="text-sm font-bold text-text-dim tracking-widest uppercase font-mono pb-2 mb-4 border-b border-gray-800">
            LISTA_ZNAJOMYCH
          </h2>
          {friends.length === 0 ? (
            <p className="text-xs text-gray-500 font-mono">Nie znaleziono połączonych węzłów. Wyszukaj użytkowników, aby ich dodać.</p>
          ) : (
            friends.map(f => (
              <button
                key={f.uid}
                onClick={() => setSelectedFriend(f)}
                className={`w-full text-left px-4 py-3 rounded-xl mb-2 transition-colors flex flex-col ${selectedFriend?.uid === f.uid ? 'bg-gray-800 border border-neon-blue' : 'hover:bg-gray-900 border border-transparent'}`}
              >
                <span className="font-bold text-white">{f.username}</span>
                <span className="text-xs font-mono text-gray-500">Połączono</span>
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
               <span className="font-bold">Czatujesz z <Link to={`/u/${selectedFriend.username}`} className="text-neon-blue hover:underline">@{selectedFriend.username}</Link></span>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {messages.length === 0 ? (
                 <p className="text-center text-gray-500 font-mono text-sm mt-10">Brak historii transmisji.</p>
               ) : (
                 messages.map(msg => {
                   const isMe = msg.senderId === user.uid;
                   return (
                     <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-neon-purple text-white rounded-br-none' : 'bg-gray-800 text-gray-200 rounded-bl-none'}`}>
                         {msg.imageUrl && (
                           <img src={msg.imageUrl} alt="attached" className="max-w-full rounded-lg mb-2 max-h-60 object-contain" />
                         )}
                         <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                       </div>
                     </div>
                   );
                 })
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
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Zacznij transmisję..."
                    className="flex-1 bg-transparent border-2 border-gray-800 rounded-xl px-4 py-2 outline-none focus:border-neon-blue font-mono text-white"
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
           <div className="flex-1 flex items-center justify-center text-gray-500 font-mono text-sm px-4 text-center">
             Wybierz znajomego, aby otworzyć kanał transmisji.
           </div>
         )}
      </div>
    </div>
  );
}
