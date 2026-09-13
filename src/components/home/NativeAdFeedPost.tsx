import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
  NativeMediaView,
} from 'react-native-google-mobile-ads';
import { AD_UNIT_IDS } from '../../config/admob';
import { useAdsConfig } from '../../hooks/useAdsConfig';
import { useTheme } from '../../theme';

type Props = {
  width: number;
  height: number;
  topInset: number;
  /** Stable id for this ad slot; passed back to `onFailed` so the parent can
   * drop this exact slot. Letting the parent bind it here (instead of a fresh
   * `() => onFailed(id)` arrow per render) keeps this memoized component from
   * re-rendering on every parent update. */
  adId: string;
  /** Called when the ad fails to load (no fill / error / timeout) so the
   * parent can REMOVE this slot — a full-screen native ad that never fills
   * must not leave a black page with a stuck spinner in the pager. */
  onFailed?: (adId: string) => void;
};

/** Give up on a slot that hasn't filled in this long (no-fill often rejects
 * fast, but this guards against a request that just hangs). */
const NATIVE_AD_TIMEOUT_MS = 6000;

/**
 * A full-screen Google native ad styled like a feed post (image/media + "Ad"
 * chip + headline/body + CTA), so it blends into the vertical pager the same
 * way `SponsoredFeedPost` does. Loads its own ad on mount; if it doesn't fill
 * it calls `onFailed` so the parent drops the slot (no dead black page).
 */
export const NativeAdFeedPost = React.memo(function NativeAdFeedPost({
  width,
  height,
  topInset,
  adId,
  onFailed,
}: Props) {
  const t = useTheme();
  const { enabled } = useAdsConfig();
  const [ad, setAd] = useState<NativeAd | null>(null);
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;
  const adIdRef = useRef(adId);
  adIdRef.current = adId;

  useEffect(() => {
    if (!enabled) {
      onFailedRef.current?.(adIdRef.current);
      return;
    }
    let cancelled = false;
    let loaded: NativeAd | null = null;
    const fail = () => {
      if (!cancelled) {
        cancelled = true;
        onFailedRef.current?.(adIdRef.current);
      }
    };
    const timer = setTimeout(() => {
      console.warn(
        `[admob] feed native ad timed out after ${NATIVE_AD_TIMEOUT_MS}ms`,
        AD_UNIT_IDS.feedNative,
      );
      fail();
    }, NATIVE_AD_TIMEOUT_MS);
    NativeAd.createForAdRequest(AD_UNIT_IDS.feedNative, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((nativeAd: NativeAd) => {
        if (cancelled) {
          nativeAd.destroy();
          return;
        }
        clearTimeout(timer);
        loaded = nativeAd;
        setAd(nativeAd);
      })
      .catch((err: unknown) => {
        // No fill / error — drop the slot instead of showing a black page.
        // Logged in release too so prod ad failures (e.g. NO_FILL) are visible.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[admob] feed native ad failed:', msg, AD_UNIT_IDS.feedNative);
        clearTimeout(timer);
        fail();
      });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      loaded?.destroy();
    };
  }, [enabled]);

  if (!ad) {
    // Brief spinner while the request is in flight; if it fails, onFailed fires
    // and the parent removes this slot (so this never sticks).
    return (
      <View style={[styles.cell, { width, height }]}>
        <ActivityIndicator color="rgba(255,255,255,0.6)" />
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={ad} style={[styles.cell, { width, height }]}>
      {ad.mediaContent ? (
        <NativeMediaView
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : ad.icon?.url ? (
        <Image
          source={{ uri: ad.icon.url }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      <View
        style={[styles.chipWrap, { top: topInset + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.chip}>
          <Text style={[styles.chipText, { fontFamily: t.fontFamily.semibold }]}>
            Ad
          </Text>
        </View>
      </View>

      <View style={styles.bottomMeta} pointerEvents="box-none">
        {ad.headline ? (
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <Text
              style={[styles.headline, { fontFamily: t.fontFamily.bold }]}
              numberOfLines={1}
            >
              {ad.headline}
            </Text>
          </NativeAsset>
        ) : null}
        {ad.body ? (
          <NativeAsset assetType={NativeAssetType.BODY}>
            <Text
              style={[styles.body, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={2}
            >
              {ad.body}
            </Text>
          </NativeAsset>
        ) : null}
        {ad.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={[styles.cta, { backgroundColor: t.colors.accent }]}>
              <Text
                style={[
                  styles.ctaLabel,
                  { fontFamily: t.fontFamily.semibold, color: t.colors.onAccent },
                ]}
              >
                {ad.callToAction}
              </Text>
            </View>
          </NativeAsset>
        ) : null}
      </View>
    </NativeAdView>
  );
});

const styles = StyleSheet.create({
  cell: {
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipWrap: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bottomMeta: {
    position: 'absolute',
    left: 0,
    right: 16,
    bottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headline: {
    color: '#FFFFFF',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  cta: {
    marginTop: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 16,
  },
});
