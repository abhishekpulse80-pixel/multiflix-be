import type { NavigationProp } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { getGoogleIdToken } from '../services/googleNativeSignIn';
import { getFirstIncompleteOnboardingScreen } from '../navigation/onboardingProgress';
import type { RootStackParamList } from '../navigation/types';
import { useGoogleLoginMutation } from '../store/api/authApi';
import { isGoogleSignInConfigured } from '../config/googleSignIn';
import { getApiErrorMessage } from '../utils/apiError';
import { getGoogleSignInNativeMessage } from '../utils/googleSignInErrors';
import { toastError, toastInfo } from '../utils/toast';

export function useGoogleSignInHandler(
  navigation: NavigationProp<RootStackParamList>,
) {
  const [googleLogin, { isLoading }] = useGoogleLoginMutation();
  const [nativeBusy, setNativeBusy] = useState(false);

  const signInWithGoogle = useCallback(async () => {
    if (isLoading || nativeBusy) {
      return;
    }
    if (!isGoogleSignInConfigured()) {
      toastInfo(
        'Google Sign-In',
        'Set GOOGLE_WEB_CLIENT_ID in src/config/googleSignIn.ts and rebuild.',
      );
      return;
    }
    setNativeBusy(true);
    try {
      const idToken = await getGoogleIdToken();
      if (!idToken) {
        return;
      }
      const data = await googleLogin({ idToken }).unwrap();
      if (data.user.isOnboarded) {
        navigation.navigate('Main');
      } else {
        navigation.navigate(getFirstIncompleteOnboardingScreen(data.user));
      }
    } catch (e: unknown) {
      const fromNative = getGoogleSignInNativeMessage(e);
      const isDevErr = fromNative.startsWith('Firebase/Android setup');
      toastError(
        'Google sign-in failed',
        isDevErr ? fromNative : getApiErrorMessage(e),
      );
    } finally {
      setNativeBusy(false);
    }
  }, [googleLogin, isLoading, nativeBusy, navigation]);

  return {
    signInWithGoogle,
    isGoogleLoading: isLoading || nativeBusy,
  };
}
