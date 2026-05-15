import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { Video, UserProfile } from '../types';
import { Link } from 'react-router';
import { Play, Eye, Calendar, Plus, Youtube, Search, X, Filter, Users, Film, SlidersHorizontal, Hash } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { VideoUploadModal } from '../components/VideoUploadModal';
import { motion, AnimatePresence } from 'motion/react';
import Fuse from 'fuse.js';

export function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [channels, setChannels] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'videos' | 'channels'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Listen to videos
    const qVideos = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeVideos = onSnapshot(qVideos, (snapshot) => {
      const vidList: Video[] = [];
      snapshot.forEach(doc => vidList.push({ id: doc.id, ...doc.data() } as Video));
      setVideos(vidList);
      setLoading(false);
    });

    // Fetch users who are known to have videos
    const fetchChannels = async () => {
      try {
        const qUsers = query(
          collection(db, 'users'), 
          where('hasVideos', '==', true),
          limit(50)
        );
        const snapUsers = await getDocs(qUsers);
        const chanList: UserProfile[] = [];
        snapUsers.forEach(doc => {
          const data = doc.data() as UserProfile;
          if (data.username) {
            chanList.push({ uid: doc.id, ...data });
          }
        });
        setChannels(chanList);
      } catch (err) {
        console.error("Error fetching channels:", err);
      }
    };
    fetchChannels();

    return () => unsubscribeVideos();
  }, []);

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) {
      return videos.sort((a, b) => b.createdAt - a.createdAt);
    }

    const fuse = new Fuse(videos, {
      keys: [
        { name: 'title', weight: 0.5 },
        { name: 'authorUsername', weight: 0.3 },
        { name: 'tags', weight: 0.4 },
        { name: 'description', weight: 0.1 }
      ],
      threshold: 0.4,
      includeScore: true,
      useExtendedSearch: true
    });

    const results = fuse.search(searchQuery);
    
    // Sort by: priority to match score, then popularity (views)
    return results
      .sort((a, b) => {
        const scoreA = a.score || 0;
        const scoreB = b.score || 0;
        
        // If scores are very close, boost by views
        if (Math.abs(scoreA - scoreB) < 0.1) {
          return (b.item.views || 0) - (a.item.views || 0);
        }
        return scoreA - scoreB;
      })
      .map(r => r.item);
  }, [videos, searchQuery]);

  const filteredChannels = useMemo(() => {
    if (!searchQuery.trim()) return [];

    // Combine channels from DB with active authors from loaded videos
    const activeAuthorsMap = new Map<string, string>();
    videos.forEach(v => activeAuthorsMap.set(v.authorId, v.authorUsername));
    
    // Create temporary profiles for authors found in videos but not in channels list
    const combinedChannels = [...channels];
    activeAuthorsMap.forEach((username, uid) => {
      if (!combinedChannels.find(c => c.uid === uid)) {
        combinedChannels.push({ uid, username } as UserProfile);
      }
    });

    const fuse = new Fuse(combinedChannels, {
      keys: ['username', 'bio', 'channelDescription'],
      threshold: 0.3
    });

    return fuse.search(searchQuery).map(r => r.item);
  }, [channels, searchQuery, videos]);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString();
  };

  const hasSearch = searchQuery.trim().length > 0;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header & Search */}
      <div className="flex flex-col gap-8 mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)]">
              <Youtube className="w-8 h-8 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-4xl font-black tracking-tight text-white uppercase">Filmy</h1>
                <span className="bg-red-600/10 text-red-500 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest font-bold">Beta</span>
              </div>
              <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Oglądaj komentuj i Polubiaj filmy!</p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-96 group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Wyszukaj filmy, kanały lub #tagi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-12 py-3.5 text-white placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-all font-mono text-xs"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-4 flex items-center text-gray-500 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3.5 rounded-2xl border transition-all ${showFilters ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'}`}
            >
              <SlidersHorizontal className="w-5 h-5" />
            </button>
            {user && (
              <button
                onClick={() => setIsUploadOpen(true)}
                className="group flex items-center gap-3 bg-white text-black px-8 py-3.5 rounded-2xl font-black uppercase tracking-tighter hover:bg-gray-100 transition-all shadow-xl hidden lg:flex"
              >
                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                WGRAJ
              </button>
            )}
          </div>
        </div>

        {/* Filters Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-3 p-1">
                <button 
                  onClick={() => setActiveFilter('all')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeFilter === 'all' ? 'bg-white text-black' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700'}`}
                >
                  <Filter className="w-3 h-3" /> Wszystko
                </button>
                <button 
                  onClick={() => setActiveFilter('videos')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeFilter === 'videos' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700'}`}
                >
                  <Film className="w-3 h-3" /> Filmy
                </button>
                <button 
                  onClick={() => setActiveFilter('channels')}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold uppercase transition-all ${activeFilter === 'channels' ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-900 text-gray-400 border border-gray-800 hover:border-gray-700'}`}
                >
                  <Users className="w-3 h-3" /> Kanały
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-video bg-gray-800 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (activeFilter === 'all' || activeFilter === 'channels') && hasSearch && filteredChannels.length > 0 ? (
        <div className="mb-12">
          <h2 className="text-xs font-mono text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" /> Znalezione kanały
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChannels.map(channel => (
              <Link to={`/channel/${channel.username}`} key={channel.uid} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-900/50 border border-white/5 hover:border-blue-500/50 transition-all group">
                <div className="w-16 h-16 rounded-full bg-gray-800 overflow-hidden border border-white/5 group-hover:scale-105 transition-transform">
                  {channel.avatarUrl ? (
                    <img src={channel.avatarUrl} alt={channel.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-600">
                      {channel.username.substring(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">{channel.username}</h3>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-tighter truncate">
                    {channel.subscribersCount || 0} subskrybentów
                  </p>
                </div>
              </Link>
            ))}
          </div>
          <div className="h-px bg-gray-800 my-12" />
        </div>
      ) : null}

      {!loading && (
        <>
          {(activeFilter === 'all' || activeFilter === 'videos') && (
            <div>
              {hasSearch && (
                <h2 className="text-xs font-mono text-gray-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <Film className="w-4 h-4" /> Wyniki wyszukiwania wideo
                </h2>
              )}
              {filteredVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="w-24 h-24 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mb-6">
                    <X className="w-8 h-8 text-gray-700" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-400 mb-2 uppercase">Nie znaleziono filmów</h3>
                  <p className="text-gray-600 max-w-xs font-mono text-xs">
                    Spróbuj innych słów kluczowych lub sprawdź filtry.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredVideos.map((video) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={video.id}
                      className="group"
                    >
                      <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 border border-gray-800 bg-black group-hover:border-red-500 transition-colors shadow-lg">
                        <Link to={`/watch/${video.id}`} className="block w-full h-full">
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                              <Play className="w-6 h-6 text-white ml-1 fill-current" />
                            </div>
                          </div>
                        </Link>
                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-[10px] font-mono font-bold text-white uppercase tracking-widest border border-white/10">
                          HD
                        </div>
                      </div>

                      <div className="px-1">
                        <Link to={`/watch/${video.id}`}>
                          <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mb-2">
                            {video.title}
                          </h3>
                        </Link>
                        
                        {/* Tags */}
                        {video.tags && video.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {video.tags.slice(0, 3).map(tag => (
                              <button 
                                key={tag} 
                                onClick={() => setSearchQuery(tag)}
                                className="text-[9px] font-bold text-red-500 hover:text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter"
                              >
                                #{tag}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col gap-1">
                          <Link to={`/channel/${video.authorUsername}`} className="text-xs text-gray-400 font-medium hover:text-white transition-colors">
                            {video.authorUsername}
                          </Link>
                          <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 uppercase tracking-tighter">
                            <span className="flex items-center gap-1">
                               <Eye className="w-3 h-3" /> {video.views} wyświetleń
                            </span>
                            <span className="flex items-center gap-1">
                               <Calendar className="w-3 h-3" /> {formatDate(video.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <VideoUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
