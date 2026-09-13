import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme';

const DOT_COUNT = 8;
const DOT_SIZE = 6;

type Props = {
  /** Override dot color (e.g. auth blue `#246BFD`). */
  accentColor?: string;
};

export function LoadingDots({ accentColor }: Props) {
  const t = useTheme();
  const dotColor = accentColor ?? t.colors.accent;
  const anims = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.35)),
  ).current;

  useEffect(() => {
    const loops = anims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 90),
          Animated.timing(v, {
            toValue: 1,
            duration: 320,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0.35,
            duration: 320,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [anims]);

  return (
    <View style={styles.row}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              opacity: anim,
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0.35, 1],
                    outputRange: [0.85, 1.15],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
