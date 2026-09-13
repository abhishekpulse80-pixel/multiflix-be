/**
 * Shared react-native-video buffer config for the feed + blog players.
 *
 * Two goals:
 *  1. Fast first frame — ExoPlayer/AVPlayer default to buffering ~15 s before
 *     playback starts; we start after ~1 s so videos pop immediately.
 *  2. Persistent on-disk cache (Android) — `cacheSizeMB` enables ExoPlayer's
 *     SimpleCache, which survives app kills, so a re-watched clip plays from
 *     disk instead of re-downloading. (iOS persistent video caching needs a
 *     native proxy module — react-native-video v6 doesn't do it.)
 */
export const VIDEO_BUFFER_CONFIG = {
  minBufferMs: 2500,
  maxBufferMs: 30000,
  bufferForPlaybackMs: 1000,
  bufferForPlaybackAfterRebufferMs: 2000,
  cacheSizeMB: 256,
};
