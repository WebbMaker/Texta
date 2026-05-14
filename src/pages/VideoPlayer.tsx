import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { db } from '../lib/firebase';
import { doc, onSnapshot, updateDoc, increment, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Video } from '../types';
import { Heart, Eye, Calendar, Share2, MoreHorizontal, User, Play, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

export function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const [video, setVideo] = useState<Video | null>(null);
  const [recommendations, setRecommendations] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const viewCountedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!id || viewCountedRef.current === id) return;

    // Increment views once per mount for this specific ID
    updateDoc(doc(db, 'videos', id), {
      views: increment(1)
    }).catch(console.error);
    
    viewCountedRef.current = id;
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'videos', id), (docSnap) => {
      if (docSnap.exists()) {
        setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
      }
      setLoading(false);
    });

    // Fetch recommendations
    const fetchRecs = async () => {
      const q = query(collection(db, 'videos'), orderBy('views', 'desc'), limit(10));
      const snap = await getDocs(q);
      const list: Video[] = [];
      snap.forEach(d => {
        if (d.id !== id) list.push({ id: d.id, ...d.data() } as Video);
      });
      setRecommendations(list);
    };
    fetchRecs();

    return () => unsubscribe();
  }, [id]);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
     return (
       <div className="max-w-[1400px] mx-auto px-4 py-8 animate-pulse">
         <div className="aspect-video bg-gray-900 rounded-[2rem] mb-8" />
         <div className="h-8 bg-gray-900 rounded w-1/3 mb-4" />
         <div className="h-4 bg-gray-900 rounded w-1/4" />
       </div>
     );
  }

  if (!video) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <h2 className="text-2xl font-black text-white mb-4">NIE ZNALEZIONO TRANSMISJI</h2>
        <Link to="/videos" className="text-red-500 font-mono hover:underline">POWRÓT DO STRUMIENIA</Link>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Player Column */}
        <div className="lg:col-span-8">
          <div className="relative aspect-video rounded-[2.5rem] overflow-hidden bg-black shadow-2xl border border-gray-800 mb-8">
            {getYouTubeId(video.videoUrl) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(video.videoUrl)}?autoplay=1`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            ) : (
              <video
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            )}
          </div>

          <div className="px-2">
            <h1 className="text-3xl font-black tracking-tight text-white mb-6 uppercase leading-tight">
              {video.title}
            </h1>

            <div className="flex flex-wrap items-center justify-between gap-6 pb-8 border-b border-gray-800">
              <div className="flex items-center gap-6">
                <Link to={`/u/${video.authorUsername}`} className="flex items-center gap-3 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-gray-700 to-gray-900 rounded-2xl flex items-center justify-center border border-gray-700 group-hover:border-red-500 transition-colors overflow-hidden">
                    <User className="w-6 h-6 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-red-500 transition-colors uppercase">{video.authorUsername}</h3>
                    <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">Weryfikacja: OK</p>
                  </div>
                </Link>
                <button className="bg-white text-black px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-tighter hover:bg-gray-100 active:scale-95 transition-all">
                  Subskrybuj
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-surface border border-gray-800 rounded-2xl overflow-hidden">
                  <button 
                    onClick={() => updateDoc(doc(db, 'videos', video.id), { likes: increment(1) })}
                    className="flex items-center gap-2 px-6 py-3 hover:bg-gray-800 transition-colors text-white font-bold border-r border-gray-800"
                  >
                    <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                    <span>{video.likes}</span>
                  </button>
                  <button className="px-4 py-3 hover:bg-gray-800 transition-colors">
                    <Share2 className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <button className="bg-surface border border-gray-800 p-3 rounded-2xl hover:bg-gray-800 transition-colors">
                   <MoreHorizontal className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>

            <div className="mt-8 p-6 bg-surface border border-gray-800 rounded-3xl">
              <div className="flex items-center gap-6 font-mono text-[11px] text-gray-400 uppercase tracking-widest mb-4">
                <span className="flex items-center gap-2 font-bold text-white">
                  <Eye className="w-3 h-3 text-red-500" /> {video.views.toLocaleString()} wyświetleń
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="w-3 h-3" /> {new Date(video.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap font-medium">
                {video.description || 'Brak opisu dla tej transmisji.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Recommendations */}
        <div className="lg:col-span-4">
          <div className="flex items-center justify-between mb-6 px-2">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter">Polecane Transmisje</h2>
            <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center">
              <Play className="w-3 h-3 text-red-500" />
            </div>
          </div>

          <div className="space-y-6">
            {recommendations.map((rec) => (
              <Link key={rec.id} to={`/watch/${rec.id}`} className="flex gap-4 group">
                <div className="relative w-40 h-24 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-800 bg-black">
                  <img
                    src={rec.thumbnailUrl}
                    alt={rec.title}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all group-hover:scale-105 duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-current" />
                  </div>
                </div>
                <div className="flex-1 py-1">
                  <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-red-400 transition-colors mb-1">
                    {rec.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1">{rec.authorUsername}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-600 font-mono">
                    <span>{rec.views.toLocaleString()} wyśw.</span>
                    <span className="w-1 h-1 bg-gray-700 rounded-full" />
                    <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </Link>
            ))}

            <button className="w-full py-4 border border-gray-800 rounded-2xl text-[10px] font-mono text-gray-500 uppercase tracking-[0.2em] hover:bg-surface hover:text-white transition-all flex items-center justify-center gap-2 group">
              Załaduj więcej transmisji
              <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
