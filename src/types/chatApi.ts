/** Snapshot of a shared post embedded inside a chat message. */
export type MessagePostRefDto = {
  postId: string;
  thumbnailUrl: string;
  mediaUrl: string;
  caption: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  mediaKind: 'image' | 'video';
};

/** Payload sent when sharing a post into a chat. */
export type MessagePostRefInput = {
  postId: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  caption?: string;
  authorId: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  mediaKind?: 'image' | 'video';
};

/** Snapshot of a story this message was sent in reply to. */
export type MessageStoryRefDto = {
  storyId: string;
  thumbnailUrl: string;
  mediaUrl: string;
  mediaKind: 'image' | 'short_video';
  authorId: string;
  authorUsername: string;
};

/** Payload sent when replying to a story. */
export type MessageStoryRefInput = {
  storyId: string;
  thumbnailUrl?: string;
  mediaUrl?: string;
  mediaKind?: 'image' | 'short_video';
  authorId: string;
  authorUsername?: string;
};

/** Snapshot of a shared user profile embedded inside a chat message. */
export type MessageProfileRefDto = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

/** Payload sent when sharing a profile into a chat. */
export type MessageProfileRefInput = {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

/** Snapshot of the message this one is a reply to (preview pill above the bubble). */
export type MessageReplyKind = 'text' | 'image' | 'video' | 'post' | 'story';

export type MessageReplyRefDto = {
  messageId: string;
  senderId: string;
  /** Snapshot of the original text (server-side truncated). */
  text: string;
  kind: MessageReplyKind;
};

/** Image/video attachment on a chat message. */
export type MessageMediaDto = {
  url: string;
  kind: 'image' | 'video';
  thumbnailUrl: string;
  width: number;
  height: number;
  durationMs: number;
  sizeBytes: number;
};

/** Payload sent when attaching media to a chat message. */
export type MessageMediaInput = {
  url: string;
  kind: 'image' | 'video';
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  durationMs?: number;
  sizeBytes?: number;
};

/** DTO for a single chat message. */
export type MessageDto = {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  postRef: MessagePostRefDto | null;
  storyRef: MessageStoryRefDto | null;
  profileRef: MessageProfileRefDto | null;
  media: MessageMediaDto | null;
  replyTo: MessageReplyRefDto | null;
  createdAt: string;
};

/** DTO for a conversation list item. */
export type ConversationDto = {
  id: string;
  otherUser: {
    id: string;
    username: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
  lastMessage: {
    text: string;
    senderId: string;
    createdAt: string;
  } | null;
  /** True when the current user has NOT read the latest message. */
  isUnread: boolean;
  /** ISO timestamp the OTHER user last opened this conversation (for "Seen"). */
  otherUserLastReadAt: string | null;
};

/** Socket payload sent when the other participant reads the conversation. */
export type MessagesReadPayload = {
  conversationId: string;
  userId: string;
  at: string;
};

export type ConversationsResponseDto = {
  items: ConversationDto[];
  /** Count of conversations the user has hidden (omitted on the hidden view). */
  hiddenCount?: number;
};

export type MessagesResponseDto = {
  items: MessageDto[];
  page: number;
  limit: number;
  hasMore: boolean;
  /** ISO timestamp the OTHER user last opened this conversation. */
  otherUserLastReadAt: string | null;
};

export type GetOrCreateConversationResponseDto = {
  conversationId: string;
};

export type SendMessageResponseDto = {
  message: MessageDto;
};
