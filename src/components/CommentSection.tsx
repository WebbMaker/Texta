import { useState, useEffect, FormEvent } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, writeBatch, increment } from 'firebase/firestore';
import { Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';
import { X } from 'lucide-react';
import { ImageUploadButton } from './ImageUploadButton';
import { createNotification } from '../lib/actions';

import { CommentItem } from './CommentItem';

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
}

export function CommentSection({ postId, postAuthorId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile } = useAuth();

  useEffect(() => {
    const commentsRef = collection(db, 'comments');
    const q = query(
      commentsRef, 
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newComments: Comment[] = [];
      snapshot.forEach((doc) => {
        newComments.push({ id: doc.id, ...doc.data() } as Comment);
      });
      setComments(newComments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !profile || (!newComment.trim() && !imageUrl) || newComment.length > 500) return;

    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      const newCommentRef = doc(collection(db, 'comments'));
      const commentData: any = {
        postId,
        authorId: user.uid,
        authorUsername: profile.username,
        content: newComment.trim(),
        createdAt: Date.now(),
        upvoteCount: 0
      };
      if (imageUrl) {
         commentData.imageUrl = imageUrl;
      }
      batch.set(newCommentRef, commentData);

      const postRef = doc(db, 'posts', postId);
      batch.update(postRef, { commentsCount: increment(1) });

      await batch.commit();
      
      if (postAuthorId !== user.uid) {
        createNotification(postAuthorId, {
          type: 'comment',
          content: `${profile.username} skomentował(a) twój post.`,
          relatedId: postId
        });
      }

      setNewComment('');
      setImageUrl(null);
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {loading ? (
          <div className="text-sm text-neutral-500 font-mono">Ładowanie komentarzy...</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-neutral-500 italic font-mono">Brak komentarzy.</div>
        ) : (
          comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))
        )}
      </div>

      {profile && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          {imageUrl && (
            <div className="relative self-start">
               <img src={imageUrl} alt="preview" className="max-h-24 rounded-lg object-contain border border-gray-700" />
               <button 
                 type="button" 
                 onClick={() => setImageUrl(null)} 
                 className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-400"
               >
                 <X className="w-3 h-3" />
               </button>
            </div>
          )}
          <div className="flex gap-4">
            <div className="flex items-center justify-center">
              <ImageUploadButton onImageSelected={setImageUrl} />
            </div>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e as any);
                }
              }}
              placeholder="Napisz komentarz... (Enter, aby wysłać)"
              className="flex-1 bg-bg-dark border border-gray-800 text-sm rounded-lg px-4 py-3 text-white outline-none focus:border-neon-purple transition-colors font-mono"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || (!newComment.trim() && !imageUrl)}
              className="bg-neon-purple text-white px-6 py-2 rounded-lg text-sm font-bold tracking-widest uppercase transition-colors hover:brightness-110 disabled:opacity-50 hidden sm:block"
            >
              Odpowiedz
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
