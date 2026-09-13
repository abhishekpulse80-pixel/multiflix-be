import type { RootState } from './store';

export const selectAccessToken = (state: RootState) => state.auth.accessToken;

export const selectCurrentUser = (state: RootState) => state.auth.user;
