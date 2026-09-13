import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import FastImage, { type ResizeMode } from '@d11/react-native-fast-image';
import UserPlaceholderSvg from '../../../assets/svg/userPlaceholder.svg';
import { useTheme } from '../../theme';

type Props = {
  uri?: string | null;
  style?: StyleProp<ViewStyle>;
  resizeMode?: ResizeMode;
  accessibilityLabel?: string;
  /** Primary-color ring when the user has active (non-expired) stories. */
  showStoryRing?: boolean;
  /** Defaults to theme accent when `showStoryRing` is true. */
  storyRingColor?: string;
  /**
   * Spacer color between the accent ring and the avatar (typical “story” UI).
   * @default '#FFFFFF'
   */
  storyRingGapColor?: string;
};

/** Visible accent stroke (px). */
export const STORY_RING_STROKE_PX = 4;
/** Inner gap between stroke and avatar (px). */
export const STORY_RING_GAP_PX = 2;

/** Total diameter increase vs avatar when `showStoryRing` is on (stroke + gap, both sides). */
export function storyRingOuterDiameter(avatarDiameter: number): number {
  return avatarDiameter + 2 * STORY_RING_GAP_PX + 2 * STORY_RING_STROKE_PX;
}

export function UserAvatar({
  uri,
  style,
  resizeMode = 'cover',
  accessibilityLabel,
  showStoryRing = false,
  storyRingColor,
  storyRingGapColor = '#FFFFFF',
}: Props) {
  const theme = useTheme();
  const [loadFailed, setLoadFailed] = useState(false);
  const trimmed = uri?.trim() ?? '';
  const hasUri = trimmed.length > 0;

  useEffect(() => {
    setLoadFailed(false);
  }, [trimmed]);

  const { w, h, ringColor, outerRadius, gapOuterRadius } = useMemo(() => {
    const f = StyleSheet.flatten(style) ?? {};
    const wNum = typeof f.width === 'number' ? f.width : 44;
    const hNum = typeof f.height === 'number' ? f.height : 44;
    const dim = Math.min(wNum, hNum);
    const rc =
      storyRingColor ?? (showStoryRing ? theme.colors.accent : undefined);
    const outerD = storyRingOuterDiameter(dim);
    const outerR = outerD / 2;
    const gapOuterR = (dim + 2 * STORY_RING_GAP_PX) / 2;
    return {
      w: wNum,
      h: hNum,
      ringColor: rc,
      outerRadius: outerR,
      gapOuterRadius: gapOuterR,
    };
  }, [style, showStoryRing, storyRingColor, theme.colors.accent]);

  const showRemote = hasUri && !loadFailed;

  const avatarInner = (
    <>
      {showRemote ? (
        <FastImage
          key={trimmed}
          source={{
            uri: trimmed,
            priority: FastImage.priority.normal,
          }}
          style={StyleSheet.absoluteFill}
          resizeMode={resizeMode}
          onError={() => setLoadFailed(true)}
        />
      ) : (
        <UserPlaceholderSvg width={w} height={h} />
      )}
    </>
  );

  if (showStoryRing && ringColor) {
    return (
      <View
        style={{
          backgroundColor: ringColor,
          padding: STORY_RING_STROKE_PX,
          borderRadius: outerRadius,
          alignSelf: 'center',
        }}
        accessibilityLabel={accessibilityLabel}
        accessibilityIgnoresInvertColors
      >
        <View
          style={{
            backgroundColor: storyRingGapColor,
            padding: STORY_RING_GAP_PX,
            borderRadius: gapOuterRadius,
          }}
        >
          <View style={[styles.clip, style]} accessibilityIgnoresInvertColors>
            {avatarInner}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.clip, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityIgnoresInvertColors
    >
      {avatarInner}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: {
    overflow: 'hidden',
  },
});
