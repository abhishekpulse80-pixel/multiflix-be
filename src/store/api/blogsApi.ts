import { baseApi } from './baseApi';
import type {
  BlogDetailResponse,
  BlogFavoriteResponse,
  BlogListResponse,
  BlogListTab,
  BlogViewResponse,
  CreateBlogRequest,
  CreateBlogResponse,
  BlogMediaStatusResponse,
} from '../../types/blogApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

const injectedBlogsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getBlogs: build.query<BlogListResponse, { tab: BlogListTab }>({
      query: ({ tab }) =>
        `/blogs?tab=${encodeURIComponent(tab)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogListResponse>(response),
      providesTags: [{ type: 'Blog' as const, id: 'LIST' }],
    }),
    getTrendingBlogs: build.query<BlogListResponse, void>({
      // Trending screen renders up to 20 blogs (5 grids of 4).
      query: () => '/blogs/trending?limit=20',
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogListResponse>(response),
      providesTags: [{ type: 'Blog' as const, id: 'TRENDING' }],
    }),
    getBlogById: build.query<BlogDetailResponse, string>({
      query: (blogId) => `/blogs/${encodeURIComponent(blogId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogDetailResponse>(response),
      providesTags: (_result, _error, blogId) => [
        { type: 'Blog' as const, id: blogId },
      ],
    }),
    setBlogFavorite: build.mutation<
      BlogFavoriteResponse,
      { blogId: string; favorited: boolean }
    >({
      query: ({ blogId, favorited }) => ({
        url: `/blogs/${encodeURIComponent(blogId)}/favorite`,
        method: 'POST',
        body: { favorited },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogFavoriteResponse>(response),
      invalidatesTags: (_result, _error, { blogId }) => [
        { type: 'Blog' as const, id: 'LIST' },
        { type: 'Blog' as const, id: blogId },
      ],
    }),
    incrementBlogView: build.mutation<BlogViewResponse, { blogId: string }>({
      query: ({ blogId }) => ({
        url: `/blogs/${encodeURIComponent(blogId)}/view`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogViewResponse>(response),
      invalidatesTags: (_result, _error, { blogId }) => [
        { type: 'Blog' as const, id: 'LIST' },
        { type: 'Blog' as const, id: blogId },
      ],
    }),
    createBlog: build.mutation<CreateBlogResponse, CreateBlogRequest>({
      query: (body) => ({
        url: '/blogs',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<CreateBlogResponse>(response),
      invalidatesTags: [
        { type: 'Blog' as const, id: 'LIST' },
        { type: 'Blog' as const, id: 'TRENDING' },
      ],
    }),
    getBlogMediaStatus: build.query<BlogMediaStatusResponse, string>({
      query: blogId => `/blogs/${encodeURIComponent(blogId)}/media-status`,
      transformResponse: (response: unknown) =>
        unwrapApiData<BlogMediaStatusResponse>(response),
    }),
    deleteBlog: build.mutation<{ deleted: boolean }, string>({
      query: (blogId) => ({
        url: `/blogs/${encodeURIComponent(blogId)}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ deleted: boolean }>(response),
      invalidatesTags: [
        { type: 'Blog' as const, id: 'LIST' },
        { type: 'Blog' as const, id: 'TRENDING' },
      ],
    }),
  }),
});

export const {
  useGetBlogsQuery,
  useGetTrendingBlogsQuery,
  useGetBlogByIdQuery,
  useSetBlogFavoriteMutation,
  useIncrementBlogViewMutation,
  useCreateBlogMutation,
  useGetBlogMediaStatusQuery,
  useLazyGetBlogMediaStatusQuery,
  useDeleteBlogMutation,
} = injectedBlogsApi;
