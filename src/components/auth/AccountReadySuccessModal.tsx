import type { NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';

const LINK = '#246BFD';
const CORAL = '#FF8A9B';

const HERO = 132;

const DECOR = [
  { t: 4, l: 8, s: 5, o: 0.75 },
  { t: 0, l: 52, s: 6, o: 0.85 },
  { t: 10, l: 108, s: 7, o: 0.9 },
  { t: 48, l: 0, s: 4, o: 0.55 },
  { t: 56, l: 124, s: 5, o: 0.65 },
  { t: 96, l: 6, s: 8, o: 0.8 },
  { t: 118, l: 72, s: 6, o: 0.7 },
  { t: 78, l: 108, s: 5, o: 0.6 },
  { t: 28, l: 96, s: 4, o: 0.5 },
  { t: 100, l: 40, s: 5, o: 0.72 },
] as const;

const RING_COUNT = 8;
const RING_BOX = 64;
const RING_R = 22;

type Props = {
  visible: boolean;
  navigation: NavigationProp<RootStackParamList>;
  redirectMs?: number;
};

function PersonGlyph() {
  return (
    <Svg width={44} height={44} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </Svg>
  );
}

function CoralRingSpinner() {
  const anims = useRef(
    Array.from({ length: RING_COUNT }, () => new Animated.Value(0.35)),
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

  const cx = RING_BOX / 2;
  const cy = RING_BOX / 2;

  return (
    <View style={ringStyles.wrap}>
      {anims.map((anim, i) => {
        const angle = -Math.PI / 2 + (2 * Math.PI * i) / RING_COUNT;
        const base = 4 + (i % 3);
        const x = cx + RING_R * Math.cos(angle) - base / 2;
        const y = cy + RING_R * Math.sin(angle) - base / 2;
        return (
          <Animated.View
            key={i}
            style={[
              ringStyles.dot,
              {
                width: base + 1,
                height: base + 1,
                borderRadius: (base + 1) / 2,
                left: x,
                top: y,
                backgroundColor: CORAL,
                opacity: anim,
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0.35, 1],
                      outputRange: [0.88, 1.12],
                    }),
                  },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: {
    width: RING_BOX,
    height: RING_BOX,
    position: 'relative',
    alignSelf: 'center',
  },
  dot: {
    position: 'absolute',
  },
});

export function AccountReadySuccessModal({
  visible,
  navigation,
  redirectMs = 2800,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const goHome = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const tmr = setTimeout(goHome, redirectMs);
    return () => clearTimeout(tmr);
  }, [visible, goHome, redirectMs]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={goHome}>
      <View style={styles.scrim}>
        <View style={[styles.card, { paddingBottom: 24 + insets.bottom }]}>
          <View style={[styles.heroArea, { width: HERO, height: HERO }]}>
            {DECOR.map((d, i) => (
              <View
                key={i}
                style={[
                  styles.decorDot,
                  {
                    top: d.t,
                    left: d.l,
                    width: d.s,
                    height: d.s,
                    borderRadius: d.s / 2,
                    opacity: d.o,
                  },
                ]}
              />
            ))}
            <View style={styles.personRing}>
              <PersonGlyph />
            </View>
          </View>

          <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
            Congratulations!
          </Text>
          <Text style={[styles.body, { fontFamily: t.fontFamily.regular }]}>
            Your account is ready to use. You will be redirected to the Home
            page in a few seconds..
          </Text>
          <View style={styles.dots}>
            <CoralRingSpinner />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 36,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  heroArea: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decorDot: {
    position: 'absolute',
    backgroundColor: LINK,
  },
  personRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: LINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    color: LINK,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 24,
  },
  dots: {
    marginTop: 4,
  },
});
