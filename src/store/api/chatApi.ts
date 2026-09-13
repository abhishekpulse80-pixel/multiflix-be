import { baseApi } from './baseApi';
import type {
  ConversationsResponseDto,
  GetOrCreateConversationResponseDto,
  MessagePostRefInput,
  MessageProfileRefInput,
  MessageStoryRefInput,
  MessagesResponseDto,
  SendMessageResponseDto,
} from '../../types/chatApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedChatApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getConversations: build.query<ConversationsResponseDto, void>({
      query: () => '/chat/conversations',
      transformResponse: (response: unknown) =>
        unwrapApiData<ConversationsResponseDto>(response),
      providesTags: ['Chat' as never],
    }),
    getHiddenConversations: build.query<ConversationsResponseDto, void>({
      query: () => '/chat/conversations?hidden=true',
      transformResponse: (response: unknown) =>
        unwrapApiData<ConversationsResponseDto>(response),
      providesTags: ['Chat' as never],
    }),
    getOrCreateConversation: build.mutation<
      GetOrCreateConversationResponseDto,
      string
    >({
      query: (userId) => ({
        url: '/chat/conversations',
        method: 'POST',
        body: { userId },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<GetOrCreateConversationResponseDto>(response),
    }),
    getMessages: build.query<
      MessagesResponseDto,
      { conversationId: string; page?: number; limit?: number }
    >({
      query: ({ conversationId, page = 0, limit = 30 }) =>
        `/chat/conversations/${encodeURIComponent(
          conversationId,
        )}/messages?page=${page}&limit=${limit}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<MessagesResponseDto>(response),
    }),
    sendMessageRest: build.mutation<
      SendMessageResponseDto,
      {
        conversationId: string;
        text?: string;
        postRef?: MessagePostRefInput | null;
        storyRef?: MessageStoryRefInput | null;
        profileRef?: MessageProfileRefInput | null;
        replyToMessageId?: string | null;
      }
    >({
      query: ({
        conversationId,
        text,
        postRef,
        storyRef,
        profileRef,
        replyToMessageId,
      }) => ({
        url: `/chat/conversations/${encodeURIComponent(
          conversationId,
        )}/messages`,
        method: 'POST',
        body: {
          text: text ?? '',
          postRef: postRef ?? null,
          storyRef: storyRef ?? null,
          profileRef: profileRef ?? null,
          replyToMessageId: replyToMessageId ?? null,
        },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<SendMessageResponseDto>(response),
    }),
    markAsRead: build.mutation<{ success: boolean }, string>({
      query: (conversationId) => ({
        url: `/chat/conversations/${encodeURIComponent(conversationId)}/read`,
        method: 'PATCH',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ success: boolean }>(response),
      invalidatesTags: ['Chat' as never],
    }),
    deleteMessage: build.mutation<
      { deleted: boolean; conversationId: string; messageId: string },
      { messageId: string }
    >({
      query: ({ messageId }) => ({
        url: `/chat/messages/${encodeURIComponent(messageId)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          deleted: boolean;
          conversationId: string;
          messageId: string;
        }>(response),
      // Refresh the conversations list so its last-message preview updates.
      invalidatesTags: ['Chat' as never],
    }),
    hideConversation: build.mutation<{ hidden: boolean }, string>({
      query: (conversationId) => ({
        url: `/chat/conversations/${encodeURIComponent(conversationId)}/hide`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ hidden: boolean }>(response),
      invalidatesTags: ['Chat' as never],
    }),
    deleteConversation: build.mutation<{ deleted: boolean }, string>({
      query: (conversationId) => ({
        url: `/chat/conversations/${encodeURIComponent(conversationId)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ deleted: boolean }>(response),
      // Optimistically drop the conversation from BOTH the main and hidden
      // lists so it disappears immediately on either screen; the invalidation-
      // driven refetch then reconciles counts.
      async onQueryStarted(conversationId, { dispatch, queryFulfilled }) {
        const removeById = (draft: ConversationsResponseDto) => {
          draft.items = draft.items.filter((c) => c.id !== conversationId);
        };
        const patches = [
          dispatch(
            injectedChatApi.util.updateQueryData(
              'getConversations',
              undefined,
              removeById,
            ),
          ),
          dispatch(
            injectedChatApi.util.updateQueryData(
              'getHiddenConversations',
              undefined,
              removeById,
            ),
          ),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
      invalidatesTags: ['Chat' as never],
    }),
    unhideConversation: build.mutation<{ hidden: boolean }, string>({
      query: (conversationId) => ({
        url: `/chat/conversations/${encodeURIComponent(conversationId)}/hide`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ hidden: boolean }>(response),
      invalidatesTags: ['Chat' as never],
    }),
  }),
});

export { injectedChatApi as chatApiSlice };

export const {
  useGetConversationsQuery,
  useGetOrCreateConversationMutation,
  useGetMessagesQuery,
  useSendMessageRestMutation,
  useMarkAsReadMutation,
  useDeleteMessageMutation,
  useHideConversationMutation,
  useDeleteConversationMutation,
  useUnhideConversationMutation,
  useGetHiddenConversationsQuery,
} = injectedChatApi;
