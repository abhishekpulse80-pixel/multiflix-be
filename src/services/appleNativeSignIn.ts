import appleAuth from '@invertase/react-native-apple-authentication';
import { Platform } from 'react-native';

/**
 * Runs Sign in with Apple and returns the identity token for the API, or `null` if cancelled / unsupported.
 */
export async function getAppleIdentityToken(): Promise<string | null> {
  if (Platform.OS !== 'ios' || !appleAuth.isSupported) {
    return null;
  }
  try {
    const res = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
    return res.identityToken ?? null;
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: unknown }).code)
        : '';
    if (code === appleAuth.Error.CANCELED) {
      return null;
    }
    throw e;
  }
}
