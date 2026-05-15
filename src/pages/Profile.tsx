import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, getDoc, setDoc, deleteDoc, addDoc, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { Post, UserProfile } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { UserPresence } from '../components/UserPresence';
import { PostCard } from '../components/PostCard';
import { EditProfileModal } from '../components/EditProfileModal';
import { MarkdownContent } from '../components/MarkdownContent';
import { TerminalSquare, Clock, Heart, UserPlus, Check, Clock3, ShieldCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router';

const POSTS_PER_PAGE = 10;

export function Profile() {
  const { username } = useParams<{ username: string }>();
  const { user, profile: myProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  
  const [isFriend, setIsFriend] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [hasReceivedRequest, setHasReceivedRequest] = useState(false);
  const [totalLikes, setTotalLikes] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

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

  const loadMorePosts = async () => {
    if (!lastDoc || loadingMore || !profile) return;
    
    setLoadingMore(true);
    try {
      const postsRef = collection(db, 'posts');
      const q = query(
        postsRef, 
        where('authorId', '==', profile.uid),
        orderBy('createdAt', 'desc'), 
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
    if (!username) return;

    let unsubscribeProfile: () => void;
    let unsubscribeFriend: () => void;
    let unsubscribeSentReq: () => void;
    let unsubscribeRecvReq: () => void;

    async function loadProfileAndPosts() {
      setLoading(true);
      setError('');
      setHasMore(true);
      try {
        const lowercaseUsername = username.toLowerCase();
        const usernamesRef = collection(db, 'usernames');
        const qUsername = query(usernamesRef, where('__name__', '==', lowercaseUsername));
        const usernameSnap = await getDocs(qUsername);

        if (usernameSnap.empty) {
          setError('User not found.');
          setLoading(false);
          return;
        }

        const userId = usernameSnap.docs[0].data().userId;
        const userRef = doc(db, 'users', userId);
        
        unsubscribeProfile = onSnapshot(userRef, (userSnap) => {
          if (userSnap.exists()) {
             setProfile({ uid: userSnap.id, ...userSnap.data() } as UserProfile);
          } else {
             setError('User profile is corrupted or missing.');
          }
        });

        // Fetch total likes
        const allPostsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', userId)));
        let sum = 0;
        allPostsSnap.forEach(d => sum += (d.data().upvoteCount || 0));
        setTotalLikes(sum);

        if (user && user.uid !== userId) {
           unsubscribeFriend = onSnapshot(doc(db, 'users', user.uid, 'friends', userId), (snap) => {
              setIsFriend(snap.exists());
           });
           unsubscribeSentReq = onSnapshot(doc(db, 'users', userId, 'friend_requests', user.uid), (snap) => {
              setHasSentRequest(snap.exists());
           });
           unsubscribeRecvReq = onSnapshot(doc(db, 'users', user.uid, 'friend_requests', userId), (snap) => {
              setHasReceivedRequest(snap.exists());
           });
        }

        // Initial posts fetch
        const postsRef = collection(db, 'posts');
        const qPosts = query(
          postsRef, 
          where('authorId', '==', userId), 
          orderBy('createdAt', 'desc'), 
          limit(POSTS_PER_PAGE)
        );
        
        const snapshot = await getDocs(qPosts);
        const newPosts: Post[] = [];
        snapshot.forEach((doc) => {
          newPosts.push({ id: doc.id, ...doc.data() } as Post);
        });
        setPosts(newPosts);
        setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
        if (snapshot.docs.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }
        setLoading(false);

      } catch (err: any) {
        console.error("Error loading profile:", err);
        setError(err.message || 'Failed to load profile');
        setLoading(false);
      }
    }

    loadProfileAndPosts();

    return () => {
      if (unsubscribeProfile) unsubscribeProfile();
      if (unsubscribeFriend) unsubscribeFriend();
      if (unsubscribeSentReq) unsubscribeSentReq();
      if (unsubscribeRecvReq) unsubscribeRecvReq();
    };
  }, [username, user]);

  const handleSendRequest = async () => {
    if (!user || !profile || !myProfile) return;
    try {
      await setDoc(doc(db, 'users', profile.uid, 'friend_requests', user.uid), {
         username: myProfile.username,
         createdAt: Date.now()
      });
    } catch(err) {
      console.error(err);
    }
  };

  const handleCancelRequest = async () => {
    if (!user || !profile) return;
    try {
      await deleteDoc(doc(db, 'users', profile.uid, 'friend_requests', user.uid));
    } catch(err) {
      console.error(err);
    }
  };

  const handleAcceptRequest = async () => {
    if (!user || !profile || !myProfile) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'friends', profile.uid), {
        username: profile.username,
        addedAt: Date.now()
      });
      await setDoc(doc(db, 'users', profile.uid, 'friends', user.uid), {
        username: myProfile.username,
        addedAt: Date.now()
      });
      await deleteDoc(doc(db, 'users', user.uid, 'friend_requests', profile.uid));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center p-8 text-neutral-500 font-mono">Ładowanie danych użytkownika...</div>;
  if (error || !profile) return <div className="text-center p-8 text-red-500 font-mono">Błąd: {error}</div>;

  const hoursSpent = Math.floor((profile.totalTimeSpent || 0) / 3600);
  const isOwnProfile = user?.uid === profile.uid;
  const themeColor = profile.themeColor || '#00f2ff';

  return (
    <div className="space-y-8">
      {showEditModal && <EditProfileModal onClose={() => setShowEditModal(false)} />}
      
      <div 
        className="bg-surface border border-gray-800 rounded-2xl p-8 relative overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
      >
        <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: themeColor }}></div>
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <TerminalSquare className="w-48 h-48" />
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div className="flex items-center gap-6">
            <UserAvatar 
                userId={profile.uid} 
                username={profile.username} 
                className="w-24 h-24 border-4 shadow-2xl"
                fallbackClassName="text-3xl bg-gray-800"
                style={{ borderColor: themeColor, boxShadow: `0 0 30px ${themeColor}40` }} 
            />
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-bold text-white tracking-tight">{profile.username}</h1>
                {profile.role === 'owner' && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 text-[10px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                    <ShieldCheck className="w-3 h-3" />
                    Zweryfikowany właściciel
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="font-mono text-sm" style={{ color: themeColor }}>
                  @{profile.username}
                </div>
                {isFriend && <UserPresence userId={profile.uid} />}
              </div>
              <div className="flex gap-4">
                 <div className="flex items-center gap-2 text-xs text-text-dim font-mono bg-bg-dark px-3 py-1.5 rounded-lg border border-gray-800">
                    <Heart className="w-4 h-4 text-neon-purple" /> {totalLikes} POLUBIEŃ
                 </div>
                 <div className="flex items-center gap-2 text-xs text-text-dim font-mono bg-bg-dark px-3 py-1.5 rounded-lg border border-gray-800">
                    <Clock className="w-4 h-4 text-neon-blue" /> {hoursSpent}h DOSTĘPNY
                 </div>
              </div>
            </div>
          </div>
          
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
             {isOwnProfile ? (
               <>
                  <button 
                    onClick={() => setShowEditModal(true)}
                    className="mt-4 sm:mt-0 bg-transparent border-2 border-gray-700 text-white px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest hover:border-gray-500 transition-colors"
                  >
                    Edytuj Profil
                  </button>
                  <button 
                    onClick={async () => {
                      await signOut();
                      navigate('/');
                    }}
                    className="mt-4 sm:mt-0 bg-red-500/10 border-2 border-red-500/50 text-red-500 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Wyloguj
                  </button>
               </>
             ) : user ? (
                 isFriend ? (
                   <>
                     <button 
                       disabled
                       className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all bg-gray-800 text-neon-blue border border-neon-blue/50"
                     >
                       <Check className="w-4 h-4" /> Znajomi
                     </button>
                     <button
                       onClick={async () => {
                          const snap = await getDocs(query(collection(db, 'conversations'), where('type', '==', 'direct'), where('participants', 'array-contains', user.uid)));
                          let convId = snap.docs.find(d => d.data().participants.includes(profile.uid))?.id;
                          if (!convId) {
                             const newRef = await addDoc(collection(db, 'conversations'), {
                               type: 'direct',
                               participants: [user.uid, profile.uid].sort(),
                               createdAt: Date.now(),
                               updatedAt: Date.now()
                             });
                             convId = newRef.id;
                          }
                          navigate('/messages'); // Wait, passing ID would be better, but we don't have URL support for it in Messages.tsx yet.
                       }}
                       className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all bg-neon-blue text-black hover:brightness-110 shadow-lg"
                     >
                       Wiadomość
                     </button>
                   </>
                 ) : hasReceivedRequest ? (
                   <button 
                     onClick={handleAcceptRequest}
                     className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all bg-neon-purple text-white hover:brightness-110 shadow-[0_0_15px_rgba(188,19,254,0.3)]"
                   >
                     <Check className="w-4 h-4" /> Akceptuj Zaproszenie
                   </button>
                 ) : hasSentRequest ? (
                   <button 
                     onClick={handleCancelRequest}
                     className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all bg-gray-800 text-gray-400 hover:text-white"
                   >
                     <Clock3 className="w-4 h-4" /> Wysłano
                   </button>
                 ) : (
                   <button 
                     onClick={handleSendRequest}
                     className="mt-4 sm:mt-0 flex items-center gap-2 px-6 py-2 rounded-xl font-bold uppercase text-sm tracking-widest transition-all bg-neon-purple text-white hover:brightness-110 shadow-[0_0_15px_rgba(188,19,254,0.3)]"
                   >
                     <UserPlus className="w-4 h-4" /> Dodaj do znajomych
                   </button>
                 )
             ) : null}
          </div>
        </div>

        {profile.bio && (
          <div className="border-l-2 pl-4 py-1 mb-4" style={{ borderColor: themeColor }}>
            <MarkdownContent content={profile.bio} className="text-lg" />
          </div>
        )}
        
        <div className="text-xs text-text-dim font-mono mt-6">
          DATA_DOŁĄCZENIA_DO_SYSTEMU: {new Date(profile.createdAt).toLocaleDateString()}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-sm font-bold text-text-dim tracking-widest uppercase font-mono pb-2 mb-6 border-b border-gray-800">
          Dziennik Transmisji
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center p-12 text-gray-500 border border-gray-800 border-dashed rounded-2xl font-mono">
            Nie przechwycono żadnych transmisji.
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
                --- KONIEC DZIENNIKA ---
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
