import { Platform } from 'react-native';

/**
 * AdMob configuration.
 *
 *  - The ad-unit IDs below are the only identifiers in code; the app ALWAYS
 *    requests these live units (no test-id branching).
 *  - Whether ads actually appear is the SINGLE RESPONSIBILITY of the admin
 *    master switch (`enabled` from `GET /ads/config`, see adsApi.ts +
 *    useAdsConfig). When admin says ads are on, the app shows live ads — in
 *    every build. The constants below are only the FALLBACK used until that
 *    fetch resolves, mirroring appSetting.service.ts.
 *
 * Note: on debug builds AdMob often returns no-fill for live units, so ads may
 * not appear while testing even with admin on. They serve normally for real
 * users on a release build.
 */

export const ADMOB_PUBLISHER_ID = 'pub-7029440848837237';

/** Admin-managed ad behaviour the app reads at runtime from `GET /ads/config`. */
export type AdsRuntimeConfig = {
  /** Master switch — when false, no native feed ads and no interstitials. */
  enabled: boolean;
  /** Inject a native ad after every N feed posts (0 = no feed ads). */
  feedNativeAdInterval: number;
  /** Show an interstitial after the viewer scrolls past this many posts (0 = off). */
  interstitialAfterPosts: number;
  /** Never show two interstitials closer together than this (ms). */
  interstitialMinIntervalMs: number;
};

/**
 * Fallback applied until `GET /ads/config` resolves (or if it fails), so every
 * consumer always has a usable value. Mirrors appSetting.service.ts defaults.
 */
export const DEFAULT_ADS_RUNTIME_CONFIG: AdsRuntimeConfig = {
  enabled: true,
  feedNativeAdInterval: 6,
  interstitialAfterPosts: 12,
  interstitialMinIntervalMs: 3 * 60 * 1000,
};

function realUnit(ios: string, android: string): string {
  return Platform.select({ ios, android, default: ios }) ?? ios;
}

// Live ad-unit IDs from the AdMob console (Multiflix Android / iOS apps).
// Always used — admin `enabled` is the only thing that decides if ads show.
export const AD_UNIT_IDS = {
  feedNative: realUnit(
    'ca-app-pub-7029440848837237/5900542983', // iOS Feed Native
    'ca-app-pub-7029440848837237/9064052514', // Android Feed Native
  ),
  interstitial: realUnit(
    'ca-app-pub-7029440848837237/8861748248', // iOS Interstitial
    'ca-app-pub-7029440848837237/4779033008', // Android Interstitial
  ),
};
