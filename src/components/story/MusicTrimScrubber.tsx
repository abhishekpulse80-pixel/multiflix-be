import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { G, Path, Rect } from 'react-native-svg';
import Video, {
  type OnProgressData,
  type VideoRef,
} from 'react-native-video';

/**
 * 15-second music trim scrubber with a deterministic dummy waveform.
 *
 * The waveform is generated client-side from a hash of `trackId`, so the
 * same track always renders the same shape. This is intentional — peaks
 * extraction is not done on the backend (kept simple per Subtask 2 spec).
 *
 * Interaction model (Instagram-style): the waveform is conceptually
 * `(durationMs / 15000) × viewportWidth` pixels wide. The user-visible
 * area is exactly the 15-second window. Dragging horizontally pans the
 * waveform behind that fixed viewport — bars literally slide in from the
 * right (later in song) or left (earlier). A hidden Video element plays
 * a looping preview of the current window.
 */

/** Default window length used when callers don't pass `windowMs`. */
export const MUSIC_TRIM_MS = 15_000;
/** Bar density per 15s window (kept constant so any track length feels uniform). */
const BAR_COUNT_PER_WINDOW = 28;
const WAVEFORM_HEIGHT = 56;
const HORIZONTAL_PADDING = 16;

export type MusicTrimScrubberProps = {
  trackId: string;
  audioUrl: string;
  /** Total duration of the source track in seconds. */
  durationSeconds: number;
  /** Current trim window start, in milliseconds (controlled). */
  trimStartMs: number;
  onTrimStartChange: (ms: number) => void;
  /**
   * Trim window length in ms. Defaults to 15 000 (story behavior).
   * Posts pass a larger value: 30 000 for images, up to 60 000 for video.
   */
  windowMs?: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Stable 32-bit hash of a string (djb2-ish). */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

function seededRandom(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

/**
 * Generate a fake but musical-looking peaks array (range 0..1) deterministic
 * for a given trackId. Mixes a slow sine envelope with seeded noise so the
 * shape feels rhythmic rather than purely random.
 */
function generatePeaks(trackId: string, count: number): number[] {
  const rand = seededRandom(hashString(trackId));
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const envelope = 0.45 + 0.35 * Math.sin(i * 0.35);
    const wobble = 0.15 * Math.sin(i * 1.2);
    const noise = rand() * 0.45;
    const v = envelope + wobble + noise * 0.6 - 0.2;
    peaks.push(Math.max(0.12, Math.min(1, v)));
  }
  return peaks;
}

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m)}:${s.toString().padStart(2, '0')}`;
}

// ─── Icons ──────────────────────────────────────────────────────────────────

function PlayIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 5v14l11-7z" fill="#FFFFFF" />
    </Svg>
  );
}

function PauseIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="#FFFFFF" />
    </Svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MusicTrimScrubber({
  trackId,
  audioUrl,
  durationSeconds,
  trimStartMs,
  onTrimStartChange,
  windowMs,
}: MusicTrimScrubberProps) {
  const windowMsValue = windowMs ?? MUSIC_TRIM_MS;
  const totalMs = Math.max(windowMsValue, Math.round(durationSeconds * 1000));
  const maxStartMs = Math.max(0, totalMs - windowMsValue);
  /** Track is shorter than (or equal to) the window → nothing to trim. */
  const canScrub = maxStartMs > 0;

  // Bar count scales with track length so density stays the same as in
  // the 15s viewport. Capped to keep SVG node count reasonable.
  const totalBars = useMemo(() => {
    const raw = Math.ceil((totalMs / windowMsValue) * BAR_COUNT_PER_WINDOW);
    return Math.max(BAR_COUNT_PER_WINDOW, Math.min(raw, 600));
  }, [totalMs]);
  const peaks = useMemo(
    () => generatePeaks(trackId, totalBars),
    [trackId, totalBars],
  );

  const videoRef = useRef<VideoRef>(null);
  const [playing, setPlaying] = useState(false);
  const [waveformWidth, setWaveformWidth] = useState(0);

  const startMsRef = useRef(trimStartMs);
  startMsRef.current = trimStartMs;

  // ── Drag handling ─────────────────────────────────────────────────────────
  // Drag the WAVEFORM (not the window). Drag right → expose earlier content
  // → trimStartMs decreases. Drag left → expose later content → increases.
  const dragStartMsRef = useRef(0);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => canScrub,
        onMoveShouldSetPanResponder: () => canScrub,
        onPanResponderGrant: () => {
          dragStartMsRef.current = startMsRef.current;
        },
        onPanResponderMove: (_e, g) => {
          if (waveformWidth <= 0) return;
          // The 15s window covers the full viewport width, so this px-to-ms
          // ratio matches the visible bar speed exactly (1:1 with the finger).
          const msPerPx = windowMsValue / waveformWidth;
          const next = Math.round(dragStartMsRef.current - g.dx * msPerPx);
          const clamped = Math.max(0, Math.min(maxStartMs, next));
          if (clamped !== startMsRef.current) {
            onTrimStartChange(clamped);
          }
        },
        onPanResponderRelease: () => {
          if (playing) {
            videoRef.current?.seek(startMsRef.current / 1000);
          }
        },
      }),
    [canScrub, maxStartMs, onTrimStartChange, playing, waveformWidth],
  );

  // ── Preview audio loop within the 15s window ─────────────────────────────
  const handleProgress = (data: OnProgressData) => {
    const startSec = startMsRef.current / 1000;
    const endSec = startSec + windowMsValue / 1000;
    if (data.currentTime >= endSec || data.currentTime < startSec - 0.25) {
      videoRef.current?.seek(startSec);
    }
  };

  // Pause when the source track changes.
  useEffect(() => {
    setPlaying(false);
  }, [trackId, audioUrl]);

  const handleTogglePlay = () => {
    if (!playing) {
      videoRef.current?.seek(trimStartMs / 1000);
    }
    setPlaying((p) => !p);
  };

  // ── Layout math ───────────────────────────────────────────────────────────
  const pxPerMs = waveformWidth > 0 ? waveformWidth / windowMsValue : 0;
  const fullWaveformWidth = pxPerMs * totalMs;
  const xOffset = -trimStartMs * pxPerMs;
  const barSpacing = totalBars > 0 ? fullWaveformWidth / totalBars : 0;
  const barWidth = Math.max(1.5, barSpacing * 0.5);

  const startSec = trimStartMs / 1000;
  const endSec = Math.min(durationSeconds, startSec + windowMsValue / 1000);

  return (
    <View style={styles.container}>
      {/* Hidden audio source */}
      <Video
        ref={videoRef}
        source={{ uri: audioUrl }}
        paused={!playing}
        onProgress={handleProgress}
        progressUpdateInterval={120}
        repeat
        playInBackground={false}
        playWhenInactive={false}
        style={styles.hiddenVideo}
      />

      {/* Play / Pause + Waveform row */}
      <View style={styles.row}>
        <Pressable
          onPress={handleTogglePlay}
          accessibilityRole="button"
          accessibilityLabel={playing ? 'Pause preview' : 'Play preview'}
          style={styles.playBtn}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Pressable>

        <View
          style={styles.waveformWrap}
          onLayout={(e) => {
            setWaveformWidth(e.nativeEvent.layout.width);
          }}
          {...panResponder.panHandlers}
        >
          {waveformWidth > 0 ? (
            <Svg width={waveformWidth} height={WAVEFORM_HEIGHT}>
              {/* Pink translucent fill — the entire viewport IS the selection. */}
              <Rect
                x={0}
                y={0}
                width={waveformWidth}
                height={WAVEFORM_HEIGHT}
                rx={10}
                fill="rgba(36,107,253,0.12)"
              />
              {/* Waveform bars, translated horizontally based on trimStartMs.
                  Bars outside the SVG viewport are naturally clipped. */}
              <G x={xOffset}>
                {peaks.map((p, i) => {
                  const cx = (i + 0.5) * barSpacing;
                  // Skip bars far outside viewport (perf for long tracks).
                  const visibleX = cx + xOffset;
                  if (visibleX < -barWidth || visibleX > waveformWidth + barWidth) {
                    return null;
                  }
                  const barH = Math.max(2, p * WAVEFORM_HEIGHT * 0.85);
                  return (
                    <Rect
                      key={i}
                      x={cx - barWidth / 2}
                      y={(WAVEFORM_HEIGHT - barH) / 2}
                      width={barWidth}
                      height={barH}
                      rx={barWidth / 2}
                      fill="#246BFD"
                    />
                  );
                })}
              </G>
              {/* Pink outline marks the fixed 15s viewport. */}
              <Rect
                x={0.5}
                y={0.5}
                width={waveformWidth - 1}
                height={WAVEFORM_HEIGHT - 1}
                rx={10}
                stroke="#246BFD"
                strokeWidth={1.5}
                fill="transparent"
              />
            </Svg>
          ) : null}

          {/* Edge "more content" hints (only when there's something to scroll to). */}
          {canScrub && trimStartMs > 0 ? (
            <View style={[styles.edgeHint, styles.edgeHintLeft]} pointerEvents="none" />
          ) : null}
          {canScrub && trimStartMs < maxStartMs ? (
            <View style={[styles.edgeHint, styles.edgeHintRight]} pointerEvents="none" />
          ) : null}
        </View>
      </View>

      {/* Time labels */}
      <View style={styles.times}>
        <Text style={styles.timeLabel}>{formatMs(trimStartMs)}</Text>
        <Text style={styles.windowLabel}>
          {canScrub
            ? `${String(Math.round(windowMsValue / 1000))}s clip`
            : 'Whole song'}
        </Text>
        <Text style={styles.timeLabel}>{formatMs(endSec * 1000)}</Text>
      </View>

      <Text style={styles.hint}>
        {canScrub
          ? `Drag the waveform to pick your ${String(
              Math.round(windowMsValue / 1000),
            )}s clip`
          : 'Song is shorter than the clip — using the whole track'}
      </Text>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 12,
  },
  hiddenVideo: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#246BFD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveformWrap: {
    flex: 1,
    height: WAVEFORM_HEIGHT,
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 10,
  },
  edgeHint: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  edgeHintLeft: {
    left: 0,
  },
  edgeHintRight: {
    right: 0,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 56, // align with waveform start (play button width + gap)
  },
  timeLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontVariant: ['tabular-nums'],
  },
  windowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#246BFD',
  },
  hint: {
    marginTop: 8,
    paddingLeft: 56,
    fontSize: 12,
    color: '#9CA3AF',
  },
});
