import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  updateDoc 
} from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { ChevronLeft, Send, MessageSquare, Terminal, User, Clock, Reply, X } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';

interface ForumPost {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
  replyTo?: {
     messageId: string;
     text: string;
     senderUsername: string;
  };
}

interface ForumTopic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  createdAt: any;
}

export function TopicDetail() {
  const { topicId } = useParams<{ topicId: string }>();
  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [replyingTo, setReplyingTo] = useState<ForumPost | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, profile } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!topicId) return;

    const fetchTopic = async () => {
      const docRef = doc(db, 'forum_topics', topicId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setTopic({ id: docSnap.id, ...docSnap.data() } as ForumTopic);
      }
    };

    fetchTopic();

    const q = query(
      collection(db, 'forum_posts', topicId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ps: ForumPost[] = [];
      snapshot.forEach(doc => {
        ps.push({ id: doc.id, ...doc.data() } as ForumPost);
      });
      setPosts(ps);
      setLoading(false);
      
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [topicId]);

  const handleSendPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim() || !user || !profile || !topicId) return;

    const postContent = newPost.trim();
    const currentReply = replyingTo;
    
    setNewPost('');
    setReplyingTo(null);

    try {
      const msgData: any = {
        text: postContent,
        senderId: user.uid,
        senderUsername: profile.username,
        createdAt: serverTimestamp()
      };
      
      if (currentReply) {
        msgData.replyTo = {
          messageId: currentReply.id,
          text: currentReply.text,
          senderUsername: currentReply.senderUsername
        };
      }

      await addDoc(collection(db, 'forum_posts', topicId, 'messages'), msgData);

      // Update last activity in topic
      await updateDoc(doc(db, 'forum_topics', topicId), {
        lastActivity: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending post:', error);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '...';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString();
  };

  if (!topic && !loading) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-white uppercase">Temat nie odnaleziony</h2>
        <Link to="/forum" className="text-neon-purple mt-4 inline-block underline">Wróć do forum</Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back button */}
      <Link to="/forum" className="inline-flex items-center gap-2 text-white/40 hover:text-white transition-colors font-semibold text-[10px] uppercase tracking-widest px-2">
        <ChevronLeft className="w-4 h-4" /> Wróć do forum
      </Link>

      {/* Topic Header */}
      <div className="liquid-glass rounded-[var(--radius-ios-large)] p-8 relative overflow-hidden">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-4 pr-12 font-display">{topic?.title}</h1>
        <p className="text-white/60 leading-relaxed mb-6 max-w-3xl font-medium">{topic?.description}</p>
        
        <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
             <UserAvatar userId={topic?.creatorId || ''} username={topic?.creatorUsername || ''} className="w-5 h-5 border border-white/10" />
             <span className="text-xs text-white/40">Autor: <span className="text-white font-bold">{topic?.creatorUsername}</span></span>
          </div>
          <div className="flex items-center gap-2">
             <Clock className="w-4 h-4 text-white/20" />
             <span className="text-xs text-white/40 font-medium">{topic ? formatDate(topic.createdAt) : ''}</span>
          </div>
        </div>
      </div>

      {/* Discussion Area */}
      <div className="liquid-glass rounded-[var(--radius-ios-large)] overflow-hidden flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide" ref={scrollRef}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="text-sm font-semibold uppercase tracking-widest">Brak odpowiedzi</p>
              <p className="text-xs mt-2">Przerwij ciszę jako pierwszy!</p>
            </div>
          ) : (
            posts.map((post) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={post.id} 
                className="flex gap-6"
              >
                <div className="flex-shrink-0">
                  <UserAvatar 
                    userId={post.senderId} 
                    username={post.senderUsername} 
                    className="w-12 h-12 border border-white/10 shadow-sm"
                  />
                </div>
                <div className="flex-1 min-w-0 relative group/msg">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-bold text-white uppercase tracking-wider">{post.senderUsername}</span>
                    <span className="text-[10px] font-medium text-white/20 uppercase tracking-widest">{formatDate(post.createdAt)}</span>
                  </div>
                  
                  {/* Reply button on hover */}
                  <button
                     onClick={() => setReplyingTo(post)}
                     title="Odpowiedz"
                     className="absolute top-1 right-2 p-1.5 bg-black/40 hover:bg-black/80 rounded-full text-white/70 hover:text-white backdrop-blur-md opacity-0 group-hover/msg:opacity-100 transition-all z-10"
                   >
                      <Reply className="w-4 h-4" />
                  </button>

                  <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-5 text-white/90 leading-relaxed backdrop-blur-sm shadow-sm">
                    {post.replyTo && (
                      <div className="flex items-center gap-2 mb-3 pl-3 border-l-2 border-white/30 text-[12px] opacity-70">
                        <Reply className="w-3 h-3 shrink-0" />
                        <div className="flex-1 truncate">
                          <span className="font-bold mr-1">{post.replyTo.senderUsername === profile?.username ? 'Ty' : post.replyTo.senderUsername}</span>
                          {post.replyTo.text}
                        </div>
                      </div>
                    )}
                    {post.text}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-white/5 backdrop-blur-xl border-t border-white/5 flex flex-col">
          {replyingTo && (
            <div className="mb-4 bg-white/5 rounded-xl p-3 pb-2 flex items-start gap-3 relative border border-white/10 w-full mb-4">
              <Reply className="w-4 h-4 mt-0.5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-white/60 mb-0.5">
                  Odpowiedź do: {replyingTo.senderId === user?.uid ? 'Ty' : replyingTo.senderUsername}
                </p>
                <p className="text-[13px] text-gray-300 truncate">
                  {replyingTo.text}
                </p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white absolute top-2 right-2">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!user ? (
            <div className="p-4 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
              <p className="text-xs font-semibold text-white/30 uppercase tracking-widest">
                Zaloguj się, aby odpowiedzieć
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendPost} className="relative group">
              <textarea 
                required
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Dodaj swoją odpowiedź..." 
                className="w-full bg-white/5 border border-white/10 rounded-[24px] px-6 py-5 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/10 transition-all text-sm h-16 min-h-[4rem] max-h-48 scrollbar-hide"
              />
              <button 
                type="submit"
                disabled={!newPost.trim()}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
