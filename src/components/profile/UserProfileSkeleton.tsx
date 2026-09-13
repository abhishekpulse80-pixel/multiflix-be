import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
const BG = '#FFFFFF';
const SHIMMER = '#E8E8ED';
const SHIMMER_MID = '#F0F0F4';

type Props = {
  /** Horizontal padding to align with `UserProfileScreen`. */
  horizontalPad?: number;
};

export function UserProfileSkeleton({ horizontalPad = 20 }: Props) {
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const bar = (
    <Animated.View
      style={[styles.shimmerBlock, { opacity: pulse, backgroundColor: SHIMMER }]}
    />
  );

  return (
    <View
      style={styles.root}
      accessibilityLabel="Loading profile">
      <View style={[styles.topBar, { paddingHorizontal: horizontalPad }]}>
        <View style={[styles.circleSm, { backgroundColor: SHIMMER_MID }]} />
        <Animated.View
          style={[
            styles.titleBar,
            { opacity: pulse, backgroundColor: SHIMMER },
          ]}
        />
        <View style={[styles.circleSm, styles.placeholderRight]} />
      </View>

      <View style={[styles.body, { paddingHorizontal: horizontalPad }]}>
        <View style={styles.avatarWrap}>
          <Animated.View
            style={[
              styles.avatar,
              { opacity: pulse, backgroundColor: SHIMMER },
            ]}
          />
        </View>
        {bar}
        <Animated.View
          style={[
            styles.bioLine,
            { opacity: pulse, backgroundColor: SHIMMER_MID },
          ]}
        />
        <View style={styles.statsRow}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.statCell}>
              <Animated.View
                style={[
                  styles.statNum,
                  { opacity: pulse, backgroundColor: SHIMMER },
                ]}
              />
              <Animated.View
                style={[
                  styles.statLabel,
                  { opacity: pulse, backgroundColor: SHIMMER_MID },
                ]}
              />
            </View>
          ))}
        </View>
        <View style={styles.ctaRow}>
          <Animated.View
            style={[
              styles.btnWide,
              { opacity: pulse, backgroundColor: SHIMMER },
            ]}
          />
          <Animated.View
            style={[
              styles.btnWide,
              { opacity: pulse, backgroundColor: SHIMMER_MID },
            ]}
          />
        </View>
        <View style={styles.tabRow}>
          <Animated.View
            style={[
              styles.tabIcon,
              { opacity: pulse, backgroundColor: SHIMMER },
            ]}
          />
          <Animated.View
            style={[
              styles.tabIcon,
              { opacity: pulse, backgroundColor: SHIMMER_MID },
            ]}
          />
        </View>
        <View style={styles.gridRow}>
          {[0, 1, 2].map(c => (
            <View key={c} style={styles.gridCol}>
              {[0, 1, 2].map(r => (
                <Animated.View
                  key={`${String(c)}-${String(r)}`}
                  style={[
                    styles.tile,
                    { opacity: pulse, backgroundColor: SHIMMER },
                  ]}
                />
              ))}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  body: {
    paddingTop: 8,
  },
  placeholderRight: {
    opacity: 0,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  circleSm: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  titleBar: {
    flex: 1,
    height: 18,
    marginHorizontal: 12,
    borderRadius: 6,
    maxWidth: 160,
    alignSelf: 'center',
  },
  avatarWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
  },
  shimmerBlock: {
    alignSelf: 'center',
    width: 140,
    height: 18,
    borderRadius: 6,
    marginBottom: 10,
  },
  bioLine: {
    alignSelf: 'center',
    width: '88%',
    height: 14,
    borderRadius: 4,
    marginBottom: 22,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statNum: {
    width: 48,
    height: 18,
    borderRadius: 4,
  },
  statLabel: {
    width: 56,
    height: 12,
    borderRadius: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  btnWide: {
    flex: 1,
    height: 48,
    borderRadius: 28,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 8,
  },
  tabIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
  },
  gridCol: {
    flex: 1,
    gap: 5,
    maxWidth: 120,
  },
  tile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
  },
});
