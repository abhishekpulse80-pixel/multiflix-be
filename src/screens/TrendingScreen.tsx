import {
  useFocusEffect,
  useNavigation } from '@react-navigation/native';
import React,
  {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Circle, Path } from 'react-native-svg';
import type { TrendingTile } from '../data/trendingMock';
import { TRENDING_GRID_BOTTOM, TRENDING_GRID_TOP } from '../data/trendingMock';
import {
  TRENDING_SEARCH_USERS,
  type TrendingSearchUser,
} from '../data/trendingSearchUsersMock';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  navigateToBloggingWatch,
  navigateToStoryViewer,
  navigateToTrendingPostsViewer,
  navigateToUserProfile,
} from '../navigation/rootNavigationRef';
import {
  addRecentUserSearch,
  clearRecentUserSearches,
  loadRecentUserSearches,
  removeRecentUserSearch,
} from '../services/recentUserSearches';
import { useGetTrendingBlogsQuery } from '../store/api/blogsApi';
import { useGetTrendingPostsQuery } from '../store/api/feedApi';
import { useGetTrendingStoriesQuery } from '../store/api/storiesApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useSearchUsersQuery } from '../store/api/usersApi';
import { useAppSelector } from '../store/hooks';
import { selectAccessToken } from '../store/selectors';
import type { ConnectionStoryAuthor } from '../types/storiesApi';
import type { UserSearchItemDto } from '../types/userSearchApi';
import { formatCount } from '../utils/formatCount';
import { useTheme } from '../theme';

const H_PAD = 8;
const GAP = 3;
const TILE_RADIUS = 4;
const STORY_RING = '#A855F7';
const HEADER_ICON_BG = '#246BFD';
const PLACEHOLDER_TILE =
  'https://placehold.co/400x400/1a202c/a0aec0/png?text=Multiflix';
const SEARCH_USER_AVATAR_PLACEHOLDER =
  'https://placehold.co/120x120/1a202c/a0aec0/png?text=User';

function SearchIcon({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path
        d="M20 20l-3-3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function ChevronLeftIcon({
  size = 22,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

function useSkeletonPulse() {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
}

function TrendingTileSkeleton({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const pulse = useSkeletonPulse();
  return (
    <Animated.View
      style={[
        styles.tileWrap,
        styles.tileSkeleton,
        { width, height, opacity: pulse },
      ]}
      accessibilityLabel="Loading"
    />
  );
}

function StoryCircleSkeleton() {
  const pulse = useSkeletonPulse();
  return (
    <Animated.View style={[styles.storySkeletonCircle, { opacity: pulse }]} />
  );
}

function TrendingSkeleton({
  col3W,
  tileH3,
  col2W,
  tileH2,
}: {
  col3W: number;
  tileH3: number;
  col2W: number;
  tileH2: number;
}) {
  return (
    <>
      {/* Story circles skeleton */}
      <View style={styles.storiesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesRow}
        >
          {Array.from({ length: 6 }, (_, i) => (
            <StoryCircleSkeleton key={`sk-story-${i}`} />
          ))}
        </ScrollView>
      </View>

      {/* Post tiles skeleton */}
      <View style={[styles.gridBlock, { paddingHorizontal: H_PAD }]}>
        <View style={styles.row3}>
          {Array.from({ length: 6 }, (_, i) => (
            <TrendingTileSkeleton
              key={`sk-p-${i}`}
              width={col3W}
              height={tileH3}
            />
          ))}
        </View>
        <View style={[styles.row2, { marginTop: GAP }]}>
          {Array.from({ length: 4 }, (_, i) => (
            <TrendingTileSkeleton
              key={`sk-b-${i}`}
              width={col2W}
              height={tileH2}
            />
          ))}
        </View>
      </View>
    </>
  );
}

function TrendingTileCard({
  item,
  width,
  height,
  fontSemibold,
  variant,
  onPress,
}: {
  item: TrendingTile;
  width: number;
  height: number;
  fontSemibold: string;
  /** Posts: heart + like-style count. Blogs/podcasts: play + view count. */
  variant: 'posts' | 'blogs';
  onPress?: () => void;
}) {
  const isPosts = variant === 'posts';
  const inner = (
    <>
      <FastImage
        source={{ uri: item.imageUri, priority: FastImage.priority.normal }}
        style={styles.tileImage}
        resizeMode={FastImage.resizeMode.cover}
        accessibilityLabel={isPosts ? 'Trending post' : 'Trending podcast'}
      />
      <View style={styles.tileScrim} pointerEvents="none" />
      {/* Posts show no like/view count on the card. Blogs/podcasts keep their
          play + view count. */}
      {!isPosts ? (
        <View style={styles.tileMeta}>
          <View style={styles.playCircle}>
            <PlayBadgeIcon size={11} />
          </View>
          <Text style={[styles.viewText, { fontFamily: fontSemibold }]}>
            {formatCount(item.views)}
          </Text>
        </View>
      ) : null}
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.tileWrap, { width, height }]}
        accessibilityRole="button"
        accessibilityLabel={
          isPosts ? 'View trending posts' : 'Trending podcast'
        }
      >
        {inner}
      </Pressable>
    );
  }
  return <View style={[styles.tileWrap, { width, height }]}>{inner}</View>;
}

