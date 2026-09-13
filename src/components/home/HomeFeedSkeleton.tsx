import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  width: number;
  height: number;
};

/** Full-screen placeholder while the first home feed request runs (no cache). */
export function HomeFeedSkeleton({ width, height }: Props) {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.65,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={[styles.root, { width, height }]} accessibilityLabel="Loading feed">
      <Animated.View style={[styles.shade, { opacity: pulse }]} />
      <ActivityIndicator color="#246BFD" size="large" style={styles.spinner} />
      <Text style={[styles.caption, { fontFamily: t.fontFamily.medium }]}>
        Loading your feed…
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#F5F5F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8E8ED',
  },
  spinner: {
    marginBottom: 16,
  },
  caption: {
    color: '#6B6B6B',
    fontSize: 15,
  },
});
