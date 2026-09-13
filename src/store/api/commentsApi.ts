import { baseApi } from './baseApi';
import type {
  CommentDto,
  CreatePostCommentResponse,
  PostCommentsListResponse,
} from '../../types/commentsApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedCommentsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getPostComments: build.query<
      PostCommentsListResponse,
      { postId: string; page?: number; limit?: number }
    >({
      query: ({ postId, page = 0, limit = 20 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/posts/${encodeURIComponent(postId)}/comments?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<PostCommentsListResponse>(response),
      providesTags: (_result, _err, { postId }) => [
        { type: 'Comment' as const, id: postId },
      ],
    }),
    createPostComment: build.mutation<
      CreatePostCommentResponse,
      { postId: string; text: string }
    >({
      query: ({ postId, text }) => ({
        url: `/posts/${encodeURIComponent(postId)}/comments`,
        method: 'POST',
        body: { text },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<CreatePostCommentResponse>(response),
      invalidatesTags: (_result, _err, { postId }) => [
        { type: 'Comment', id: postId },
        // Avoid invalidating the whole home feed (same as likes): refetch would replace page 0 only.
      ],
    }),
  }),
});

export const {
  useGetPostCommentsQuery,
  useLazyGetPostCommentsQuery,
  useCreatePostCommentMutation,
} = injectedCommentsApi;

export function commentDtoToSheetRow(c: CommentDto): {
  id: string;
  userId: string;
  userName: string;
  avatarUri: string;
  body: string;
  createdAt: string;
} {
  const avatarUri =
    typeof c.authorAvatarUrl === 'string' && c.authorAvatarUrl.trim().length > 0
      ? c.authorAvatarUrl.trim()
      : '';
  return {
    id: c.id,
    userId: c.authorId,
    userName: c.authorDisplayName,
    avatarUri,
    body: c.text,
    createdAt: c.createdAt,
  };
}
