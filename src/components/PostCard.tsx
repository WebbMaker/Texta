import { useState, useEffect } from 'react';
import { Post, Vote } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import { toggleVote, createNotification } from '../lib/actions';
import { db } from '../lib/firebase';
import { doc, onSnapshot, deleteDoc } from 'firebase/firestore';
import { UserAvatar } from './UserAvatar';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  key?: string | number;
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user, profile } = useAuth();
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  
  const likes = post.upvoteCount;

  useEffect(() => {
    if (!user) return;
    const voteRef = doc(db, 'posts', post.id, 'votes', user.uid);
    const unsubscribe = onSnapshot(voteRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Vote;
        setUserVote(data.type);
      } else {
        setUserVote(null);
      }
    });
    return () => unsubscribe();
  }, [user, post.id]);

  const handleLike = async () => {
    if (!user) return;
    setIsVoting(true);
    try {
      await toggleVote(post.id, user.uid, userVote === 'upvote' ? 'upvote' : 'upvote', userVote);
      if (userVote !== 'upvote' && user.uid !== post.authorId && profile) {
        // Since we are mapping everything to upvote, checking if they didn't have upvote means they're adding one now
        createNotification(post.authorId, {
          type: 'like',
          content: `${profile.username} polubił(a) twój post.`,
          relatedId: post.id
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!user || user.uid !== post.authorId) return;
    if (window.confirm('Czy na pewno chcesz usunąć tę transmisję?')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (err) {
        console.error("Failed to delete post:", err);
      }
    }
  };

  const renderContent = (content: string) => {
    // Regex for basic hashtags
    const parts = content.split(/(#[a-zA-Z0-9_żółćęśąźńŻÓŁĆĘŚĄŹŃ]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('#')) {
        return <span key={i} className="text-neon-blue cursor-pointer hover:underline">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="p-6 bg-surface border border-gray-800 rounded-2xl relative overflow-hidden mb-6">
      <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue"></div>
      <div className="flex gap-5">
        <div className="flex-1 overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <UserAvatar userId={post.authorId} username={post.authorUsername} className="w-10 h-10" />
              <div>
                <p className="font-bold text-white">
                  <Link to={`/u/${post.authorUsername}`} className="hover:underline">
                    {post.authorUsername}
                  </Link>
                  <span className="text-neon-blue font-mono text-sm ml-2 hidden sm:inline-block">@{post.authorUsername}</span>
                </p>
                <p className="text-xs text-gray-500 font-mono" title={new Date(post.createdAt).toLocaleString()}>
                  {formatDistanceToNow(post.createdAt, { addSuffix: true })} • CZAS RZECZYWISTY
                </p>
              </div>
            </div>
            
            {user && user.uid === post.authorId && (
              <button onClick={handleDelete} className="text-gray-500 hover:text-red-400 p-2 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-lg leading-relaxed text-gray-200 mb-6 whitespace-pre-wrap break-words format-text">
            {renderContent(post.content)}
          </p>

          {post.imageUrl && (
            <div className="mb-6 rounded-xl overflow-hidden border border-gray-800 flex justify-center bg-black/50 p-2">
              <img src={post.imageUrl} alt="img" className="max-h-96 object-contain rounded-lg" />
            </div>
          )}

          <div className="flex items-center gap-8 border-t border-gray-800 pt-4">
            <button 
              disabled={isVoting || !user}
              onClick={handleLike}
              className={`flex items-center gap-2 transition-colors ${userVote === 'upvote' ? 'text-neon-purple' : 'text-gray-500 hover:text-white'}`}
            >
              <Heart className={`w-5 h-5 ${userVote === 'upvote' ? 'fill-current' : ''}`} />
              <span className="font-mono text-sm">{likes > 0 && likes} {likes === 1 ? 'Polubienie' : 'Polubienia'}</span>
            </button>

            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors"
            >
              <MessageSquare className="w-5 h-5 text-gray-400" />
              <span className="font-mono text-sm">{post.commentsCount} Komentarzy</span>
            </button>
          </div>
        </div>
      </div>

      {showComments && (
        <div className="mt-6 pt-6 border-t border-gray-800">
           <CommentSection postId={post.id} postAuthorId={post.authorId} />
        </div>
      )}
    </div>
  );
}
