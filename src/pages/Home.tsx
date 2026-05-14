import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Post } from '../types';
import { PostComposer } from '../components/PostComposer';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';
import { AuthModal } from '../components/AuthModal';
import { Terminal, Globe, Zap, Youtube, ChevronRight } from 'lucide-react';
import { Link } from 'react-router';

const POSTS_PER_PAGE = 15;

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortParam, setSortParam] = useState<'createdAt' | 'upvoteCount'>('createdAt');
  const [limitCount, setLimitCount] = useState(POSTS_PER_PAGE);
  const [hasMore, setHasMore] = useState(true);
  const [authModal, setAuthModal] = useState<{ open: boolean, mode: 'login' | 'register' }>({ open: false, mode: 'login' });
  const { profile, user } = useAuth();
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setLimitCount(prev => prev + POSTS_PER_PAGE);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  useEffect(() => {
    setLoading(true);
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy(sortParam, 'desc'), limit(limitCount));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newPosts: Post[] = [];
      snapshot.forEach((doc) => {
        newPosts.push({ id: doc.id, ...doc.data() } as Post);
      });
      
      setPosts(newPosts);
      setLoading(false);
      setLoadingMore(false);
      
      if (snapshot.docs.length < limitCount) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }, (error) => {
      console.error("Error with posts snapshot:", error);
      setLoading(false);
      setLoadingMore(false);
    });

    return () => unsubscribe();
  }, [sortParam, limitCount]);

  useEffect(() => {
    // Reset limit when switching sort
    setLimitCount(POSTS_PER_PAGE);
  }, [sortParam]);

  return (
    <div className="space-y-6">
      {!user && (
        <div className="mb-12 p-8 sm:p-16 rounded-[var(--radius-ios-large)] relative overflow-hidden liquid-glass">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-neon-blue/10 blur-[120px] -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-neon-purple/10 blur-[120px] -ml-48 -mb-48" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <h1 className="text-4xl sm:text-7xl font-bold tracking-tight text-white mb-6 font-display">
              Witaj w <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">TEXTA</span>
            </h1>
            <p className="max-w-2xl text-white/60 text-lg sm:text-xl mb-12 font-medium leading-relaxed">
              Profesjonalne miejsce do dzielenia się myślami. <br className="hidden sm:block" /> Dołącz do naszej nowoczesnej społeczności.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto">
              <button 
                onClick={() => setAuthModal({ open: true, mode: 'register' })}
                className="w-full sm:w-auto px-12 py-4 bg-white text-black font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Dołącz teraz
              </button>
              <button 
                onClick={() => setAuthModal({ open: true, mode: 'login' })}
                className="w-full sm:w-auto px-12 py-4 bg-white/5 border border-white/10 text-white font-bold rounded-2xl hover:bg-white/10 transition-all backdrop-blur-md"
              >
                Zaloguj się
              </button>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div className="mb-8">
          <PostComposer />
        </div>
      )}



      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal(prev => ({ ...prev, open: false }))} 
        mode={authModal.mode} 
      />
      
      <div className="flex items-center justify-between mb-8 px-2">
        <h2 className="text-3xl font-black text-white tracking-tight font-display uppercase">Posty</h2>
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 backdrop-blur-md">
          <button 
            onClick={() => setSortParam('createdAt')}
            className={`px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider ${sortParam === 'createdAt' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Najnowsze
          </button>
          <button 
            onClick={() => setSortParam('upvoteCount')}
            className={`px-4 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-wider ${sortParam === 'upvoteCount' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
          >
            Popularne
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {loading ? (
          <div className="flex justify-center p-12 text-gray-500 tracking-widest text-sm animate-pulse">Ładowanie...</div>
        ) : posts.length === 0 ? (
          <div className="text-center p-12 text-gray-500 border border-gray-800 border-dashed rounded-2xl text-sm max-w-lg mx-auto">
            Brak postów do wyświetlenia. Bądź pierwszym, który coś napisze!
          </div>
        ) : (
          <>
            {posts.map((post, index) => (
              <div 
                key={post.id} 
                ref={index === posts.length - 1 ? lastPostElementRef : null}
              >
                <PostCard post={post} />
              </div>
            ))}
            
            {loadingMore && (
              <div className="flex justify-center p-8 text-gray-500 text-xs tracking-widest animate-pulse">
                Pobieranie...
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center p-8 text-gray-600 text-xs uppercase tracking-tighter">
                To już wszystko na dziś
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
