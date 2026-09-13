import type {
  OriginalSoundDto,
  OriginalSoundsListResponse,
  PostsUsingSoundResponse,
} from '../../types/soundsApi';
import { unwrapApiData } from '../../utils/apiEnvelope';
import { baseApi } from './baseApi';

const injectedSoundsApi = baseApi.injectEndpoints({
  endpoints: build => ({
    /**
     * Public catalog of original sounds (ready + public), hottest first.
     * Used by the "Original" tab in the music picker.
     */
    listOriginalSounds: build.query<
      OriginalSoundsListResponse,
      { page?: number; limit?: number } | void
    >({
      query: arg => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 20;
        return `/sounds?page=${String(page)}&limit=${String(limit)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<OriginalSoundsListResponse>(response),
      providesTags: [{ type: 'Sound' as const, id: 'LIST' }],
    }),
    /** Single sound detail (for the now-playing screen). */
    getOriginalSoundById: build.query<OriginalSoundDto, string>({
      query: soundId => `/sounds/${encodeURIComponent(soundId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<OriginalSoundDto>(response),
      providesTags: (_result, _error, soundId) => [
        { type: 'Sound' as const, id: soundId },
      ],
    }),
    /** Posts that have reused this sound (paginated). */
    getPostsUsingSound: build.query<
      PostsUsingSoundResponse,
      { soundId: string; page?: number; limit?: number }
    >({
      query: ({ soundId, page, limit }) => {
        const p = page ?? 0;
        const l = limit ?? 24;
        return `/sounds/${encodeURIComponent(soundId)}/posts?page=${String(
          p,
        )}&limit=${String(l)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<PostsUsingSoundResponse>(response),
      providesTags: (_result, _error, arg) => [
        { type: 'Sound' as const, id: `POSTS_${arg.soundId}` },
      ],
    }),
  }),
});

export const {
  useListOriginalSoundsQuery,
  useGetOriginalSoundByIdQuery,
  useGetPostsUsingSoundQuery,
} = injectedSoundsApi;
