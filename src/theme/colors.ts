/**
 * Color tokens — adjust when matching provided screenshots.
 * Dark-first palette typical for video / streaming surfaces.
 */

export const palette = {
  // Neutrals
  black: '#0A0A0A',
  gray950: '#121212',
  gray900: '#1A1A1A',
  gray850: '#222222',
  gray800: '#2A2A2A',
  gray700: '#3D3D3D',
  gray600: '#5C5C5C',
  gray500: '#8A8A8A',
  gray400: '#B3B3B3',
  gray300: '#D1D1D1',
  gray200: '#E8E8E8',
  gray100: '#F4F4F4',
  white: '#FFFFFF',

  /** Light onboarding / marketing UI */
  brandBlue: '#3B71FE',
  brandBlueSoft: 'rgba(59, 113, 254, 0.12)',

  // Brand / accent (swap hex to match brand from designs)
  primary: '#E50914',
  primaryMuted: '#B81D24',
  primarySoft: 'rgba(229, 9, 20, 0.16)',

  // Semantic
  success: '#2ECC71',
  warning: '#F5A623',
  error: '#E50914',
  info: '#3B82F6',

  // Overlays (hero images, modals)
  overlayStrong: 'rgba(0, 0, 0, 0.72)',
  overlayMedium: 'rgba(0, 0, 0, 0.48)',
  overlayLight: 'rgba(0, 0, 0, 0.24)',
  scrimBottom: 'rgba(0, 0, 0, 0.85)',
} as const;

export type Palette = typeof palette;