function filterUsers(
  query: string,
  users: TrendingSearchUser[],
): TrendingSearchUser[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return users;
  }
  return users.filter(
    u => u.name.toLowerCase().includes(q) || u.handle.toLowerCase().includes(q),
  );
}

function mapSearchItemToTrendingUser(d: UserSearchItemDto): TrendingSearchUser {
  const name = d.fullName?.trim() || d.username;
  return {
    id: d.id,
    name,
    handle: d.username,
    avatarUri: d.avatarUrl?.trim() || SEARCH_USER_AVATAR_PLACEHOLDER,
  };
}

/** Posts per horizontal strip (rendered as a 2-row carousel → 5 cols × 2). */
const POSTS_PER_STRIP = 10;
/** Blogs per grid block (2 columns × 2 rows). */
const BLOGS_PER_GRID = 4;

/** Split a flat tile list into fixed-size groups (strips / grids). */
function chunkTiles(items: TrendingTile[], size: number): TrendingTile[][] {
  const out: TrendingTile[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** One row of the interleaved Trending feed: a posts strip or a blogs grid. */
type TrendingBlock =
  | { type: 'posts'; key: string; tiles: TrendingTile[] }
  | { type: 'blogs'; key: string; tiles: TrendingTile[] };

export function TrendingScreen() {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const token = useAppSelector(selectAccessToken);
  const skipTrending = !token;
  const {
    data: trendingPostsRes,
    isLoading: trendingPostsLoading,
    isFetching: trendingPostsFetching,
    isError: trendingPostsError,
    refetch: refetchTrendingPosts,
  } = useGetTrendingPostsQuery(undefined, {
    skip: skipTrending,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const {
    data: trendingBlogsRes,
    isLoading: trendingBlogsLoading,
    isFetching: trendingBlogsFetching,
    isError: trendingBlogsError,
    refetch: refetchTrendingBlogs,
  } = useGetTrendingBlogsQuery(undefined, {
    skip: skipTrending,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const {
    data: trendingStoriesRes,
    isError: trendingStoriesError,
    refetch: refetchTrendingStories,
  } = useGetTrendingStoriesQuery(undefined, {
    skip: skipTrending,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([
      refetchTrendingPosts(),
      refetchTrendingBlogs(),
      refetchTrendingStories(),
    ]),
  );

  const navigation = useNavigation();
  const listRef = useRef<FlatList>(null);
  // Re-pressing the Trending tab while it's focused scrolls to top + refreshes,
  // same as the Home tab.
  useEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return undefined;
    const unsub = (
      tabNav as { addListener: (e: string, cb: () => void) => () => void }
    ).addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      void onRefresh();
    });
    return unsub;
  }, [navigation, onRefresh]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const [recentUsers, setRecentUsers] = useState<TrendingSearchUser[]>([]);

  // Hydrate recent-user list once the search view opens. Refresh on every open
  // so taps from other surfaces that also update the list stay in sync.
  useEffect(() => {
    if (!searchOpen) return;
    let cancelled = false;
    void loadRecentUserSearches().then((list) => {
      if (!cancelled) setRecentUsers(list);
    });
    return () => {
      cancelled = true;
    };
  }, [searchOpen]);

  const handleUserTap = useCallback((user: TrendingSearchUser) => {
    void addRecentUserSearch(user).then((next) => setRecentUsers(next));
    navigateToUserProfile(user.id);
  }, []);

  const handleClearRecents = useCallback(() => {
    setRecentUsers([]);
    void clearRecentUserSearches();
  }, []);

  const handleRemoveRecent = useCallback((userId: string) => {
    // Optimistic local removal — keeps the list snappy. Storage write
    // happens in the background; if it fails, the entry will reappear on
    // next hydrate, which is acceptable for a cosmetic list.
    setRecentUsers((prev) => prev.filter((u) => u.id !== userId));
    void removeRecentUserSearch(userId);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      setDebouncedQuery('');
      return;
    }
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(id);
  }, [query, searchOpen]);

  const offlineSearchUsers = useMemo(
    () => filterUsers(query, TRENDING_SEARCH_USERS),
    [query],
  );

  const {
    data: remoteSearch,
    isFetching: remoteSearchFetching,
    isError: remoteSearchError,
  } = useSearchUsersQuery(
    { q: debouncedQuery, limit: 25 },
    {
      skip: !token || !searchOpen || debouncedQuery.length === 0,
    },
  );

  const displayUsers = useMemo((): TrendingSearchUser[] => {
    if (!token) {
      return offlineSearchUsers;
    }
    if (debouncedQuery.length === 0) {
      return [];
    }
    return (remoteSearch?.items ?? []).map(mapSearchItemToTrendingUser);
  }, [token, offlineSearchUsers, debouncedQuery, remoteSearch]);

  const showingRecents =
    !!token && debouncedQuery.length === 0 && recentUsers.length > 0;

  const userListData = token
    ? debouncedQuery.length === 0
      ? recentUsers
      : displayUsers
    : offlineSearchUsers;

  useEffect(() => {
    if (searchOpen) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [searchOpen]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Re-pull trending stories on focus so viewed rings gray out after
      // returning from the story viewer.
      if (token) {
        refetchTrendingStories();
      }
      return undefined;
    }, [token, refetchTrendingStories]),
  );

  const scrollBottomPad = 28;

  // Floor so tiles + gaps are guaranteed to fit the row (a raw float lands
  // exactly on contentW and sub-pixel rounding can wrap the last tile).
  const col3W = useMemo(
    () => Math.floor((screenW - H_PAD * 2 - GAP * 2) / 3),
    [screenW],
  );
  const col2W = useMemo(
    () => Math.floor((screenW - H_PAD * 2 - GAP) / 2),
    [screenW],
  );

  const tileH3 = useMemo(() => col3W * 1.42, [col3W]);
  const tileH2 = useMemo(() => col2W * 1.12, [col2W]);

  const postTiles = useMemo((): TrendingTile[] | null => {
    if (!token) {
      return TRENDING_GRID_TOP;
    }
    if ((trendingPostsLoading || trendingPostsFetching) && !trendingPostsRes) {
      return null;
    }
    if (trendingPostsError) {
      return TRENDING_GRID_TOP;
    }
    const items = trendingPostsRes?.items ?? [];
    if (items.length === 0) {
      return [];
    }
    return items.map(p => {
      const isVideo = p.mediaKind === 'short_video';
      const posterUri = isVideo
        ? p.thumbnailUrl?.trim() || p.media.url?.trim() || PLACEHOLDER_TILE
        : p.media.url?.trim() || PLACEHOLDER_TILE;
      return {
        id: p.id,
        imageUri: posterUri,
        views: p.likesCount,
      };
    });
  }, [
    token,
    trendingPostsLoading,
    trendingPostsFetching,
    trendingPostsRes,
    trendingPostsError,
  ]);

  /** Chunk a list of tiles into columns of 2 for the horizontal two-row carousel. */
  const chunkPairs = useCallback((items: TrendingTile[]): TrendingTile[][] => {
    const pairs: TrendingTile[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      pairs.push(items.slice(i, i + 2));
    }
    return pairs;
  }, []);

  const trendingViewerPosts = useMemo(() => {
    if (!token || trendingPostsError || !trendingPostsRes?.items?.length) {
      return null;
    }
    return trendingPostsRes.items.map(p => ({
      id: p.id,
      uri: p.media.url?.trim() || PLACEHOLDER_TILE,
      likes: p.likesCount,
      isVideo: p.mediaKind === 'short_video',
      caption: p.caption ?? '',
      hashtags: p.hashtags ?? '',
      musicTitle: p.musicTitle ?? '',
      music: p.music ?? null,
      originalSound: p.originalSound ?? null,
      posterUri: p.thumbnailUrl,
      videoDurationSec: p.durationSeconds ?? null,
      comments: p.commentsCount,
      likedByViewer: p.likedByViewer,
      savedByViewer: p.savedByViewer,
      createdAt: p.createdAt,
      authorId: p.authorId,
      authorUsername: p.authorUsername,
      // Display name (full name → username) + avatar so the viewer shows the
      // real name/photo instead of falling back to the @handle.
      authorDisplayName: p.authorFullName?.trim() || p.authorUsername,
      authorAvatarUri: p.authorAvatarUrl,
    }));
  }, [token, trendingPostsRes, trendingPostsError]);

  const openTrendingPostsViewer = useCallback(
    (postId: string) => {
      if (!trendingViewerPosts?.length) {
        return;
      }
      navigateToTrendingPostsViewer({
        initialPostId: postId,
        posts: trendingViewerPosts,
      });
    },
    [trendingViewerPosts],
  );

  const blogTiles = useMemo((): TrendingTile[] | null => {
    if (!token) {
      return TRENDING_GRID_BOTTOM;
    }
    if ((trendingBlogsLoading || trendingBlogsFetching) && !trendingBlogsRes) {
      return null;
    }
    if (trendingBlogsError) {
      return TRENDING_GRID_BOTTOM;
    }
    const items = trendingBlogsRes?.items ?? [];
    if (items.length === 0) {
      return [];
    }
    return items.map(b => ({
      id: `blog-${b.id}`,
      imageUri: b.thumbnailUrl?.trim() || PLACEHOLDER_TILE,
      views: b.viewsCount,
    }));
  }, [
    token,
    trendingBlogsLoading,
    trendingBlogsFetching,
    trendingBlogsRes,
    trendingBlogsError,
  ]);

  /**
   * Interleaved feed: a 10-post strip, then a 4-blog grid, repeating —
   * posts(0..10), blogs(0..4), posts(10..20), blogs(4..8), … Empty blog grids
   * are omitted, so once blogs run out the remaining post strips continue
   * alone. Empty while data is still loading (header shows the skeleton).
   */
  const blocks = useMemo<TrendingBlock[]>(() => {
    if (postTiles == null) {
      return [];
    }
    const postChunks = chunkTiles(postTiles, POSTS_PER_STRIP);
    const blogChunks =
      blogTiles == null ? [] : chunkTiles(blogTiles, BLOGS_PER_GRID);
    const out: TrendingBlock[] = [];
    const rounds = Math.max(postChunks.length, blogChunks.length);
    for (let i = 0; i < rounds; i++) {
      const posts = postChunks[i];
      if (posts && posts.length > 0) {
        out.push({ type: 'posts', key: `p${i}`, tiles: posts });
      }
      const blogs = blogChunks[i];
      if (blogs && blogs.length > 0) {
        out.push({ type: 'blogs', key: `b${i}`, tiles: blogs });
      }
    }
    return out;
  }, [postTiles, blogTiles]);

  const storyAuthors = useMemo<ConnectionStoryAuthor[]>(() => {
    if (!token || trendingStoriesError) {
      return [];
    }
    return (trendingStoriesRes?.authors ?? []).slice(0, 10);
  }, [token, trendingStoriesRes, trendingStoriesError]);

  const openAuthorStories = useCallback(
    (author: ConnectionStoryAuthor) => {
      if (!author.stories.length) {
        return;
      }
      // Build a queue across every author that has stories so the viewer can
      // auto-advance from the tapped author through the rest of the rail
      // (and close only after the last one).
      const withStories = storyAuthors.filter(a => a.stories.length > 0);
      const startIndex = withStories.findIndex(
        a => a.userId === author.userId,
      );
      if (startIndex < 0) {
        return;
      }
      const queue = withStories.map(a => ({
        stories: a.stories,
        authorUsername: a.username,
        authorDisplayName: a.fullName,
        authorAvatarUri: a.avatarUrl,
      }));
      navigateToStoryViewer({
        ...queue[startIndex],
        authorQueue: queue,
        queueIndex: startIndex,
      });
    },
    [storyAuthors],
  );

  const renderUser = useCallback(
    ({ item }: { item: TrendingSearchUser }) => (
      <Pressable
        style={styles.userRow}
        onPress={() => handleUserTap(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, @${item.handle}`}
      >
        <UserAvatar uri={item.avatarUri} style={styles.userAvatar} />
        <View style={styles.userText}>
          <Text
            style={[styles.userName, { fontFamily: t.fontFamily.semibold }]}
          >
            {item.name}
          </Text>
          <Text
            style={[styles.userHandle, { fontFamily: t.fontFamily.regular }]}
          >
            @{item.handle}
          </Text>
        </View>
        {showingRecents ? (
          <Pressable
            onPress={() => handleRemoveRecent(item.id)}
            hitSlop={10}
            style={styles.userRemoveBtn}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${item.handle} from recent searches`}
          >
            <Text
              style={[
                styles.userRemoveText,
                { fontFamily: t.fontFamily.regular },
              ]}
            >
              ×
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    ),
    [
      handleUserTap,
      handleRemoveRecent,
      showingRecents,
      t.fontFamily.regular,
      t.fontFamily.semibold,
    ],
  );

  const userKey = useCallback((item: TrendingSearchUser) => item.id, []);

  /**
   * Render a posts section: 2-row horizontal carousel.
   * - First section preserves legacy UX: skeleton while loading, empty text when empty.
   * - Later sections are silently hidden when no data (to skip filler).
   */
  const renderPostsSection = ({
    slice,
    keyPrefix,
    isFirst,
  }: {
    slice: TrendingTile[] | null;
    keyPrefix: string;
    isFirst: boolean;
  }) => {
    if (slice == null) {
      if (!isFirst) return null;
      return (
        <View style={[styles.gridBlock, { marginBottom: GAP }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.postsHScrollContent,
              { paddingHorizontal: H_PAD },
            ]}
          >
            {Array.from({ length: 3 }, (_, i) => (
              <View key={`sk-${keyPrefix}-col-${i}`} style={styles.postsColumn}>
                <TrendingTileSkeleton width={col3W} height={tileH3} />
                <TrendingTileSkeleton width={col3W} height={tileH3} />
              </View>
            ))}
          </ScrollView>
        </View>
      );
    }
    if (slice.length === 0) {
      if (!isFirst) return null;
      return (
        <View style={{ paddingHorizontal: H_PAD, marginBottom: GAP }}>
          <Text
            style={[styles.emptyGrid, { fontFamily: t.fontFamily.regular }]}
          >
            No trending posts yet.
          </Text>
        </View>
      );
    }
    const pairs = chunkPairs(slice);
    return (
      <View style={[styles.gridBlock, { marginBottom: GAP }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.postsHScrollContent,
            { paddingHorizontal: H_PAD },
          ]}
        >
          {pairs.map((pair, colIdx) => (
            <View key={`${keyPrefix}-col-${colIdx}`} style={styles.postsColumn}>
              {pair.map(item => (
                <TrendingTileCard
                  key={`${keyPrefix}-${item.id}`}
                  item={item}
                  width={col3W}
                  height={tileH3}
                  fontSemibold={t.fontFamily.semibold}
                  variant="posts"
                  onPress={
                    trendingViewerPosts
                      ? () => openTrendingPostsViewer(item.id)
                      : undefined
                  }
                />
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  /**
   * Render a blogs section: 2-column wrap grid (same tiles as legacy layout).
   * - First section preserves legacy UX: skeleton while loading, empty text when empty.
   * - Later sections are silently hidden when no data.
   */
  const renderBlogsSection = ({
    slice,
    keyPrefix,
    isFirst,
  }: {
    slice: TrendingTile[] | null;
    keyPrefix: string;
    isFirst: boolean;
  }) => {
    if (slice == null) {
      if (!isFirst) return null;
      return (
        <View
          style={[
            styles.row2,
            { marginBottom: GAP, paddingHorizontal: H_PAD },
          ]}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <TrendingTileSkeleton
              key={`sk-${keyPrefix}-${i}`}
              width={col2W}
              height={tileH2}
            />
          ))}
        </View>
      );
    }
    // Hide the section entirely when there are no podcasts — no empty-state
    // text (per product: an empty podcasts row should be silent).
    if (slice.length === 0) {
      return null;
    }
    return (
      <View
        style={[
          styles.row2,
          { marginBottom: GAP, paddingHorizontal: H_PAD },
        ]}
      >
        {slice.map(item => {
          const blogId = item.id.replace(/^blog-/, '');
          return (
            <TrendingTileCard
              key={`${keyPrefix}-${item.id}`}
              item={item}
              width={col2W}
              height={tileH2}
              fontSemibold={t.fontFamily.semibold}
              variant="blogs"
              onPress={
                token ? () => navigateToBloggingWatch(blogId) : undefined
              }
            />
          );
        })}
      </View>
    );
  };

  if (searchOpen) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.searchHeader, { paddingTop: 12 }]}>
          <Pressable
            onPress={closeSearch}
            hitSlop={12}
            style={styles.searchBack}
            accessibilityLabel="Close search"
            accessibilityRole="button"
          >
            <ChevronLeftIcon color="#0D0D0D" />
          </Pressable>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { fontFamily: t.fontFamily.regular }]}
            placeholder="Search users…"
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
            accessibilityLabel="Search users"
          />
        </View>
        <FlatList
          style={styles.userList}
          data={userListData}
          keyExtractor={userKey}
          renderItem={renderUser}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.userListContent,
            { paddingBottom: scrollBottomPad },
          ]}
          ListHeaderComponent={
            showingRecents ? (
              <View style={styles.recentHeaderRow}>
                <Text
                  style={[
                    styles.recentHeaderTitle,
                    { fontFamily: t.fontFamily.semibold },
                  ]}
                >
                  Recent
                </Text>
                <Pressable
                  onPress={handleClearRecents}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear recent searches"
                >
                  <Text
                    style={[
                      styles.recentClearLink,
                      { fontFamily: t.fontFamily.semibold },
                    ]}
                  >
                    Clear
                  </Text>
                </Pressable>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !token ? (
              query.trim().length > 0 ? (
                <Text
                  style={[
                    styles.emptyUsers,
                    { fontFamily: t.fontFamily.medium },
                  ]}
                >
                  {`No users match "${query.trim()}".`}
                </Text>
              ) : null
            ) : debouncedQuery.length === 0 ? (
              <Text
                style={[styles.emptyUsers, { fontFamily: t.fontFamily.medium }]}
              >
                Type a name or @handle to search people on Multiflix.
              </Text>
            ) : remoteSearchFetching ? (
              <View style={styles.searchLoadingWrap}>
                <ActivityIndicator size="small" color={HEADER_ICON_BG} />
              </View>
            ) : remoteSearchError ? (
              <Text
                style={[styles.emptyUsers, { fontFamily: t.fontFamily.medium }]}
              >
                Could not search. Check your connection and try again.
              </Text>
            ) : (
              <Text
                style={[styles.emptyUsers, { fontFamily: t.fontFamily.medium }]}
              >
                {`No users found for "${debouncedQuery}".`}
              </Text>
            )
          }
        />
      </KeyboardAvoidingView>
    );
  }

  const showFullSkeleton = token && postTiles == null && blogTiles == null;
  const showEmptyPosts = postTiles != null && postTiles.length === 0;
  const showRefreshFooter =
    token &&
    (trendingPostsFetching || trendingBlogsFetching) &&
    postTiles != null &&
    blogTiles != null;

  return (
    <FlatList
      ref={listRef}
      style={styles.scroll}
      data={blocks}
      keyExtractor={block => block.key}
      renderItem={({ item }) =>
        item.type === 'posts'
          ? renderPostsSection({
              slice: item.tiles,
              keyPrefix: item.key,
              isFirst: false,
            })
          : renderBlogsSection({
              slice: item.tiles,
              keyPrefix: item.key,
              isFirst: false,
            })
      }
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: scrollBottomPad },
      ]}
      showsVerticalScrollIndicator={false}
      // The list is windowed, so only the visible post strips / blog grids
      // mount — keeping image load bounded across ~100 posts. Clipping is left
      // off to avoid the Fabric reparent crash with nested horizontal lists.
      removeClippedSubviews={false}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={5}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={REFRESH_TINT}
          colors={[REFRESH_TINT]}
        />
      }
      ListHeaderComponent={
        <>
          <View style={[styles.header, { paddingTop: 12 }]}>
            <View style={styles.headerLeft}>
              <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
                Trending
              </Text>
            </View>
            <Pressable
              hitSlop={12}
              accessibilityLabel="Search users"
              accessibilityRole="button"
              onPress={() => setSearchOpen(true)}
            >
              <SearchIcon color="#0D0D0D" />
            </Pressable>
          </View>

          {showFullSkeleton ? (
            <TrendingSkeleton
              col3W={col3W}
              tileH3={tileH3}
              col2W={col2W}
              tileH2={tileH2}
            />
          ) : storyAuthors.length > 0 ? (
            <View style={styles.storiesSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storiesRow}
              >
                {storyAuthors.map(author => (
                  <Pressable
                    key={author.userId}
                    onPress={() => openAuthorStories(author)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${author.username}'s stories`}
                    style={styles.storyItem}
                  >
                    <View
                      style={[
                        styles.storyCell,
                        author.hasUnseen ? null : styles.storyCellSeen,
                      ]}
                    >
                      <UserAvatar
                        uri={author.avatarUrl ?? undefined}
                        style={styles.storyAvatar}
                        accessibilityLabel={`${author.username} story`}
                      />
                    </View>
                    <Text
                      style={[
                        styles.storyName,
                        { fontFamily: t.fontFamily.medium },
                      ]}
                      numberOfLines={1}
                    >
                      {author.username}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </>
      }
      ListEmptyComponent={
        showFullSkeleton || !showEmptyPosts ? null : (
          <View style={{ paddingHorizontal: H_PAD, marginTop: GAP }}>
            <Text
              style={[styles.emptyGrid, { fontFamily: t.fontFamily.regular }]}
            >
              No trending posts yet.
            </Text>
          </View>
        )
      }
      ListFooterComponent={
        showRefreshFooter ? (
          <View style={[styles.refreshRow, { paddingHorizontal: H_PAD }]}>
            <ActivityIndicator size="small" color={HEADER_ICON_BG} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD - 4,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  searchBack: {
    padding: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#0D0D0D',
    paddingVertical: Platform.select({ ios: 10, default: 8 }),
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F2F3F5',
    minHeight: 44,
  },
  userList: {
    flex: 1,
  },
  userListContent: {
    flexGrow: 1,
    paddingTop: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: H_PAD,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFEF',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8E8E8',
    marginRight: 14,
  },
  userText: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 16,
    color: '#0D0D0D',
  },
  userHandle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 2,
  },
  userRemoveBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  userRemoveText: {
    fontSize: 22,
    color: '#9CA3AF',
    lineHeight: 22,
  },
  emptyUsers: {
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 24,
    fontSize: 15,
    color: '#6B6B6B',
  },
  recentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 8,
  },
  recentHeaderTitle: {
    fontSize: 13,
    color: '#6B6B6B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  recentClearLink: {
    fontSize: 13,
    color: '#246BFD',
  },
  searchLoadingWrap: {
    alignItems: 'center',
    paddingTop: 40,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PAD,
    paddingBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  videoBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: HEADER_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    color: '#0D0D0D',
  },
  storiesSection: {
    marginTop: 8,
    marginBottom: 18,
  },
  storiesRow: {
    paddingHorizontal: H_PAD,
    gap: 14,
    paddingVertical: 4,
  },
  storyItem: {
    alignItems: 'center',
    width: 68,
  },
  storyCell: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: STORY_RING,
    overflow: 'hidden',
  },
  // Grayed-out ring for authors whose stories the viewer has fully seen.
  storyCellSeen: {
    borderColor: '#C7C7CC',
  },
  storyAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8E8E8',
  },
  storyName: {
    marginTop: 4,
    fontSize: 11,
    color: '#0D0D0D',
    maxWidth: 68,
    textAlign: 'center',
  },
  gridBlock: {
    gap: 0,
  },
  sectionLabel: {
    fontSize: 15,
    color: '#0D0D0D',
    marginBottom: 8,
  },
  emptyGrid: {
    width: '100%',
    textAlign: 'center',
    paddingVertical: 20,
    color: '#6B6B6B',
    fontSize: 14,
  },
  refreshRow: {
    alignItems: 'center',
    paddingTop: 12,
  },
  tileSkeleton: {
    backgroundColor: '#EEF0F4',
  },
  storySkeletonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF0F4',
  },
  row3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  postsHScrollContent: {
    flexDirection: 'row',
    gap: GAP,
  },
  postsColumn: {
    flexDirection: 'column',
    gap: GAP,
  },
  row2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tileWrap: {
    borderRadius: TILE_RADIUS,
    overflow: 'hidden',
    backgroundColor: '#EEE',
  },
  tileImage: {
    ...StyleSheet.absoluteFill,
    borderRadius: TILE_RADIUS,
  },
  tileScrim: {
    ...StyleSheet.absoluteFill,
    borderRadius: TILE_RADIUS,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  tileMeta: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: HEADER_ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 2,
  },
  viewText: {
    color: '#FFFFFF',
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
