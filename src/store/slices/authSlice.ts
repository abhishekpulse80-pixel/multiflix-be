import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthGenderDto } from '../../types/authApi';

/** Mirrors `AuthUserDto` from the API (stored after login / register / `me`). */
export type AuthUser = {
  id: string;
  /** Null until the user provides an email during onboarding. */
  email: string | null;
  username: string;
  usernameUpdatedAt: string | null;
  createdAt: string;
  isOnboarded: boolean;
  hasPassword: boolean;
  interests: string[];
  gender: AuthGenderDto | null;
  dateOfBirth: string | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  /** When true, the user's followers list is hidden from other users. */
  isFollowersListPrivate: boolean;
  /** When false, push notifications are turned off. */
  notificationsEnabled: boolean;
};

export type AuthState = {
  accessToken: string | null;
  user: AuthUser | null;
};

const initialState: AuthState = {
  accessToken: null,
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
    },
    setAuthUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
    },
    clearSession() {
      return initialState;
    },
  },
});

export const { setCredentials, setAuthUser, clearSession } = authSlice.actions;
export default authSlice.reducer;
