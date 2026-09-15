jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-device-info', () => ({
  getVersion: jest.fn(() => '1.0'),
  getBuildNumber: jest.fn(() => '8'),
}));

jest.mock('@invertase/react-native-apple-authentication', () => ({
  __esModule: true,
  default: {
    isSupported: false,
    performRequest: jest.fn(() =>
      Promise.resolve({ identityToken: null, user: '' }),
    ),
    Error: { CANCELED: '1001' },
    Operation: { LOGIN: 1 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
  },
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() =>
      Promise.resolve({ type: 'cancelled', data: null }),
    ),
    getTokens: jest.fn(() => Promise.resolve({ idToken: '', accessToken: '' })),
    signOut: jest.fn(() => Promise.resolve(null)),
  },
  statusCodes: { SIGN_IN_CANCELLED: 'SIGN_IN_CANCELLED' },
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() => Promise.resolve({ didCancel: true })),
  launchCamera: jest.fn(() => Promise.resolve({ didCancel: true })),
}));

jest.mock('react-native-permissions', () => ({
  PERMISSIONS: {
    IOS: { CAMERA: 'ios.permission.CAMERA' },
    ANDROID: { CAMERA: 'android.permission.CAMERA' },
  },
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    BLOCKED: 'blocked',
    LIMITED: 'limited',
    UNAVAILABLE: 'unavailable',
  },
  check: jest.fn(() => Promise.resolve('granted')),
  request: jest.fn(() => Promise.resolve('granted')),
  openSettings: jest.fn(() => Promise.resolve()),
}));

jest.mock('@react-native-firebase/messaging', () => {
  const messaging = () => ({
    requestPermission: jest.fn(() => Promise.resolve(1)),
    getAPNSToken: jest.fn(() => Promise.resolve('test-apns-token')),
    getToken: jest.fn(() => Promise.resolve('test-fcm-token')),
    onMessage: jest.fn(() => jest.fn()),
    onTokenRefresh: jest.fn(() => jest.fn()),
    onNotificationOpenedApp: jest.fn(() => jest.fn()),
    getInitialNotification: jest.fn(() => Promise.resolve(null)),
    registerDeviceForRemoteMessages: jest.fn(() => Promise.resolve()),
  });
  messaging.AuthorizationStatus = { AUTHORIZED: 1, PROVISIONAL: 2 };
  return { __esModule: true, default: messaging };
});

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(() => Promise.resolve('default')),
    displayNotification: jest.fn(() => Promise.resolve()),
    onForegroundEvent: jest.fn(() => jest.fn()),
  },
  AndroidImportance: { HIGH: 4 },
  EventType: { PRESS: 1, ACTION_PRESS: 2 },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fetch: jest.fn(),
    wrap: jest.fn(path => path),
    fs: {
      dirs: { DocumentDir: '/tmp' },
      stat: jest.fn(() => Promise.resolve({ size: '0' })),
      exists: jest.fn(() => Promise.resolve(false)),
      mkdir: jest.fn(() => Promise.resolve()),
      unlink: jest.fn(() => Promise.resolve()),
      writeFile: jest.fn(() => Promise.resolve()),
      readFile: jest.fn(() => Promise.resolve('')),
    },
  },
}));

jest.mock('@d11/react-native-fast-image', () => {
  const { Image } = require('react-native');
  return {
    __esModule: true,
    default: Image,
    resizeMode: { contain: 'contain', cover: 'cover', stretch: 'stretch' },
  };
});

jest.mock('react-native-track-player', () => ({
  __esModule: true,
  default: {
    setupPlayer: jest.fn(() => Promise.resolve()),
    updateOptions: jest.fn(() => Promise.resolve()),
    pause: jest.fn(() => Promise.resolve()),
    reset: jest.fn(() => Promise.resolve()),
    add: jest.fn(() => Promise.resolve()),
    skip: jest.fn(() => Promise.resolve()),
    play: jest.fn(() => Promise.resolve()),
    getActiveTrackIndex: jest.fn(() => Promise.resolve(0)),
  },
  AppKilledPlaybackBehavior: { ContinuePlayback: 1 },
  Capability: {
    Play: 1,
    Pause: 2,
    SkipToNext: 3,
    SkipToPrevious: 4,
    SeekTo: 5,
    Stop: 6,
  },
  Event: {
    PlaybackState: 'playback-state',
    PlaybackProgressUpdated: 'playback-progress',
    PlaybackActiveTrackChanged: 'active-track',
    PlaybackQueueEnded: 'queue-ended',
  },
  State: { Playing: 1, Buffering: 2, Loading: 3 },
  useTrackPlayerEvents: jest.fn(),
}));

jest.mock('react-native-google-mobile-ads', () => {
  const { View } = require('react-native');
  const mobileAds = jest.fn(() => ({
    initialize: jest.fn(() => Promise.resolve({})),
  }));
  return {
    __esModule: true,
    default: mobileAds,
    mobileAds,
    NativeAd: {
      createForAdRequest: jest.fn(() => Promise.reject(new Error('ad unavailable'))),
    },
    NativeAdView: View,
    NativeAsset: View,
    NativeMediaView: View,
    NativeAssetType: { HEADLINE: 1, BODY: 2, CALL_TO_ACTION: 3 },
  };
});

jest.mock('react-native-orientation-locker', () => ({
  __esModule: true,
  default: {
    lockToPortrait: jest.fn(),
    lockToLandscape: jest.fn(),
    unlockAllOrientations: jest.fn(),
    addDeviceOrientationListener: jest.fn(),
    removeDeviceOrientationListener: jest.fn(),
  },
}));

jest.mock('react-native-video-trim', () => ({
  __esModule: true,
  showEditor: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('react-native-screens', () => ({
  enableScreens: jest.fn(),
}));

jest.mock('react-native-pager-view', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});

jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View };
});
