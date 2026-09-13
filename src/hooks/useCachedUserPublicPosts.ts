import { createSelector } from '@reduxjs/toolkit';
import { useMemo } from 'react';
import { useAppSelector } from '../store/hooks';
import type { RootState } from '../store/store';
import type { ProfileGridItem } from '../data/publicUserProfileMock';
import type {
  PublicRecentPostThumbDto,
  UserPublicMediaQuery,
  UserPublicPostsResponseDto,
} from '../types/profileApi';

const PROFILE_MEDIA_LIMIT_SPAN = 4;

type ApiQueryState = {
  endpointName?: string;
  originalArgs?: unknown;
  data?: unknown;
};

type LoadedPage = {
  page: number;
  limit: number;
  items: PublicRecentPostThumbDto[];
  hasMore: boolean;
};

type CachedUserPosts = {
  /** Pages currently in cache for this user, sorted ascending by page. */
  pages: LoadedPage[];
  /** Posts merged across pages, preserving page order. */
  items: PublicRecentPostThumbDto[];
  /** Max page index currently in cache. `-1` if none. */
  maxPage: number;
  /** `hasMore` reported by the highest-page response. */
  hasMore: boolean;
  /** True if at least one page is in cache. */
  hasAnyPage: boolean;
};

const EMPTY_CACHED_POSTS: CachedUserPosts = {
  pages: [],
  items: [],
  maxPage: -1,
  hasMore: false,
  hasAnyPage: false,
};

const selectApiQueries = (state: RootState) =>
  (state as unknown as { api: { queries: Record<string, ApiQueryState> } }).api
    .queries;

/**
 * Memoized selector factory — returns pages for the given userId by scanning
 * all cached `getUserPublicPosts` entries. Re-runs only when `state.api.queries`
 * changes reference (i.e. on any RTK Query cache update).
 */
const makeSelectCachedUserPosts = () =>
  createSelector(
    [selectApiQueries, (_state: RootState, userId: string) => userId],
    (queries, userId): CachedUserPosts => {
      if (!userId) return EMPTY_CACHED_POSTS;
      const pages: LoadedPage[] = [];
      for (const q of Object.values(queries)) {
        if (
          q?.endpointName !== 'getUserPublicPosts' ||
          !q.originalArgs ||
          !q.data
        ) {
          continue;
        }
        const args = q.originalArgs as UserPublicMediaQuery;
        if (args.userId !== userId) continue;
        const data = q.data as UserPublicPostsResponseDto;
        pages.push({
          page: args.page,
          limit: args.limit,
          items: data.items,
          hasMore: data.hasMore,
        });
      }
      if (pages.length === 0) return EMPTY_CACHED_POSTS;
      pages.sort((a, b) => a.page - b.page);
      const items = pages.flatMap((p) => p.items);
      const lastPage = pages[pages.length - 1];
      return {
        pages,
        items,
        maxPage: lastPage.page,
        hasMore: lastPage.hasMore,
        hasAnyPage: true,
      };
    },
  );

/**
 * Subscribe to all cached pages of `getUserPublicPosts` for a given user and
 * return both the merged `PublicRecentPostThumbDto[]` and the grid items
 * mapped for `ProfileGridItem` consumers.
 *
 * Reading from the cache (instead of a local snapshot) ensures that
 * optimistic patches from `setPostLike` / other mutations flow straight into
 * the profile grid.
 */
export function useCachedUserPublicPosts(
  userId: string | null | undefined,
): CachedUserPosts & { gridItems: ProfileGridItem[] } {
  const selector = useMemo(() => makeSelectCachedUserPosts(), []);
  const safeUserId = userId ?? '';
  const cached = useAppSelector((state) => selector(state, safeUserId));
  const gridItems = useMemo<ProfileGridItem[]>(() => {
    const out: ProfileGridItem[] = [];
    // Dedupe by id: refetching page 0 (e.g. after a profile mutation
    // invalidates the User tag) can overlap with stale later pages, and
    // duplicate ids → duplicate React keys → a Fabric "child already has a
    // parent" mount crash in the grid.
    const seenIds = new Set<string>();
    cached.pages.forEach(({ page, limit, items }) => {
      items.forEach((row, i) => {
        if (seenIds.has(row.id)) {
          return;
        }
        seenIds.add(row.id);
        const isVideo = row.mediaKind === 'short_video';
        const thumb = row.thumbnailUrl?.trim() || undefined;
        const mediaUrl = row.mediaUrl?.trim() || '';
        out.push({
          id: row.id,
          uri: isVideo
            ? thumb || ''
            : mediaUrl ||
              'https://placehold.co/400x400/1a202c/a0aec0/png?text=Multiflix',
          mediaUrl,
          span: 1 + ((page * limit + i) % PROFILE_MEDIA_LIMIT_SPAN) * 0.06,
          isVideo,
          thumbnailUrl: thumb,
          caption: row.caption ?? '',
          hashtags: row.hashtags ?? '',
          musicTitle: row.musicTitle ?? '',
          videoDurationSec: row.durationSeconds,
          music: row.music,
          originalSound: row.originalSound ?? null,
          comments: row.commentsCount,
          likes: row.likesCount,
          saves: row.savesCount ?? 0,
          likedByViewer: row.likedByViewer ?? false,
          savedByViewer: row.savedByViewer ?? false,
          createdAt: row.createdAt,
        });
      });
    });
    return out;
  }, [cached.pages]);
  return { ...cached, gridItems };
}
