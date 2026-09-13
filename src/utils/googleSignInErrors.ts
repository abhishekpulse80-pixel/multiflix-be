/**
 * Maps native Google Sign-In failures to actionable text.
 * @see https://react-native-google-signin.github.io/docs/troubleshooting#developer_error
 */
export function getGoogleSignInNativeMessage(error: unknown): string {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: unknown }).code)
      : '';
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';

  const blob = `${message} ${code}`.toUpperCase();
  const isDeveloperError =
    blob.includes('DEVELOPER_ERROR') ||
    code === '10' ||
    blob.includes('DEVELOPER CONSOLE');

  if (isDeveloperError) {
    return [
      'Android OAuth client is missing or SHA-1 does not match your build.',
      'Open android/app/google-services.json: under "oauth_client" you need client_type 1 (Android) with android_info — not only Web (3).',
      'Fix: Firebase → Project settings → Android app com.multiflix → add SHA-1 from `cd android && ./gradlew signingReport`, then re-download google-services.json.',
      'Or Google Cloud → Credentials → create OAuth client type Android (same package + SHA-1), same project as Firebase.',
      'Run: npm run check:google-android',
    ].join(' ');
  }

  return message.trim() || 'Google Sign-In failed';
}
