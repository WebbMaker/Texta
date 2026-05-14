import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Video } from '../types';
import { Link } from 'react-router';
import { Play, Eye, Calendar, Plus, Youtube } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { VideoUploadModal } from '../components/VideoUploadModal';
import { motion } from 'motion/react';

export function Videos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'videos'), orderBy('createdAt', 'desc'), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vidList: Video[] = [];
      snapshot.forEach(doc => vidList.push({ id: doc.id, ...doc.data() } as Video));
      setVideos(vidList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString();
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-red-600 rounded-3xl flex items-center justify-center shadow-[0_0_30px_rgba(220,38,38,0.4)]">
            <Youtube className="w-8 h-8 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-4xl font-black tracking-tight text-white uppercase">Filmy</h1>
              <span className="bg-red-600/10 text-red-500 text-[10px] font-mono px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest font-bold">Beta</span>
            </div>
            <p className="text-gray-500 font-mono text-sm tracking-widest uppercase">Zentralizowany strumień wizualny</p>
          </div>
        </div>

        {user && (
          <button
            onClick={() => setIsUploadOpen(true)}
            className="group flex items-center gap-3 bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-tighter hover:bg-gray-100 transition-all shadow-xl"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            WGRAJ NOWY FILM
          </button>
        )}
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
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-24 h-24 bg-gray-900 border border-gray-800 rounded-full flex items-center justify-center mb-6">
            <Play className="w-8 h-8 text-gray-700" />
          </div>
          <h3 className="text-xl font-bold text-gray-400 mb-2 uppercase">Brak transmisji wideo</h3>
          <p className="text-gray-600 max-w-xs font-mono text-xs">
            System nie wykrył żadnych aktywnych kanałów wideo. Bądź operatorem pierwszego strumienia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={video.id}
              className="group cursor-pointer"
            >
              <Link to={`/watch/${video.id}`}>
                <div className="relative aspect-video rounded-3xl overflow-hidden mb-4 border border-gray-800 bg-black group-hover:border-red-500 transition-colors shadow-lg">
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
                  <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-[10px] font-mono font-bold text-white uppercase tracking-widest border border-white/10">
                    HD
                  </div>
                </div>

                <div className="px-1">
                  <h3 className="text-lg font-bold text-white line-clamp-2 leading-snug group-hover:text-red-400 transition-colors mb-2">
                    {video.title}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs text-gray-400 font-medium hover:text-white transition-colors">
                      {video.authorUsername}
                    </span>
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
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <VideoUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
