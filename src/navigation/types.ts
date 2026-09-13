import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { StoryDto } from '../types/storiesApi';

/**
 * One author's stories plus the header display info, used by the story
 * viewer's multi-author queue (Trending / connections rails).
 */
export type StoryViewerAuthorGroup = {
  stories: StoryDto[];
  authorUsername: string;
  authorDisplayName?: string | null;
  authorAvatarUri?: string | null;
};

/** Vertical feed (paging) — add modals / detail pushes here. */
export type HomeStackParamList = {
  HomeFeed: undefined;
};

export type TrendingStackParamList = {
  TrendingHome: undefined;
};

export type BloggingStackParamList = {
  BloggingMain: undefined;
  BloggingWatch: { postId: string };
};

export type MusicStackParamList = {
  MusicHome: undefined;
  MusicAlbumDetail: { albumId: string };
  MusicNowPlaying: { trackId: string; sourceAlbumId?: string };
  MusicFavourites: undefined;
  ArtistProfile: { artistId: string };
};

export type PlaceholderStackParamList = {
  MyProfile: undefined;
};

/**
 * Bottom tab route names (match `HomeTabId` in `HomeBottomBar`).
 * Params are owned by nested stack navigators, not the tab routes.
 */
export type MainTabParamList = {
  home: undefined;
  trending: undefined;
  blogging: undefined;
  music: undefined;
  profile: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  LetsYouIn: undefined;
  SignUp: undefined;
  ChooseInterests: undefined;
  FillProfile: undefined;
  SignIn: undefined;
  ForgotPassword: undefined;
  ForgotPasswordOtp: {
    channel: 'sms' | 'email';
    masked: string;
    email: string;
  };
  ResetNewPassword: { resetToken: string };
  /** Authenticated area: bottom tabs + per-tab stacks. */
  Main: undefined;
  /** Pushed above tabs — opened from feed, search, blogging, etc. */
  UserProfile: { userId: string };
  /** App settings (profile header). */
  Settings: undefined;
  /** Change password (from Settings — authenticated user). */
  ChangePassword: undefined;
  /** Users the authenticated viewer has blocked (from Settings). */
  BlockedUsers: undefined;
  /** Posts the authenticated viewer has saved/bookmarked (from Settings). */
  SavedPosts: undefined;
  /** Earnings overview (from Settings). */
  Earnings: undefined;
  /** Edit the authenticated user's profile fields. */
  EditProfile: undefined;
  /** Full-screen Instagram-style story viewer. */
  StoryViewer: {
    stories: StoryDto[];
    authorUsername: string;
    /** Caller's best display name (fullName). Header prefers the
     * per-story DTO fields, then this, then username. */
    authorDisplayName?: string | null;
    authorAvatarUri?: string | null;
    /** Index of the story to show first (default 0). */
    initialIndex?: number;
    /**
     * Optional multi-author queue (e.g. the Trending / connections rail).
     * When present, the viewer advances to the next author after the current
     * author's last story — and back to the previous author before the first
     * — closing only after the final author. Omit for single-author viewing.
     */
    authorQueue?: StoryViewerAuthorGroup[];
    /** Index into `authorQueue` for the author currently being shown. */
    queueIndex?: number;
  };
  /** Full-screen media preview before creating a post (step 1). */
  MediaPreview: {
    mediaUri: string;
    fileName?: string;
    mimeType?: string;
    isVideo: boolean;
    /**
     * Optional pre-attached music (e.g. when opening MediaPreview from a
     * music detail screen via "Use this sound"). The music picker on
     * MediaPreview seeds from this and can still be changed/removed.
     */
    initialMusic?: {
      /**
       * Optional. When set, MediaPreview/CreatePost route this through the
       * matching backend field (musicTrackId vs attachedOriginalSoundId).
       * Defaults to 'track' so older callers keep working.
       */
      source?: 'track' | 'original_sound';
      trackId: string;
      title: string;
      artistName: string | null;
      artUrl: string;
      audioUrl: string;
      durationSeconds: number;
      trimStartMs: number;
    };
  };
  /** Caption / hashtags entry before publishing a post (step 2). */
  CreatePost: {
    mediaUri: string;
    fileName?: string;
    mimeType?: string;
    isVideo: boolean;
    soundTitle: string | null;
    /** Optional curated music selection from the picker on step 1. */
    musicTrackId?: string | null;
    /** Optional creator-extracted Original Sound from step 1's picker. */
    attachedOriginalSoundId?: string | null;
    musicTrimStartMs?: number | null;
  };
  /** Full-screen blog creation form (video + title + description). */
  CreateBlog: {
    videoUri: string;
    fileName?: string;
    mimeType?: string;
  };
  /** Followers / Following list for a user. */
  FollowersList: { userId: string; initialTab?: 'followers' | 'following' };
  /** Bank account form. */
  BankAccount: undefined;
  /** Place a withdrawal request (amount entry + submit). */
  WithdrawRequest: undefined;
  /** Notifications inbox (likes, comments, new followers). */
  Notifications: undefined;
  /** Conversations list (DMs). */
  ChatList: undefined;
  /** Conversations the user has hidden. */
  HiddenChats: undefined;
  /** 1-to-1 chat conversation. */
  Chat: {
    userId: string;
    username: string;
    fullName: string;
    avatarUrl: string | null;
    /** If known, skip getOrCreate call. */
    conversationId?: string;
  };
  /** Full-screen story preview after photo/video is picked. */
  StoryPreview: {
    imageUri: string;
    /** From picker — improves multipart `Content-Type` on Android. */
    fileName?: string;
    mimeType?: string;
    isVideo?: boolean;
  };
  UserProfilePostsViewer: {
    userId: string;
    userDisplayName: string;
    userHandle: string;
    userAvatarUri: string;
    initialPostId: string;
    initialPage: number;
    hasMore: boolean;
    /** When set, open the comments sheet for this post on mount (e.g. opened
     *  from a comment notification). */
    initialCommentsPostId?: string;
    posts: Array<{
      id: string;
      uri: string;
      likes: number;
      isVideo: boolean;
      caption: string;
      hashtags: string;
      musicTitle: string;
      music?: import('../types/feedApi').PostMusicDto | null;
      originalSound?: {
        soundId: string;
        title: string;
        ownerUsername: string;
      } | null;
      /** Source video duration (s) — used to size the music window. */
      videoDurationSec?: number | null;
      comments: number;
      likedByViewer: boolean;
      savedByViewer?: boolean;
      createdAt?: string;
    }>;
  };
  /** Dev playground for testing video player. */
  VideoPlayground: undefined;
  /** Full-screen pager for `GET /posts/trending` (fixed list, no pagination). */
  TrendingPostsViewer: {
    initialPostId: string;
    posts: Array<{
      id: string;
      uri: string;
      likes: number;
      isVideo: boolean;
      caption: string;
      hashtags: string;
      musicTitle: string;
      music?: import('../types/feedApi').PostMusicDto | null;
      originalSound?: {
        soundId: string;
        title: string;
        ownerUsername: string;
      } | null;
      /** Source video duration (s) — used to size the music window. */
      videoDurationSec?: number | null;
      comments: number;
      likedByViewer: boolean;
      savedByViewer?: boolean;
      createdAt?: string;
      authorId: string;
      authorUsername: string;
      /** Author avatar + display name when known (e.g. a post shared in chat). */
      authorAvatarUri?: string | null;
      authorDisplayName?: string | null;
    }>;
  };
  /** Posts containing a given hashtag (header + grid). */
  HashtagFeed: { tag: string };
  /** Posts using a given music track (header + grid). */
  MusicFeed: {
    trackId: string;
    /** Optional preview values shown until the API responds. */
    initialTitle?: string;
    initialArtUrl?: string | null;
  };
  /**
   * Posts using a given Original Sound (creator-extracted audio).
   * Mirrors MusicFeed in layout but reads from /sounds/:id and
   * /sounds/:id/posts. Includes a "Use this sound" CTA at the top.
   */
  SoundDetail: {
    soundId: string;
    /** Optional preview values shown until the API responds. */
    initialTitle?: string;
    initialArtUrl?: string | null;
  };
};

export type SplashScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Splash'
>;
export type OnboardingScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'Onboarding'
>;
