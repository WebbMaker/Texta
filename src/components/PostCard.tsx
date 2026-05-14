import { useState, useEffect } from 'react';
import { Post, Vote } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Trash2, X, Maximize2, Edit3, Save } from 'lucide-react';
import { Link } from 'react-router';
import { toggleVote, createNotification } from '../lib/actions';
import { db } from '../lib/firebase';
import { doc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import { UserAvatar } from './UserAvatar';
import { CommentSection } from './CommentSection';
import { MarkdownContent } from './MarkdownContent';
import { motion, AnimatePresence } from 'motion/react';

interface PostCardProps {
  key?: string | number;
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user, profile } = useAuth();
  const [userVote, setUserVote] = useState<'upvote' | 'downvote' | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editImageUrl, setEditImageUrl] = useState(post.imageUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  
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
    const isOwner = profile?.role === 'owner';
    if (!user || (user.uid !== post.authorId && !isOwner)) return;
    if (window.confirm('Czy na pewno chcesz usunąć tę transmisję?')) {
      try {
        await deleteDoc(doc(db, 'posts', post.id));
      } catch (err) {
        console.error("Failed to delete post:", err);
      }
    }
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
            
            {user && (user.uid === post.authorId || profile?.role === 'owner') && (
              <div className="flex items-center gap-1">
                {!isEditing ? (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="text-gray-500 hover:text-neon-blue p-2 transition-colors"
                    title="Edytuj post"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="text-gray-500 hover:text-white p-2 transition-colors"
                    title="Anuluj"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button onClick={handleDelete} className="text-gray-500 hover:text-red-400 p-2 transition-colors" title="Usuń post">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-4 mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-bg-dark border border-gray-800 rounded-xl p-4 text-white font-mono text-sm focus:ring-1 focus:ring-neon-blue outline-none resize-none"
                rows={4}
                placeholder="Treść posta (Markdown wspierany)..."
              />
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest pl-1">URL Obrazka (opcjonalnie)</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-bg-dark border border-gray-800 rounded-xl px-4 py-2 text-white font-mono text-sm focus:ring-1 focus:ring-neon-blue outline-none"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>
              <button
                disabled={isSaving || !editContent.trim()}
                onClick={async () => {
                  setIsSaving(true);
                  try {
                    await updateDoc(doc(db, 'posts', post.id), {
                      content: editContent,
                      imageUrl: editImageUrl || null
                    });
                    setIsEditing(false);
                  } catch (err) {
                    console.error("Failed to update post:", err);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-neon-blue/10 border border-neon-blue/50 text-neon-blue rounded-xl text-xs font-bold hover:bg-neon-blue/20 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Zapisywanie...' : (
                  <>
                    <Save className="w-4 h-4" />
                    Zapisz zmiany
                  </>
                )}
              </button>
            </div>
          ) : (
            <>
              <MarkdownContent content={post.content} className="mb-6" />

              {post.imageUrl && (
                <div className="mb-6 group relative">
                  <div 
                    onClick={() => setIsFullscreen(true)}
                    className="max-w-[45%] rounded-xl overflow-hidden border border-gray-800 bg-black/50 cursor-zoom-in transition-all hover:border-neon-blue relative inline-block"
                  >
                    <img 
                      src={post.imageUrl} 
                      alt="post content" 
                      className="w-full h-auto max-h-[400px] object-contain rounded-lg block" 
                    />
                    <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>
              )}
            </>
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
           <CommentSection targetId={post.id} targetType="post" authorId={post.authorId} />
        </div>
      )}

      {/* Fullscreen Image Portal */}
      <AnimatePresence>
        {isFullscreen && post.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={() => setIsFullscreen(false)}
          >
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[101]"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(false);
              }}
            >
              <X className="w-6 h-6" />
            </motion.button>
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              src={post.imageUrl}
              alt="fullscreen"
              className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
