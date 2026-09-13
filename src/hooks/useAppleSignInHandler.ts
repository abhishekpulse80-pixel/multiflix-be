import type { NavigationProp } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';
import { getFirstIncompleteOnboardingScreen } from '../navigation/onboardingProgress';
import type { RootStackParamList } from '../navigation/types';
import { useAppleLoginMutation } from '../store/api/authApi';
import { getAppleIdentityToken } from '../services/appleNativeSignIn';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError } from '../utils/toast';

export function useAppleSignInHandler(
  navigation: NavigationProp<RootStackParamList>,
) {
  const [appleLogin, { isLoading }] = useAppleLoginMutation();
  const [nativeBusy, setNativeBusy] = useState(false);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios' || isLoading || nativeBusy) {
      return;
    }
    setNativeBusy(true);
    try {
      const identityToken = await getAppleIdentityToken();
      if (!identityToken) {
        return;
      }
      const data = await appleLogin({ identityToken }).unwrap();
      if (data.user.isOnboarded) {
        navigation.navigate('Main');
      } else {
        navigation.navigate(getFirstIncompleteOnboardingScreen(data.user));
      }
    } catch (e: unknown) {
      toastError('Apple sign-in failed', getApiErrorMessage(e));
    } finally {
      setNativeBusy(false);
    }
  }, [appleLogin, isLoading, nativeBusy, navigation]);

  return {
    signInWithApple,
    isAppleLoading: isLoading || nativeBusy,
  };
}
