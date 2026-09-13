import { Platform } from 'react-native';

/**
 * OAuth 2.0 Web client ID (ends in `.apps.googleusercontent.com`).
 *
 * Firebase: Project settings → Your apps → create Web app if needed → copy the client ID.
 * Google Cloud: APIs & Services → Credentials → OAuth 2.0 Client ID (Web application).
 *
 * The same ID must appear in the API env `GOOGLE_SIGN_IN_CLIENT_IDS` (comma-separated if you list several).
 *
 * Android needs an **Android** OAuth client in `google-services.json` (`oauth_client` entry with
 * `client_type` 1 and `android_info`). Web-only (`client_type` 3) causes DEVELOPER_ERROR.
 * Add SHA-1 in Firebase for `com.multiflix`, re-download the file, then run `npm run check:google-android`.
 *
 * iOS: OAuth **iOS** client ID from `GoogleService-Info.plist` (`CLIENT_ID`). Also add
 * `REVERSED_CLIENT_ID` as a URL scheme in `Info.plist` (done in this repo).
 */
export const GOOGLE_WEB_CLIENT_ID =
  '791376194861-fdood1gdd2lrh6gqeia48il2uftbl4qc.apps.googleusercontent.com';

/** iOS-only; must match `CLIENT_ID` in `ios/Multiflix/GoogleService-Info.plist`. */
export const GOOGLE_IOS_CLIENT_ID =
  '791376194861-8900hcuo56cmd6r79dqs59oq97lrpnck.apps.googleusercontent.com';

function isValidGoogleClientId(id: string): boolean {
  const t = id.trim();
  return t.length > 10 && t.includes('.apps.googleusercontent.com');
}

export function isGoogleSignInConfigured(): boolean {
  if (!isValidGoogleClientId(GOOGLE_WEB_CLIENT_ID)) {
    return false;
  }
  if (Platform.OS === 'ios') {
    return isValidGoogleClientId(GOOGLE_IOS_CLIENT_ID);
  }
  return true;
}
