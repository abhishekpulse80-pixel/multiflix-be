import React, { useEffect, useRef } from 'react';
import {
  Image,
  StyleSheet,
  View,
} from 'react-native';
import { LoadingDots } from '../components/LoadingDots';
import { getFirstIncompleteOnboardingScreen } from '../navigation/onboardingProgress';
import type { SplashScreenProps } from '../navigation/types';
import {
  clearSession,
  selectAccessToken,
  selectCurrentUser,
  useAppDispatch,
  useAppSelector,
  useLazyGetMeQuery,
} from '../store';
import { useTheme } from '../theme';

const MIN_SPLASH_MS = 1400;

/**
 * Only an explicit auth rejection (HTTP 401/403) means the stored session is
 * actually invalid. A network/timeout/5xx failure on cold start does NOT —
 * logging the user out on those caused spurious sign-outs when the app was
 * reopened after sitting unused for days.
 */
function isAuthRejection(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  return status === 401 || status === 403;
}

export function SplashScreen({ navigation }: SplashScreenProps) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const accessToken = useAppSelector(selectAccessToken);
  const persistedUser = useAppSelector(selectCurrentUser);
  // Read via a ref inside the boot effect so a getMe-driven user update can't
  // re-trigger the effect (and re-run fetchMe) mid-navigation.
  const persistedUserRef = useRef(persistedUser);
  persistedUserRef.current = persistedUser;
  const [fetchMe] = useLazyGetMeQuery();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const started = Date.now();
      const waitMin = () =>
        new Promise<void>(resolve => {
          const elapsed = Date.now() - started;
          const left = Math.max(0, MIN_SPLASH_MS - elapsed);
          setTimeout(resolve, left);
        });

      if (!accessToken) {
        await waitMin();
        if (!cancelled) {
          navigation.replace('Onboarding');
        }
        return;
      }

      try {
        const { user } = await fetchMe().unwrap();
        await waitMin();
        if (cancelled) {
          return;
        }
        if (user.isOnboarded) {
          navigation.replace('Main');
        } else {
          navigation.replace(getFirstIncompleteOnboardingScreen(user));
        }
      } catch (err) {
        await waitMin();
        if (cancelled) {
          return;
        }
        // Definitive auth rejection → the token really is invalid: sign out.
        if (isAuthRejection(err)) {
          dispatch(clearSession());
          navigation.replace('Onboarding');
          return;
        }
        // Transient failure (offline / timeout / server blip on cold start) —
        // keep the persisted session and route by the cached user so the app
        // opens normally instead of logging the user out. Individual screens
        // refetch and surface their own errors.
        const cachedUser = persistedUserRef.current;
        if (cachedUser) {
          navigation.replace(
            cachedUser.isOnboarded
              ? 'Main'
              : getFirstIncompleteOnboardingScreen(cachedUser),
          );
        } else {
          // Have a token but no cached user (rare) — let Main load and refetch.
          navigation.replace('Main');
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, dispatch, fetchMe, navigation]);

  const logoSize = 200;

  return (
    <View style={[styles.root, { backgroundColor: '#000000' }]}>
<View style={styles.center}>
        <Image
          source={require('../../assets/images/logo_512.png')}
          style={{ width: logoSize, height: logoSize }}
          resizeMode="contain"
        />
      </View>
      <View style={[styles.bottom, { paddingBottom: 28 }]}>
        <LoadingDots />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingBottom: 28,
    alignItems: 'center',
  },
});
