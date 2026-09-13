import { baseApi } from './baseApi';
import type {
  UserPublicBlogsResponseDto,
  UserPublicMediaQuery,
  UserPublicPostsResponseDto,
  UserPublicProfileDto,
} from '../../types/profileApi';
import type {
  ConnectionSearchResponseDto,
  UserSearchResponseDto,
} from '../../types/userSearchApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedUsersApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchConnections: build.query<
      ConnectionSearchResponseDto,
      { q: string; limit?: number }
    >({
      query: ({ q, limit = 20 }) => {
        const params = new URLSearchParams({ q, limit: String(limit) });
        return `/users/connections/search?${params.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<ConnectionSearchResponseDto>(response),
    }),
    searchUsers: build.query<UserSearchResponseDto, { q: string; limit?: number }>({
      query: ({ q, limit = 25 }) => {
        const params = new URLSearchParams({
          q,
          limit: String(limit),
        });
        return `/users/search?${params.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<UserSearchResponseDto>(response),
    }),
    getUserPublicProfile: build.query<
      { profile: UserPublicProfileDto },
      string
    >({
      query: userId => `/users/${encodeURIComponent(userId)}/public`,
      transformResponse: (response: unknown) =>
        unwrapApiData<{ profile: UserPublicProfileDto }>(response),
      providesTags: (_result, _error, userId) => [
        { type: 'User' as const, id: userId },
      ],
    }),
    /** Resolve a @username → userId for opening a shared profile deep link. */
    resolveUsername: build.query<{ userId: string }, string>({
      query: username => `/users/by-username/${encodeURIComponent(username)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<{ userId: string }>(response),
    }),
    getUserPublicPosts: build.query<UserPublicPostsResponseDto, UserPublicMediaQuery>({
      query: ({ userId, page, limit }) =>
        `/users/${encodeURIComponent(userId)}/public/posts?page=${encodeURIComponent(
          String(page),
        )}&limit=${encodeURIComponent(String(limit))}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<UserPublicPostsResponseDto>(response),
      providesTags: (_result, _error, { userId }) => [
        { type: 'User' as const, id: userId },
      ],
    }),
    getUserPublicBlogs: build.query<UserPublicBlogsResponseDto, UserPublicMediaQuery>({
      query: ({ userId, page, limit }) =>
        `/users/${encodeURIComponent(userId)}/public/blogs?page=${encodeURIComponent(
          String(page),
        )}&limit=${encodeURIComponent(String(limit))}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<UserPublicBlogsResponseDto>(response),
      providesTags: (_result, _error, { userId }) => [
        { type: 'User' as const, id: userId },
      ],
    }),
    getFollowers: build.query<
      {
        items: Array<{
          id: string;
          username: string;
          fullName: string | null;
          avatarUrl: string | null;
          isFollowedBack: boolean;
          followsYou: boolean;
        }>;
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      },
      { userId: string; page?: number; limit?: number }
    >({
      query: ({ userId, page = 0, limit = 30 }) =>
        `/users/${encodeURIComponent(userId)}/followers?page=${page}&limit=${limit}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          items: Array<{
            id: string;
            username: string;
            fullName: string | null;
            avatarUrl: string | null;
            isFollowedBack: boolean;
            followsYou: boolean;
          }>;
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        }>(response),
      providesTags: (_result, _error, { userId }) => [
        { type: 'User' as const, id: `${userId}-followers` },
        // Any follow/unfollow refreshes every follower/following list so the
        // per-row Follow/Following button reflects the latest relationship.
        { type: 'User' as const, id: 'FOLLOW_LISTS' },
      ],
    }),
    getFollowing: build.query<
      {
        items: Array<{
          id: string;
          username: string;
          fullName: string | null;
          avatarUrl: string | null;
          isFollowedBack: boolean;
          followsYou: boolean;
        }>;
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      },
      { userId: string; page?: number; limit?: number }
    >({
      query: ({ userId, page = 0, limit = 30 }) =>
        `/users/${encodeURIComponent(userId)}/following?page=${page}&limit=${limit}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          items: Array<{
            id: string;
            username: string;
            fullName: string | null;
            avatarUrl: string | null;
            isFollowedBack: boolean;
            followsYou: boolean;
          }>;
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        }>(response),
      providesTags: (_result, _error, { userId }) => [
        { type: 'User' as const, id: `${userId}-following` },
        { type: 'User' as const, id: 'FOLLOW_LISTS' },
      ],
    }),
    followUser: build.mutation<{ following: boolean }, string>({
      query: userId => ({
        url: `/users/${encodeURIComponent(userId)}/follow`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ following: boolean }>(response),
      invalidatesTags: (_r, _e, userId) => [
        { type: 'User' as const, id: userId },
        { type: 'User' as const, id: 'FOLLOW_LISTS' },
      ],
    }),
    unfollowUser: build.mutation<{ following: boolean }, string>({
      query: userId => ({
        url: `/users/${encodeURIComponent(userId)}/follow`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ following: boolean }>(response),
      invalidatesTags: (_r, _e, userId) => [
        { type: 'User' as const, id: userId },
        { type: 'User' as const, id: 'FOLLOW_LISTS' },
      ],
    }),
    blockUser: build.mutation<{ blocked: true }, string>({
      query: userId => ({
        url: `/users/${encodeURIComponent(userId)}/block`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ blocked: true }>(response),
      invalidatesTags: (_r, _e, userId) => [
        { type: 'User' as const, id: userId },
        { type: 'User' as const, id: 'BLOCKED_LIST' },
      ],
    }),
    unblockUser: build.mutation<{ blocked: false }, string>({
      query: userId => ({
        url: `/users/${encodeURIComponent(userId)}/block`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ blocked: false }>(response),
      invalidatesTags: (_r, _e, userId) => [
        { type: 'User' as const, id: userId },
        { type: 'User' as const, id: 'BLOCKED_LIST' },
      ],
    }),
    getBlockedUsers: build.query<
      {
        items: Array<{
          id: string;
          username: string;
          fullName: string | null;
          avatarUrl: string | null;
          blockedAt: string;
        }>;
        page: number;
        limit: number;
        total: number;
        hasMore: boolean;
      },
      { page?: number; limit?: number } | void
    >({
      query: (args) => {
        const page = args?.page ?? 0;
        const limit = args?.limit ?? 30;
        return `/users/blocks?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          items: Array<{
            id: string;
            username: string;
            fullName: string | null;
            avatarUrl: string | null;
            blockedAt: string;
          }>;
          page: number;
          limit: number;
          total: number;
          hasMore: boolean;
        }>(response),
      providesTags: [{ type: 'User' as const, id: 'BLOCKED_LIST' }],
    }),
  }),
});

export const {
  useLazyResolveUsernameQuery,
  useGetUserPublicProfileQuery,
  useSearchConnectionsQuery,
  useSearchUsersQuery,
  useLazyGetUserPublicPostsQuery,
  useLazyGetUserPublicBlogsQuery,
  useGetFollowersQuery,
  useGetFollowingQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
  useBlockUserMutation,
  useUnblockUserMutation,
  useGetBlockedUsersQuery,
} = injectedUsersApi;
