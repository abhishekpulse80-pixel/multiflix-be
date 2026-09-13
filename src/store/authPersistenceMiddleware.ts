import {
  type Middleware,
  isAnyOf,
} from '@reduxjs/toolkit';
import {
  clearPersistedAuth,
  savePersistedAuth,
} from '../services/authStorage';
import { signOutGoogle } from '../services/googleNativeSignIn';
import {
  clearSession,
  setAuthUser,
  setCredentials,
  type AuthUser,
} from './slices/authSlice';

type AuthSliceState = {
  accessToken: string | null;
  user: AuthUser | null;
};

/**
 * Keeps AsyncStorage in sync with Redux auth (same payload shape as the API).
 */
export const authPersistenceMiddleware: Middleware =
  (api) => (next) => (action) => {
    const result = next(action);
    if (clearSession.match(action)) {
      signOutGoogle().catch(() => {});
    }
    if (isAnyOf(setCredentials, setAuthUser, clearSession)(action)) {
      const { accessToken, user } = (api.getState() as { auth: AuthSliceState })
        .auth;
      if (accessToken && user) {
        savePersistedAuth({ accessToken, user }).catch(() => {});
      } else {
        clearPersistedAuth().catch(() => {});
      }
    }
    return result;
  };
