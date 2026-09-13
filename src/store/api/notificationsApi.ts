import { baseApi } from './baseApi';
import type {
  ListNotificationsResponse,
  MarkAllReadResponse,
  MarkNotificationReadResponse,
  UnreadCountResponse,
} from '../../types/notificationsApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedNotificationsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getNotifications: build.query<
      ListNotificationsResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/notifications?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<ListNotificationsResponse>(response),
      providesTags: (result, _err, arg) =>
        result && arg.page === 0
          ? [{ type: 'Notification' as const, id: 'LIST' }]
          : [],
    }),
    getUnreadNotificationsCount: build.query<UnreadCountResponse, void>({
      query: () => '/notifications/unread-count',
      transformResponse: (response: unknown) =>
        unwrapApiData<UnreadCountResponse>(response),
      providesTags: [{ type: 'Notification' as const, id: 'UNREAD_COUNT' }],
    }),
    markNotificationRead: build.mutation<
      MarkNotificationReadResponse,
      { notificationId: string }
    >({
      query: ({ notificationId }) => ({
        url: `/notifications/${encodeURIComponent(notificationId)}/read`,
        method: 'PATCH',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MarkNotificationReadResponse>(response),
      // Optimistically flip isRead in the cached first page, then reconcile.
      async onQueryStarted(
        { notificationId },
        { dispatch, queryFulfilled, getState },
      ) {
        const state = getState() as {
          api: {
            queries: Record<
              string,
              { endpointName?: string; originalArgs?: unknown } | undefined
            >;
          };
        };
        const listArgsList: Array<{ page: number; limit?: number }> = [];
        for (const q of Object.values(state.api.queries)) {
          if (q?.endpointName === 'getNotifications' && q.originalArgs) {
            listArgsList.push(
              q.originalArgs as { page: number; limit?: number },
            );
          }
        }
        const patches: Array<{ undo: () => void }> = [];
        for (const args of listArgsList) {
          patches.push(
            dispatch(
              injectedNotificationsApi.util.updateQueryData(
                'getNotifications',
                args,
                (draft) => {
                  const n = draft.items.find((x) => x.id === notificationId);
                  if (n && !n.isRead) {
                    n.isRead = true;
                  }
                },
              ),
            ),
          );
        }
        patches.push(
          dispatch(
            injectedNotificationsApi.util.updateQueryData(
              'getUnreadNotificationsCount',
              undefined,
              (draft) => {
                if (draft.count > 0) draft.count -= 1;
              },
            ),
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),
    markAllNotificationsRead: build.mutation<MarkAllReadResponse, void>({
      query: () => ({
        url: '/notifications/read-all',
        method: 'PATCH',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MarkAllReadResponse>(response),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        { type: 'Notification', id: 'UNREAD_COUNT' },
      ],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useLazyGetNotificationsQuery,
  useGetUnreadNotificationsCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = injectedNotificationsApi;
