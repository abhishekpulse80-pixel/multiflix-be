/** `GET /users/:userId/public` — matches `multiflix-backend` `UserPublicProfileDto`. */

import type { PostMusicDto } from './feedApi';

export type PublicRecentPostThumbDto = {
  id: string;
  mediaKind: 'image' | 'short_video';
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string | null;
  musicTitle: string | null;
  /** Source video duration in seconds — used to size the music window. */
  durationSeconds: number | null;
  /** Attached music (curated track or original sound), or null. */
  music: PostMusicDto | null;
  /** This post's own extracted sound (attribution label), or null. */
  originalSound: {
    soundId: string;
    title: string;
    ownerUsername: string;
  } | null;
  commentsCount: number;
  likesCount: number;
  /** Bookmark count (optional for back-compat with older cached responses). */
  savesCount?: number;
  /** Whether the authenticated viewer has liked this post. */
  likedByViewer: boolean;
  /** Whether the authenticated viewer has saved (bookmarked) this post. */
  savedByViewer?: boolean;
  /** ISO upload timestamp. */
  createdAt?: string;
};

export type PublicRecentBlogThumbDto = {
  id: string;
  /** May be null at runtime (blog without a generated thumbnail). */
  thumbnailUrl: string | null;
  viewsCount: number;
  /** Episode title — shown on the profile podcasts list. */
  title: string;
  /** Runtime in seconds (null until the upload pipeline fills it). */
  durationSeconds: number | null;
  /** ISO publish timestamp (null for drafts). */
  publishedAt: string | null;
};

export type UserPublicProfileDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isOnboarded: boolean;
  interests: string[];
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  postsCount: number;
  likesCount: number;
  followersCount: number;
  followingCount: number;
  /** Present when viewing another user’s profile; `null` on own profile. */
  isFollowing: boolean | null;
  /** Whether this user follows the viewer — drives the "Follow Back" label. */
  followsYou: boolean | null;
  /** When true, the subject has hidden their followers list from other users. */
  isFollowersListPrivate: boolean;
};

export type UserPublicMediaQuery = {
  userId: string;
  page: number;
  limit: number;
};

export type UserPublicPostsResponseDto = {
  items: PublicRecentPostThumbDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type UserPublicBlogsResponseDto = {
  items: PublicRecentBlogThumbDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};
