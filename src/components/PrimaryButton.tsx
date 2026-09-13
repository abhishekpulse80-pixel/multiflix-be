import React from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

type Props = {
  label: string;
  onPress: () => void | Promise<void>;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  /** Soft colored shadow (auth CTAs) */
  elevated?: boolean;
  disabled?: boolean;
};

export function PrimaryButton({
  label,
  onPress,
  style,
  labelStyle,
  elevated = false,
  disabled = false,
}: Props) {
  const t = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) {
          return;
        }
        try {
          const out = onPress();
          if (
            out != null &&
            typeof (out as PromiseLike<void>).then === 'function'
          ) {
            void (out as PromiseLike<void>).then(null, err => {
              // eslint-disable-next-line no-console
              console.warn('[PrimaryButton] onPress rejected', err);
            });
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[PrimaryButton] onPress threw', err);
        }
      }}
      style={({ pressed }) => [
        styles.base,
        elevated &&
          Platform.OS === 'ios' && {
            shadowColor: t.colors.accent,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.22,
            shadowRadius: 18,
          },
        elevated && Platform.OS === 'android' && { elevation: 8 },
        {
          backgroundColor: t.colors.accent,
          opacity: disabled ? 0.55 : pressed ? 0.88 : 1,
        },
        style,
      ]}>
      <Text
        style={[
          styles.label,
          { fontFamily: t.fontFamily.semibold },
          labelStyle,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
