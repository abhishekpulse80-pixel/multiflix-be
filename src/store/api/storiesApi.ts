import { baseApi } from './baseApi';
import type {
  ConnectionStoriesResponse,
  CreateStoryRequest,
  CreateStoryResponse,
  ReactToStoryResponse,
  StoryReactionType,
  StoryReactionsResponse,
  StoryViewersResponse,
  TrendingStoriesResponse,
  UserStoriesResponse,
} from '../../types/storiesApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedStoriesApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getUserStories: build.query<UserStoriesResponse, string>({
      query: (userId) =>
        `/stories/user/${encodeURIComponent(userId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<UserStoriesResponse>(response),
      providesTags: (_result, _err, userId) => [
        { type: 'Story', id: userId },
      ],
    }),
    getConnectionStories: build.query<ConnectionStoriesResponse, void>({
      query: () => '/stories/connections',
      transformResponse: (response: unknown) =>
        unwrapApiData<ConnectionStoriesResponse>(response),
      providesTags: [{ type: 'Story', id: 'CONNECTIONS' }],
    }),
    getTrendingStories: build.query<TrendingStoriesResponse, void>({
      query: () => '/stories/trending',
      transformResponse: (response: unknown) =>
        unwrapApiData<TrendingStoriesResponse>(response),
      providesTags: [{ type: 'Story', id: 'TRENDING' }],
    }),
    getStoryViewers: build.query<StoryViewersResponse, string>({
      query: (storyId) =>
        `/stories/${encodeURIComponent(storyId)}/viewers`,
      transformResponse: (response: unknown) =>
        unwrapApiData<StoryViewersResponse>(response),
      providesTags: (_result, _err, storyId) => [
        { type: 'Story', id: `viewers-${storyId}` },
      ],
    }),
    /** `POST /stories/:storyId/view` — record a distinct view (idempotent). */
    recordStoryView: build.mutation<{ ok: true }, { storyId: string }>({
      query: ({ storyId }) => ({
        url: `/stories/${encodeURIComponent(storyId)}/view`,
        method: 'POST',
        body: { viewed: true },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ ok: true }>(response),
      // Refresh the author's viewers list (and the connection ring's allViewed
      // state) once the view is recorded.
      invalidatesTags: (_result, _error, { storyId }) => [
        { type: 'Story', id: `viewers-${storyId}` },
        { type: 'Story', id: 'CONNECTIONS' },
      ],
    }),
    deleteStory: build.mutation<
      { deleted: boolean },
      { storyId: string; authorId: string }
    >({
      query: ({ storyId }) => ({
        url: `/stories/${encodeURIComponent(storyId)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ deleted: boolean }>(response),
      invalidatesTags: (_result, _error, { authorId }) => [
        { type: 'Story', id: 'FEED' },
        { type: 'Story', id: 'TRENDING' },
        { type: 'Story', id: authorId },
      ],
    }),
    getStoryReactions: build.query<StoryReactionsResponse, string>({
      query: (storyId) =>
        `/stories/${encodeURIComponent(storyId)}/reactions`,
      transformResponse: (response: unknown) =>
        unwrapApiData<StoryReactionsResponse>(response),
      providesTags: (_result, _err, storyId) => [
        { type: 'Story', id: `reactions-${storyId}` },
      ],
    }),
    reactToStory: build.mutation<
      ReactToStoryResponse,
      { storyId: string; reaction: StoryReactionType }
    >({
      query: ({ storyId, reaction }) => ({
        url: `/stories/${encodeURIComponent(storyId)}/react`,
        method: 'POST',
        body: { reaction },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<ReactToStoryResponse>(response),
      invalidatesTags: (_result, _error, { storyId }) => [
        { type: 'Story', id: `reactions-${storyId}` },
      ],
    }),
    createStory: build.mutation<CreateStoryResponse, CreateStoryRequest>({
      query: (body) => ({
        url: '/stories',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<CreateStoryResponse>(response),
      invalidatesTags: (result) => {
        const tags: Array<{ type: 'Story'; id: string }> = [
          { type: 'Story', id: 'FEED' },
          { type: 'Story', id: 'TRENDING' },
        ];
        const authorId = result?.story?.authorId;
        if (authorId) {
          tags.push({ type: 'Story', id: authorId });
        }
        return tags;
      },
    }),
  }),
});

export const {
  useGetConnectionStoriesQuery,
  useGetTrendingStoriesQuery,
  useGetUserStoriesQuery,
  useLazyGetUserStoriesQuery,
  useGetStoryViewersQuery,
  useGetStoryReactionsQuery,
  useReactToStoryMutation,
  useRecordStoryViewMutation,
  useDeleteStoryMutation,
  useCreateStoryMutation,
} = injectedStoriesApi;
