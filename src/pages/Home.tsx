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
        <div className="mb-12 p-8 sm:p-12 bg-surface border border-gray-800 rounded-[2rem] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-neon-blue/5 blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-purple/5 blur-[100px] -ml-32 -mb-32" />
          
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="flex items-center gap-4 mb-6">
               <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                  <Terminal className="w-6 h-6 text-neon-blue" />
               </div>
               <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                  <Globe className="w-6 h-6 text-neon-purple" />
               </div>
               <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                  <Zap className="w-6 h-6 text-yellow-400" />
               </div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-white mb-6 uppercase">
              Witaj w <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">TEXTA</span>
            </h1>
            <p className="max-w-xl text-gray-400 text-lg mb-10 font-mono">
              Miejsce, gdzie Twoje słowa mają znaczenie. <br className="hidden sm:block" /> Dołącz do społeczności przyszłości.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button 
                onClick={() => setAuthModal({ open: true, mode: 'register' })}
                className="w-full sm:w-auto px-10 py-4 bg-neon-blue text-black font-black uppercase tracking-widest rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,242,255,0.3)]"
              >
                Zarejestruj się
              </button>
              <button 
                onClick={() => setAuthModal({ open: true, mode: 'login' })}
                className="w-full sm:w-auto px-10 py-4 border border-gray-700 text-white font-black uppercase tracking-widest rounded-xl hover:bg-gray-800 transition-all font-mono"
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

      <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
        <Link 
          to="/videos"
          className="flex-1 sm:flex-none group flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)]"
        >
          <Youtube className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Obejrzyj Filmy
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal(prev => ({ ...prev, open: false }))} 
        mode={authModal.mode} 
      />
      
      <div className="flex border-b border-gray-800 mb-6 font-mono text-sm">
        <button 
          onClick={() => setSortParam('createdAt')}
          className={`pb-3 px-4 ${sortParam === 'createdAt' ? 'text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
        >
          NAJNOWSZE
        </button>
        <button 
          onClick={() => setSortParam('upvoteCount')}
          className={`pb-3 px-4 ${sortParam === 'upvoteCount' ? 'text-neon-purple border-b-2 border-neon-purple' : 'text-gray-500 hover:text-white'}`}
        >
          POPULARNE
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center p-12 text-gray-500 font-mono tracking-widest text-sm animate-pulse">ŁADOWANIE_SYSTEMU...</div>
        ) : posts.length === 0 ? (
          <div className="text-center p-12 text-gray-500 border border-gray-800 border-dashed rounded-2xl font-mono text-sm max-w-lg mx-auto">
            Nie znaleziono aktywnych węzłów. Bądź pierwszym, który prześle transmisję.
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
              <div className="flex justify-center p-8 text-gray-500 font-mono text-xs tracking-widest animate-pulse">
                POBIERANIE_DODATKOWYCH_DANYCH...
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center p-8 text-gray-600 font-mono text-xs uppercase tracking-tighter">
                --- OSIĄGNIĘTO KONIEC STRUMIENIA ---
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
