import React, { useCallback, useRef } from 'react';
import Video, {
  type OnProgressData,
  type VideoRef,
} from 'react-native-video';
import { useAdaptiveMediaUrl } from '../../hooks/useAdaptiveMediaUrl';
import { useAppSelector } from '../../store/hooks';
import { selectAccessToken } from '../../store/selectors';

/**
 * Hidden audio player for an attached music track.
 *
 * On load it seeks to `trimStartMs` and starts looping within the trim
 * window via `onProgress`. The window size defaults to 15 s (matching the
 * story / post music spec) and is configurable for future longer windows.
 *
 * Pauses with the host screen via the `paused` prop. The Video element
 * itself is rendered 0×0 and absolutely positioned so it never affects
 * layout of the consumer.
 */
export type MediaMusicPlayerProps = {
  audioUrl: string;
  trimStartMs: number;
  paused: boolean;
  /** Window length in ms — default 15 000. */
  windowMs?: number;
  /** Fired once when the audio is ready (gate auto-hide timers, etc.). */
  onReady?: () => void;
};

const DEFAULT_WINDOW_MS = 15_000;
const HIDDEN_STYLE = {
  width: 0,
  height: 0,
  position: 'absolute' as const,
};

export function MediaMusicPlayer({
  audioUrl,
  trimStartMs,
  paused,
  windowMs = DEFAULT_WINDOW_MS,
  onReady,
}: MediaMusicPlayerProps) {
  const ref = useRef<VideoRef>(null);
  const token = useAppSelector(selectAccessToken);
  // Warm the adaptive cache without swapping the native audio source while
  // the hidden player is active; source swaps can crash Android media codecs.
  useAdaptiveMediaUrl(audioUrl, 'audio', token);
  const startSec = trimStartMs / 1000;
  const endSec = startSec + windowMs / 1000;

  const handleLoad = useCallback(() => {
    ref.current?.seek(startSec);
    onReady?.();
  }, [startSec, onReady]);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      if (data.currentTime >= endSec || data.currentTime < startSec - 0.25) {
        ref.current?.seek(startSec);
      }
    },
    [endSec, startSec],
  );

  return (
    <Video
      ref={ref}
      source={{ uri: audioUrl }}
      paused={paused}
      onLoad={handleLoad}
      onProgress={handleProgress}
      progressUpdateInterval={150}
      repeat
      playInBackground={false}
      playWhenInactive={false}
      // ── Audio-session co-existence with the source video ────────────────
      // Without these flags, this hidden Video instance grabs Android audio
      // focus the moment it starts playing, which causes the visible
      // FeedVideo (rendered as a sibling) to pause after the first frame.
      // `disableFocus` skips the audio-focus request on Android; on iOS we
      // mark the session as `mix` so two AVPlayer instances can run side
      // by side. Same idea, two platforms.
      disableFocus
      mixWithOthers="mix"
      style={HIDDEN_STYLE}
    />
  );
}
