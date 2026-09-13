import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { palette } from '../../theme/colors';

// Legacy filled heart for the home feed like button — an SVG wrapping a
// base64 PNG didn't render reliably on Android, so we use a flat PNG.
const PinkHeartPng = require('../../../assets/images/pinkheart.png');

type Props = { size?: number; color: string };

export function FeedFlagIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 22V4a1 1 0 0 1 1-1h15l-3 6 3 6H5a1 1 0 0 1-1-1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FeedHeartIcon({
  size = 28,
  color,
  filled,
  // `png` (default): legacy pink PNG when filled — home feed like button.
  // `svg`: solid SVG heart filled with brand red — used in the blogging
  // section, painted on the Path so it can't render invisible on Android.
  variant = 'png',
  filledColor = palette.primary,
}: Props & {
  filled?: boolean;
  variant?: 'png' | 'svg';
  filledColor?: string;
}) {
  if (variant === 'svg') {
    const d =
      'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={filled ? filledColor : 'none'}
      >
        <Path
          d={d}
          stroke={filled ? filledColor : color}
          strokeWidth={1.8}
          fill={filled ? filledColor : 'none'}
        />
      </Svg>
    );
  }
  const d =
    'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z';
  if (filled) {
    return (
      <Image
        source={PinkHeartPng}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" />
    </Svg>
  );
}

export function FeedCommentIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function FeedBookmarkIcon({
  size = 26,
  color,
  filled,
}: Props & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
      <Path
        d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

export function FeedShareIcon({ size = 26, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Person + plus — used on recommendation “Follow” actions. */
export function FollowUserPlusIcon({ size = 18, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle
        cx="9"
        cy="7"
        r="4"
        stroke={color}
        strokeWidth={2}
        fill="none"
      />
      <Line
        x1="19"
        y1="8"
        x2="19"
        y2="14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="16"
        y1="11"
        x2="22"
        y2="11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
