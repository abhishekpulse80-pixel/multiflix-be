import { useIsFocused } from '@react-navigation/native';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  Event,
  State,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import {
  getCachedAudioUrl,
  prefetchTrackAudio,
} from '../services/musicCacheStorage';

/**
 * App-wide music player. Lifted above the MusicStack so audio survives
 * intra-tab navigation (Home → Album → NowPlaying → back) and only stops
 * when the user leaves the music tab.
 *
 * Uses react-native-track-player so playback survives the app being
 * backgrounded or the screen being locked. RNTP runs the audio in a
 * foreground service, exposes lock-screen / notification controls, and
 * forwards remote-control events through `musicPlaybackService` (registered
 * in `index.js`).
 *
 * RNTP owns the queue. The whole `queue` is pushed to the native player so
 * `skipToNext` / `skipToPrevious` (from the in-app controls and the
 * lock-screen / notification) operate on the same list. The active React
 * `track` is mirrored from `Event.PlaybackActiveTrackChanged` so the UI
 * stays in sync regardless of who initiated the change.
 */

export type MusicPlayerTrack = {
  id: string;
  audioUrl: string;
  title: string;
  artist: string;
  artUri: string;
  artistId: string | null;
};

type MusicPlayerState = {
  track: MusicPlayerTrack | null;
  /** Ordered list of tracks the player can step through (prev/next). */
  queue: MusicPlayerTrack[];
  /** The album the track was opened from (used when navigating into NowPlaying). */
  sourceAlbumId: string | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  /** True while MusicNowPlayingScreen is the focused screen. Drives MiniPlayer visibility. */
  nowPlayingFocused: boolean;
};

type MusicPlayerContextValue = MusicPlayerState & {
  /**
   * Load and start playing a track. The `queue` overrides any existing queue
   * (NowPlayingScreen recomputes it from the active album/recommended set).
   * No-op for the audio if `track.id` is already loaded and the queue
   * (by track ids) matches the previous queue.
   */
  loadTrack: (
    track: MusicPlayerTrack,
    queue: MusicPlayerTrack[],
    sourceAlbumId: string | null,
  ) => void;
  togglePlay: () => void;
  /** Absolute seek (clamped to [0, duration]). */
  seekTo: (seconds: number) => void;
  /** Relative seek (clamped). */
  skipBy: (deltaSeconds: number) => void;
  /** Step to the previous track in the queue, if any. */
  goPrev: () => void;
  /** Step to the next track in the queue, if any. */
  goNext: () => void;
  /** Optional callback when the current track finishes playing. */
  setOnTrackEnd: (cb: (() => void) | null) => void;
  /** Called by NowPlayingScreen on focus/blur to drive MiniPlayer visibility. */
  setNowPlayingFocused: (focused: boolean) => void;
};

const MusicPlayerContext = createContext<MusicPlayerContextValue | null>(null);

export function useMusicPlayer(): MusicPlayerContextValue {
  const ctx = useContext(MusicPlayerContext);
  if (!ctx) {
    throw new Error('useMusicPlayer must be used within MusicPlayerProvider');
  }
  return ctx;
}

let setupPromise: Promise<void> | null = null;
function ensurePlayerSetup(): Promise<void> {
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    try {
      // Buffer tuned for fast first-play. RNTP's defaults (minBuffer 50 s,
      // playBuffer 2.5 s) prioritise avoiding mid-track stalls but make the
      // first audio frame appear 3–5 s after `play()`. Lower thresholds get
      // sound out of the speaker much faster; the network keeps filling the
      // buffer in the background to `maxBuffer`.
      await TrackPlayer.setupPlayer({
        minBuffer: 5,
        maxBuffer: 30,
        playBuffer: 1,
        backBuffer: 0,
      });
    } catch (e) {
      // setupPlayer rejects with `player_already_initialized` on hot reloads;
      // any other error is genuine and should propagate.
      const code = (e as { code?: string } | null)?.code;
      if (code !== 'player_already_initialized') {
        setupPromise = null;
        throw e;
      }
    }
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.ContinuePlayback,
      },
      progressUpdateEventInterval: 0.5,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
    });
  })();
  return setupPromise;
}

