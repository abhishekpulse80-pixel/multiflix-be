import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/** Dark bone for the black-themed blogging skeletons. */
const BONE_DARK = '#2C2C2E';
const TITLE = '#FFFFFF';
const H_PAD_WATCH = 16;
const LINK = '#246BFD';

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

function ChevronDownIcon({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ListProps = {
  coverHeight: number;
  rowCount?: number;
};

/** Card-shaped placeholders matching `BloggingScreen` list layout. */
export function BloggingListSkeleton({
  coverHeight,
  rowCount = 4,
}: ListProps) {
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.listRoot} accessibilityLabel="Loading blogs">
      <Animated.View style={{ opacity: pulse }}>
        {Array.from({ length: rowCount }).map((_, i) => (
          <View key={i} style={styles.listCard}>
            <View style={[styles.listThumb, { height: coverHeight }]} />
            <View style={styles.listMetaRow}>
              <View style={styles.listAvatar} />
              <View style={styles.listTextCol}>
                <View style={styles.listTitleBar} />
                <View style={styles.listSubBar} />
              </View>
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

type WatchProps = {
  miniPlayerHeight: number;
  onGoBack: () => void;
};

/** Matches `BloggingWatchScreen` chrome, mini player, and related rows. */
export function BloggingWatchSkeleton({ miniPlayerHeight, onGoBack }: WatchProps) {
  const pulse = useSkeletonPulse();
  return (
    <View style={styles.watchRoot} accessibilityLabel="Loading blog">
      <View style={[styles.watchChrome, { paddingHorizontal: H_PAD_WATCH }]}>
        <Pressable
          onPress={onGoBack}
          hitSlop={12}
          style={styles.watchChromeHit}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ChevronDownIcon color={TITLE} />
        </Pressable>
        <View style={styles.watchChromeHintSpacer} />
        <View style={styles.watchChromeHit} />
      </View>
      <Animated.View style={[styles.watchBody, { opacity: pulse }]}>
        <View
          style={[
            styles.watchMini,
            {
              marginHorizontal: H_PAD_WATCH,
              height: miniPlayerHeight,
            },
          ]}
        />
        <View style={[styles.watchSectionBar, { marginHorizontal: H_PAD_WATCH }]} />
        <View
          style={[
            styles.watchSectionBarNarrow,
            { marginHorizontal: H_PAD_WATCH, marginTop: 8 },
          ]}
        />
        {Array.from({ length: 4 }).map((_, i) => (
          <View
            key={i}
            style={[styles.watchRelatedRow, { paddingHorizontal: H_PAD_WATCH }]}
          >
            <View style={styles.watchRelatedThumb} />
            <View style={styles.watchRelatedText}>
              <View style={styles.watchRelatedTitle} />
              <View style={styles.watchRelatedMeta} />
            </View>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  listRoot: {
    paddingTop: 8,
  },
  listCard: {
    marginBottom: 22,
  },
  listThumb: {
    borderRadius: 14,
    backgroundColor: BONE_DARK,
  },
  listMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BONE_DARK,
  },
  listTextCol: {
    flex: 1,
    minWidth: 0,
  },
  listTitleBar: {
    height: 16,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '88%',
  },
  listSubBar: {
    height: 13,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '52%',
    marginTop: 8,
  },
  watchRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
  watchChrome: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  watchChromeHit: {
    width: 40,
    alignItems: 'center',
  },
  watchChromeHintSpacer: {
    flex: 1,
  },
  watchBody: {
    flex: 1,
  },
  watchMini: {
    borderRadius: 12,
    backgroundColor: BONE_DARK,
    marginBottom: 20,
  },
  watchSectionBar: {
    height: 20,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '55%',
    marginBottom: 4,
  },
  watchSectionBarNarrow: {
    height: 14,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '92%',
    marginBottom: 12,
  },
  watchRelatedRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  watchRelatedThumb: {
    width: 128,
    height: 72,
    borderRadius: 8,
    backgroundColor: BONE_DARK,
  },
  watchRelatedText: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    gap: 8,
  },
  watchRelatedTitle: {
    height: 15,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '95%',
  },
  watchRelatedMeta: {
    height: 12,
    borderRadius: 4,
    backgroundColor: BONE_DARK,
    width: '40%',
  },
});
