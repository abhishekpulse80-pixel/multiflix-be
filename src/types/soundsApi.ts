/**
 * Original Sound = audio extracted from a creator's video post and
 * republished as a reusable clip. The mobile picker shows these in an
 * "Original" tab alongside the curated music catalog.
 */
export type OriginalSoundDto = {
  id: string;
  sourcePostId: string;
  ownerUserId: string;
  ownerUsername: string;
  ownerFullName: string | null;
  ownerAvatarUrl: string | null;
  /** Display label (defaults to "Original sound — <username>"). */
  title: string;
  /** Public CDN URL for the .m4a — null while still processing/failed. */
  audioUrl: string | null;
  durationSeconds: number | null;
  /** How many videos have reused this sound. Drives the catalog sort. */
  usesCount: number;
  status: 'processing' | 'ready' | 'failed' | 'deleted';
  createdAt: string;
};

export type OriginalSoundsListResponse = {
  items: OriginalSoundDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type SoundPostListItem = {
  id: string;
  authorId: string;
  authorUsername: string;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
  likesCount: number;
  createdAt: string;
};

export type PostsUsingSoundResponse = {
  items: SoundPostListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  soundId: string;
};

export type AudioStatusResponse = {
  soundId?: string;
  trackId?: string;
  status: 'processing' | 'ready' | 'failed' | 'not_required';
  recommendedQuality?: 'low' | 'medium' | 'high';
  recommendedUrl: string | null;
  variants: Array<{
    quality: 'low' | 'medium' | 'high';
    bitrateKbps: number;
    url: string;
  }>;
  error: string | null;
};
