import React from 'react';
import Svg, { Path } from 'react-native-svg';

type Props = { size?: number; color: string };

export function LocationPinIcon({ size = 22, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21s7-4.35 7-10a7 7 0 1 0-14 0c0 5.65 7 10 7 10z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <Path
        d="M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        fill={color}
      />
    </Svg>
  );
}
