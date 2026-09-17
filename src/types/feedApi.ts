/** `GET /posts/feed` — matches `multiflix-backend` `HomeFeedResponse` / `PostDto`. */

export type FeedPostMediaDto = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  url: string | null;
};

export type FeedRecommendationUserDto = {
  id: string;
  handle: string;
  avatarUrl: string | null;
  /** Whether this recommended user already follows you → "Follow Back". */
  followsYou?: boolean;
};

/**
 * Populated music attachment for a post — same shape as the story version.
 * Mobile plays `audioUrl` from `trimStartMs` while the post is on screen.
 */
export type PostMusicDto = {
  /**
   * Source of the attached audio. `track` is the curated MusicTrack
   * catalog; `original_sound` is a creator's extracted post audio.
   */
  source: 'track' | 'original_sound';
  /**
   * Stable id of the attached audio. For `source: 'track'` this is the
   * MusicTrack id; for `source: 'original_sound'` it's the OriginalSound id.
   * The client uses it purely as a React key / deep-link param — the
   * detail screen branches on `source` to pick the right route.
   */
  trackId: string;
  title: string;
  artistName: string | null;
  audioUrl: string;
  artUrl: string;
  durationSeconds: number | null;
  trimStartMs: number;
};

export type FeedPostDto = {
  id: string;
  authorId: string;
  /** Same as profile username; from `GET /posts/feed` / `POST /posts`. */
  authorUsername: string;
  /** Display name of the author (e.g. "Jane Doe"). */
  authorFullName: string;
  /** Avatar URL of the author, null if unset. */
  authorAvatarUrl: string | null;
  mediaKind: 'image' | 'short_video';
  media: FeedPostMediaDto;
  /** HLS conversion state for video posts; images are `not_required`. */
  mediaProcessingStatus?:
    | 'processing'
    | 'ready'
    | 'failed'
    | 'not_required';
  hlsUrl?: string | null;
  hlsVariants?: Array<{
    quality: string;
    width: number;
    height: number;
    bitrateKbps: number;
    playlistUrl: string;
  }>;
  mediaProcessingError?: string | null;
  /** Auto-generated poster image for video posts. */
  thumbnailUrl: string | null;
  caption: string | null;
  hashtags: string | null;
  /** Display label for the attached track (auto-derived when music is set). */
  musicTitle: string | null;
  /** Populated music attachment, or null when none was selected. */
  music: PostMusicDto | null;
  /**
   * The post's OWN extracted Original Sound (attribution only — the video
   * plays its own audio, this is just a tappable "Original sound — @owner"
   * label). Null unless this is a video whose audio was extracted.
   */
  originalSound: {
    soundId: string;
    title: string;
    ownerUsername: string;
  } | null;
  /** True if the uploader chose to mute the original video audio. */
  originalAudioMuted: boolean;
  mediaWidth: number | null;
  mediaHeight: number | null;
  durationSeconds: number | null;
  likesCount: number;
  /** Bookmark count (optional for back-compat with older cached responses). */
  savesCount?: number;
  commentsCount: number;
  /** From feed: whether the current user liked this post. */
  likedByViewer: boolean;
  /** From feed: whether the current user saved (bookmarked) this post. */
  savedByViewer?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SponsoredAdDto = {
  id: string;
  imageUrl: string;
  avatarUrl: string | null;
  brandName: string;
  handle: string;
  caption: string;
  hashtags: string | null;
  targetUrl: string;
  ctaLabel: string;
};

export type HomeFeedItemDto =
  | { type: 'post'; post: FeedPostDto }
  | {
      type: 'recommendations';
      id: string;
      users: FeedRecommendationUserDto[];
    }
  | { type: 'sponsored'; ad: SponsoredAdDto };

export type HomeFeedResponse = {
  items: HomeFeedItemDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/** `GET /posts/trending` — top posts by likes (max 6). */
export type TrendingPostsResponse = {
  items: FeedPostDto[];
};

/** `GET /posts/hashtag/:tag` — paginated list of posts containing a hashtag. */
export type HashtagPostsResponse = {
  items: FeedPostDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  hashtag: string;
};

/** `GET /posts/music/:trackId` — paginated list of posts using a music track. */
export type MusicPostsResponse = {
  items: FeedPostDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  musicTrackId: string;
  music: {
    title: string;
    artistName: string | null;
    audioUrl: string;
    artUrl: string;
    durationSeconds: number | null;
  } | null;
};

/** `POST /posts/:postId/like` — `{ liked: true }` to like, `{ liked: false }` to remove like. */
export type PostLikeResponse = {
  liked: boolean;
  likesCount: number;
};

/** `POST /posts/:postId/save` — `{ saved: true }` to bookmark, `{ saved: false }` to remove. */
export type PostSaveResponse = {
  saved: boolean;
  savesCount: number;
};

/** `GET /posts/saved` — paginated list of posts the viewer has saved. */
export type SavedPostsResponse = {
  items: FeedPostDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/** `POST /posts` — create a new post from a previously uploaded file. */
export type CreatePostFileRef = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  url: string | null;
};

export type CreatePostRequest = {
  mediaKind: 'image' | 'short_video';
  file: CreatePostFileRef;
  caption?: string | null;
  hashtags?: string | null;
  musicTitle?: string | null;
  /** Optional curated music track attached to the post. */
  musicTrackId?: string | null;
  /** Required when `musicTrackId` is set. */
  musicTrimStartMs?: number | null;
  /**
   * Optional reusable creator sound (extracted from another user's post).
   * Mutually exclusive with `musicTrackId` — sending both is rejected by
   * the backend.
   */
  attachedOriginalSoundId?: string | null;
  /**
   * If true, the uploader chose to mute the original video audio. Players
   * silence the source clip regardless of any attached music. Omit (or
   * send `false`) for image posts and for video posts that should keep
   * their original audio.
   */
  originalAudioMuted?: boolean;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  durationSeconds?: number | null;
};

export type CreatePostResponse = {
  post: FeedPostDto;
};
