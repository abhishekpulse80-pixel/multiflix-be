/**
 * FCM push notifications — permission, token registration, foreground display,
 * and deep-link handling. Call `initPushNotifications()` once after the user is
 * authenticated; call `clearPushOnLogout()` on sign-out.
 *
 * Foreground banners are rendered via Notifee because RN Firebase does not
 * auto-display notifications when the app is in the foreground.
 */
import { Platform } from 'react-native';
import messaging, {
  type FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';
import { store } from '../store';
import { injectedAuthApi } from '../store/api/authApi';
import { navigateFromPush, type PushData } from '../navigation/rootNavigationRef';

const ANDROID_CHANNEL_ID = 'default';
/** Must match backend `BROADCAST_TOPIC` in `notification.service.ts`. */
const BROADCAST_TOPIC = 'all_users';

let unsubscribeOnMessage: (() => void) | null = null;
let unsubscribeOnTokenRefresh: (() => void) | null = null;
let unsubscribeOnNotificationOpened: (() => void) | null = null;
let unsubscribeNotifeeForeground: (() => void) | null = null;
let initialized = false;

/** Ask the OS for notification permission. Returns true if granted. */
async function requestPermission(): Promise<boolean> {
  const authStatus = await messaging().requestPermission();
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
}

/**
 * iOS only: wait for the APNs device token before calling `getToken()`.
 * Firebase can't mint an FCM token until APNs hands it the device token,
 * and `getToken()` silently resolves to '' until then. Poll briefly so
 * we don't register an empty token with the backend. Logs if APNs never
 * registers — that means either `aps-environment` is missing from the
 * entitlement, Push Notifications capability isn't enabled on the App ID,
 * or the APNs key isn't uploaded to Firebase.
 */
async function waitForApnsTokenIfIOS(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const MAX_MS = 10_000;
  const INTERVAL_MS = 250;
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    try {
      const apns = await messaging().getAPNSToken();
      if (apns) return;
    } catch {
      /* keep polling */
    }
    await new Promise<void>(resolve => setTimeout(resolve, INTERVAL_MS));
  }
  console.warn(
    '[push] APNs token never arrived on iOS — check: (1) `aps-environment` ' +
      'entitlement, (2) Push Notifications capability on the App ID, ' +
      '(3) APNs auth key uploaded to Firebase Console.',
  );
}

/** Create the default Android notification channel (no-op on iOS). */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifee.createChannel({
    id: ANDROID_CHANNEL_ID,
    name: 'Default',
    importance: AndroidImportance.HIGH,
  });
}

/** Register the current FCM token with the backend. Silently ignores errors. */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    await store
      .dispatch(
        injectedAuthApi.endpoints.registerPushToken.initiate({ token }),
      )
      .unwrap();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.warn('[push] registerPushToken failed:', msg);
  }
}

/** Show a system banner while the app is in the foreground. */
async function displayForeground(
  rm: FirebaseMessagingTypes.RemoteMessage,
): Promise<void> {
  const title = rm.notification?.title ?? (rm.data?.title as string | undefined) ?? '';
  const body = rm.notification?.body ?? (rm.data?.body as string | undefined) ?? '';
  if (!title && !body) return;
  await notifee.displayNotification({
    title,
    body,
    data: rm.data as Record<string, string> | undefined,
    android: {
      channelId: ANDROID_CHANNEL_ID,
      pressAction: { id: 'default' },
      smallIcon: 'ic_notification',
    },
    ios: { sound: 'default' },
  });
}

/** Convert a raw RemoteMessage.data blob to our PushData shape. */
function dataToPush(
  data: Record<string, string | object> | undefined,
): PushData | null {
  if (!data) return null;
  const type = typeof data.type === 'string' ? data.type : null;
  if (!type) return null;
  return { ...(data as Record<string, string>), type } as PushData;
}

/**
 * One-time init: permission → channel → token → register → listeners.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initPushNotifications(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const granted = await requestPermission();
    if (!granted) {
      console.log('[push] permission not granted — skipping token registration');
      return;
    }

    await ensureAndroidChannel();

    await waitForApnsTokenIfIOS();
    const token = await messaging().getToken();
    if (token) {
      await registerTokenWithBackend(token);
      // Admin broadcasts are delivered to this topic. Failure is non-fatal —
      // per-user pushes keep working.
      try {
        await messaging().subscribeToTopic(BROADCAST_TOPIC);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.warn('[push] subscribeToTopic failed:', msg);
      }
    } else {
      console.warn(
        '[push] getToken() returned empty — no FCM token registered',
      );
    }

    // Re-register whenever FCM rotates the token.
    unsubscribeOnTokenRefresh = messaging().onTokenRefresh((newToken) => {
      void registerTokenWithBackend(newToken);
    });

    // Foreground: show a banner ourselves.
    unsubscribeOnMessage = messaging().onMessage(async (rm) => {
      try {
        await displayForeground(rm);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'unknown error';
        console.warn('[push] foreground display failed:', msg);
      }
    });

    // Tap on a notification while app is backgrounded.
    unsubscribeOnNotificationOpened = messaging().onNotificationOpenedApp(
      (rm) => {
        const push = dataToPush(rm.data);
        if (push) navigateFromPush(push);
      },
    );

    // Tap on the foreground banner (shown by Notifee, not FCM) — these fire a
    // Notifee event rather than onNotificationOpenedApp.
    unsubscribeNotifeeForeground = notifee.onForegroundEvent(
      ({ type, detail }) => {
        if (type !== EventType.PRESS) return;
        const push = dataToPush(
          detail.notification?.data as Record<string, string> | undefined,
        );
        if (push) navigateFromPush(push);
      },
    );

    // Tap that launched the app from a cold start.
    const initialMessage = await messaging().getInitialNotification();
    if (initialMessage) {
      const push = dataToPush(initialMessage.data);
      if (push) {
        // Delay one tick so the nav container is ready.
        setTimeout(() => navigateFromPush(push), 500);
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.warn('[push] init failed:', msg);
    initialized = false;
  }
}

/**
 * Tear down listeners and clear the token on the backend. Call on logout.
 */
export async function clearPushOnLogout(): Promise<void> {
  try {
    unsubscribeOnMessage?.();
    unsubscribeOnTokenRefresh?.();
    unsubscribeOnNotificationOpened?.();
    unsubscribeNotifeeForeground?.();
    unsubscribeOnMessage = null;
    unsubscribeOnTokenRefresh = null;
    unsubscribeOnNotificationOpened = null;
    unsubscribeNotifeeForeground = null;
    initialized = false;

    // Best-effort: drop token on backend, then delete locally.
    try {
      await store
        .dispatch(injectedAuthApi.endpoints.clearPushToken.initiate())
        .unwrap();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      console.warn('[push] clearPushToken failed:', msg);
    }

    try {
      await messaging().unsubscribeFromTopic(BROADCAST_TOPIC);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      console.warn('[push] unsubscribeFromTopic failed:', msg);
    }

    try {
      await messaging().deleteToken();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      console.warn('[push] deleteToken failed:', msg);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    console.warn('[push] clearPushOnLogout failed:', msg);
  }
}
