import { useCallback, useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import {
  navigateToHomeFeed,
  navigateToMusicNowPlaying,
  navigateToBloggingWatch,
  navigateToPost,
  navigateToUserProfile,
  rootNavigationRef,
} from '../navigation/rootNavigationRef';
import { useLazyGetPostByIdQuery } from '../store/api/feedApi';
import { useLazyResolveUsernameQuery } from '../store/api/usersApi';
import type { DeepLinkTarget } from '../utils/deepLinks';
import { targetFromUrl } from '../utils/deepLinks';

/**
 * Extract the @username from a profile deep link, or null. Parsed with regex
 * (not the URL API) to avoid React Native's incomplete URL polyfill. Supports:
 *   https://multiflix.in/u/<username>
 *   http://multiflix.in/u/<username>   (and optional www.)
 *   multiflix://u/<username>           (custom-scheme fallback)
 */

/**
 * Opens a shared profile link (multiflix.in/u/<username>) inside the app:
 * resolves the username to a userId and navigates to the profile. Handles both
 * cold start (getInitialURL) and warm ('url' event). If the nav container
 * isn't ready yet (cold start), the username is queued and flushed on ready.
 */
export function useProfileDeepLinks(navReady: boolean): void {
  const [resolveUsername] = useLazyResolveUsernameQuery();
  const [getPostById] = useLazyGetPostByIdQuery();
  const pendingTargetRef = useRef<DeepLinkTarget | null>(null);
  const lastHandledUrlRef = useRef<string | null>(null);

  const openProfile = useCallback(
    async (target: DeepLinkTarget) => {
      if (target.kind === 'music') {
        navigateToMusicNowPlaying(target.value);
        return;
      }
      if (target.kind === 'blog') {
        navigateToBloggingWatch(target.value);
        return;
      }
      if (target.kind === 'video') {
        try {
          const post = await getPostById(target.value).unwrap();
          if (!post?.id) {
            navigateToHomeFeed();
            return;
          }
          navigateToPost(post);
        } catch {
          // The public post route may be protected or temporarily unavailable.
          // Prevent the app from staying on a stale empty state; fall back home.
          if (rootNavigationRef.isReady()) {
            navigateToHomeFeed();
          }
        }
        return;
      }
      try {
        const { userId } = await resolveUsername(target.value).unwrap();
        if (userId) navigateToUserProfile(userId);
      } catch {
        // Best-effort — the app already opened; just don't navigate.
      }
    },
    [getPostById, resolveUsername],
  );

  const handleUrl = useCallback(
    (url: string | null) => {
      if (!url) return;
      const normalized = url.trim();
      const target = targetFromUrl(normalized);
      if (!target) return;
      if (lastHandledUrlRef.current === normalized) return;
      lastHandledUrlRef.current = normalized;
      if (!rootNavigationRef.isReady()) {
        pendingTargetRef.current = target;
        return;
      }
      void openProfile(target);
    },
    [openProfile],
  );

  // Cold start: a link that launched the app.
  useEffect(() => {
    Linking.getInitialURL()
      .then(handleUrl)
      .catch(() => { });
  }, [handleUrl]);

  // Warm: a link tapped while the app is running.
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, [handleUrl]);

  // Flush a queued cold-start username once the navigator is ready.
  useEffect(() => {
    if (navReady && pendingTargetRef.current) {
      const target = pendingTargetRef.current;
      pendingTargetRef.current = null;
      void openProfile(target);
    }
  }, [navReady, openProfile]);
}
