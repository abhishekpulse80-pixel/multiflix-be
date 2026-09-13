import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import { UserAvatar } from '../common/UserAvatar';
import { useRecordAdClickMutation } from '../../store/api/adsApi';
import type { SponsoredFeedAd } from '../../types/homeFeed';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { useTheme } from '../../theme';

type Props = {
  ad: SponsoredFeedAd;
  width: number;
  height: number;
  topInset: number;
};

export const SponsoredFeedPost = React.memo(function SponsoredFeedPost({
  ad,
  width,
  height,
  topInset,
}: Props) {
  const t = useTheme();
  const [recordAdClick] = useRecordAdClickMutation();

  const onCta = useCallback(() => {
    // Fire-and-forget click tracking — do not block the user if it fails.
    recordAdClick({ adId: ad.id })
      .unwrap()
      .catch(() => {});
    openExternalUrl(ad.targetUrl).catch(() => {});
  }, [ad.id, ad.targetUrl, recordAdClick]);

  return (
    <View style={[styles.cell, { width, height }]}>
      <FastImage
        source={{ uri: ad.imageUri, priority: FastImage.priority.high }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        accessibilityLabel={`Sponsored: ${ad.brandName}`}
      />

      <View
        style={[styles.sponsoredChipWrap, { top: topInset + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.sponsoredChip}>
          <Text
            style={[styles.sponsoredChipText, { fontFamily: t.fontFamily.semibold }]}
          >
            Sponsored
          </Text>
        </View>
      </View>

      <View style={styles.bottomMeta} pointerEvents="box-none">
        <View style={styles.metaRow}>
          <UserAvatar
            uri={ad.avatarUri}
            style={styles.avatar}
            accessibilityLabel={ad.brandName}
          />
          <View style={styles.metaText}>
            <Text
              style={[styles.userName, { fontFamily: t.fontFamily.bold }]}
            >
              {ad.brandName}
            </Text>
            <Text
              style={[styles.userRole, { fontFamily: t.fontFamily.regular }]}
            >
              @{ad.userName}
            </Text>
          </View>
        </View>
        <Text style={[styles.caption, { fontFamily: t.fontFamily.regular }]}>
          {ad.caption}{' '}
          {ad.hashtags.length > 0 ? (
            <Text style={styles.hash}>{ad.hashtags}</Text>
          ) : null}
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: t.colors.accent, opacity: pressed ? 0.88 : 1 },
          ]}
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ad.ctaLabel}
        >
          <Text
            style={[
              styles.ctaLabel,
              { fontFamily: t.fontFamily.semibold, color: t.colors.onAccent },
            ]}
          >
            {ad.ctaLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    backgroundColor: '#0D0D0D',
  },
  sponsoredChipWrap: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
  sponsoredChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  sponsoredChipText: {
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#FFFFFF',
    marginRight: 12,
  },
  metaText: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hash: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
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
