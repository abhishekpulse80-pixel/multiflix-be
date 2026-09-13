import React, { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { loadPersistedAuth } from '../services/authStorage';
import { useAppDispatch } from '../store/hooks';
import { setCredentials } from '../store/slices/authSlice';
import { initPushNotifications } from '../utils/pushNotifications';
import { initScreenTimeTracker } from '../services/screenTimeTracker';

/**
 * Loads persisted `{ accessToken, user }` (same shape as login/register API)
 * before the rest of the tree mounts, so Splash and API calls see the session.
 */
export function AuthHydrationGate({ children }: PropsWithChildren) {
  const dispatch = useAppDispatch();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const session = await loadPersistedAuth();
      if (!alive) {
        return;
      }
      if (session) {
        dispatch(setCredentials(session));
        // Register FCM token for already-authed users on app start.
        void initPushNotifications();
        // Start the screen-time tracker (flush interval + AppState listener).
        initScreenTimeTracker();
      }
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [dispatch]);

  if (!ready) {
    return (
      <View style={styles.fill}>
        <ActivityIndicator size="large" accessibilityLabel="Loading session" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
