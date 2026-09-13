import type { TextStyle } from 'react-native';

type FontWeightName = TextStyle['fontWeight'];

/**
 * Linked TTFs in assets/fonts (react-native.config.js + npx react-native-asset).
 * Names match Android asset resolution (filename without extension).
 */
export const fontFamily = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semibold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
} as const;

export const fontSize = {
  '2xs': 10,
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  '5xl': 40,
} as const;

export const lineHeight = {
  tight: 1.15,
  normal: 1.35,
  relaxed: 1.5,
} as const;

/** Preset text styles — weight comes from font file, not fontWeight (Android-safe). */
export const textStyles = {
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['5xl'],
    fontWeight: 'normal' as FontWeightName,
    letterSpacing: -0.5,
  },
  headline: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize['3xl'],
    fontWeight: 'normal' as FontWeightName,
    letterSpacing: -0.25,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xl,
    fontWeight: 'normal' as FontWeightName,
  },
  subtitle: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.lg,
    fontWeight: 'normal' as FontWeightName,
  },
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.md,
    fontWeight: 'normal' as FontWeightName,
  },
  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    fontWeight: 'normal' as FontWeightName,
  },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    fontWeight: 'normal' as FontWeightName,
  },
  overline: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize['2xs'],
    fontWeight: 'normal' as FontWeightName,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as TextStyle['textTransform'],
  },
} as const satisfies Record<string, TextStyle>;

export type TextStyleKey = keyof typeof textStyles;
