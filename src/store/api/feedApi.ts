import { baseApi } from './baseApi';
import type {
  CreatePostRequest,
  CreatePostResponse,
  FeedPostDto,
  GetPostResponse,
  HashtagPostsResponse,
  HomeFeedResponse,
  MusicPostsResponse,
  PostLikeResponse,
  PostSaveResponse,
  SavedPostsResponse,
  TrendingPostsResponse,
} from '../../types/feedApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedFeedApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getHomeFeed: build.query<
      HomeFeedResponse,
      { page: number; limit?: number }
    >({
      query: ({ page, limit = 20 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/posts/feed?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<HomeFeedResponse>(response),
      providesTags: (result, _err, arg) =>
        result && arg.page === 0 ? [{ type: 'Feed' as const, id: 'HOME' }] : [],
    }),
    getPostById: build.query<FeedPostDto, string>({
      query: postId => `/posts/${encodeURIComponent(postId)}`,
      transformResponse: (response: unknown) => {
        const payload = unwrapApiData<GetPostResponse>(response);
        return 'post' in payload ? payload.post : payload;
      },
      providesTags: (_result, _error, postId) => [{ type: 'Post' as const, id: postId }],
    }),
    getTrendingPosts: build.query<TrendingPostsResponse, void>({
      // Trending screen renders a bounded feed of up to 100 posts (10 strips
      // of 10). Arg stays `void` so the like/save optimistic patches that
      // target this cache keep working unchanged.
      query: () => '/posts/trending?limit=100',
      transformResponse: (response: unknown) =>
        unwrapApiData<TrendingPostsResponse>(response),
      providesTags: [{ type: 'Feed' as const, id: 'TRENDING_POSTS' }],
    }),
    getPostsByHashtag: build.query<
      HashtagPostsResponse,
      { tag: string; page?: number; limit?: number }
    >({
      query: ({ tag, page = 0, limit = 24 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/posts/hashtag/${encodeURIComponent(tag)}?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<HashtagPostsResponse>(response),
    }),
    getPostsByMusicTrack: build.query<
      MusicPostsResponse,
      { trackId: string; page?: number; limit?: number }
    >({
      query: ({ trackId, page = 0, limit = 24 }) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/posts/music/${encodeURIComponent(trackId)}?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicPostsResponse>(response),
    }),
    getSavedPosts: build.query<
      SavedPostsResponse,
      { page?: number; limit?: number }
    >({
      query: ({ page = 0, limit = 24 } = {}) => {
        const q = new URLSearchParams({
          page: String(page),
          limit: String(limit),
        });
        return `/posts/saved?${q.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<SavedPostsResponse>(response),
      // Refetched when a save is toggled anywhere (see setPostSave) so the
      // saved list gains/drops the tile.
      providesTags: [{ type: 'Feed' as const, id: 'SAVED' }],
    }),
    setPostLike: build.mutation<
      PostLikeResponse,
      { postId: string; liked: boolean }
    >({
      query: ({ postId, liked }) => ({
        url: `/posts/${encodeURIComponent(postId)}/like`,
        method: 'POST',
        body: { liked },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<PostLikeResponse>(response),
      /**
       * Keep `likedByViewer` / `likesCount` in sync across every cached feed
       * that might render this post (home feed pages + trending posts +
       * user profile posts grids), so liking in one screen is reflected in
       * the grid that opened it when the viewer returns.
       */
      async onQueryStarted(
        { postId, liked },
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
        const homeFeedArgsList: Array<{ page: number; limit?: number }> = [];
        const userPostsArgsList: Array<{
          userId: string;
          page: number;
          limit: number;
        }> = [];
        for (const q of Object.values(state.api.queries)) {
          if (q?.endpointName === 'getHomeFeed' && q.originalArgs) {
            homeFeedArgsList.push(
              q.originalArgs as { page: number; limit?: number },
            );
          } else if (
            q?.endpointName === 'getUserPublicPosts' &&
            q.originalArgs
          ) {
            userPostsArgsList.push(
              q.originalArgs as {
                userId: string;
                page: number;
                limit: number;
              },
            );
          }
        }

        const delta = liked ? 1 : -1;
        const patches: Array<{ undo: () => void }> = [];
        patches.push(
          dispatch(
            injectedFeedApi.util.updateQueryData(
              'getTrendingPosts',
              undefined,
              (draft) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) {
                  p.likedByViewer = liked;
                  p.likesCount = Math.max(0, p.likesCount + delta);
                }
              },
            ),
          ),
        );
        for (const args of homeFeedArgsList) {
          patches.push(
            dispatch(
              injectedFeedApi.util.updateQueryData(
                'getHomeFeed',
                args,
                (draft) => {
                  for (const item of draft.items) {
                    if (item.type === 'post' && item.post.id === postId) {
                      item.post.likedByViewer = liked;
                      item.post.likesCount = Math.max(
                        0,
                        item.post.likesCount + delta,
                      );
                    }
                  }
                },
              ),
            ),
          );
        }
        const patchUserPosts = (
          args: { userId: string; page: number; limit: number },
          apply: (p: { likesCount: number; likedByViewer: boolean }) => void,
        ) =>
          dispatch(
            baseApi.util.updateQueryData(
              'getUserPublicPosts' as never,
              args as never,
              ((draft: {
                items: Array<{
                  id: string;
                  likesCount: number;
                  likedByViewer: boolean;
                }>;
              }) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) apply(p);
              }) as never,
            ),
          );
        for (const args of userPostsArgsList) {
          patches.push(
            patchUserPosts(args, (p) => {
              p.likedByViewer = liked;
              p.likesCount = Math.max(0, p.likesCount + delta);
            }),
          );
        }

        try {
          const { data } = await queryFulfilled;
          // Reconcile with server counts (handles races / other viewers).
          dispatch(
            injectedFeedApi.util.updateQueryData(
              'getTrendingPosts',
              undefined,
              (draft) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) {
                  p.likedByViewer = data.liked;
                  p.likesCount = data.likesCount;
                }
              },
            ),
          );
          for (const args of homeFeedArgsList) {
            dispatch(
              injectedFeedApi.util.updateQueryData(
                'getHomeFeed',
                args,
                (draft) => {
                  for (const item of draft.items) {
                    if (item.type === 'post' && item.post.id === postId) {
                      item.post.likedByViewer = data.liked;
                      item.post.likesCount = data.likesCount;
                    }
                  }
                },
              ),
            );
          }
          for (const args of userPostsArgsList) {
            patchUserPosts(args, (p) => {
              p.likedByViewer = data.liked;
              p.likesCount = data.likesCount;
            });
          }
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),
    setPostSave: build.mutation<
      PostSaveResponse,
      { postId: string; saved: boolean }
    >({
      query: ({ postId, saved }) => ({
        url: `/posts/${encodeURIComponent(postId)}/save`,
        method: 'POST',
        body: { saved },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<PostSaveResponse>(response),
      // Drop/add the tile in the Saved Posts list when a save is toggled
      // from anywhere (the optimistic patches below only fix the bookmark
      // state on feeds/grids; the saved list is a separate query).
      invalidatesTags: [{ type: 'Feed' as const, id: 'SAVED' }],
      /**
       * Keep `savedByViewer` / `savesCount` in sync across every cached feed
       * that might render this post (home feed pages + trending posts + user
       * profile posts grids), so saving in one screen is reflected in the
       * grid that opened it when the viewer returns.
       */
      async onQueryStarted(
        { postId, saved },
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
        const homeFeedArgsList: Array<{ page: number; limit?: number }> = [];
        const userPostsArgsList: Array<{
          userId: string;
          page: number;
          limit: number;
        }> = [];
        for (const q of Object.values(state.api.queries)) {
          if (q?.endpointName === 'getHomeFeed' && q.originalArgs) {
            homeFeedArgsList.push(
              q.originalArgs as { page: number; limit?: number },
            );
          } else if (
            q?.endpointName === 'getUserPublicPosts' &&
            q.originalArgs
          ) {
            userPostsArgsList.push(
              q.originalArgs as {
                userId: string;
                page: number;
                limit: number;
              },
            );
          }
        }

        const delta = saved ? 1 : -1;
        const patches: Array<{ undo: () => void }> = [];
        patches.push(
          dispatch(
            injectedFeedApi.util.updateQueryData(
              'getTrendingPosts',
              undefined,
              (draft) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) {
                  p.savedByViewer = saved;
                  p.savesCount = Math.max(0, (p.savesCount ?? 0) + delta);
                }
              },
            ),
          ),
        );
        for (const args of homeFeedArgsList) {
          patches.push(
            dispatch(
              injectedFeedApi.util.updateQueryData(
                'getHomeFeed',
                args,
                (draft) => {
                  for (const item of draft.items) {
                    if (item.type === 'post' && item.post.id === postId) {
                      item.post.savedByViewer = saved;
                      item.post.savesCount = Math.max(
                        0,
                        (item.post.savesCount ?? 0) + delta,
                      );
                    }
                  }
                },
              ),
            ),
          );
        }
        const patchUserPosts = (
          args: { userId: string; page: number; limit: number },
          apply: (p: {
            savesCount?: number;
            savedByViewer?: boolean;
          }) => void,
        ) =>
          dispatch(
            baseApi.util.updateQueryData(
              'getUserPublicPosts' as never,
              args as never,
              ((draft: {
                items: Array<{
                  id: string;
                  savesCount?: number;
                  savedByViewer?: boolean;
                }>;
              }) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) apply(p);
              }) as never,
            ),
          );
        for (const args of userPostsArgsList) {
          patches.push(
            patchUserPosts(args, (p) => {
              p.savedByViewer = saved;
              p.savesCount = Math.max(0, (p.savesCount ?? 0) + delta);
            }),
          );
        }

        try {
          const { data } = await queryFulfilled;
          // Reconcile with server counts (handles races / other viewers).
          dispatch(
            injectedFeedApi.util.updateQueryData(
              'getTrendingPosts',
              undefined,
              (draft) => {
                const p = draft.items.find((x) => x.id === postId);
                if (p) {
                  p.savedByViewer = data.saved;
                  p.savesCount = data.savesCount;
                }
              },
            ),
          );
          for (const args of homeFeedArgsList) {
            dispatch(
              injectedFeedApi.util.updateQueryData(
                'getHomeFeed',
                args,
                (draft) => {
                  for (const item of draft.items) {
                    if (item.type === 'post' && item.post.id === postId) {
                      item.post.savedByViewer = data.saved;
                      item.post.savesCount = data.savesCount;
                    }
                  }
                },
              ),
            );
          }
          for (const args of userPostsArgsList) {
            patchUserPosts(args, (p) => {
              p.savedByViewer = data.saved;
              p.savesCount = data.savesCount;
            });
          }
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),
    createPost: build.mutation<CreatePostResponse, CreatePostRequest>({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<CreatePostResponse>(response),
      invalidatesTags: (result) => {
        const tags: Array<{ type: 'Feed' | 'User'; id: string }> = [
          { type: 'Feed', id: 'HOME' },
          { type: 'Feed', id: 'TRENDING_POSTS' },
        ];
        const authorId = result?.post?.authorId;
        if (authorId) {
          tags.push({ type: 'User', id: authorId });
        }
        return tags;
      },
    }),
    deletePost: build.mutation<{ deleted: boolean }, string>({
      query: (postId) => ({
        url: `/posts/${encodeURIComponent(postId)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ deleted: boolean }>(response),
      invalidatesTags: [
        { type: 'Feed', id: 'HOME' },
        { type: 'Feed', id: 'TRENDING_POSTS' },
      ],
    }),
    // Mark posts as seen in the home feed. Fire-and-forget — deliberately does
    // NOT invalidate Feed:HOME (we don't want an immediate refetch); the seen
    // exclusion takes effect on the next manual pull-to-refresh / app open.
    recordPostViews: build.mutation<{ recorded: number }, { postIds: string[] }>(
      {
        query: body => ({ url: '/posts/views', method: 'POST', body }),
        transformResponse: (response: unknown) =>
          unwrapApiData<{ recorded: number }>(response),
      },
    ),
  }),
});

export const {
  useGetHomeFeedQuery,
  useLazyGetHomeFeedQuery,
  useLazyGetPostByIdQuery,
  useGetTrendingPostsQuery,
  useLazyGetTrendingPostsQuery,
  useGetPostsByHashtagQuery,
  useGetPostsByMusicTrackQuery,
  useGetSavedPostsQuery,
  useSetPostLikeMutation,
  useSetPostSaveMutation,
  useCreatePostMutation,
  useDeletePostMutation,
  useRecordPostViewsMutation,
} = injectedFeedApi;
