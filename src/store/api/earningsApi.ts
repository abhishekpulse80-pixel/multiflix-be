import { baseApi } from './baseApi';
import type {
  RecordScreenTimeRequest,
  RecordScreenTimeResponse,
  ScreenTimeResponse,
  TransactionsResponse,
  WalletResponse,
} from '../../types/earningsApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedEarningsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** Flush buffered screen-time minutes. Credits wallet + creates transactions. */
    flushScreenTime: build.mutation<
      RecordScreenTimeResponse,
      RecordScreenTimeRequest
    >({
      query: (body) => ({
        url: '/earnings/me/screen-time',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<RecordScreenTimeResponse>(response),
      /**
       * After a successful flush the wallet balance changes and a new earning
       * transaction (usually one per section) lands in the list — invalidate
       * both so `EarningsScreen` refreshes on next mount.
       */
      invalidatesTags: [
        { type: 'Wallet' as const, id: 'ME' },
        { type: 'Transaction' as const, id: 'LIST' },
        { type: 'Transaction' as const, id: 'SCREEN_TIME' },
      ],
    }),
    getWallet: build.query<WalletResponse, void>({
      query: () => '/earnings/me/wallet',
      transformResponse: (response: unknown) =>
        unwrapApiData<WalletResponse>(response),
      providesTags: [{ type: 'Wallet' as const, id: 'ME' }],
    }),
    getTransactions: build.query<
      TransactionsResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/earnings/me/transactions?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<TransactionsResponse>(response),
      providesTags: [{ type: 'Transaction' as const, id: 'LIST' }],
    }),
    getScreenTime: build.query<ScreenTimeResponse, { days?: number } | void>({
      query: (arg) => {
        const days = arg?.days ?? 7;
        return `/earnings/me/screen-time?days=${String(days)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<ScreenTimeResponse>(response),
      providesTags: [{ type: 'Transaction' as const, id: 'SCREEN_TIME' }],
    }),
  }),
});

export const {
  useFlushScreenTimeMutation,
  useGetWalletQuery,
  useGetTransactionsQuery,
  useGetScreenTimeQuery,
} = injectedEarningsApi;

/** Imperative access for non-component code (e.g. the screen-time tracker). */
export { injectedEarningsApi };
