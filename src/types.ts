export interface Message {
  id: string;
  participants: string[];
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  seen: boolean;
}

export interface TypingStatus {
  isTyping: boolean;
  lastActive: number;
}
export interface Notification {
  id: string;
  type: 'comment' | 'like' | 'friend_request' | 'system' | string;
  createdAt: number;
  content: string;
  read: boolean;
  relatedId: string; // ID of post or user
}

export interface UserProfile {
  uid: string;
  username: string;
  lowercaseUsername: string;
  bio?: string;
  createdAt: number;
  avatarUrl?: string;
  themeColor?: string;
  totalTimeSpent?: number;
  isOnline?: boolean;
  lastActive?: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  upvoteCount: number;
  downvoteCount: number;
  commentsCount: number;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  upvoteCount: number;
}

export interface Vote {
  id: string; // voteUserId
  type: 'upvote' | 'downvote';
}

export interface Video {
  id: string;
  authorId: string;
  authorUsername: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  views: number;
  createdAt: number;
  likes: number;
}
