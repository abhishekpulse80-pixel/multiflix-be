import mobileAds from 'react-native-google-mobile-ads';

let started: Promise<unknown> | null = null;

/**
 * Initialise the Google Mobile Ads SDK once, at app start. Idempotent.
 *
 * NOTE on consent (do before shipping, depending on your markets):
 *  - iOS 14+: request App Tracking Transparency (e.g. via
 *    `react-native-tracking-transparency`) before this call so the SDK can use
 *    the IDFA for personalised ads. Declining just yields non-personalised ads.
 *    You must ALSO re-add `NSUserTrackingUsageDescription` to ios Info.plist
 *    (removed for now so App Store Review doesn't require a tracking
 *    declaration while ads are off) and declare tracking in App Privacy.
 *  - GDPR / consent regions: show Google's UMP consent form
 *    (`AdsConsent` from react-native-google-mobile-ads) before initialising.
 * Both are intentionally left as TODOs because they depend on the privacy
 * policy; the SDK still serves (non-personalised) ads without them.
 */
export function initializeAdMob(): Promise<unknown> {
  // Always initialise the SDK (cheap, and shows nothing on its own). Whether
  // ads actually SHOW is decided at runtime by the admin-managed config
  // (see useAdsConfig), so the SDK stays ready even if an admin turns ads on
  // while the app is already running.
  if (!started) {
    started = mobileAds()
      .initialize()
      .then((adapterStatuses) => {
        if (__DEV__) {
          console.log('[admob] initialized', adapterStatuses);
        }
        return adapterStatuses;
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.warn('[admob] initialize failed:', msg);
      });
  }
  return started ?? Promise.resolve();
}
