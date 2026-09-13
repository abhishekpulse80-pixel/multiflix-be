/**
 * @format
 */

import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { name as appName } from './app.json';
import { musicPlaybackService } from './src/services/musicPlaybackService';

/**
 * FCM background message handler — MUST be registered at module scope in the
 * entry file (before `AppRegistry.registerComponent`) so RN Firebase can wire
 * up the headless JS task in background / terminated state. No-op body is
 * fine: the backend sends a `notification` block, so the OS renders the
 * banner itself. This handler exists so RN Firebase has somewhere to route
 * the payload and so we can add pre-display logic later (e.g. badge updates).
 */
messaging().setBackgroundMessageHandler(async (_rm) => {
  // Intentionally empty — OS renders the banner from the `notification` payload.
});

AppRegistry.registerComponent(appName, () => App);

/**
 * Register the RNTP playback service so it runs even when the JS bridge is
 * suspended (app backgrounded / phone locked). MUST live in the entry file
 * — RNTP loads it as a separate JS task before the rest of the app boots.
 */
TrackPlayer.registerPlaybackService(() => musicPlaybackService);
