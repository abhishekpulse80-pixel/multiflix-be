import { useCallback, useEffect, useRef } from 'react';
import { useInterstitialAd } from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../config/admob';
import { useAdsConfig } from './useAdsConfig';

/**
 * Feed interstitial driver: preloads one interstitial and shows it once the
 * viewer has scrolled past `interstitialAfterPosts` posts since the last one,
 * throttled to at most one every `interstitialMinIntervalMs`. Reloads after
 * each dismissal so the next is ready. No-op when ads are disabled. All three
 * knobs come from the admin-managed config (see useAdsConfig).
 *
 * Call the returned `notePostViewed()` whenever a new post scrolls into view.
 */
export function useFeedInterstitial(): { notePostViewed: () => void } {
  const { enabled, interstitialAfterPosts, interstitialMinIntervalMs } =
    useAdsConfig();
  const { isLoaded, isClosed, load, show } = useInterstitialAd(
    AD_UNIT_IDS.interstitial,
    { requestNonPersonalizedAdsOnly: true },
  );
  const lastShownAt = useRef(0);
  const postsSinceShown = useRef(0);

  useEffect(() => {
    if (enabled) {
      load();
    }
  }, [enabled, load]);

  // Preload the next one as soon as the current is dismissed.
  useEffect(() => {
    if (isClosed) {
      load();
    }
  }, [isClosed, load]);

  const notePostViewed = useCallback(() => {
    if (!enabled || interstitialAfterPosts <= 0) {
      return;
    }
    postsSinceShown.current += 1;
    const now = Date.now();
    if (
      isLoaded &&
      postsSinceShown.current >= interstitialAfterPosts &&
      now - lastShownAt.current >= interstitialMinIntervalMs
    ) {
      postsSinceShown.current = 0;
      lastShownAt.current = now;
      show();
    }
  }, [enabled, interstitialAfterPosts, interstitialMinIntervalMs, isLoaded, show]);

  return { notePostViewed };
}
