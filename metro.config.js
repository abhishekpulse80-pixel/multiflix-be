const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * Must spread default `transformer` / `resolver` — replacing them breaks the
 * default babel pipeline so `.svg` stays an asset (number) instead of a component.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
module.exports = mergeConfig(defaultConfig, {
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    ...defaultConfig.resolver,
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
});
