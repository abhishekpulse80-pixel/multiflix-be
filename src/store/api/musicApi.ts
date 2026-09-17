import type {
  MusicAlbumDetailResponse,
  MusicAlbumListResponse,
  MusicArtistDetailResponse,
  MusicArtistListResponse,
  MusicSearchResponse,
  MusicTrackDetailResponse,
  MusicTrackFavouriteResponse,
  MusicTrackListResponse,
  MusicTrackPlayResponse,
} from '../../types/musicApi';
import { unwrapApiData } from '../../utils/apiEnvelope';
import { baseApi } from './baseApi';
import type { AudioStatusResponse } from '../../types/soundsApi';

const injectedMusicApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getMusicAlbums: build.query<
      MusicAlbumListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (arg) => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 50;
        return `/music/albums?page=${String(page)}&limit=${String(limit)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicAlbumListResponse>(response),
      providesTags: [{ type: 'Music' as const, id: 'ALBUMS' }],
    }),
    getMusicRecommendedTracks: build.query<
      MusicTrackListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (arg) => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 50;
        return `/music/tracks/recommended?page=${String(page)}&limit=${String(limit)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicTrackListResponse>(response),
      providesTags: [{ type: 'Music' as const, id: 'RECOMMENDED' }],
    }),
    getMusicAlbumById: build.query<MusicAlbumDetailResponse, string>({
      query: (albumId) => `/music/albums/${encodeURIComponent(albumId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicAlbumDetailResponse>(response),
      providesTags: (_result, _error, albumId) => [
        { type: 'Music' as const, id: `ALBUM_${albumId}` },
      ],
    }),
    getMusicTrackById: build.query<MusicTrackDetailResponse, string>({
      query: (trackId) => `/music/tracks/${encodeURIComponent(trackId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicTrackDetailResponse>(response),
      providesTags: (_result, _error, trackId) => [
        { type: 'Music' as const, id: `TRACK_${trackId}` },
      ],
    }),
    getMusicTrackAudioStatus: build.query<
      AudioStatusResponse,
      { trackId: string; networkSpeedMbps?: number }
    >({
      query: ({ trackId, networkSpeedMbps }) => ({
        url: `/music/tracks/${encodeURIComponent(trackId)}/audio-status`,
        params: networkSpeedMbps == null ? undefined : { networkSpeedMbps },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<AudioStatusResponse>(response),
    }),
    getMusicArtists: build.query<
      MusicArtistListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (arg) => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 50;
        return `/music/artists?page=${String(page)}&limit=${String(limit)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicArtistListResponse>(response),
      providesTags: [{ type: 'Music' as const, id: 'ARTISTS' }],
    }),
    getMusicArtistById: build.query<MusicArtistDetailResponse, string>({
      query: (artistId) => `/music/artists/${encodeURIComponent(artistId)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicArtistDetailResponse>(response),
      providesTags: (_result, _error, artistId) => [
        { type: 'Music' as const, id: `ARTIST_${artistId}` },
      ],
    }),
    getMusicFavourites: build.query<
      MusicTrackListResponse,
      { page?: number; limit?: number } | void
    >({
      query: (arg) => {
        const page = arg?.page ?? 0;
        const limit = arg?.limit ?? 50;
        return `/music/favourites?page=${String(page)}&limit=${String(limit)}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicTrackListResponse>(response),
      providesTags: [{ type: 'Music' as const, id: 'FAVOURITES' }],
    }),
    searchMusic: build.query<MusicSearchResponse, { q: string; limit?: number }>({
      query: ({ q, limit = 20 }) => {
        const params = new URLSearchParams({ q, limit: String(limit) });
        return `/music/search?${params.toString()}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicSearchResponse>(response),
    }),
    setMusicTrackFavourite: build.mutation<
      MusicTrackFavouriteResponse,
      { trackId: string; favourited: boolean }
    >({
      query: ({ trackId, favourited }) => ({
        url: `/music/tracks/${encodeURIComponent(trackId)}/favourite`,
        method: 'POST',
        body: { favourited },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicTrackFavouriteResponse>(response),
      // Refresh the favourites list (add/remove the track) and this track's own
      // detail. Do NOT invalidate RECOMMENDED: refetching it reshuffles the
      // now-playing catalog and can drop the current track (blanking the Now
      // Playing screen). Its favouritedByViewer flag is already kept fresh by
      // the optimistic patch in onQueryStarted below.
      invalidatesTags: (_result, _error, { trackId }) => [
        { type: 'Music' as const, id: 'FAVOURITES' },
        { type: 'Music' as const, id: `TRACK_${trackId}` },
      ],
    }),
    recordMusicTrackPlay: build.mutation<MusicTrackPlayResponse, string>({
      query: (trackId) => ({
        url: `/music/tracks/${encodeURIComponent(trackId)}/play`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MusicTrackPlayResponse>(response),
      // No tag invalidation — recommended/album lists are refreshed on Music-tab focus.
      /**
       * Patch cached `streamsCount` across every music query that might render
       * this track (recommended, album detail, favourites), so the bumped count
       * shows up immediately in the UI instead of waiting for a refetch.
       */
      async onQueryStarted(trackId, { dispatch, queryFulfilled, getState }) {
        const state = getState() as {
          api: {
            queries: Record<
              string,
              { endpointName?: string; originalArgs?: unknown } | undefined
            >;
          };
        };
        const recommendedArgsList: Array<
          { page?: number; limit?: number } | undefined
        > = [];
        const favouritesArgsList: Array<
          { page?: number; limit?: number } | undefined
        > = [];
        const albumIds: string[] = [];
        const artistIds: string[] = [];
        for (const q of Object.values(state.api.queries)) {
          if (q?.endpointName === 'getMusicRecommendedTracks') {
            recommendedArgsList.push(
              q.originalArgs as { page?: number; limit?: number } | undefined,
            );
          } else if (q?.endpointName === 'getMusicFavourites') {
            favouritesArgsList.push(
              q.originalArgs as { page?: number; limit?: number } | undefined,
            );
          } else if (
            q?.endpointName === 'getMusicAlbumById' &&
            typeof q.originalArgs === 'string'
          ) {
            albumIds.push(q.originalArgs);
          } else if (
            q?.endpointName === 'getMusicArtistById' &&
            typeof q.originalArgs === 'string'
          ) {
            artistIds.push(q.originalArgs);
          }
        }

        const patches: Array<{ undo: () => void }> = [];
        for (const args of recommendedArgsList) {
          patches.push(
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicRecommendedTracks',
                args,
                (draft) => {
                  const t = draft.items.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount += 1;
                  }
                },
              ),
            ),
          );
        }
        for (const args of favouritesArgsList) {
          patches.push(
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicFavourites',
                args,
                (draft) => {
                  const t = draft.items.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount += 1;
                  }
                },
              ),
            ),
          );
        }
        for (const albumId of albumIds) {
          patches.push(
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicAlbumById',
                albumId,
                (draft) => {
                  const t = draft.tracks.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount += 1;
                  }
                },
              ),
            ),
          );
        }
        for (const artistId of artistIds) {
          patches.push(
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicArtistById',
                artistId,
                (draft) => {
                  const t = draft.tracks.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount += 1;
                  }
                },
              ),
            ),
          );
        }

        try {
          const { data } = await queryFulfilled;
          // Reconcile with authoritative server count.
          for (const args of recommendedArgsList) {
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicRecommendedTracks',
                args,
                (draft) => {
                  const t = draft.items.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount = data.streamsCount;
                  }
                },
              ),
            );
          }
          for (const args of favouritesArgsList) {
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicFavourites',
                args,
                (draft) => {
                  const t = draft.items.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount = data.streamsCount;
                  }
                },
              ),
            );
          }
          for (const albumId of albumIds) {
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicAlbumById',
                albumId,
                (draft) => {
                  const t = draft.tracks.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount = data.streamsCount;
                  }
                },
              ),
            );
          }
          for (const artistId of artistIds) {
            dispatch(
              injectedMusicApi.util.updateQueryData(
                'getMusicArtistById',
                artistId,
                (draft) => {
                  const t = draft.tracks.find((x) => x.id === trackId);
                  if (t) {
                    t.streamsCount = data.streamsCount;
                  }
                },
              ),
            );
          }
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),
  }),
});

export const {
  useGetMusicAlbumsQuery,
  useGetMusicRecommendedTracksQuery,
  useGetMusicAlbumByIdQuery,
  useGetMusicTrackByIdQuery,
  useGetMusicTrackAudioStatusQuery,
  useGetMusicArtistsQuery,
  useGetMusicArtistByIdQuery,
  useGetMusicFavouritesQuery,
  useSearchMusicQuery,
  useSetMusicTrackFavouriteMutation,
  useRecordMusicTrackPlayMutation,
} = injectedMusicApi;
