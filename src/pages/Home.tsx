import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Post } from '../types';
import { PostComposer } from '../components/PostComposer';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../contexts/AuthContext';

const POSTS_PER_PAGE = 15;

export function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortParam, setSortParam] = useState<'createdAt' | 'upvoteCount'>('createdAt');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const { profile } = useAuth();
  
  const observer = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading || loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMorePosts();
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, loadingMore, hasMore]);

  const fetchInitialPosts = async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(postsRef, orderBy(sortParam, 'desc'), limit(POSTS_PER_PAGE));
      const snapshot = await getDocs(q);
      
      const newPosts: Post[] = [];
      snapshot.forEach((doc) => {
        newPosts.push({ id: doc.id, ...doc.data() } as Post);
      });
      
      setPosts(newPosts);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      if (snapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!lastDoc || loadingMore) return;
    
    setLoadingMore(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef, 
        orderBy(sortParam, 'desc'), 
        startAfter(lastDoc), 
        limit(POSTS_PER_PAGE)
      );
      
      const snapshot = await getDocs(q);
      const newPosts: Post[] = [];
      snapshot.forEach((doc) => {
        newPosts.push({ id: doc.id, ...doc.data() } as Post);
      });
      
      setPosts(prev => [...prev, ...newPosts]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      
      if (snapshot.docs.length < POSTS_PER_PAGE) {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more posts:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchInitialPosts();
  }, [sortParam]);

  return (
    <div className="space-y-6">
      {profile && (
        <div className="mb-8">
          <PostComposer />
        </div>
      )}
      
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
