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
