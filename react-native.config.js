module.exports = {
  project: {
    ios: {},
    android: {
      /** Must match `namespace` / `applicationId` in `android/app/build.gradle` (RNGP entry point). */
      packageName: 'com.multiflix',
    },
  },
  assets: ['./assets/fonts'],
};
