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
import { ChevronLeft, Send, MessageSquare, Terminal, User, Clock } from 'lucide-react';
import { UserAvatar } from '../components/UserAvatar';
import { motion, AnimatePresence } from 'motion/react';

interface ForumPost {
  id: string;
  text: string;
  senderId: string;
  senderUsername: string;
  createdAt: any;
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
    setNewPost('');

    try {
      await addDoc(collection(db, 'forum_posts', topicId, 'messages'), {
        text: postContent,
        senderId: user.uid,
        senderUsername: profile.username,
        createdAt: serverTimestamp()
      });

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
      <Link to="/forum" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-[10px] uppercase tracking-widest px-2">
        <ChevronLeft className="w-4 h-4" /> Wróć do forum
      </Link>

      {/* Topic Header */}
      <div className="bg-surface/30 border border-gray-800 rounded-[2.5rem] p-8 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/5 rounded-full blur-3xl" />
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-4 pr-12">{topic?.title}</h1>
        <p className="text-gray-400 leading-relaxed mb-6 max-w-3xl">{topic?.description}</p>
        
        <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-800/50">
          <div className="flex items-center gap-2">
             <User className="w-4 h-4 text-gray-600" />
             <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Wątek rozpoczęty przez: <span className="text-neon-purple font-bold">{topic?.creatorUsername}</span></span>
          </div>
          <div className="flex items-center gap-2">
             <Clock className="w-4 h-4 text-gray-600" />
             <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{topic ? formatDate(topic.createdAt) : ''}</span>
          </div>
        </div>
      </div>

      {/* Discussion Area */}
      <div className="bg-surface/10 border border-gray-800 rounded-[2.5rem] overflow-hidden flex flex-col h-[600px]">
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide" ref={scrollRef}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="w-8 h-8 border-2 border-neon-purple border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-30">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p className="font-mono text-sm uppercase tracking-widest">Brak odpowiedzi</p>
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
                    className="w-12 h-12 border border-gray-800"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{post.senderUsername}</span>
                    <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">{formatDate(post.createdAt)}</span>
                  </div>
                  <div className="bg-surface border border-gray-800/50 rounded-2xl rounded-tl-none p-5 text-gray-200 leading-relaxed shadow-sm">
                    {post.text}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Input Area */}
        <div className="p-8 bg-bg-dark/50 backdrop-blur-md border-t border-gray-800">
          {!user ? (
            <div className="p-4 text-center bg-gray-900 border border-dashed border-gray-800 rounded-2xl">
              <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
                Zaloguj się, aby odpowiedzieć
              </p>
            </div>
          ) : (
            <form onSubmit={handleSendPost} className="relative group">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Terminal className="w-5 h-5 text-gray-500 group-focus-within:text-neon-purple transition-colors" />
              </div>
              <textarea 
                required
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Dodaj swoją odpowiedź..." 
                className="w-full bg-gray-900 border border-gray-800 rounded-3xl pl-14 pr-16 py-5 text-white placeholder:text-gray-600 focus:outline-none focus:border-neon-purple/50 focus:ring-1 focus:ring-neon-purple/20 transition-all font-mono text-sm h-16 min-h-[4rem] max-h-48 scrollbar-hide"
              />
              <button 
                type="submit"
                disabled={!newPost.trim()}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-neon-purple text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg disabled:opacity-30 disabled:grayscale"
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
