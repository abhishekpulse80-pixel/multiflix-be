import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet } from 'react-native';

const TRACK_W = 48;
const TRACK_H = 28;
const KNOB = 22;
const PAD = 3;
const ON_COLOR = '#246BFD';
const OFF_COLOR = '#E5E5EA';

type Props = {
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Custom switch with fixed cross-platform dimensions — the native RN `Switch`
 * renders at different sizes per platform (and clipped on iOS in tight
 * containers), so we use this for consistent layout and styling.
 */
export function Toggle({ value, onValueChange, disabled = false }: Props) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: value ? 1 : 0,
      duration: 180,
      // Animating backgroundColor isn't native-driver compatible.
      useNativeDriver: false,
    }).start();
  }, [value, anim]);

  const backgroundColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [OFF_COLOR, ON_COLOR],
  });
  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, TRACK_W - KNOB - PAD * 2],
  });

  return (
    <Pressable
      onPress={() => {
        if (!disabled) onValueChange(!value);
      }}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      style={disabled ? styles.disabled : undefined}>
      <Animated.View style={[styles.track, { backgroundColor }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX }] }]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    padding: PAD,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  disabled: {
    opacity: 0.5,
  },
});
