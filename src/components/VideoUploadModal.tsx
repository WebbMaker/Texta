import React, { useState } from 'react';
import { X, Upload, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VideoUploadModal({ isOpen, onClose }: VideoUploadModalProps) {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tags, setTags] = useState('');

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUrlChange = (val: string) => {
    setVideoUrl(val);
    const ytId = getYouTubeId(val);
    if (ytId) {
      setThumbnailUrl(`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !title || !videoUrl || !thumbnailUrl) return;

    setLoading(true);
    try {
      const videoRef = doc(collection(db, 'videos'));
      const parsedTags = tags.split(/[\s,]+/).filter(t => t.trim().length > 0).map(t => t.toLowerCase().replace(/^#/, ''));
      
      await setDoc(videoRef, {
        id: videoRef.id,
        authorId: user.uid,
        authorUsername: profile.username,
        title,
        description,
        videoUrl,
        thumbnailUrl,
        views: 0,
        likes: 0,
        createdAt: Date.now(),
        tags: parsedTags
      });

      // Update user profile to indicate they have a channel/videos
      await setDoc(doc(db, 'users', user.uid), {
        hasVideos: true
      }, { merge: true });

      onClose();
      setTitle('');
      setDescription('');
      setVideoUrl('');
      setThumbnailUrl('');
      setTags('');
    } catch (error) {
      console.error('Error uploading video:', error);
      alert('Błąd podczas wrzucania filmu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-bg-dark border border-gray-800 rounded-3xl overflow-hidden shadow-2xl"
          >
            <div className="h-2 w-full bg-gradient-to-r from-red-500 to-orange-500" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-red-500/10 rounded-xl text-red-500">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Wgraj Film</h2>
                  <p className="text-gray-500 font-mono text-xs">Udostępnij swoją wizję systemowi.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Tytuł Filmu</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Wprowadź tytuł..."
                    className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Opis</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisz swój film..."
                    className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-white h-24 resize-none focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Hashtagi (oddzielone spacją lub przecinkiem)</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="np. gaming, vlog, tech"
                    className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">URL Filmu ( YouTube lub .mp4 )</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        required
                        value={videoUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="Wklej link YouTube lub bezpośredni mp4"
                        className="w-full bg-surface border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white text-xs focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                    <p className="mt-2 text-[10px] text-gray-500 font-mono italic px-1">Obsługujemy linki YouTube (automatycznie pobieramy miniaturę) oraz linki bezpośrednie do plików wideo.</p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">URL Miniaturki</label>
                    <div className="relative">
                      <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        required
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full bg-surface border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white text-xs focus:outline-none focus:border-red-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 border border-gray-800 text-gray-400 font-bold rounded-xl hover:bg-gray-800 transition-all font-mono text-sm uppercase"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-4 bg-red-500 text-white font-black rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      PRZESYŁANIE...
                    </>
                  ) : (
                    'OPUBLIKUJ FILM'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
