import type { TrendingSearchUser } from './trendingSearchUsersMock';
import { TRENDING_SEARCH_USERS } from './trendingSearchUsersMock';
import type { PostMusicDto } from '../types/feedApi';

export type ProfileGridItem = {
  id: string;
  /** Display URI for the grid tile (thumbnail for videos, image URL for images). */
  uri: string;
  /** Actual media URL for playback (used when opening post viewer). */
  mediaUrl?: string;
  isVideo?: boolean;
  /** Poster thumbnail for video posts. */
  thumbnailUrl?: string;
  /** Height multiplier vs square cell width (masonry-ish). */
  span: number;
  views?: number;
  likes?: number;
  caption?: string;
  hashtags?: string;
  musicTitle?: string;
  /** Source video duration (s) — used to size music window in viewers. */
  videoDurationSec?: number | null;
  /** Curated music attached to the post, or null. */
  music?: PostMusicDto | null;
  /** This post's own extracted sound (attribution label), or null. */
  originalSound?: {
    soundId: string;
    title: string;
    ownerUsername: string;
  } | null;
  comments?: number;
  /** Bookmark count for this post. */
  saves?: number;
  /** Whether the authenticated viewer has liked this post. */
  likedByViewer?: boolean;
  /** Whether the authenticated viewer has saved (bookmarked) this post. */
  savedByViewer?: boolean;
  /** ISO upload timestamp. */
  createdAt?: string;
  /** Blog/podcast episode title (shown on the podcasts tab). */
  title?: string;
  /** Blog/podcast runtime in seconds (shown as the duration pill). */
  durationSeconds?: number | null;
  /** Blog/podcast publish timestamp (ISO) — drives the relative date label. */
  publishedAt?: string | null;
};

export type PublicUserProfile = {
  userId: string;
  displayName: string;
  handle: string;
  bio: string;
  avatarUri: string;
  posts: number;
  followers: number;
  likes: number;
  /** From API when viewing another user; omitted for offline mocks. */
  isFollowing?: boolean | null;
  /** Whether this user follows the viewer — drives the "Follow Back" label. */
  followsYou?: boolean | null;
  /** When true, the subject has hidden their followers list from other users. */
  isFollowersListPrivate?: boolean;
  grid: ProfileGridItem[];
  /** Items shown on the “saved / likes” tab (subset or alternate set). */
  likedGrid: ProfileGridItem[];
};

const G = (id: string, w = 640) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const GRID_POOL: Omit<ProfileGridItem, 'id'>[] = [
  {
    uri: G('1524504388940-b1c1722653e1'),
    span: 1.15,
    isVideo: true,
    views: 367_500,
  },
  { uri: G('1494790108377-be9c29b29330'), span: 1, isVideo: false },
  { uri: G('1546069901-ba9599a7e63c'), span: 1.25, isVideo: false },
  {
    uri: G('1504674900247-0877df9cc836'),
    span: 1.1,
    isVideo: true,
    views: 837_900,
  },
  { uri: G('1510812431401-41d2bd2722f3'), span: 1, isVideo: false },
  { uri: G('1414235077428-338989a2e8c0'), span: 1.2, isVideo: false },
  { uri: G('1551218808-94e220cd1ff1'), span: 1, isVideo: true, views: 120_400 },
  { uri: G('1514362547207-9a16739852a1'), span: 1.15, isVideo: false },
  { uri: G('1470337458703-46a894d3bd42'), span: 1.3, isVideo: false },
];

function buildGrid(seed: string, count = 9): ProfileGridItem[] {
  const off = seed?.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }, (_, i) => {
    const src = GRID_POOL[(i + off) % GRID_POOL.length];
    return { ...src, id: `${seed}-g${i}` };
  });
}

function syntheticFromTrending(u: TrendingSearchUser): PublicUserProfile {
  const off = u.id.charCodeAt(1) + u.id.charCodeAt(0);
  const posts = 40 + (off % 180);
  const followers = 1_200 + (off % 50) * 1_100;
  const likes = 8_000 + (off % 120) * 4_200;
  const grid = buildGrid(u.id, 9);
  return {
    userId: u.id,
    displayName: u.name,
    handle: u.handle,
    bio: 'Creator',
    avatarUri: u.avatarUri,
    posts,
    followers,
    likes,
    grid,
    likedGrid: grid.filter((_, i) => i % 2 === 0),
  };
}

const JENNY_GRID: ProfileGridItem[] = [
  {
    id: 'jw0',
    uri: G('1524504388940-b1c1722653e1'),
    span: 1.1,
    isVideo: true,
    views: 367_500,
  },
  {
    id: 'jw1',
    uri: G('1494790108377-be9c29b29330'),
    span: 1,
    isVideo: false,
  },
  {
    id: 'jw2',
    uri: G('1546069901-ba9599a7e63c'),
    span: 1.2,
    isVideo: false,
  },
  {
    id: 'jw3',
    uri: G('1504674900247-0877df9cc836'),
    span: 1,
    isVideo: true,
    views: 837_900,
  },
  {
    id: 'jw4',
    uri: G('1510812431401-41d2bd2722f3'),
    span: 1.15,
    isVideo: false,
  },
  {
    id: 'jw5',
    uri: G('1414235077428-338989a2e8c0'),
    span: 1.25,
    isVideo: false,
  },
  {
    id: 'jw6',
    uri: G('1551218808-94e220cd1ff1'),
    span: 1,
    isVideo: false,
  },
  {
    id: 'jw7',
    uri: G('1514362547207-9a16739852a1'),
    span: 1.1,
    isVideo: true,
    views: 512_000,
  },
  {
    id: 'jw8',
    uri: G('1470337458703-46a894d3bd42'),
    span: 1.2,
    isVideo: false,
  },
];

const JENNY: PublicUserProfile = {
  userId: 'u4',
  displayName: 'Jenny Wilson',
  handle: 'jenny_wilson',
  bio: 'Actress & Singer',
  avatarUri:
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  posts: 679,
  followers: 2_600_000,
  likes: 27_000_000,
  grid: JENNY_GRID,
  likedGrid: JENNY_GRID.filter((_, i) => i % 2 === 1),
};

const KUNJ: PublicUserProfile = {
  userId: 'kunj',
  displayName: 'Kunj Apple',
  handle: 'kunj_apple',
  bio: 'Podcaster & creator',
  avatarUri:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  posts: 86,
  followers: 24_500,
  likes: 402_000,
  grid: buildGrid('kunj', 9),
  likedGrid: buildGrid('kunj2', 6),
};

export function getPublicUserProfile(userId: string): PublicUserProfile {
  if (userId === 'u4') {
    return JENNY;
  }
  if (userId === 'kunj') {
    return KUNJ;
  }
  const trend = TRENDING_SEARCH_USERS.find(u => u.id === userId);
  if (trend) {
    return syntheticFromTrending(trend);
  }
  return {
    userId,
    displayName: 'User',
    handle: 'user',
    bio: '',
    avatarUri: G('1529626455594-4ff0802cfb7e'),
    posts: 0,
    followers: 0,
    likes: 0,
    grid: buildGrid(userId, 6),
    likedGrid: [],
  };
}
