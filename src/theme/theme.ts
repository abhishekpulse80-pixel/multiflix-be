import { palette } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { spacing } from './spacing';
import { fontFamily, fontSize, lineHeight, textStyles } from './typography';

/** Semantic colors for the default (dark) app shell */
const darkSemantic = {
  background: palette.black,
  surface: palette.gray950,
  surfaceElevated: palette.gray900,
  surfaceMuted: palette.gray850,
  border: palette.gray800,
  borderSubtle: palette.gray850,
  textPrimary: palette.white,
  textSecondary: palette.gray400,
  textMuted: palette.gray500,
  textInverse: palette.black,
  accent: palette.primary,
  accentMuted: palette.primaryMuted,
  accentSoft: palette.primarySoft,
  onAccent: palette.white,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  overlay: palette.overlayMedium,
  scrim: palette.scrimBottom,
} as const;

const lightSemantic = {
  background: palette.white,
  surface: palette.white,
  surfaceElevated: palette.white,
  surfaceMuted: palette.gray200,
  border: palette.gray300,
  borderSubtle: palette.gray200,
  textPrimary: palette.black,
  textSecondary: palette.gray600,
  textMuted: palette.gray500,
  textInverse: palette.white,
  accent: palette.brandBlue,
  accentMuted: '#2F5FE0',
  accentSoft: palette.brandBlueSoft,
  onAccent: palette.white,
  success: palette.success,
  warning: palette.warning,
  error: palette.error,
  info: palette.info,
  overlay: palette.overlayLight,
  scrim: palette.overlayStrong,
} as const;

export type ThemeColors = typeof darkSemantic | typeof lightSemantic;

export type Theme = {
  mode: 'light' | 'dark';
  colors: ThemeColors;
  palette: typeof palette;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  lineHeight: typeof lineHeight;
  textStyles: typeof textStyles;
};

export const darkTheme: Theme = {
  mode: 'dark',
  colors: darkSemantic,
  palette,
  spacing,
  radius,
  shadows,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
};

export const lightTheme: Theme = {
  mode: 'light',
  colors: lightSemantic,
  palette,
  spacing,
  radius,
  shadows,
  fontFamily,
  fontSize,
  lineHeight,
  textStyles,
};

/** Default: light shell (status bar + surfaces). */
export const defaultTheme = lightTheme;
