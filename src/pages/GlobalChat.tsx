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
    <div className="flex flex-col h-[calc(100vh-160px)] bg-surface/30 border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="p-6 border-b border-gray-800 bg-bg-dark/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-neon-blue/10 border border-neon-blue/20 rounded-2xl flex items-center justify-center">
            <Hash className="w-6 h-6 text-neon-blue" />
          </div>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter text-white">Czat Główny</h1>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Wszyscy użytkownicy • Live</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-1.5 bg-green-500/10 border border-green-500/20 rounded-xl">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-[10px] font-mono font-bold text-green-500 uppercase tracking-widest">Szyfrowanie Systemowe</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide" ref={scrollRef}>
        {loading ? (
           <div className="flex items-center justify-center h-full">
             <div className="w-8 h-8 border-2 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
             <MessageSquare className="w-12 h-12 mb-4" />
             <p className="font-mono text-sm uppercase tracking-widest">Cisza w eterze...</p>
             <p className="text-xs mt-2">Bądź pierwszym, który przerwie milczenie.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const prevMsg = messages[index - 1];
            const sameAuthor = prevMsg?.senderId === msg.senderId;

            return (
              <motion.div 
                initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                key={msg.id} 
                className={`flex items-start gap-4 ${isMe ? 'flex-row-reverse' : ''} ${sameAuthor ? 'mt-1' : 'mt-6'}`}
              >
                {!sameAuthor && (
                  <UserAvatar 
                    userId={msg.senderId} 
                    username={msg.senderUsername} 
                    className="w-10 h-10 border border-gray-800"
                  />
                )}
                {sameAuthor && <div className="w-10" />}

                <div className={`max-w-[70%] sm:max-w-[60%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!sameAuthor && (
                    <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-1 px-1">
                      {msg.senderUsername}
                    </span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isMe 
                    ? 'bg-neon-blue text-black font-medium rounded-tr-none shadow-[0_4px_15px_rgba(0,242,255,0.2)]' 
                    : 'bg-gray-900 text-gray-200 border border-gray-800 rounded-tl-none'
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
      <div className="p-6 bg-bg-dark/50 backdrop-blur-md border-t border-gray-800">
        {!user ? (
          <div className="py-4 text-center bg-gray-900/50 border border-dashed border-gray-800 rounded-2xl">
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
              Zaloguj się, aby brać udział w rozmowie
            </p>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Terminal className="w-4 h-4 text-gray-500 group-focus-within:text-neon-blue transition-colors" />
            </div>
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Wpisz wiadomość..." 
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-12 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-blue/50 focus:ring-1 focus:ring-neon-blue/20 transition-all font-mono text-xs"
            />
            <button 
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute inset-y-0 right-2 px-4 flex items-center text-neon-blue hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
