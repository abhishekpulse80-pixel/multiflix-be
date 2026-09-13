/** `POST /stories` — matches backend `createStoryBodySchema` (strict). */

export type StoryMediaKind = 'image' | 'short_video';

export type StoryMediaDto = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  url: string | null;
};

/**
 * Pinch/pan transform from the story editor. Same shape as the backend's
 * `IStoryMediaTransform`. Applied as a CSS-like transform on the media
 * wrapper at view time.
 */
export type StoryMediaTransformDto = {
  scale: number;
  /** Pan offsets as a fraction of canvas width / height (-2 .. 2). */
  translateX: number;
  translateY: number;
};

/** A single user-placed text overlay rendered on top of the story media. */
export type StoryTextOverlayDto = {
  text: string;
  /** Horizontal center, normalized 0..1 of the media frame. */
  x: number;
  /** Vertical center, normalized 0..1 of the media frame. */
  y: number;
  /** Hex color (e.g. "#FFFFFF"). */
  color: string;
  /** Font size in points. */
  fontSize: number;
};

/**
 * Music attachment populated by the backend for client-side dual playback.
 * The mobile player loads the video muted (or shows the image) and plays
 * `audioUrl` from `trimStartMs` for a fixed 15-second window.
 */
export type StoryMusicDto = {
  trackId: string;
  title: string;
  artistName: string | null;
  audioUrl: string;
  artUrl: string;
  durationSeconds: number | null;
  trimStartMs: number;
};

export type StoryDto = {
  id: string;
  authorId: string;
  authorUsername: string;
  /** Display fields — show fullName → username. */
  authorFullName?: string | null;
  mediaKind: StoryMediaKind;
  media: StoryMediaDto;
  soundTitle: string | null;
  /** Curated music attached to the story, or null when none was selected. */
  music: StoryMusicDto | null;
  caption: string | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  durationSeconds: number | null;
  viewsCount: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  /** When false, the story is excluded from the public Trending list. */
  showInTrending?: boolean;
  /** User-placed text overlays. Empty array when none. */
  textOverlays?: StoryTextOverlayDto[];
  /** Pinch/pan transform from the editor. Null = identity. */
  mediaTransform?: StoryMediaTransformDto | null;
};

export type CreateStoryFileRef = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  url: string | null;
};

export type CreateStoryRequest = {
  mediaKind: StoryMediaKind;
  file: CreateStoryFileRef;
  soundTitle?: string | null;
  /** Optional curated music track attached to the story. */
  musicTrackId?: string | null;
  /** Required when `musicTrackId` is set. Start of the 15s window in ms. */
  musicTrimStartMs?: number | null;
  caption?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  /** Required for video stories — must be ~15s. */
  durationSeconds?: number | null;
  /** Default true on the server. Set to false to hide from Trending. */
  showInTrending?: boolean;
  /** User-placed text overlays. Sent on image stories only for v1. */
  textOverlays?: StoryTextOverlayDto[];
  /** Optional pinch/pan transform from the editor. */
  mediaTransform?: StoryMediaTransformDto | null;
};

export type CreateStoryResponse = {
  story: StoryDto;
};

/** `GET /stories/user/:userId` — active (non-expired) stories for the profile ring. */
export type UserStoriesResponse = {
  items: StoryDto[];
};

export type StoryViewerDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  viewedAt: string;
};

export type StoryViewersResponse = {
  viewers: StoryViewerDto[];
};

export type StoryReactionType =
  | 'happy'
  | 'funny'
  | 'thrilled'
  | 'angry'
  | 'sad'
  | 'wow';

export type ReactionCountDto = {
  reaction: StoryReactionType;
  count: number;
};

export type StoryReactionsResponse = {
  counts: ReactionCountDto[];
  viewerReaction: StoryReactionType | null;
};

export type ReactToStoryResponse = {
  viewerReaction: StoryReactionType | null;
};

/** `GET /stories/connections` — active stories from follow network, grouped by author. */
export type ConnectionStoryAuthor = {
  userId: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  stories: StoryDto[];
  /** True when the viewer hasn't seen every one of this author's stories —
   * drives the coloured (vs grayed-out) ring, Instagram-style. */
  hasUnseen: boolean;
};

export type ConnectionStoriesResponse = {
  authors: ConnectionStoryAuthor[];
};

/** `GET /stories/trending` — one ring per author, ranked by most-viewed story. */
export type TrendingStoriesResponse = {
  authors: ConnectionStoryAuthor[];
};