async function toRntpTrack(t: MusicPlayerTrack) {
  // Prefer the on-disk copy if we cached it on a previous play / prefetch —
  // file:// URLs start playing instantly on slow networks.
  const cached = await getCachedAudioUrl(t.id).catch(() => null);
  return {
    id: t.id,
    url: cached ?? t.audioUrl,
    title: t.title,
    artist: t.artist,
    artwork: t.artUri,
  };
}

/** How many upcoming tracks to download into the cache while one plays. Kept
 * at 1 (just the immediate next track) so an actively-listening user gets a
 * gapless next-track handoff without speculatively pulling tracks they may
 * skip. */
const PREFETCH_LOOKAHEAD = 1;

export function MusicPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [track, setTrack] = useState<MusicPlayerTrack | null>(null);
  const [queue, setQueue] = useState<MusicPlayerTrack[]>([]);
  const [sourceAlbumId, setSourceAlbumId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [nowPlayingFocused, setNowPlayingFocused] = useState(false);

  const durationRef = useRef(0);
  const onTrackEndRef = useRef<(() => void) | null>(null);
  const queueRef = useRef<MusicPlayerTrack[]>([]);
  const playingRef = useRef(false);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  // Track id signature of what's currently loaded into RNTP, so we don't
  // re-push the same queue when only React-side details change.
  const appliedQueueSigRef = useRef<string>('');

  // Auto-pause when the music tab loses focus. Tab focus is independent of
  // app focus — backgrounding the device keeps the music tab focused, so
  // RNTP's foreground service keeps audio going. This only fires when the
  // user navigates to a different bottom tab.
  const isFocused = useIsFocused();
  useEffect(() => {
    if (!isFocused) {
      void TrackPlayer.pause();
    }
  }, [isFocused]);

  // One-time RNTP setup. The native player is a process-wide singleton, so
  // `ensurePlayerSetup` is idempotent across mounts (e.g. fast refresh).
  useEffect(() => {
    void ensurePlayerSetup();
  }, []);

  // Sync React queue + active track to RNTP. If the queue (by ids) matches
  // what's already loaded, we just `skip` to the new index — this preserves
  // the in-flight buffer when the user hops between tracks of the same
  // album. If the queue identity changed, we reset and re-add.
  useEffect(() => {
    if (!track || queue.length === 0) return;
    const targetIdx = queue.findIndex(q => q.id === track.id);
    if (targetIdx < 0) return;

    const sig = queue.map(q => q.id).join('|');
    let cancelled = false;

    void (async () => {
      await ensurePlayerSetup();
      if (cancelled) return;

      if (sig !== appliedQueueSigRef.current) {
        const rntpTracks = await Promise.all(queue.map(toRntpTrack));
        if (cancelled) return;
        await TrackPlayer.reset();
        if (cancelled) return;
        await TrackPlayer.add(rntpTracks);
        if (cancelled) return;
        appliedQueueSigRef.current = sig;
        if (targetIdx > 0) {
          await TrackPlayer.skip(targetIdx);
          if (cancelled) return;
        }
        const { state } = await TrackPlayer.getPlaybackState();
        if (
          state !== State.Playing &&
          state !== State.Buffering &&
          state !== State.Loading
        ) {
          await TrackPlayer.play();
        }
        return;
      }

      // Same queue, possibly different active track.
      const activeIdx = await TrackPlayer.getActiveTrackIndex();
      if (cancelled) return;
      if (activeIdx !== targetIdx) {
        await TrackPlayer.skip(targetIdx);
        if (cancelled) return;
        const { state } = await TrackPlayer.getPlaybackState();
        if (
          state !== State.Playing &&
          state !== State.Buffering &&
          state !== State.Loading
        ) {
          await TrackPlayer.play();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [track, queue]);

  // Cache upcoming tracks while the current one plays. Skips the active track
  // to avoid competing with RNTP's live stream on slow networks — the active
  // track lands in the cache naturally on a later session when it appears as
  // an upcoming queue item.
  useEffect(() => {
    if (!track || queue.length === 0) return;
    const idx = queue.findIndex(q => q.id === track.id);
    if (idx < 0) return;
    const end = Math.min(idx + 1 + PREFETCH_LOOKAHEAD, queue.length);
    for (let i = idx + 1; i < end; i++) {
      const t = queue[i];
      prefetchTrackAudio(t.id, t.audioUrl);
    }
  }, [track, queue]);

  // Subscribe to RNTP playback events. RNTP is the source of truth for
  // `playing`, `currentTime`, `duration`, and the active track — local state
  // is updated from these events, so remote-control actions (lock-screen,
  // headset) stay in sync.
  useTrackPlayerEvents(
    [
      Event.PlaybackState,
      Event.PlaybackProgressUpdated,
      Event.PlaybackActiveTrackChanged,
      Event.PlaybackQueueEnded,
    ],
    event => {
      switch (event.type) {
        case Event.PlaybackState: {
          const isActive =
            event.state === State.Playing ||
            event.state === State.Buffering ||
            event.state === State.Loading;
          playingRef.current = isActive;
          setPlaying(prev => (prev === isActive ? prev : isActive));
          break;
        }
        case Event.PlaybackProgressUpdated: {
          setCurrentTime(event.position);
          if (event.duration && event.duration !== durationRef.current) {
            durationRef.current = event.duration;
            setDuration(event.duration);
          }
          break;
        }
        case Event.PlaybackActiveTrackChanged: {
          // RNTP-driven track change (auto-advance, lock-screen prev/next,
          // or our own `skip`/`skipTo*` calls). Resolve the new track from
          // the queue by id and mirror it into React state.
          const newId = (event.track as { id?: string } | null | undefined)
            ?.id;
          if (!newId) break;
          const found = queueRef.current.find(q => q.id === newId);
          if (!found) break;
          setTrack(prev => (prev?.id === found.id ? prev : found));
          setCurrentTime(0);
          setDuration(0);
          durationRef.current = 0;
          break;
        }
        case Event.PlaybackQueueEnded: {
          setCurrentTime(0);
          void TrackPlayer.seekTo(0);
          onTrackEndRef.current?.();
          break;
        }
      }
    },
  );

  const loadTrack = useCallback(
    (
      next: MusicPlayerTrack,
      nextQueue: MusicPlayerTrack[],
      albumId: string | null,
    ) => {
      setSourceAlbumId(albumId);
      setQueue(nextQueue);
      setTrack(prev => (prev?.id === next.id ? prev : next));
    },
    [],
  );

  const goPrev = useCallback(() => {
    void TrackPlayer.skipToPrevious().catch(() => {
      /* start of queue — ignore */
    });
  }, []);

  const goNext = useCallback(() => {
    void TrackPlayer.skipToNext().catch(() => {
      /* end of queue — ignore */
    });
  }, []);

  const togglePlay = useCallback(() => {
    void (async () => {
      const isCurrentlyPlaying =
        playingRef.current ||
        (await TrackPlayer.getPlaybackState()).state === State.Playing ||
        (await TrackPlayer.getPlaybackState()).state === State.Buffering ||
        (await TrackPlayer.getPlaybackState()).state === State.Loading;

      if (isCurrentlyPlaying) {
        await TrackPlayer.pause();
      } else {
        await TrackPlayer.play();
      }
    })();
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const dur = durationRef.current;
    if (dur <= 0) return;
    const clamped = Math.max(0, Math.min(dur, seconds));
    void TrackPlayer.seekTo(clamped);
    setCurrentTime(clamped);
  }, []);

  const skipBy = useCallback(
    (delta: number) => {
      seekTo(currentTime + delta);
    },
    [currentTime, seekTo],
  );

  const setOnTrackEnd = useCallback((cb: (() => void) | null) => {
    onTrackEndRef.current = cb;
  }, []);

  const value = useMemo<MusicPlayerContextValue>(
    () => ({
      track,
      queue,
      sourceAlbumId,
      playing,
      currentTime,
      duration,
      nowPlayingFocused,
      loadTrack,
      togglePlay,
      seekTo,
      skipBy,
      goPrev,
      goNext,
      setOnTrackEnd,
      setNowPlayingFocused,
    }),
    [
      track,
      queue,
      sourceAlbumId,
      playing,
      currentTime,
      duration,
      nowPlayingFocused,
      loadTrack,
      togglePlay,
      seekTo,
      skipBy,
      goPrev,
      goNext,
      setOnTrackEnd,
    ],
  );

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
    </MusicPlayerContext.Provider>
  );
}
