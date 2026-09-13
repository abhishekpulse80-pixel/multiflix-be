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

const TITLE = '#FFFFFF';
const MUTED = '#AEAEB2';

type Props = {
  /** Cover height — matches the surrounding blog card's thumbnail height. */
  coverHeight: number;
  /** Called on no-fill / error / timeout so the list drops this slot. */
  onFailed?: () => void;
};

/** Give up on a slot that hasn't filled in this long. */
const NATIVE_AD_TIMEOUT_MS = 6000;

/**
 * A Google native ad styled like a Blogging feed card (cover media + "Ad" chip,
 * then a meta row with icon/headline/CTA), so it blends into the blog list the
 * same way a real blog card does. Loads its own ad on mount; if it doesn't fill
 * it calls `onFailed` so the parent removes the slot (no empty gap).
 */
export const BlogNativeAdCard = React.memo(function BlogNativeAdCard({
  coverHeight,
  onFailed,
}: Props) {
  const t = useTheme();
  const { enabled } = useAdsConfig();
  const [ad, setAd] = useState<NativeAd | null>(null);
  const onFailedRef = useRef(onFailed);
  onFailedRef.current = onFailed;

  useEffect(() => {
    if (!enabled) {
      onFailedRef.current?.();
      return;
    }
    let cancelled = false;
    let loaded: NativeAd | null = null;
    const fail = () => {
      if (!cancelled) {
        cancelled = true;
        onFailedRef.current?.();
      }
    };
    const timer = setTimeout(() => {
      console.warn(
        `[admob] blog native ad timed out after ${NATIVE_AD_TIMEOUT_MS}ms`,
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
        // Logged in release too so prod ad failures (e.g. NO_FILL) are visible.
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[admob] blog native ad failed:', msg, AD_UNIT_IDS.feedNative);
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
    // Brief placeholder while the request is in flight; on failure onFailed
    // fires and the parent removes this slot, so it never sticks.
    return (
      <View style={styles.card}>
        <View style={[styles.thumbWrap, { height: coverHeight }]}>
          <ActivityIndicator color="rgba(255,255,255,0.5)" />
        </View>
      </View>
    );
  }

  return (
    <NativeAdView nativeAd={ad} style={styles.card}>
      <View style={[styles.thumbWrap, { height: coverHeight }]}>
        {ad.mediaContent ? (
          <NativeMediaView style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : ad.icon?.url ? (
          <Image
            source={{ uri: ad.icon.url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.adChip} pointerEvents="none">
          <Text style={[styles.adChipText, { fontFamily: t.fontFamily.semibold }]}>
            Ad
          </Text>
        </View>
      </View>

      <View style={styles.cardMeta}>
        {ad.icon?.url ? (
          <Image source={{ uri: ad.icon.url }} style={styles.cardAvatar} />
        ) : (
          <View style={styles.cardAvatar} />
        )}
        <View style={styles.cardText}>
          {ad.headline ? (
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text
                style={[styles.cardTitle, { fontFamily: t.fontFamily.bold }]}
                numberOfLines={2}
              >
                {ad.headline}
              </Text>
            </NativeAsset>
          ) : null}
          {ad.body || ad.advertiser ? (
            <NativeAsset
              assetType={
                ad.advertiser
                  ? NativeAssetType.ADVERTISER
                  : NativeAssetType.BODY
              }
            >
              <Text
                style={[styles.cardSub, { fontFamily: t.fontFamily.regular }]}
                numberOfLines={1}
              >
                {ad.advertiser ?? ad.body}
              </Text>
            </NativeAsset>
          ) : null}
        </View>
        {ad.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <View style={[styles.cta, { backgroundColor: t.colors.accent }]}>
              <Text
                style={[
                  styles.ctaLabel,
                  {
                    fontFamily: t.fontFamily.semibold,
                    color: t.colors.onAccent,
                  },
                ]}
                numberOfLines={1}
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
  card: {
    marginBottom: 22,
  },
  thumbWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adChip: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  adChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    color: TITLE,
    lineHeight: 22,
  },
  cardSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  cta: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 13,
  },
});
