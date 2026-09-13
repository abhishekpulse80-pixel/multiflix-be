import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectAccessToken } from '../store/selectors';
import {
  connectChatSocket,
  disconnectChatSocket,
} from '../services/chatSocket';

/**
 * Manages the Socket.io chat connection lifecycle.
 * Connects when the user has an access token, disconnects when they don't.
 * Place this hook once near the app root (e.g., in RootNavigator or App).
 */
export function useChatSocketConnection(): void {
  const token = useAppSelector(selectAccessToken);

  useEffect(() => {
    if (token) {
      connectChatSocket(token);
    } else {
      disconnectChatSocket();
    }
    return () => {
      disconnectChatSocket();
    };
  }, [token]);
}
