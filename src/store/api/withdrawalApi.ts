import { baseApi } from './baseApi';
import type {
  CreateWithdrawalRequestBody,
  ListMyWithdrawalRequestsResponse,
  WithdrawalRequestDto,
  WithdrawalSettingsResponse,
} from '../../types/withdrawalApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedWithdrawalApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** `GET /withdrawals/settings` — `{ minimumAmount }` in INR. */
    getWithdrawalSettings: build.query<WithdrawalSettingsResponse, void>({
      query: () => '/withdrawals/settings',
      transformResponse: (response: unknown) =>
        unwrapApiData<WithdrawalSettingsResponse>(response),
      providesTags: [{ type: 'Withdrawal' as const, id: 'SETTINGS' }],
    }),
    /** `GET /withdrawals/mine?page=&limit=` — caller's own request history. */
    getMyWithdrawalRequests: build.query<
      ListMyWithdrawalRequestsResponse,
      { page?: number; limit?: number } | void
    >({
      query: (arg) => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 20;
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/withdrawals/mine?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<ListMyWithdrawalRequestsResponse>(response),
      providesTags: [{ type: 'Withdrawal' as const, id: 'LIST' }],
    }),
    /** `POST /withdrawals` — place a new request. */
    createWithdrawalRequest: build.mutation<
      WithdrawalRequestDto,
      CreateWithdrawalRequestBody
    >({
      query: (body) => ({
        url: '/withdrawals',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<WithdrawalRequestDto>(response),
      /**
       * A new request changes the list + means the user now has a pending
       * request; invalidate both so any list / status UI re-fetches.
       */
      invalidatesTags: [{ type: 'Withdrawal' as const, id: 'LIST' }],
    }),
  }),
});

export const {
  useGetWithdrawalSettingsQuery,
  useGetMyWithdrawalRequestsQuery,
  useCreateWithdrawalRequestMutation,
} = injectedWithdrawalApi;
