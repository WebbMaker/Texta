import { useState, useEffect } from 'react';
import { Post, Vote } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { Heart, MessageSquare, Trash2, X, Maximize2, Edit3, Save, Clock } from 'lucide-react';
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
    <div className="liquid-glass rounded-[var(--radius-ios-large)] overflow-hidden mb-8 transition-all hover:scale-[1.005] group/post">
      {/* Post Header */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <UserAvatar userId={post.authorId} username={post.authorUsername} className="w-12 h-12 border border-white/10 shadow-sm" />
            <div>
              <p className="font-bold text-white tracking-tight font-display">
                <Link to={`/u/${post.authorUsername}`} className="hover:text-neon-blue transition-colors">
                  {post.authorUsername}
                </Link>
              </p>
              <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider flex items-center gap-2 mt-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(post.createdAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          
          {user && (user.uid === post.authorId || profile?.role === 'owner') && (
            <div className="flex items-center gap-1 opacity-0 group-hover/post:opacity-100 transition-opacity">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)} 
                  className="text-white/40 hover:text-white p-2.5 bg-white/5 rounded-xl border border-white/5 transition-all"
                  title="Edytuj post"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="text-white/40 hover:text-white p-2.5 bg-white/5 rounded-xl border border-white/5 transition-all"
                  title="Anuluj"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={handleDelete} 
                className="text-white/40 hover:text-red-400 p-2.5 bg-white/5 rounded-xl border border-white/5 transition-all" 
                title="Usuń post"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="space-y-6">
          {isEditing ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white text-sm focus:ring-1 focus:ring-white/20 outline-none resize-none min-h-[150px] backdrop-blur-md"
                placeholder="Co chcesz zmienić?"
              />
              <div className="flex flex-col gap-2">
                <label className="text-xs text-white/40 pl-1">Link do obrazka (opcjonalnie)</label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:ring-1 focus:ring-white/20 outline-none backdrop-blur-md"
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
                className="flex items-center gap-3 px-6 py-3 bg-white text-black rounded-xl text-xs font-bold hover:bg-white/90 transition-all disabled:opacity-50 shadow-lg"
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
              <div className="text-gray-200 leading-relaxed text-base">
                <MarkdownContent content={post.content} />
              </div>

              {post.imageUrl && (
                <div className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 w-[240px] h-[240px] flex-shrink-0 shadow-lg">
                  <img 
                    src={post.imageUrl} 
                    alt="post content" 
                    className="w-full h-full object-cover block group-hover:scale-[1.05] transition-transform duration-500 cursor-zoom-in" 
                    onClick={() => setIsFullscreen(true)}
                  />
                  <div className="absolute top-3 right-3 p-1.5 bg-black/60 backdrop-blur-md rounded-xl opacity-0 group-hover:opacity-100 transition-opacity border border-white/5">
                    <Maximize2 className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Action Bar */}
          <div className="flex items-center gap-4 pt-6 border-t border-white/5">
            <button 
              disabled={isVoting || !user}
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl transition-all ${
                userVote === 'upvote' 
                ? 'bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm shadow-red-500/10' 
                : 'bg-white/5 text-white/40 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
            >
              <Heart className={`w-5 h-5 ${userVote === 'upvote' ? 'fill-current animate-pulse' : ''}`} />
              <span className="text-sm font-semibold">
                {likes > 0 ? `${likes} osób lubi to` : 'Lubię to'}
              </span>
            </button>

            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-2xl transition-all ${
                showComments
                ? 'bg-white/20 text-white border border-white/20 shadow-md'
                : 'bg-white/5 text-white/40 hover:text-white border border-white/5 hover:bg-white/10'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {post.commentsCount > 0 ? `${post.commentsCount} komentarzy` : 'Komentuj'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Comments Section */}
      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white/5 border-t border-white/5 backdrop-blur-md"
          >
            <div className="p-6">
              <CommentSection targetId={post.id} targetType="post" authorId={post.authorId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
