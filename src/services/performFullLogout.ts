import { baseApi } from '../store/api/baseApi';
import { clearSession } from '../store/slices/authSlice';
import type { AppDispatch } from '../store/store';
import { clearHomeFeedCache } from './feedCacheStorage';
import { clearPushOnLogout } from '../utils/pushNotifications';
import {
  clearScreenTimeBuffer,
  flushScreenTimeNow,
} from './screenTimeTracker';

/**
 * Clears local user/session data: feed cache, RTK Query cache, Redux auth.
 * AsyncStorage auth is cleared by `authPersistenceMiddleware` after `clearSession`.
 */
export async function performFullLogout(dispatch: AppDispatch): Promise<void> {
  // Best-effort: drop the FCM token on backend + device before we tear down RTK.
  await clearPushOnLogout().catch(() => {});
  // Flush any buffered screen-time minutes (token still valid here), then reset.
  await flushScreenTimeNow().catch(() => {});
  await clearScreenTimeBuffer().catch(() => {});
  await clearHomeFeedCache().catch(() => {});
  dispatch(baseApi.util.resetApiState());
  dispatch(clearSession());
}
