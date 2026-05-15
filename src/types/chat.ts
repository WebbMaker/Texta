export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participants: string[];
  admins?: string[];
  name?: string;
  photoUrl?: string;
  nicknames?: Record<string, string>;
  createdAt: number;
  updatedAt: number;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
  };
}

export interface ConversationMessage {
  id: string;
  senderId: string;
  content: string;
  imageUrl?: string;
  createdAt: number;
  seenBy: string[];
}
