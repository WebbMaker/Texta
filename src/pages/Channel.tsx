import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, increment, collection, query, where, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile, Video } from '../types';
import { User, Eye, Heart, Users, Play, Edit3, Save, X, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

export function Channel() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [stats, setStats] = useState({ views: 0, likes: 0 });

  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    if (!username) return;

    const findUser = async () => {
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', username));
        const userSnap = await getDocs(q);
        if (!userSnap.empty) {
          setUid(userSnap.docs[0].id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error finding user:", error);
        setLoading(false);
      }
    };

    findUser();
  }, [username]);

  useEffect(() => {
    if (!uid) return;

    // Listen to profile changes
    const unsubscribeProfile = onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        const userData = { ...docSnap.data(), uid: docSnap.id } as UserProfile;
        setProfile(userData);
        if (!isEditingDescription) {
          setNewDescription(userData.channelDescription || '');
        }
      }
      setLoading(false);
    });

    // Listen to subscription status
    let unsubscribeSub = () => {};
    if (user) {
      const subRef = doc(db, 'users', uid, 'subscribers', user.uid);
      unsubscribeSub = onSnapshot(subRef, (subSnap) => {
        setIsSubscribed(subSnap.exists());
      });
    }

    // Fetch videos (doing this once or we could also listen)
    const fetchVideos = async () => {
      try {
        const videosQuery = query(collection(db, 'videos'), where('authorId', '==', uid));
        const videosSnap = await getDocs(videosQuery);
        const videosList: Video[] = [];
        let totalViews = 0;
        let totalLikes = 0;
        
        videosSnap.forEach(d => {
          const v = { id: d.id, ...d.data() } as Video;
          videosList.push(v);
          totalViews += (v.views || 0);
          totalLikes += (v.likes || 0);
        });
        
        setVideos(videosList.sort((a, b) => b.createdAt - a.createdAt));
        setStats({ views: totalViews, likes: totalLikes });
      } catch (error) {
        console.error("Error fetching videos:", error);
      }
    };

    fetchVideos();

    return () => {
      unsubscribeProfile();
      unsubscribeSub();
    };
  }, [uid, user]);

  const handleSubscribe = async () => {
    if (!user || !uid) return;
    if (user.uid === uid) return;

    const subRef = doc(db, 'users', uid, 'subscribers', user.uid);
    const channelRef = doc(db, 'users', uid);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        await updateDoc(channelRef, { subscribersCount: increment(-1) });
      } else {
        await setDoc(subRef, { subscribedAt: Date.now() });
        await updateDoc(channelRef, { subscribersCount: increment(1) });
      }
    } catch (error) {
      console.error("Error toggling subscription:", error);
    }
  };

  const handleSaveDescription = async () => {
    if (!uid || !user || user.uid !== uid) return;

    try {
      await updateDoc(doc(db, 'users', uid), {
        channelDescription: newDescription.slice(0, 150)
      });
      setIsEditingDescription(false);
    } catch (error) {
      console.error("Error saved description:", error);
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500 font-mono">Ładowanie kanału...</div>;
  }

  if (!profile) {
    return <div className="max-w-7xl mx-auto px-4 py-20 text-center text-gray-500 font-mono text-2xl font-black">KANAŁ NIE ODNALEZIONY</div>;
  }

  const isOwner = user?.uid === profile.uid;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center gap-12 mb-12">
        {/* Profile Pic */}
        <div className="relative group">
          <div className={`w-48 h-48 rounded-[3rem] bg-gradient-to-br from-gray-800 to-bg-dark border-4 overflow-hidden flex items-center justify-center shadow-2xl transition-transform duration-500 group-hover:scale-105 ${profile.role === 'owner' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'border-gray-800'}`}>
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
            ) : (
              <User className="w-20 h-20 text-gray-600" />
            )}
          </div>
        </div>

        {/* Info & Stats */}
        <div className="flex-1 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-6">
            <div className="flex flex-col gap-2 items-center md:items-start">
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic">
                {profile.username}
              </h1>
              {profile.role === 'owner' && (
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 text-xs font-black uppercase tracking-widest animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <ShieldCheck className="w-4 h-4" />
                  Zweryfikowany właściciel
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubscribe}
                disabled={isOwner}
                className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter transition-all flex items-center gap-2 ${
                  isSubscribed 
                    ? 'bg-gray-800 text-gray-400' 
                    : 'bg-white text-black hover:bg-gray-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                } ${isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubscribed ? <Check className="w-4 h-4" /> : null}
                {isSubscribed ? 'Subskrybujesz' : 'Subskrybuj'}
              </motion.button>
            </div>
          </div>

          <div className="flex flex-wrap justify-center md:justify-start gap-8 font-mono text-xs uppercase tracking-widest text-gray-500 mb-8">
            <div className="flex flex-col gap-1">
              <span className="text-white font-black text-2xl tracking-tighter italic flex items-center gap-2">
                <Users className="w-5 h-5 text-red-500" /> {profile.subscribersCount || 0}
              </span>
              <span>Subskrybentów</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white font-black text-2xl tracking-tighter italic flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" /> {stats.views.toLocaleString()}
              </span>
              <span>Wyświetleń łącznie</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-white font-black text-2xl tracking-tighter italic flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" /> {stats.likes.toLocaleString()}
              </span>
              <span>Polubień łącznie</span>
            </div>
          </div>

          {/* Channel Description */}
          <div className="max-w-xl">
            {isEditingDescription ? (
              <div className="space-y-4">
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  maxLength={150}
                  placeholder="Krótki opis kanału (max 150 znaków)..."
                  className="w-full bg-surface border border-gray-800 rounded-2xl p-4 text-white font-medium resize-none h-24 focus:border-blue-500 outline-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleSaveDescription} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase transition-transform active:scale-95">Zapisz</button>
                  <button onClick={() => setIsEditingDescription(false)} className="bg-gray-800 text-gray-400 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-transform active:scale-95">Anuluj</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-4">
                <p className="text-gray-400 text-sm italic font-medium">
                  {profile.channelDescription || 'Brak opisu kanału.'}
                </p>
                {isOwner && (
                  <button onClick={() => setIsEditingDescription(true)} className="p-2 hover:bg-gray-800 rounded-lg text-gray-600 hover:text-white transition-colors">
                    <Edit3 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent my-12" />

      {/* Videos Grid */}
      <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-8 italic flex items-center gap-4">
        <Play className="w-8 h-8 text-red-500" /> Filmy kanału
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {videos.map((video) => (
          <Link key={video.id} to={`/watch/${video.id}`} className="group block">
            <div className="aspect-video relative rounded-3xl overflow-hidden bg-surface border border-gray-800 mb-4">
              <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="p-4 bg-red-600 rounded-full scale-50 group-hover:scale-100 transition-transform duration-300 shadow-xl">
                  <Play className="w-8 h-8 text-white fill-current" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-black text-white line-clamp-2 uppercase tracking-tight group-hover:text-red-500 transition-colors">{video.title}</h3>
            <div className="flex items-center gap-4 mt-2 font-mono text-[10px] text-gray-500 uppercase tracking-widest">
              <span>{video.views.toLocaleString()} wyświetleń</span>
              <span>{new Date(video.createdAt).toLocaleDateString()}</span>
            </div>
          </Link>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-gray-600 font-mono text-sm uppercase tracking-[0.2em]">Ten kanał nie opublikował jeszcze żadnych filmów.</p>
        </div>
      )}
    </div>
  );
}
