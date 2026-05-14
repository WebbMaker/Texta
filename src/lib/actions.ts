import { db } from './firebase';
import { doc, getDoc, setDoc, deleteDoc, writeBatch, increment, collection, addDoc } from 'firebase/firestore';

export async function createNotification(userId: string, data: { type: string, content: string, relatedId: string }) {
  try {
    await addDoc(collection(db, 'users', userId, 'notifications'), {
      ...data,
      read: false,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error("Failed to create notification", error);
  }
}

export async function toggleVote(
  postId: string, 
  userId: string, 
  voteType: 'upvote' | 'downvote',
  currentVoteType?: 'upvote' | 'downvote' | null
) {
  const voteRef = doc(db, 'posts', postId, 'votes', userId);
  const postRef = doc(db, 'posts', postId);
  const batch = writeBatch(db);

  if (currentVoteType === voteType) {
    // User is toggling off their active vote
    batch.delete(voteRef);
    if (voteType === 'upvote') batch.update(postRef, { upvoteCount: increment(-1) });
    if (voteType === 'downvote') batch.update(postRef, { downvoteCount: increment(-1) });
  } else {
    // User is voting for the first time, or changing their vote
    batch.set(voteRef, { type: voteType });
    if (currentVoteType) {
      // Changing vote
      if (voteType === 'upvote') {
        batch.update(postRef, { upvoteCount: increment(1), downvoteCount: increment(-1) });
      } else {
        batch.update(postRef, { upvoteCount: increment(-1), downvoteCount: increment(1) });
      }
    } else {
      // First time vote
      if (voteType === 'upvote') batch.update(postRef, { upvoteCount: increment(1) });
      if (voteType === 'downvote') batch.update(postRef, { downvoteCount: increment(1) });
    }
  }

  await batch.commit();
}
