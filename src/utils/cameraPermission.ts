import { Linking, PermissionsAndroid, Platform } from 'react-native';
import {
  PERMISSIONS,
  RESULTS,
  check,
  openSettings,
  request,
} from 'react-native-permissions';

/** Thrown when camera is permanently denied — show “Open Settings”. */
export const CAMERA_PERMISSION_BLOCKED_CODE = 'CAMERA_PERMISSION_BLOCKED';

export type CameraPermissionOutcome = 'granted' | 'denied' | 'blocked';

/**
 * Ensures camera permission before opening the camera (required on both platforms).
 */
export async function ensureCameraPermission(): Promise<CameraPermissionOutcome> {
  if (Platform.OS === 'android') {
    const already = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    if (already) {
      return 'granted';
    }
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera access',
        message:
          'Multiflix needs access to your camera to take a profile picture.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      return 'granted';
    }
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      return 'blocked';
    }
    return 'denied';
  }

  const iosPerm = PERMISSIONS.IOS.CAMERA;
  const current = await check(iosPerm);
  if (current === RESULTS.GRANTED || current === RESULTS.LIMITED) {
    return 'granted';
  }
  // Already blocked from a previous session — user is actively retrying a
  // feature that needs the camera, so callers may show an Open-Settings prompt
  // (Apple Guideline 5.1.1(iv) compliant).
  if (current === RESULTS.BLOCKED || current === RESULTS.UNAVAILABLE) {
    return 'blocked';
  }
  // First-time decision: show the native iOS permission prompt.
  const next = await request(iosPerm);
  if (next === RESULTS.GRANTED || next === RESULTS.LIMITED) {
    return 'granted';
  }
  // First denial (iOS marks the permission BLOCKED after a single decline).
  // Per Apple Guideline 5.1.1(iv) we must NOT immediately redirect the user to
  // Settings here. Return 'denied' so callers exit silently; if the user later
  // retries the feature, the check() above will return BLOCKED and a Settings
  // link can be offered at that point.
  return 'denied';
}

export async function openAppSettings(): Promise<void> {
  try {
    await openSettings();
  } catch {
    await Linking.openSettings();
  }
}
