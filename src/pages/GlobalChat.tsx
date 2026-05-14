import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Send, Hash, MessageSquare, Terminal } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';

interface GlobalMessage {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
}

export function GlobalChat() {
  const [messages, setMessages] = useState<GlobalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'global_messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: GlobalMessage[] = [];
      snapshot.forEach(doc => {
        msgs.push({ id: doc.id, ...doc.data() } as GlobalMessage);
      });
      setMessages(msgs);
      setLoading(false);
      
      // Auto scroll
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !profile) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'global_messages'), {
        text: messageContent,
        senderId: user.uid,
        senderUsername: profile.username,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] liquid-glass rounded-[var(--radius-ios-large)] overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-white/5 backdrop-blur-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center">
            <Hash className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-display">Czat Główny</h1>
            <p className="text-xs text-white/40">Publiczny kanał rozmów</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl">
           <span className="text-xs font-bold text-white/40 uppercase tracking-tight">Globalna Rozmowa</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
        {loading ? (
           <div className="flex items-center justify-center h-full">
             <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
           </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
             <MessageSquare className="w-12 h-12 mb-4" />
             <p className="text-sm font-semibold">Cisza w eterze...</p>
             <p className="text-xs mt-2">Bądź pierwszym, który przerwie milczenie.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const prevMsg = messages[index - 1];
            const sameAuthor = prevMsg?.senderId === msg.senderId;

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={msg.id} 
                className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : ''} ${sameAuthor ? 'mt-1' : 'mt-6'}`}
              >
                {!sameAuthor && (
                  <UserAvatar 
                    userId={msg.senderId} 
                    username={msg.senderUsername} 
                    className="w-10 h-10 border border-white/10"
                  />
                )}
                {sameAuthor && <div className="w-10" />}

                <div className={`max-w-[70%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!sameAuthor && (
                    <span className="text-[10px] font-bold text-white/30 mb-1 px-1">
                      {msg.senderUsername}
                    </span>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                    ? 'bg-white text-black font-medium rounded-tr-none shadow-lg' 
                    : 'bg-white/5 text-white border border-white/10 rounded-tl-none backdrop-blur-md'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/5 backdrop-blur-xl border-t border-white/5">
        {!user ? (
          <div className="py-4 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-white/40 font-medium">
              Zaloguj się, aby brać udział w rozmowie
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative group">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Napisz do wszystkich..." 
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-sm"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute inset-y-0 right-2 px-4 flex items-center text-white/60 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
