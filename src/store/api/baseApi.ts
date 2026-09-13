import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
} from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../config/api';
import { withHttpRequestLogging } from '../../utils/httpRequestLog';

type RootStateWithAuth = {
  auth: { accessToken: string | null };
};

const rawBaseQuery: BaseQueryFn = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootStateWithAuth).auth.accessToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    // ngrok free: without this, RN fetch often fails (FETCH_ERROR) — HTML warning page / tunnel quirks.
    if (/ngrok/i.test(API_BASE_URL)) {
      headers.set('ngrok-skip-browser-warning', 'true');
    }
    return headers;
  },
});

const baseQuery = withHttpRequestLogging(rawBaseQuery, API_BASE_URL);

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery,
  // Keep unsubscribed query data for 5 min (default is 60s) so revisiting a
  // screen shows cached data instantly instead of a full refetch. Tag
  // invalidation on mutations still keeps data correct.
  keepUnusedDataFor: 300,
  tagTypes: [
    'User',
    'Post',
    'Comment',
    'Feed',
    'Blog',
    'Music',
    'Sound',
    'Story',
    'Chat',
    'Wallet',
    'Transaction',
    'Notification',
    'Withdrawal',
    'AdsConfig',
  ],
  endpoints: (build) => ({
    health: build.query<
      { ok: boolean; service?: string; db?: string },
      void
    >({
      query: () => '/health',
    }),
  }),
});

export const { useHealthQuery, useLazyHealthQuery } = baseApi;
