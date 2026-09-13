import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import {
  navigateToUserProfile,
  rootNavigationRef,
} from '../navigation/rootNavigationRef';
import { useLazyResolveUsernameQuery } from '../store/api/usersApi';

/**
 * Extract the @username from a profile deep link, or null. Parsed with regex
 * (not the URL API) to avoid React Native's incomplete URL polyfill. Supports:
 *   https://multiflix.in/u/<username>
 *   http://multiflix.in/u/<username>   (and optional www.)
 *   multiflix://u/<username>           (custom-scheme fallback)
 */
function usernameFromUrl(url: string): string | null {
  const custom = url.match(/^multiflix:\/\/u\/([^/?#]+)/i);
  if (custom?.[1]) return decodeURIComponent(custom[1]);
  const web = url.match(/^https?:\/\/(?:www\.)?multiflix\.in\/u\/([^/?#]+)/i);
  if (web?.[1]) return decodeURIComponent(web[1]);
  return null;
}

/**
 * Opens a shared profile link (multiflix.in/u/<username>) inside the app:
 * resolves the username to a userId and navigates to the profile. Handles both
 * cold start (getInitialURL) and warm ('url' event). If the nav container
 * isn't ready yet (cold start), the username is queued and flushed on ready.
 */
export function useProfileDeepLinks(navReady: boolean): void {
  const [resolveUsername] = useLazyResolveUsernameQuery();
  const pendingUsernameRef = useRef<string | null>(null);

  const openProfile = useCallback(
    async (username: string) => {
      try {
        const { userId } = await resolveUsername(username).unwrap();
        if (userId) navigateToUserProfile(userId);
      } catch {
        // Best-effort — the app already opened; just don't navigate.
      }
    },
    [resolveUsername],
  );

  const handleUrl = useCallback(
    (url: string | null) => {
      if (!url) return;
      const username = usernameFromUrl(url);
      if (!username) return;
      if (!rootNavigationRef.isReady()) {
        // Cold start before the navigator mounted — flush once ready.
        pendingUsernameRef.current = username;
        return;
      }
      void openProfile(username);
    },
    [openProfile],
  );

  // Cold start: a link that launched the app.
  useEffect(() => {
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => {});
  }, [handleUrl]);

  // Warm: a link tapped while the app is running.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [handleUrl]);

  // Flush a queued cold-start username once the navigator is ready.
  useEffect(() => {
    if (navReady && pendingUsernameRef.current) {
      const username = pendingUsernameRef.current;
      pendingUsernameRef.current = null;
      void openProfile(username);
    }
  }, [navReady, openProfile]);
}
