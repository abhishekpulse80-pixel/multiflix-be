import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import {
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  isGoogleSignInConfigured,
} from '../config/googleSignIn';

let configured = false;

export function configureGoogleSignIn(): void {
  if (configured || !isGoogleSignInConfigured()) {
    return;
  }
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID.trim(),
    ...(Platform.OS === 'ios'
      ? { iosClientId: GOOGLE_IOS_CLIENT_ID.trim() }
      : {}),
    offlineAccess: false,
  });
  configured = true;
}

/**
 * Presents the Google sign-in UI and returns an ID token for the backend, or `null` if the user cancelled.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  configureGoogleSignIn();
  try {
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
    }
    const res = await GoogleSignin.signIn();
    if (res.type !== 'success') {
      return null;
    }
    const direct = res.data.idToken;
    if (direct) {
      return direct;
    }
    const tokens = await GoogleSignin.getTokens();
    return tokens.idToken ?? null;
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: unknown }).code)
        : '';
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    throw e;
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!isGoogleSignInConfigured()) {
    return;
  }
  try {
    configureGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    /* ignore */
  }
}
