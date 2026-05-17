import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { Link } from 'react-router';
import { Send, Check, X, CheckCheck, Users, Search, Target, Pencil, MoreVertical } from 'lucide-react';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { UserAvatar } from '../components/UserAvatar';
import { UserPresence } from '../components/UserPresence';
import { MarkdownContent } from '../components/MarkdownContent';
import { Conversation, ConversationMessage } from '../types';
import { CreateGroupModal } from '../components/chat/CreateGroupModal';
import { ChatSettings } from '../components/chat/ChatSettings';

const MESSENGER_DOTS_ANIMATION = `
  @keyframes typing {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-5px); }
  }
`;

export function Messages() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{uid: string, username: string, avatarUrl?: string}[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [friendRequests, setFriendRequests] = useState<{uid: string, username: string, sentAt: number}[]>([]);
  
  const [typings, setTypings] = useState<Record<string, boolean>>({});
  const [friendsInfo, setFriendsInfo] = useState<Record<string, {username: string, avatarUrl?: string}>>({});
  const [friends, setFriends] = useState<string[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load friends and friend requests
  useEffect(() => {
    if (!user) return;
    const unsubFriends = onSnapshot(collection(db, 'users', user.uid, 'friends'), (snap) => {
      setFriends(snap.docs.map(d => d.id));
    });

    const freqRef = collection(db, 'users', user.uid, 'friend_requests');
    const qFreq = query(freqRef, orderBy('sentAt', 'desc'));
    const unsubFreqs = onSnapshot(qFreq, (snapshot) => {
      const newFreqs: {uid: string, username: string, sentAt: number}[] = [];
      snapshot.forEach(docSnap => {
        newFreqs.push({ uid: docSnap.id, ...(docSnap.data() as any) });
      });
      setFriendRequests(newFreqs);
    });

    return () => {
      unsubFriends();
      unsubFreqs();
    };
  }, [user]);

  // Search users effect
  useEffect(() => {
    if (!searchQuery.trim() || !user) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const qText = searchQuery.trim().toLowerCase();
      
      const nameSynonyms: Record<string, string[]> = {
        'ola': ['aleksandra'],
        'aleksandra': ['ola', 'oluś'],
        'kasia': ['katarzyna'],
        'katarzyna': ['kasia'],
        'tomek': ['tomasz'],
        'tomasz': ['tomek'],
        'maciek': ['maciej'],
        'maciej': ['maciek'],
        'ania': ['anna'],
        'anna': ['ania'],
        'magda': ['magdalena'],
        'magdalena': ['magda'],
        'michał': ['misiek', 'michal'],
        'michal': ['michał', 'misiek']
      };

      const levenshtein = (a: string, b: string) => {
        if (a.length === 0) return b.length;
        if (b.length === 0) return a.length;
        const matrix = [];
        for (let i = 0; i <= b.length; i++) { matrix[i] = [i]; }
        for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
        for (let i = 1; i <= b.length; i++) {
          for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
              matrix[i][j] = matrix[i - 1][j - 1];
            } else {
              matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
          }
        }
        return matrix[b.length][a.length];
      };

      try {
        const { getDocs, query, collection, limit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'users'), limit(300)));
        const users = snap.docs.map(d => ({uid: d.id, ...(d.data() as any)})).filter(u => u.uid !== user.uid);
        
        const qSynonyms = [qText, ...(nameSynonyms[qText] || [])];
        
        let results = users.map(u => {
          let minDistance = Infinity;
          const uName = u.username.toLowerCase();
          
          if (qSynonyms.some(s => uName.includes(s))) {
             minDistance = 0;
          } else {
             const dist = levenshtein(uName, qText);
             minDistance = dist;
             
             // Also check distances against synonyms
             for (const syn of qSynonyms) {
               minDistance = Math.min(minDistance, levenshtein(uName, syn));
             }
          }
          return { ...u, distance: minDistance };
        });

        // Margines błędu: dystans max 2 (dla literówek) lub substring
        results = results.filter(r => r.distance <= Math.max(2, Math.floor(qText.length / 3)) || qSynonyms.some(s => r.username.toLowerCase().includes(s)));
        results.sort((a,b) => a.distance - b.distance);
        setSearchResults(results.slice(0, 10));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  const handleStartChat = async (targetUserId: string) => {
     setSearchQuery('');
     setSearchResults([]);
     
     if (!friends.includes(targetUserId)) {
       alert('Musisz mieć tę osobę w znajomych, aby rozpocząć czat. Wejdź na jej profil, aby wysłać zaproszenie.');
       return;
     }

     const existing = conversations.find(c => c.type === 'direct' && c.participants.includes(targetUserId));
     if (existing) {
        setActiveConvId(existing.id);
        return;
     }
     try {
       const newRef = await addDoc(collection(db, 'conversations'), {
         type: 'direct',
         participants: [user!.uid, targetUserId].sort(),
         nicknames: {},
         createdAt: Date.now(),
         updatedAt: Date.now()
       });
       setActiveConvId(newRef.id);
     } catch (e) {
       console.error(e);
     }
  };

  // Load conversations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const convs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      convs.sort((a, b) => b.updatedAt - a.updatedAt);
      setConversations(convs);
      
      // Fetch missing user info for participants
      const missingUids = new Set<string>();
      convs.forEach(c => {
         c.participants.forEach(p => {
           if (p !== user.uid && !friendsInfo[p]) missingUids.add(p);
         });
      });
      
      if (missingUids.size > 0) {
         missingUids.forEach(async (uid) => {
           try {
             const userDoc = await getDoc(doc(db, 'users', uid));
             if (userDoc.exists()) {
               setFriendsInfo(prev => ({
                 ...prev,
                 [uid]: { username: userDoc.data().username, avatarUrl: userDoc.data().avatarUrl }
               }));
             }
           } catch(e) {}
         });
      }
      
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  // Load active conversation messages
  useEffect(() => {
    if (!user || !activeConvId) return;
    
    const q = query(
      collection(db, 'conversations', activeConvId, 'messages'),
      orderBy('createdAt', 'asc')
    );
    
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConversationMessage));
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      
      // Mark as seen
      const unseen = snap.docs.filter(d => {
        const m = d.data() as ConversationMessage;
        return m.senderId !== user.uid && !m.seenBy.includes(user.uid);
      });
      if (unseen.length > 0) {
        const batch = writeBatch(db);
        unseen.forEach(d => {
          batch.update(d.ref, { seenBy: [...d.data().seenBy, user.uid] });
        });
        batch.commit();
      }
    });

    // Typing status listener
    const unsubTyping = onSnapshot(doc(db, 'typing_status', activeConvId), (docSnap) => {
       if (docSnap.exists()) {
         const data = docSnap.data();
         const isRecent = Date.now() - (data.lastActive || 0) < 5000;
         const typingInfo: Record<string, boolean> = {};
         Object.keys(data).forEach(k => {
            if (k !== 'lastActive' && k !== user.uid) {
               typingInfo[k] = !!data[k] && isRecent;
            }
         });
         setTypings(typingInfo);
       } else {
         setTypings({});
       }
    });

    return () => { unsub(); unsubTyping(); };
  }, [user, activeConvId]);

  const visibleConversations = conversations.filter(c => {
    if (c.type === 'group') return true;
    const friendId = c.participants.find(p => p !== user?.uid);
    if (!friendId) return false;
    return friends.includes(friendId);
  });

  const activeConv = visibleConversations.find(c => c.id === activeConvId);

  const getConvName = (conv: Conversation) => {
    if (conv.type === 'group') return conv.name || 'Grupa';
    const friendId = conv.participants.find(p => p !== user?.uid);
    if (!friendId) return 'Tylko ty';
    if (conv.nicknames && conv.nicknames[friendId]) return conv.nicknames[friendId];
    return friendsInfo[friendId]?.username || 'Ładowanie...';
  };

  const getConvAvatar = (conv: Conversation) => {
    if (conv.type === 'group') {
      if (conv.photoUrl) {
         return <img src={conv.photoUrl} alt="Group avatar" className="w-12 h-12 rounded-full shadow-lg object-cover shrink-0" />;
      }
      return (
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#007aff] to-[#5856d6] flex items-center justify-center shrink-0 shadow-lg">
          <Users className="w-6 h-6 text-white" />
        </div>
      );
    }
    const friendId = conv.participants.find(p => p !== user?.uid);
    if (!friendId) return <div className="w-12 h-12 rounded-full bg-gray-800 shrink-0" />;
    return <UserAvatar userId={friendId} username={friendsInfo[friendId]?.username || ''} className="w-12 h-12 shrink-0" />;
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeConvId || (!newMessage.trim() && !imageUrl)) return;
    
    const msgText = newMessage.trim();
    const curImg = imageUrl;
    
    setNewMessage('');
    setImageUrl(null);
    handleTyping(false);

    try {
      const msgData: any = {
        senderId: user.uid,
        content: msgText,
        createdAt: Date.now(),
        seenBy: [user.uid]
      };
      if (curImg) msgData.imageUrl = curImg;
      
      await addDoc(collection(db, 'conversations', activeConvId, 'messages'), msgData);
      
      // Update last message
      await updateDoc(doc(db, 'conversations', activeConvId), {
        updatedAt: Date.now(),
        lastMessage: {
          text: msgText || (curImg ? 'Przesłano obraz' : ''),
          senderId: user.uid,
          createdAt: Date.now()
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!user || !activeConvId) return;
    setDoc(doc(db, 'typing_status', activeConvId), {
      [user.uid]: isTyping,
      lastActive: Date.now()
    }, { merge: true }).catch(console.error);
  };

  const onInputChange = (val: string) => {
    setNewMessage(val);
    handleTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
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

  const activeTypingUsers = Object.keys(typings).filter(uid => typings[uid]);

  if (!user) return <div className="text-center py-12">Zaloguj się...</div>;

  return (
    <div className="flex h-[80vh] bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <style>{MESSENGER_DOTS_ANIMATION}</style>
      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} onGroupCreated={(id) => { setActiveConvId(id); setShowCreateGroup(false); }} />}
      
      {/* Sidebar */}
      <div className="w-[350px] border-r border-white/10 flex flex-col bg-zinc-950/50 backdrop-blur-xl">
        {/* User Search */}
        <div className="p-3 border-b border-white/5 bg-black/40">
           <div className="relative">
             <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
             <input
               type="text"
               placeholder="Szukaj osób..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#007aff]/50 focus:bg-zinc-800 transition-colors"
             />
           </div>
           {searchQuery.trim() && (
             <div className="max-h-[200px] overflow-y-auto mt-2 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl absolute w-[334px] z-50 left-2 top-[60px]">
               {isSearching ? (
                  <div className="p-3 text-center text-xs text-gray-500">Szukanie...</div>
               ) : searchResults.length > 0 ? (
                  <div className="flex flex-col">
                    {searchResults.map(res => (
                       <button
                         key={res.uid}
                         onClick={() => handleStartChat(res.uid)}
                         className="flex items-center gap-3 p-2 hover:bg-white/5 text-left border-b border-white/5 last:border-0"
                       >
                         <UserAvatar userId={res.uid} username={res.username} className="w-8 h-8 rounded-full shadow-sm" />
                         <span className="font-semibold text-sm truncate">{res.username}</span>
                       </button>
                    ))}
                  </div>
               ) : (
                  <div className="p-3 text-center text-xs text-gray-500">Brak wyników</div>
               )}
             </div>
           )}
        </div>

        {friendRequests.length > 0 && (
           <div className="p-3 border-b border-white/5 bg-[#007aff]/10 flex flex-col gap-2">
             <h3 className="text-xs font-bold uppercase tracking-widest text-[#007aff] px-1">Zaproszenia ({friendRequests.length})</h3>
             <div className="max-h-[150px] overflow-y-auto scrollbar-hide flex flex-col gap-2">
               {friendRequests.map(req => (
                 <div key={req.uid} className="bg-black/40 rounded-xl p-2 border border-[#007aff]/20 flex flex-col gap-2">
                   <div className="flex items-center gap-2">
                     <UserAvatar userId={req.uid} username={req.username} className="w-6 h-6 rounded-full" />
                     <span className="text-sm font-semibold truncate flex-1 leading-none">{req.username}</span>
                   </div>
                   <div className="flex gap-2">
                     <button
                       onClick={() => handleAcceptRequest(req.uid, req.username)}
                       className="flex-1 bg-[#007aff] text-white py-1.5 rounded-lg text-xs font-bold hover:brightness-110 flex justify-center items-center gap-1"
                     >
                       <Check className="w-3 h-3" /> Akceptuj
                     </button>
                     <button
                       onClick={() => handleRejectRequest(req.uid)}
                       className="flex-1 bg-white/10 text-white hover:bg-white/20 py-1.5 rounded-lg text-xs font-bold flex justify-center items-center gap-1"
                     >
                       <X className="w-3 h-3" /> Odrzuć
                     </button>
                   </div>
                 </div>
               ))}
             </div>
           </div>
        )}

        <div className="p-5 flex items-center justify-between">
          <h1 className="text-xl font-bold font-display tracking-tight text-white/90">Czaty</h1>
          <button onClick={() => setShowCreateGroup(true)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors group" title="Nowa grupa">
            <Pencil className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
          </button>
        </div>
        
        {/* Recent users bubbles */}
        <div className="px-5 pb-4 border-b border-white/5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-4">
           {visibleConversations.map(c => {
             return (
               <div key={c.id} onClick={() => setActiveConvId(c.id)} className="cursor-pointer inline-flex flex-col items-center gap-2 w-[4.5rem] group">
                 <div className="relative group-hover:-translate-y-1 transition-transform">
                   {getConvAvatar(c)}
                   {c.type === 'direct' && c.participants.find(p=>p!==user.uid) && (
                     <UserPresence 
                       userId={c.participants.find(p=>p!==user.uid)!} 
                       hideLabel 
                       className="absolute bottom-0 right-0 w-3 h-3 shadow-sm border-[1.5px] border-black/40 z-10" 
                     />
                   )}
                 </div>
                 <div className="flex flex-col items-center w-full">
                   <span className="text-[11px] font-medium text-white/60 truncate w-full text-center group-hover:text-white/90 transition-colors">{getConvName(c).split(' ')[0]}</span>
                   {c.type === 'direct' && c.participants.find(p=>p!==user.uid) && (
                     <div className="mt-0.5 min-h-[14px]">
                       <UserPresence userId={c.participants.find(p=>p!==user.uid)!} hideLabel={false} hideActiveText={true} className="text-[9px]" />
                     </div>
                   )}
                 </div>
               </div>
             )
           })}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {visibleConversations.map(c => {
            const isActive = activeConvId === c.id;
            const friendId = c.type === 'direct' ? c.participants.find(p => p !== user.uid) : null;
            const hasUnread = c.lastMessage && c.lastMessage.senderId !== user.uid && 
                              messages.length>0 && !messages[messages.length-1].seenBy.includes(user.uid);
            
            return (
              <button 
                key={c.id} 
                onClick={() => setActiveConvId(c.id)}
                className={`w-full p-3 rounded-2xl flex items-center gap-4 transition-all duration-200 text-left ${isActive ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}
              >
                <div className="relative shrink-0">
                  {getConvAvatar(c)}
                  {friendId && (
                     <UserPresence 
                       userId={friendId} 
                       hideLabel 
                       className="absolute bottom-0 right-0 w-3.5 h-3.5 shadow-sm border-[1.5px] border-black/40 z-10" 
                     />
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-1 w-full overflow-hidden">
                    <span className={`font-semibold truncate tracking-tight text-[15px] ${hasUnread ? 'text-white' : 'text-gray-200'} shrink`}>
                      {getConvName(c)}
                    </span>
                    {friendId && (
                      <div className="shrink-0 flex items-center">
                        <UserPresence userId={friendId} hideLabel={false} className="text-[10px]" />
                      </div>
                    )}
                    {c.updatedAt && (
                      <span className="text-[11px] font-medium text-gray-500/80 whitespace-nowrap ml-auto shrink-0 pl-2">
                        {new Date(c.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                  </div>
                  {c.lastMessage && (
                     <p className={`text-[13px] truncate leading-tight w-full pr-4 ${hasUnread ? 'text-white font-medium' : 'text-gray-500'}`}>
                        {c.lastMessage.senderId === user.uid ? 'Ty: ' : ''}{c.lastMessage.text}
                     </p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col relative bg-zinc-950/80">
        {activeConvId && activeConv ? (
          <>
            {/* Header */}
            <div className="h-[73px] border-b border-white/10 px-6 flex items-center justify-between bg-black/40 backdrop-blur-md z-10 shrink-0">
               <div className="flex items-center gap-4">
                 {getConvAvatar(activeConv)}
                 <div className="flex flex-col">
                   <h2 className="font-bold text-lg leading-tight">{getConvName(activeConv)}</h2>
                   {activeConv.type === 'direct' && (
                     <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                       <UserPresence userId={activeConv.participants.find(p => p !== user.uid)!} />
                     </div>
                   )}
                   {activeConv.type === 'group' && (
                     <div className="text-xs text-gray-500 mt-0.5">
                       {activeConv.participants.length} członków
                     </div>
                   )}
                 </div>
               </div>
               
               <button onClick={() => setShowSettings(!showSettings)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white">
                 <MoreVertical className="w-5 h-5" />
               </button>
            </div>
            
            <div className="flex-1 overflow-hidden flex relative">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto scrollbar-hide px-2 sm:px-6 flex flex-col">
                <div className="flex-1"></div>
                <div className="flex flex-col pb-4 space-y-4">
                  {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user.uid;
                    const isLast = idx === messages.length - 1;
                    const showAvatar = !isMe && (idx === 0 || messages[idx-1].senderId !== msg.senderId);
                    
                    return (
                      <div key={msg.id} className={`flex gap-2 max-w-[85%] ${isMe ? 'self-end' : 'self-start'}`}>
                        {!isMe && (
                          <div className="w-8 shrink-0 flex items-end">
                            {showAvatar && (
                               <UserAvatar userId={msg.senderId} username={friendsInfo[msg.senderId]?.username || ''} className="w-8 h-8 rounded-full shadow-sm" />
                            )}
                          </div>
                        )}
                        <div className="flex flex-col">
                          {!isMe && showAvatar && activeConv.type === 'group' && (
                            <span className="text-[10px] text-gray-500 mb-1 ml-1">{friendsInfo[msg.senderId]?.username || 'Użytkownik'}</span>
                          )}
                          <div 
                            className={`px-4 py-2.5 rounded-[20px] shadow-sm relative group overflow-hidden ${
                              isMe ? 'bg-gradient-to-br from-[#007aff] to-[#005bb5] text-white rounded-br-sm' 
                                   : 'bg-zinc-800 text-zinc-100 rounded-bl-sm border border-white/5'
                            }`}
                          >
                             {msg.imageUrl && (
                               <img src={msg.imageUrl} alt="" className="max-w-[240px] max-h-[320px] rounded-xl mb-2" />
                             )}
                             <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>
                          {isMe && isLast && (
                            <div className="flex items-center justify-end gap-1 mt-1 pr-1">
                               {msg.seenBy.length > 1 ? (
                                 <CheckCheck className="w-3.5 h-3.5 text-blue-400" />
                               ) : (
                                 <Check className="w-3.5 h-3.5 text-gray-500" />
                               )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  
                  {activeTypingUsers.length > 0 && (
                    <div className="flex gap-2 self-start max-w-[85%]">
                       <div className="w-8 shrink-0 flex items-end">
                         <UserAvatar userId={activeTypingUsers[0]} username={friendsInfo[activeTypingUsers[0]]?.username || ''} className="w-8 h-8 rounded-full shadow-sm" />
                       </div>
                       <div className="bg-zinc-800 border border-white/5 px-4 py-3 rounded-[20px] rounded-bl-sm shadow-sm flex items-center gap-1 w-16 h-10">
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'typing 1.4s infinite ease-in-out', animationDelay: '0s' }}></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'typing 1.4s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                         <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'typing 1.4s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                       </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} className="h-4" />
                </div>
              </div>

              {/* Chat Settings Sidebar (Slide in) */}
              {showSettings && (
                 <ChatSettings 
                   conversation={activeConv}
                   friendsInfo={friendsInfo}
                   onClose={() => setShowSettings(false)}
                 />
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-black/60 backdrop-blur-md border-t border-white/10 flex flex-col gap-3 shrink-0">
              {imageUrl && (
                <div className="relative self-start pl-2">
                  <img src={imageUrl} alt="preview" className="h-20 rounded-xl object-contain border border-white/10 shadow-lg" />
                  <button type="button" onClick={() => setImageUrl(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-3 max-w-4xl mx-auto w-full">
                <div className="pb-1">
                  <ImageUploadButton onImageSelected={setImageUrl} />
                </div>
                <div className="flex-1 bg-zinc-900 border border-white/10 rounded-[24px] min-h-[44px] flex items-center pr-2 focus-within:ring-2 focus-within:ring-[#007aff]/50 focus-within:border-[#007aff] transition-all">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => onInputChange(e.target.value)}
                    placeholder="Wiadomość..."
                    className="flex-1 bg-transparent px-4 py-3 outline-none text-[15px] text-white disabled:opacity-50"
                  />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() && !imageUrl}
                    className="bg-[#007aff] text-white w-8 h-8 rounded-full flex items-center justify-center hover:brightness-110 disabled:opacity-50 disabled:bg-gray-800 disabled:text-gray-500 transition-all ml-1 shrink-0"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-zinc-950/50">
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10 shadow-2xl">
               <Send className="w-10 h-10 text-[#007aff]" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2 font-display">Twoje Wiadomości</h2>
            <p className="text-sm">Wyślij prywatne wiadomości do znajomych lub grupy.</p>
          </div>
        )}
      </div>
    </div>
  );
}
