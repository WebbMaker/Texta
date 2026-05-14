import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ImageUploadButton } from './ImageUploadButton';
import { X } from 'lucide-react';

interface EditProfileModalProps {
  onClose: () => void;
}

export function EditProfileModal({ onClose }: EditProfileModalProps) {
  const { user, profile } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [themeColor, setThemeColor] = useState(profile?.themeColor || '#00f2ff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    setIsSubmitting(true);
    setError('');

    try {
      const updates: any = {};
      
      if (bio.trim() !== (profile.bio || '')) {
         if (bio.length > 160) throw new Error("Opis jest zbyt długi");
         updates.bio = bio.trim();
      }
      if (avatarUrl.trim() !== (profile.avatarUrl || '')) {
         updates.avatarUrl = avatarUrl.trim();
      }
      if (themeColor !== (profile.themeColor || '')) {
         updates.themeColor = themeColor;
      }

      if (Object.keys(updates).length > 0) {
        await updateDoc(doc(db, 'users', user.uid), updates);
      }
      
      onClose();
    } catch (err: any) {
      setError(err.message || "Nie udało się zaktualizować profilu");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="bg-surface p-8 rounded-2xl max-w-md w-full border border-gray-800 shadow-[0_0_30px_rgba(0,242,255,0.1)] relative">
        <h2 className="text-2xl font-bold text-white mb-6">EDYCJA_PROFILU</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">AWATAR</label>
            <div className="flex items-center gap-4 mb-2">
               {avatarUrl ? (
                 <div className="relative">
                   <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-gray-700" />
                   <button 
                     type="button" 
                     onClick={() => setAvatarUrl('')}
                     className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-400"
                   >
                     <X className="w-3 h-3" />
                   </button>
                 </div>
               ) : (
                 <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center border-2 border-dashed border-gray-600">
                    <ImageUploadButton onImageSelected={setAvatarUrl} />
                 </div>
               )}
               <div className="flex-1 text-xs text-gray-500">Kliknij wyżej lub wklej link do zdjęcia:</div>
            </div>
            <input 
              type="text" 
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-bg-dark border-2 border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-neon-blue font-mono text-white"
            />
          </div>
          <div>
             <label className="block text-xs font-mono text-gray-400 mb-2">O MNIE</label>
             <textarea 
               value={bio}
               onChange={(e) => setBio(e.target.value)}
               maxLength={160}
               className="w-full bg-bg-dark border-2 border-gray-800 rounded-xl px-4 py-3 outline-none focus:border-neon-blue resize-none h-24 font-mono text-white"
             />
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-2">KOLOR_MOTYWU</label>
            <input 
              type="color" 
              value={themeColor}
              onChange={(e) => setThemeColor(e.target.value)}
              className="w-full h-12 rounded-lg cursor-pointer bg-transparent"
            />
          </div>
          {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
          <div className="flex justify-end gap-4 mt-6">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 rounded-lg font-bold uppercase text-gray-400 hover:text-white transition-colors"
            >
              Anuluj
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-neon-blue text-black font-bold tracking-widest uppercase px-6 py-2 rounded-xl transition-all hover:brightness-110 disabled:opacity-50"
            >
              {isSubmitting ? '...' : 'ZAPISZ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
