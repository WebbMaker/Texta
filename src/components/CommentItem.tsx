import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, writeBatch, increment, deleteDoc } from 'firebase/firestore';
import { Comment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router';
import { Heart, Trash2 } from 'lucide-react';

import { UserAvatar } from './UserAvatar';

interface CommentItemProps {
  key?: string | number;
  comment: Comment;
}

export function CommentItem({ comment }: CommentItemProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (!user) return;
    const voteRef = doc(db, 'comments', comment.id, 'votes', user.uid);
    const unsubscribe = onSnapshot(voteRef, (snap) => {
      setIsLiked(snap.exists());
    });
    return () => unsubscribe();
  }, [user, comment.id]);

  const toggleLike = async () => {
    if (!user) return;
    setIsLiking(true);
    
    try {
      const voteRef = doc(db, 'comments', comment.id, 'votes', user.uid);
      const commentRef = doc(db, 'comments', comment.id);
      const batch = writeBatch(db);
      
      if (isLiked) {
        batch.delete(voteRef);
        batch.update(commentRef, { upvoteCount: increment(-1) });
      } else {
        batch.set(voteRef, { liked: true });
        batch.update(commentRef, { upvoteCount: increment(1) });
      }
      
      await batch.commit();
    } catch (e) {
      console.error("Like toggle failed", e);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== comment.authorId) return;
    if (window.confirm('Czy na pewno chcesz usunąć ten komentarz?')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'comments', comment.id));
        batch.update(doc(db, 'posts', comment.postId), { commentsCount: increment(-1) });
        await batch.commit();
      } catch (err) {
        console.error("Failed to delete comment:", err);
      }
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(#[a-zA-Z0-9_żółćęśąźńŻÓŁĆĘŚĄŹŃ]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="text-neon-purple cursor-pointer hover:underline">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="bg-bg-dark border border-gray-800 rounded-xl p-4 text-sm flex gap-4 relative group">
      <UserAvatar userId={comment.authorId} username={comment.authorUsername} className="w-8 h-8 flex-shrink-0" fallbackClassName="bg-indigo-500 font-bold font-mono text-white text-xs" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <Link to={`/u/${comment.authorUsername}`} className="font-bold text-gray-200 hover:text-neon-blue transition-colors">
            {comment.authorUsername}
          </Link>
          <span className="text-neon-blue font-mono text-xs hidden sm:inline-block">@{comment.authorUsername}</span>
          <span className="text-gray-700">•</span>
          <span className="text-gray-500 font-mono text-xs truncate" title={new Date(comment.createdAt).toLocaleString()}>
            {formatDistanceToNow(comment.createdAt, { addSuffix: true })}
          </span>
        </div>
        {comment.imageUrl && (
          <img src={comment.imageUrl} alt="attached" className="max-h-40 rounded-lg object-contain border border-gray-700 mb-2 max-w-full" />
        )}
        <p className="text-gray-300 whitespace-pre-wrap break-words leading-relaxed">{renderContent(comment.content)}</p>
      </div>
      <div className="flex flex-col items-center justify-start gap-1 pt-1">
        {user && user.uid === comment.authorId && (
          <button 
            onClick={handleDelete}
            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity mb-2"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button
          disabled={isLiking || !user}
          onClick={toggleLike}
          className={`p-1 rounded transition-colors ${isLiked ? 'text-neon-purple' : 'text-gray-600 hover:text-neon-purple'}`}
        >
          <Heart className="w-5 h-5 transition-transform active:scale-90" fill={isLiked ? "currentColor" : "none"} />
        </button>
        {comment.upvoteCount > 0 && (
          <span className={`text-xs font-mono font-bold ${isLiked ? 'text-neon-purple' : 'text-gray-500'}`}>
            {comment.upvoteCount}
          </span>
        )}
      </div>
    </div>
  );
}
