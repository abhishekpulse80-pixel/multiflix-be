import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Video, {
  type OnLoadData,
  type VideoRef,
} from 'react-native-video';
import Svg, { Path } from 'react-native-svg';
import { VIDEO_BUFFER_CONFIG } from '../../utils/videoBufferConfig';
import { useAdaptiveMediaUrl } from '../../hooks/useAdaptiveMediaUrl';
import { useAppSelector } from '../../store/hooks';
import { selectAccessToken } from '../../store/selectors';

type Props = {
  uri: string;
  /** Poster / thumbnail image shown while video is loading. */
  posterUri?: string;
  style?: StyleProp<ViewStyle>;
  /** When true the video plays; when false it pauses. */
  isVisible?: boolean;
  /** Muted playback — useful for grid previews. Default false. */
  muted?: boolean;
  /** Loop playback. Default true. */
  loop?: boolean;
  /** Show play/pause tap overlay. Default true. */
  showControls?: boolean;
  /** Cover or contain. Default 'cover'. */
  resizeMode?: 'cover' | 'contain' | 'stretch';
  /** Fires whenever the video's loading/buffering state changes. */
  onLoadingChange?: (loading: boolean) => void;
  /** Fires on double-tap. When provided, a double-tap suppresses play/pause toggle. */
  onDoubleTap?: () => void;
  /**
   * Fires whenever the *effective* paused state changes — i.e. when the
   * user toggles play/pause via the tap overlay or when `isVisible` flips.
   * Used by FeedPost to keep curated music in sync with the video.
   */
  onPauseChange?: (paused: boolean) => void;
};

function PlayIcon({ size = 48 }: { size?: number }) {
  return (
    <View
      style={[
        playStyles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Svg
        width={size * 0.4}
        height={size * 0.4}
        viewBox="0 0 24 24"
        fill="#FFFFFF"
      >
        <Path d="M8 5v14l11-7z" />
      </Svg>
    </View>
  );
}

function PauseIcon({ size = 48 }: { size?: number }) {
  return (
    <View
      style={[
        playStyles.circle,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Svg
        width={size * 0.35}
        height={size * 0.35}
        viewBox="0 0 24 24"
        fill="#FFFFFF"
      >
        <Path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
      </Svg>
    </View>
  );
}

export function FeedVideo({
  uri,
  posterUri,
  style,
  isVisible = true,
  muted = false,
  loop = true,
  showControls = true,
  resizeMode = 'cover',
  onLoadingChange,
  onDoubleTap,
  onPauseChange,
}: Props) {
  const videoRef = useRef<VideoRef>(null);
  const token = useAppSelector(selectAccessToken);
  // Resolve and cache the adaptive URL for future playback, but keep this
  // native player on one stable source for its entire lifetime. Changing a
  // react-native-video source while ExoPlayer is rendering can crash Android.
  useAdaptiveMediaUrl(uri, 'video', token, isVisible);
  const [manualPaused, setManualPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showIcon, setShowIcon] = useState(false);
  const [layout, setLayout] = useState<{ w: number; h: number } | null>(null);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const paused = !isVisible || manualPaused;

  useEffect(() => {
    return () => {
      if (iconTimer.current) clearTimeout(iconTimer.current);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    };
  }, []);

  useEffect(() => {
    if (isVisible) setLoading(true);
  }, [isVisible]);

  // Notify the parent when the effective paused state changes so it can
  // keep curated music in lockstep with the video.
  useEffect(() => {
    onPauseChange?.(paused);
  }, [paused, onPauseChange]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width: w, height: h } = e.nativeEvent.layout;
    if (w > 0 && h > 0) {
      setLayout({ w, h });
    }
  }, []);

  const onLoad = useCallback(
    (_data: OnLoadData) => {
      setLoading(false);
      onLoadingChange?.(false);
    },
    [onLoadingChange],
  );

  const onBuffer = useCallback(
    ({ isBuffering }: { isBuffering: boolean }) => {
      setLoading(isBuffering);
      onLoadingChange?.(isBuffering);
    },
    [onLoadingChange],
  );

  const runSingleTap = useCallback(() => {
    if (!showControls) return;
    setManualPaused(prev => !prev);

    // Flash the play/pause icon briefly
    setShowIcon(true);
    if (iconTimer.current) clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => setShowIcon(false), 800);
  }, [showControls]);

  const handleTap = useCallback(() => {
    const now = Date.now();

    // Double-tap detection (within 300ms) — cancel pending single-tap, fire onDoubleTap.
    if (onDoubleTap && now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      onDoubleTap();
      return;
    }
    lastTapRef.current = now;

    // When onDoubleTap is set, defer single-tap so a 2nd tap can cancel it.
    if (onDoubleTap) {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        runSingleTap();
      }, 300);
      return;
    }

    runSingleTap();
  }, [onDoubleTap, runSingleTap]);

  return (
    <View style={[styles.root, style]} onLayout={onLayout}>
      {layout && isVisible ? (
        <View style={{ width: layout.w, height: layout.h }}>
          <Video
            ref={videoRef}
            source={{
              uri,
              shouldCache: true,
              bufferConfig: VIDEO_BUFFER_CONFIG,
            }}
            style={StyleSheet.absoluteFill}
            resizeMode={resizeMode}
            repeat={loop}
            paused={paused}
            muted={muted}
            playInBackground={false}
            playWhenInactive={false}
            onLoad={onLoad}
            onBuffer={onBuffer}
          />
        </View>
      ) : null}

      {/* Tap overlay */}
      {(showControls || onDoubleTap) && (
        <Pressable style={StyleSheet.absoluteFill} onPress={handleTap}>
          {showIcon && (
            <View style={styles.iconOverlay} pointerEvents="none">
              {paused ? <PlayIcon /> : <PauseIcon />}
            </View>
          )}
        </Pressable>
      )}

      {/* Poster + loading spinner while video loads */}
      {loading && (
        <View style={styles.posterOverlay} pointerEvents="none">
          {posterUri ? (
            <FastImage
              source={{ uri: posterUri, priority: FastImage.priority.high }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
          ) : null}
          {isVisible && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  iconOverlay: {
    ...(StyleSheet.absoluteFill as object),
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterOverlay: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#000',
  },
  loadingOverlay: {
    ...(StyleSheet.absoluteFill as object),
    justifyContent: 'center',
    alignItems: 'center',
  },
});

const playStyles = StyleSheet.create({
  circle: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
