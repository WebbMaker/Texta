import React, { useState, useEffect } from 'react';
import { X, Save, Video, Image as ImageIcon, Loader2, Trash2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { Video as VideoType } from '../types';
import { useNavigate } from 'react-router';

interface VideoEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoType;
}

export function VideoEditModal({ isOpen, onClose, video }: VideoEditModalProps) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(video.description);
  const [videoUrl, setVideoUrl] = useState(video.videoUrl);
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnailUrl);

  useEffect(() => {
    setTitle(video.title);
    setDescription(video.description);
    setVideoUrl(video.videoUrl);
    setThumbnailUrl(video.thumbnailUrl);
  }, [video]);

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
    const isOwner = profile?.role === 'owner';
    if (!user || (user.uid !== video.authorId && !isOwner) || !title || !videoUrl || !thumbnailUrl) return;

    setLoading(true);
    try {
      const videoRef = doc(db, 'videos', video.id);
      await updateDoc(videoRef, {
        title,
        description,
        videoUrl,
        thumbnailUrl,
      });
      onClose();
    } catch (error) {
      console.error('Error updating video:', error);
      alert('Błąd podczas edycji filmu.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const isOwner = profile?.role === 'owner';
    if (!user || (user.uid !== video.authorId && !isOwner)) return;
    if (!window.confirm('Czy na pewno chcesz usunąć ten film?')) return;
    
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'videos', video.id));
      onClose();
      navigate('/videos');
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Błąd podczas usuwania filmu.');
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
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-500" />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <form onSubmit={handleSubmit} className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500">
                    <Save className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tighter text-white uppercase">Edytuj Film</h2>
                    <p className="text-gray-500 font-mono text-xs">Zaktualizuj dane w systemie.</p>
                  </div>
                </div>
                {(user?.uid === video.authorId || profile?.role === 'owner') && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Usuń film"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
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
                    className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">Opis</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opisz swój film..."
                    className="w-full bg-surface border border-gray-800 rounded-xl px-4 py-3 text-white h-24 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">URL Filmu</label>
                    <div className="relative">
                      <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="url"
                        required
                        value={videoUrl}
                        onChange={(e) => handleUrlChange(e.target.value)}
                        placeholder="Wklej link YouTube lub bezpośredni mp4"
                        className="w-full bg-surface border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
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
                        className="w-full bg-surface border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white text-xs focus:outline-none focus:border-blue-500 transition-colors"
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
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-xl hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      ZAPISYWANIE...
                    </>
                  ) : (
                    'ZAPISZ ZMIANY'
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
