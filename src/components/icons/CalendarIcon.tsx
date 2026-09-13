import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

type Props = { size?: number; color: string };

export function CalendarIcon({ size = 22, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M8 3v4M16 3v4M3 11h18"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}
