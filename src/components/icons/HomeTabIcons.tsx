import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { size?: number; color: string };

export function HomeTabHouseIcon({
  size = 24,
  color,
  active = false,
}: Props & { active?: boolean }) {
  if (active) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M9 22V12h6v10"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Compass — music tab */
export function HomeTabMusicIcon({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth={1.8} />
      <Path
        d="M16.5 7.5l-2.2 6.5-6.5 2.2 2.2-6.5 6.5-2.2z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/**
 * Trending — Lucide “flame” outline (single path, matches stroke weight of other tab icons).
 * @see https://github.com/lucide-icons/lucide/blob/main/icons/flame.svg
 */
export function HomeTabTrendingIcon({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** Microphone on stand — blogging */
export function HomeTabBloggingIcon({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a3 3 0 013 3v5a3 3 0 11-6 0V6a3 3 0 013-3z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M19 11a7 7 0 01-14 0"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 18v3M9 21h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function HomeTabProfileIcon({ size = 24, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
        stroke={color}
        strokeWidth={1.8}
      />
    </Svg>
  );
}
