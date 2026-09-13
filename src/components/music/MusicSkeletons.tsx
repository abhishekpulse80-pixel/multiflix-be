import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';

const BG = '#F5F5F7';
const BONE = '#E8E8E8';

const H_PAD = 20;
const THUMB = 64;
const ALBUM = 120;
const ALBUM_RADIUS = 15;
const PROFILE = 88;
const PROFILE_RADIUS = 12;

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.38)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.62,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.38,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

type HomeProps = {
  trackPlaceholderCount?: number;
  albumPlaceholderCount?: number;
};

/** Mirrors `MusicScreen` hero, album carousel, and recommend list. */
export function MusicHomeSkeleton({
  trackPlaceholderCount = 6,
  albumPlaceholderCount = 4,
}: HomeProps) {
  const pulse = useSkeletonPulse();
  return (
    <ScrollView
      style={styles.homeRoot}
      contentContainerStyle={styles.homeContent}
      showsVerticalScrollIndicator={false}
      accessibilityLabel="Loading music">
      <Animated.View style={{ opacity: pulse }}>
        <View style={[styles.heroLine, { width: '88%' }]} />
        <View style={[styles.heroLine, { width: '72%', marginTop: 10 }]} />
        <View style={[styles.sectionLine, { width: '28%', marginTop: 24 }]} />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.albumScroll}>
          {Array.from({ length: albumPlaceholderCount }).map((_, i) => (
            <View key={i} style={styles.albumCard}>
              <View style={styles.albumCover} />
              <View style={[styles.albumLabelLine, { width: '80%', alignSelf: 'center' }]} />
              <View
                style={[styles.albumLabelLine, { width: '55%', marginTop: 6, alignSelf: 'center' }]}
              />
            </View>
          ))}
        </ScrollView>
        <View style={[styles.sectionLine, { width: '52%', marginTop: 28, marginBottom: 4 }]} />
        {Array.from({ length: trackPlaceholderCount }).map((_, i) => (
          <View key={i} style={styles.trackRow}>
            <View style={styles.trackThumb} />
            <View style={styles.trackTextCol}>
              <View style={[styles.trackLine, { width: '78%' }]} />
              <View style={[styles.trackLineSm, { width: '45%', marginTop: 8 }]} />
              <View style={[styles.trackLineXs, { width: '36%', marginTop: 6 }]} />
            </View>
          </View>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

/** Mirrors `MusicAlbumDetailScreen` top bar, profile block, and track list. */
export function MusicAlbumDetailSkeleton({ trackPlaceholderCount = 5 }: { trackPlaceholderCount?: number }) {
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.detailRoot} accessibilityLabel="Loading album">
      <View style={[styles.topBar, { paddingTop: 12 }]}>
        <View style={styles.topIconBox} />
        <View style={styles.navTitleBone} />
        <View style={styles.topIconBox} />
      </View>
      <ScrollView
        contentContainerStyle={styles.detailScroll}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: pulse }}>
          <View style={styles.profileBlock}>
            <View style={styles.profileImg} />
            <View style={styles.profileTextCol}>
              <View style={[styles.profileNameLine, { width: '70%' }]} />
              <View style={[styles.trackLineSm, { width: '55%', marginTop: 10 }]} />
              <View style={[styles.trackLineXs, { width: '40%', marginTop: 8 }]} />
              <View style={[styles.bioLine, { width: '100%', marginTop: 12 }]} />
              <View style={[styles.bioLine, { width: '92%', marginTop: 6 }]} />
            </View>
          </View>
          <View style={[styles.sectionLine, { width: '36%', marginBottom: 12 }]} />
          {Array.from({ length: trackPlaceholderCount }).map((_, i) => (
            <View key={i} style={styles.trackRow}>
              <View style={styles.trackThumb} />
              <View style={styles.trackTextCol}>
                <View style={[styles.trackLine, { width: '75%' }]} />
                <View style={[styles.trackLineSm, { width: '42%', marginTop: 8 }]} />
                <View style={[styles.trackLineXs, { width: '34%', marginTop: 6 }]} />
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

/** Mirrors `MusicNowPlayingScreen` art, meta, controls, and upcoming rows. */
export function MusicNowPlayingSkeleton() {
  const pulse = useSkeletonPulse();
  const { width: screenW } = useWindowDimensions();
  const artSize = Math.min(screenW - H_PAD * 2, 320);
  const barW = screenW - H_PAD * 2;

  return (
    <View style={styles.npRoot} accessibilityLabel="Loading track">
      <View style={[styles.npTopBar, { paddingTop: 12 }]}>
        <View style={styles.topIconBox} />
        <View style={[styles.npNavBone, { maxWidth: barW - 100 }]} />
        <View style={styles.topIconBox} />
      </View>
      <ScrollView
        style={styles.npScroll}
        contentContainerStyle={[styles.npBody, { paddingBottom: 96 }]}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: pulse, alignItems: 'stretch' }}>
          <View style={[styles.artBone, { width: artSize, height: artSize }]} />
          <View style={[styles.titleBone, { width: '82%', alignSelf: 'center' }]} />
          <View style={[styles.subtitleBone, { width: '48%', marginTop: 12, alignSelf: 'center' }]} />
          <View style={[styles.progressBone, { width: barW, marginTop: 28 }]} />
          <View style={styles.controlsRow}>
            <View style={styles.sideCtrlBone} />
            <View style={styles.playMainBone} />
            <View style={styles.sideCtrlBone} />
          </View>
          <View style={[styles.upcomingLabel, { width: '36%', marginBottom: 14 }]} />
          {Array.from({ length: 4 }).map((_, i) => (
            <View key={i} style={styles.upRow}>
              <View style={styles.upThumbBone} />
              <View style={styles.trackTextCol}>
                <View style={[styles.trackLine, { width: '70%' }]} />
                <View style={[styles.trackLineSm, { width: '38%', marginTop: 6 }]} />
                <View style={[styles.trackLineXs, { width: '32%', marginTop: 5 }]} />
              </View>
            </View>
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  homeRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  homeContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 16 + 88,
  },
  heroLine: {
    height: 22,
    borderRadius: 8,
    backgroundColor: BONE,
  },
  sectionLine: {
    height: 16,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  albumScroll: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  albumCard: {
    width: ALBUM,
  },
  albumCover: {
    width: ALBUM,
    height: ALBUM,
    borderRadius: ALBUM_RADIUS,
    backgroundColor: BONE,
  },
  albumLabelLine: {
    height: 11,
    borderRadius: 4,
    backgroundColor: BONE,
    marginTop: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  trackThumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    backgroundColor: BONE,
  },
  trackTextCol: {
    flex: 1,
    minWidth: 0,
  },
  trackLine: {
    height: 16,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  trackLineSm: {
    height: 13,
    borderRadius: 5,
    backgroundColor: BONE,
  },
  trackLineXs: {
    height: 11,
    borderRadius: 4,
    backgroundColor: BONE,
  },
  detailRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  topIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: BONE,
  },
  navTitleBone: {
    flex: 1,
    height: 18,
    marginHorizontal: 8,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  detailScroll: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 40,
  },
  profileBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 28,
  },
  profileImg: {
    width: PROFILE,
    height: PROFILE,
    borderRadius: PROFILE_RADIUS,
    backgroundColor: BONE,
  },
  profileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  profileNameLine: {
    height: 22,
    borderRadius: 8,
    backgroundColor: BONE,
  },
  bioLine: {
    height: 12,
    borderRadius: 4,
    backgroundColor: BONE,
  },
  npRoot: {
    flex: 1,
    backgroundColor: BG,
  },
  npTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
  },
  npNavBone: {
    flex: 1,
    height: 14,
    marginHorizontal: 8,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  npScroll: {
    flex: 1,
  },
  npBody: {
    paddingHorizontal: H_PAD,
    alignItems: 'stretch',
  },
  artBone: {
    alignSelf: 'center',
    borderRadius: 22,
    backgroundColor: BONE,
    marginTop: 8,
    marginBottom: 28,
  },
  titleBone: {
    height: 28,
    borderRadius: 8,
    backgroundColor: BONE,
  },
  subtitleBone: {
    height: 18,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  progressBone: {
    alignSelf: 'center',
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 40,
    marginTop: 28,
    marginBottom: 36,
  },
  sideCtrlBone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: BONE,
  },
  playMainBone: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: BONE,
  },
  upcomingLabel: {
    height: 20,
    borderRadius: 6,
    backgroundColor: BONE,
  },
  upRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  upThumbBone: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: BONE,
  },
});
