import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Plus, MessageSquare, Clock, User, X, ChevronRight, Library } from 'lucide-react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

interface ForumTopic {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  createdAt: any;
  lastActivity: any;
}

export function Forum() {
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user, profile } = useAuth();

  // Create Topic State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'forum_topics'),
      orderBy('lastActivity', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ts: ForumTopic[] = [];
      snapshot.forEach(doc => {
        ts.push({ id: doc.id, ...doc.data() } as ForumTopic);
      });
      setTopics(ts);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !title.trim()) return;

    try {
      await addDoc(collection(db, 'forum_topics'), {
        title: title.trim(),
        description: description.trim(),
        creatorId: user.uid,
        creatorUsername: profile.username,
        createdAt: serverTimestamp(),
        lastActivity: serverTimestamp()
      });
      setTitle('');
      setDescription('');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error creating topic:', error);
    }
  };

  const formatDate = (ts: any) => {
    if (!ts) return '...';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-surface/30 p-8 rounded-[2.5rem] border border-gray-800 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-neon-purple/10 border border-neon-purple/20 rounded-3xl flex items-center justify-center">
            <Library className="w-8 h-8 text-neon-purple" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Forum Społeczności</h1>
            <p className="text-xs font-mono text-gray-500 uppercase tracking-widest mt-1">Dyskutuj, twórz, wymieniaj się doświadczeniami</p>
          </div>
        </div>

        {user && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-3 px-8 py-4 bg-neon-purple text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(157,0,255,0.3)]"
          >
            <Plus className="w-5 h-5" />
            Nowy Temat
          </button>
        )}
      </div>

      {/* Grid of Topics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {topics.map((topic) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={topic.id}
            >
              <Link 
                to={`/forum/topic/${topic.id}`}
                className="group flex flex-col h-full bg-surface border border-gray-800 rounded-3xl p-6 hover:border-neon-purple/50 transition-all relative overflow-hidden"
              >
                {/* Glow effect */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-neon-purple/5 rounded-full blur-3xl group-hover:bg-neon-purple/10 transition-colors" />
                
                <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2 group-hover:text-neon-purple transition-colors line-clamp-2">
                  {topic.title}
                </h2>
                
                <p className="text-sm text-gray-400 leading-relaxed mb-6 line-clamp-3">
                  {topic.description || 'Brak opisu dla tego tematu...'}
                </p>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between pt-4 border-t border-gray-800/50">
                    <div className="flex items-center gap-2">
                      <User className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{topic.creatorUsername}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-gray-600" />
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">{formatDate(topic.lastActivity)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center py-2 bg-gray-900/50 rounded-xl group-hover:bg-neon-purple/10 transition-colors">
                    <span className="text-[10px] font-mono font-bold text-gray-500 group-hover:text-neon-purple uppercase tracking-widest flex items-center gap-2">
                      Otwórz dyskusję <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-neon-purple border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && topics.length === 0 && (
        <div className="text-center py-20 bg-surface/20 border border-dashed border-gray-800 rounded-[2.5rem]">
          <MessageSquare className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-mono uppercase tracking-widest">Nikt jeszcze nic nie napisał...</p>
          <p className="text-xs text-gray-600 mt-2">Bądź pierwszy i załóż nowy temat!</p>
        </div>
      )}

      {/* Create Topic Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-xl bg-bg-dark border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="p-8 border-b border-gray-800 bg-surface/50 flex items-center justify-between">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Utwórz Nowy Temat</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-500 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTopic} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Tytuł Tematu</label>
                  <input 
                    required
                    type="text" 
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Wpisz coś chwytliwego..."
                    className="w-full bg-surface border border-gray-800 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-neon-purple transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] mb-2 px-1">Krótki Opis</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="O czym będziemy rozmawiać?"
                    className="w-full bg-surface border border-gray-800 rounded-2xl px-6 py-4 text-white h-32 resize-none focus:outline-none focus:border-neon-purple transition-all"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 border border-gray-800 text-gray-500 font-bold uppercase tracking-widest rounded-2xl hover:bg-gray-800 transition-all font-mono text-xs"
                  >
                    Anuluj
                  </button>
                  <button 
                    type="submit"
                    disabled={!title.trim()}
                    className="flex-1 py-4 bg-neon-purple text-black font-black uppercase tracking-widest rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(157,0,255,0.2)] disabled:opacity-50 disabled:grayscale"
                  >
                    Opublikuj
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
