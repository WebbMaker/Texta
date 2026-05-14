import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { ImageUploadButton } from './ImageUploadButton';
import { X } from 'lucide-react';

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

    setIsSubmitting(true);
    setError('');

    try {
      const newPostRef = doc(collection(db, 'posts'));
      const postData: any = {
        authorId: user.uid,
        authorUsername: profile.username,
        content: content.trim(),
        createdAt: Date.now(),
        upvoteCount: 0,
        downvoteCount: 0,
        commentsCount: 0
      };
      if (imageUrl) {
        postData.imageUrl = imageUrl;
      }
      await setDoc(newPostRef, postData);
      setContent('');
      setImageUrl(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to post');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="relative">
        <div className={`w-full bg-surface border-2 border-gray-800 rounded-xl p-4 overflow-hidden focus-within:border-neon-blue transition-all flex flex-col ${imageUrl ? 'min-h-[200px]' : ''}`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Co Ci chodzi po głowie? (obsługuje Markdown)"
            className="w-full bg-transparent text-white placeholder-gray-600 focus:outline-none resize-none min-h-[80px]"
            disabled={isSubmitting}
          />
          {imageUrl && (
            <div className="relative mt-2 inline-block self-start">
               <img src={imageUrl} alt="preview" className="max-h-48 rounded-lg object-contain border border-gray-700" />
               <button 
                 type="button" 
                 onClick={() => setImageUrl(null)} 
                 className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-400"
               >
                 <X className="w-4 h-4" />
               </button>
            </div>
          )}
          <div className="h-14"></div>
        </div>
        
        <div className="absolute bottom-4 right-4 left-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto pl-2">
             <ImageUploadButton onImageSelected={setImageUrl} />
             {error && <span className="text-red-400 font-mono text-xs">{error}</span>}
          </div>
          
          <div className="flex items-center gap-4 bg-surface pb-1 pointer-events-auto">
            <span className={`text-xs font-mono ${content.length > MAX_CHARS ? 'text-red-400' : 'text-gray-500'}`}>
              {content.length} / {MAX_CHARS}
            </span>
            <button
              type="submit"
              disabled={isSubmitting || (!content.trim() && !imageUrl) || content.length > MAX_CHARS || !profile}
              className="px-6 py-2 bg-neon-blue text-black font-bold rounded-lg hover:brightness-110 transition-all uppercase text-sm tracking-widest disabled:opacity-50 disabled:grayscale"
            >
              {isSubmitting ? '...' : 'Publikuj'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
