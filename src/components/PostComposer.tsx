import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ImageUploadButton } from './ImageUploadButton';
import { X } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export function PostComposer() {
  const { user, profile } = useAuth();
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const MAX_CHARS = 500;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || (!content.trim() && !imageUrl) || content.length > MAX_CHARS) return;

    const postContent = content.trim();
    const mediaUrl = imageUrl;

    setIsSubmitting(true);
    setError('');
    
    // Clear UI immediately
    setContent('');
    setImageUrl(null);

    try {
      const newPostRef = doc(collection(db, 'posts'));
      const postData: any = {
        authorId: user.uid,
        authorUsername: profile.username,
        content: postContent,
        createdAt: Date.now(),
        upvoteCount: 0,
        downvoteCount: 0,
        commentsCount: 0
      };
      if (mediaUrl) {
        postData.imageUrl = mediaUrl;
      }
      await setDoc(newPostRef, postData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to post');
      // Restore on error
      setContent(postContent);
      setImageUrl(mediaUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-12">
      <form onSubmit={handleSubmit} className="relative group">
        <div className={`w-full liquid-glass rounded-[var(--radius-ios-large)] p-6 overflow-hidden focus-within:ring-2 focus-within:ring-white/10 transition-all flex flex-col ${imageUrl ? 'min-h-[250px]' : ''}`}>
          <div className="flex gap-4 mb-4">
            <UserAvatar userId={user?.uid || ''} username={profile?.username || ''} className="w-10 h-10 border border-white/10" />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Co nowego, ${profile?.username || 'użytkowniku'}?`}
              className="w-full bg-transparent text-white placeholder-white/30 focus:outline-none resize-none pt-2 text-lg font-display font-medium tracking-tight"
              disabled={isSubmitting}
            />
          </div>

          {imageUrl && (
            <div className="relative mt-2 inline-block self-start group/img">
               <img src={imageUrl} alt="preview" className="max-h-64 rounded-2xl object-contain border border-white/10 bg-white/5" />
               <button 
                 type="button" 
                 onClick={() => setImageUrl(null)} 
                 className="absolute top-2 right-2 bg-red-500 text-white rounded-xl p-2 hover:bg-red-400 transition-colors shadow-xl"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}
          <div className="h-16"></div>
        </div>
        
        <div className="absolute bottom-6 right-6 left-6 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
             <ImageUploadButton onImageSelected={setImageUrl} />
             {error && <span className="text-red-400 text-xs">{error}</span>}
          </div>
          
          <div className="flex items-center gap-6 pointer-events-auto">
            <span className={`text-xs ${content.length > MAX_CHARS ? 'text-red-400' : 'text-white/40'}`}>
              {content.length} / {MAX_CHARS}
            </span>
            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageUrl) || content.length > MAX_CHARS || !profile}
              className="px-8 py-3 bg-white text-black font-bold rounded-xl hover:scale-105 active:scale-95 transition-all uppercase text-xs tracking-wide disabled:opacity-50 shadow-lg"
            >
              {isSubmitting ? 'Wysyłanie...' : 'Opublikuj'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
