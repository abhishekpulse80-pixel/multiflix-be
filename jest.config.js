module.exports = {
  preset: '@react-native/jest-preset',
  watchman: false,
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    '<rootDir>/jest.setup.js',
  ],
  moduleNameMapper: {
    '\\.svg$': '<rootDir>/__mocks__/svgMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|react-native-screens|react-native-gesture-handler|react-native-pager-view|react-native-safe-area-context|react-native-svg)/)',
  ],
};
