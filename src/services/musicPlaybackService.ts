import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * RNTP playback service. Runs in a separate JS context (not the main UI
 * context) and persists for as long as the playback session is alive —
 * including when the app is backgrounded or the JS bridge is suspended.
 *
 * The service only forwards remote-control events (lock-screen, control
 * center, Bluetooth headset buttons) to the underlying TrackPlayer
 * instance. All UI state for the music tab is still owned by
 * `MusicPlayerContext`, which subscribes to the same events from the
 * foreground.
 *
 * Registered from `index.js` via `TrackPlayer.registerPlaybackService`.
 */
export async function musicPlaybackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    void TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    void TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    void TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    void TrackPlayer.skipToNext().catch(() => {
      /* end of queue — ignore */
    });
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    void TrackPlayer.skipToPrevious().catch(() => {
      /* start of queue — ignore */
    });
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    void TrackPlayer.seekTo(position);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, ({ interval }) => {
    void (async () => {
      const { position } = await TrackPlayer.getProgress();
      await TrackPlayer.seekTo(position + interval);
    })();
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, ({ interval }) => {
    void (async () => {
      const { position } = await TrackPlayer.getProgress();
      await TrackPlayer.seekTo(Math.max(0, position - interval));
    })();
  });
}
