import { io, type Socket } from 'socket.io-client';
import { API_BASE_URL } from '../config/api';
import type {
  MessageDto,
  MessageMediaInput,
  MessagePostRefInput,
  MessagesReadPayload,
} from '../types/chatApi';

// Derive the socket base URL from the API URL (strip /api/v1)
const SOCKET_URL = API_BASE_URL.replace(/\/api\/v1$/, '');

let socket: Socket | null = null;

/**
 * Connect to the chat socket with the given access token.
 * Idempotent — if already connected with same token, returns existing socket.
 */
export function connectChatSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('[ChatSocket] connected', socket?.id);
  });

  socket.on('disconnect', (reason: string) => {
    console.log('[ChatSocket] disconnected', reason);
  });

  socket.on('connect_error', (err: Error) => {
    console.warn('[ChatSocket] connect_error', err.message);
  });

  return socket;
}

/** Disconnect and clean up. */
export function disconnectChatSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Get the current socket instance (may be null). */
export function getChatSocket(): Socket | null {
  return socket;
}

/** Join a conversation room. */
export function joinConversation(conversationId: string): void {
  socket?.emit('join_conversation', conversationId);
}

/** Leave a conversation room. */
export function leaveConversation(conversationId: string): void {
  socket?.emit('leave_conversation', conversationId);
}

/** Send a message via socket (with ack callback). */
export function sendMessageSocket(
  conversationId: string,
  text: string,
  replyToMessageId?: string | null,
  onAck?: (res: { ok: boolean; message?: MessageDto; error?: string }) => void,
): void {
  socket?.emit(
    'send_message',
    { conversationId, text, replyToMessageId: replyToMessageId ?? null },
    onAck,
  );
}

/** Send a shared-post message via socket (text may be empty). */
export function sendPostShareSocket(
  conversationId: string,
  postRef: MessagePostRefInput,
  text: string = '',
  replyToMessageId?: string | null,
  onAck?: (res: { ok: boolean; message?: MessageDto; error?: string }) => void,
): void {
  socket?.emit(
    'send_message',
    {
      conversationId,
      text,
      postRef,
      replyToMessageId: replyToMessageId ?? null,
    },
    onAck,
  );
}

/** Send a media (image/video) message via socket (text may be empty). */
export function sendMediaMessageSocket(
  conversationId: string,
  media: MessageMediaInput,
  text: string = '',
  replyToMessageId?: string | null,
  onAck?: (res: { ok: boolean; message?: MessageDto; error?: string }) => void,
): void {
  socket?.emit(
    'send_message',
    {
      conversationId,
      text,
      media,
      replyToMessageId: replyToMessageId ?? null,
    },
    onAck,
  );
}

/** Emit typing indicator. */
export function emitTyping(conversationId: string): void {
  socket?.emit('typing', conversationId);
}

/** Emit stop typing indicator. */
export function emitStopTyping(conversationId: string): void {
  socket?.emit('stop_typing', conversationId);
}

/** Listen for new messages. Returns cleanup function. */
export function onNewMessage(
  handler: (message: MessageDto) => void,
): () => void {
  socket?.on('new_message', handler);
  return () => {
    socket?.off('new_message', handler);
  };
}

/** Listen for typing events. Returns cleanup function. */
export function onUserTyping(
  handler: (data: { conversationId: string; userId: string }) => void,
): () => void {
  socket?.on('user_typing', handler);
  return () => {
    socket?.off('user_typing', handler);
  };
}

/** Listen for stop typing events. Returns cleanup function. */
export function onUserStopTyping(
  handler: (data: { conversationId: string; userId: string }) => void,
): () => void {
  socket?.on('user_stop_typing', handler);
  return () => {
    socket?.off('user_stop_typing', handler);
  };
}

/** Tell server the current user has opened the conversation (read receipts). */
export function emitMarkRead(conversationId: string): void {
  socket?.emit('mark_read', conversationId);
}

/** Listen for the other participant reading the conversation. Returns cleanup. */
export function onMessagesRead(
  handler: (data: MessagesReadPayload) => void,
): () => void {
  socket?.on('messages_read', handler);
  return () => {
    socket?.off('messages_read', handler);
  };
}

export type MessageDeletedPayload = {
  conversationId: string;
  messageId: string;
};

/** Listen for a message being deleted in a conversation. Returns cleanup. */
export function onMessageDeleted(
  handler: (data: MessageDeletedPayload) => void,
): () => void {
  socket?.on('message_deleted', handler);
  return () => {
    socket?.off('message_deleted', handler);
  };
}
