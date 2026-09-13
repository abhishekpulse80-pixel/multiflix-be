import { getBuildNumber, getVersion } from 'react-native-device-info';

/**
 * Human-readable app version for testers, e.g. `v1.0(8)`.
 * Values come from native iOS / Android project settings (not JS).
 */
export function getAppBuildMetaLine(): string {
  const version = getVersion().trim();
  const build = getBuildNumber().trim();
  if (version.length === 0 || version === 'unknown') {
    if (build.length > 0 && build !== 'unknown') {
      return `build ${build}`;
    }
    return '—';
  }
  if (build.length === 0 || build === 'unknown') {
    return `v${version}`;
  }
  return `v${version}(${build})`;
}
