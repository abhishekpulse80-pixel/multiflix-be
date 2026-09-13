import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useMusicPlayer } from '../../context/MusicPlayerContext';
import { useTheme } from '../../theme';

const BAR_HEIGHT = 64;
const ART_SIZE = 44;
const INK = '#0D0D0D';
const MUTED = '#6B6B6B';
const PURPLE = '#9333EA';
const SURFACE = '#FFFFFF';

function PlayIcon({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

function PauseIcon({ size = 22, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </Svg>
  );
}

function SkipPrevIcon({ size = 20, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 6h2v12H6V6zm11 1l-7 5 7 5V7z" />
    </Svg>
  );
}

function SkipNextIcon({ size = 20, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16 18h2V6h-2v12zM6 7l7 5-7 5V7z" />
    </Svg>
  );
}

/**
 * Compact persistent player rendered above the bottom tab bar on every music
 * tab screen except `MusicNowPlaying`. Tapping (anywhere except play/pause)
 * opens the full NowPlaying screen for the current track.
 */
export function MiniPlayer() {
  const t = useTheme();
  const player = useMusicPlayer();
  const nav = useNavigation();

  const visible = !!player.track && !player.nowPlayingFocused;

  const onOpenNowPlaying = useCallback(() => {
    if (!player.track) return;
    // MiniPlayer is rendered as a sibling of MusicStack.Navigator (so the
    // mini bar can sit above the inner stack). That means `useNavigation()`
    // here resolves to the *bottom-tab* navigator, not the music stack —
    // calling `navigate('MusicNowPlaying', ...)` directly throws "was not
    // handled by any navigator". We explicitly target the music tab and
    // forward the screen + params into its nested stack.
    (nav as unknown as {
      navigate: (
        name: string,
        params?: Record<string, unknown>,
      ) => void;
    }).navigate('music', {
      screen: 'MusicNowPlaying',
      params: {
        trackId: player.track.id,
        sourceAlbumId: player.sourceAlbumId ?? undefined,
      },
    });
  }, [nav, player.track, player.sourceAlbumId]);

  if (!visible || !player.track) {
    return null;
  }

  const progress =
    player.duration > 0
      ? Math.min(1, Math.max(0, player.currentTime / player.duration))
      : 0;

  const queueIdx = player.queue.findIndex(q => q.id === player.track?.id);
  const canPrev = queueIdx > 0;
  const canNext = queueIdx >= 0 && queueIdx < player.queue.length - 1;

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.bar}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Pressable
          onPress={onOpenNowPlaying}
          style={styles.tapArea}
          accessibilityRole="button"
          accessibilityLabel="Open Now Playing">
          <FastImage
            source={{ uri: player.track.artUri, priority: FastImage.priority.normal }}
            style={styles.art}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View style={styles.text}>
            <Text
              style={[styles.title, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={1}>
              {player.track.title}
            </Text>
            <Text
              style={[styles.artist, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={1}>
              {player.track.artist}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={player.goPrev}
          hitSlop={8}
          disabled={!canPrev}
          style={[styles.iconBtn, !canPrev && styles.iconBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Previous track"
          accessibilityState={{ disabled: !canPrev }}>
          <SkipPrevIcon color={canPrev ? INK : MUTED} />
        </Pressable>

        <Pressable
          onPress={player.togglePlay}
          hitSlop={10}
          style={styles.playBtn}
          accessibilityRole="button"
          accessibilityLabel={player.playing ? 'Pause' : 'Play'}>
          {player.playing ? <PauseIcon /> : <PlayIcon />}
        </Pressable>

        <Pressable
          onPress={player.goNext}
          hitSlop={8}
          disabled={!canNext}
          style={[styles.iconBtn, !canNext && styles.iconBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Next track"
          accessibilityState={{ disabled: !canNext }}>
          <SkipNextIcon color={canNext ? INK : MUTED} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: SURFACE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 6,
  },
  progressTrack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: PURPLE,
  },
  tapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  art: {
    width: ART_SIZE,
    height: ART_SIZE,
    borderRadius: 8,
    backgroundColor: '#E8E8ED',
  },
  text: {
    flex: 1,
    marginLeft: 12,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    color: INK,
  },
  artist: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  playBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  iconBtn: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: {
    opacity: 0.35,
  },
});
