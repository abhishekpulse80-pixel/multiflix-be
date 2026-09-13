import {
  useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useMemo,
  useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  UserAvatar,
  storyRingOuterDiameter,
} from '../components/common/UserAvatar';
import {
  NotificationBellIcon,
  SettingsGearIcon,
} from '../components/profile/ProfileHeaderIcons';
import Svg, { Path } from 'react-native-svg';
import { ProfileMasonry } from '../components/profile/ProfileMasonry';
import { ProfilePodcastList } from '../components/profile/ProfilePodcastList';
import { ConfirmSheet } from '../components/common/ConfirmSheet';
import { UserProfileActionsSheet } from '../components/profile/UserProfileActionsSheet';
import { ShareToChatSheet } from '../components/home/ShareToChatSheet';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { UserProfileSkeleton } from '../components/profile/UserProfileSkeleton';
import {
  getPublicUserProfile,
  type ProfileGridItem,
} from '../data/publicUserProfileMock';
import {
  navigateToBloggingWatch,
  navigateToSettings,
  navigateToStoryViewer,
} from '../navigation/rootNavigationRef';
import type { RootStackParamList } from '../navigation/types';
import { useAppSelector } from '../store/hooks';
import { useGetUserStoriesQuery } from '../store/api/storiesApi';
import {
  useBlockUserMutation,
  useFollowUserMutation,
  useLazyGetUserPublicBlogsQuery,
  useLazyGetUserPublicPostsQuery,
  useGetUserPublicProfileQuery,
  useUnfollowUserMutation,
} from '../store/api/usersApi';
import { selectAccessToken } from '../store/selectors';
import { useCachedUserPublicPosts } from '../hooks/useCachedUserPublicPosts';
import { useTheme } from '../theme';
import { getApiErrorMessage } from '../utils/apiError';
import { formatProfileStat } from '../utils/formatProfileStat';
import { mapUserPublicProfileDtoToPublicUserProfile } from '../utils/mapUserPublicProfileToUi';
import { toastError, toastInfo, toastSuccess } from '../utils/toast';

const BG = '#FFFFFF';
const BLUE = '#246BFD';
const TITLE = '#0D0D0D';
const MUTED = '#6B6B6B';
const H_PAD = 14;
const GAP = 5;
const PROFILE_MEDIA_LIMIT = 12;

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

function ChevronBack({
  color = TITLE,
  size = 22,
}: {
  color?: string;
  size?: number;
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

function PersonPlusIcon({
  color = '#FFFFFF',
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="-1 -2 26 26" fill="none">
      <Path
        d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 7a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MessageIcon({
  color = BLUE,
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GridTabIcon({
  active,
  size = 22,
}: {
  active: boolean;
  size?: number;
}) {
  const c = active ? BLUE : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z"
        stroke={c}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreDotsIcon({
  color = TITLE,
  size = 22,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM13.5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM22 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
        fill={color}
      />
    </Svg>
  );
}

function MicTabIcon({ active, size = 22 }: { active: boolean; size?: number }) {
  const c = active ? BLUE : MUTED;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM6 11a1 1 0 012 0 4 4 0 008 0 1 1 0 112 0 6 6 0 01-5 5.91V20h2a1 1 0 110 2H9a1 1 0 110-2h2v-3.09A6 6 0 016 11z"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserProfileScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const { userId } = route.params;
  const token = useAppSelector(selectAccessToken);
  const [tab, setTab] = useState<'grid' | 'blogs'>('grid');
  const [actionsSheetOpen, setActionsSheetOpen] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);

  const skipQuery = !token;
  const { data, isLoading, isError, refetch } = useGetUserPublicProfileQuery(
    userId,
    {
      skip: skipQuery,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    },
  );
  const { data: userStories, refetch: refetchUserStories } =
    useGetUserStoriesQuery(userId, {
      skip: skipQuery || !userId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    });
  const hasActiveStories = (userStories?.items?.length ?? 0) > 0;

  // Pull-to-refresh: refresh profile + stories and reload the post/blog grids.
  const { refreshing, onRefresh } = usePullToRefresh(() => {
    setPostsLoaded(false);
    setBlogsLoaded(false);
    return Promise.all([refetch(), skipQuery ? null : refetchUserStories()]);
  });
  const [followUser, { isLoading: followLoading }] = useFollowUserMutation();
  const [unfollowUser, { isLoading: unfollowLoading }] =
    useUnfollowUserMutation();
  const followBusy = followLoading || unfollowLoading;
  const [blockUser, { isLoading: blockLoading }] = useBlockUserMutation();
  const [fetchPublicPosts, { isFetching: postsFetching }] =
    useLazyGetUserPublicPostsQuery();
  const [fetchPublicBlogs, { isFetching: blogsFetching }] =
    useLazyGetUserPublicBlogsQuery();
  const {
    gridItems: cachedPublicPosts,
    maxPage: cachedPostsMaxPage,
    hasMore: cachedPostsHasMore,
    hasAnyPage: cachedPostsHasAnyPage,
  } = useCachedUserPublicPosts(userId);
  const publicPosts = cachedPublicPosts;
  const postsPage = Math.max(cachedPostsMaxPage, 0);
  const postsHasMore = cachedPostsHasMore;
  const [publicBlogs, setPublicBlogs] = useState<ProfileGridItem[]>([]);
  const [blogsPage, setBlogsPage] = useState(0);
  const [blogsHasMore, setBlogsHasMore] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);

  const offlineProfile = useMemo(() => getPublicUserProfile(userId), [userId]);

  const profile = useMemo(() => {
    if (data?.profile) {
      return mapUserPublicProfileDtoToPublicUserProfile(data.profile);
    }
    if (skipQuery) {
      return offlineProfile;
    }
    return null;
  }, [data, skipQuery, offlineProfile]);

  /** Own profile: API sets `isFollowing: null`. */
  const isOwnProfileFromApi = Boolean(
    token && data?.profile && data.profile.isFollowing === null,
  );
  /** Another user’s profile while logged in — can call follow/unfollow. */
  const useLiveFollow = Boolean(
    token && data?.profile && data.profile.isFollowing !== null,
  );

  const handleOpenBlockConfirm = useCallback(() => {
    setActionsSheetOpen(false);
    if (blockLoading) {
      return;
    }
    setBlockConfirmOpen(true);
  }, [blockLoading]);

  const handleConfirmBlock = useCallback(() => {
    const handle = profile?.handle ?? 'this user';
    blockUser(userId)
      .unwrap()
      .then(() => {
        toastSuccess('Blocked', `@${handle} has been blocked.`);
        navigation.goBack();
      })
      .catch((e: unknown) => {
        toastError('Could not block user', getApiErrorMessage(e));
      });
  }, [profile?.handle, blockUser, userId, navigation]);

  const handleToggleFollow = useCallback(async () => {
    if (!useLiveFollow || !data?.profile) {
      return;
    }
    const following = data.profile.isFollowing === true;
    try {
      if (following) {
        await unfollowUser(userId).unwrap();
      } else {
        await followUser(userId).unwrap();
      }
    } catch (e: unknown) {
      toastError('Could not update follow', getApiErrorMessage(e));
    }
  }, [useLiveFollow, data?.profile, unfollowUser, followUser, userId]);

  const showSkeleton = Boolean(token && userId && isLoading && !data);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      return undefined;
    }, []),
  );

  const contentW = screenW - H_PAD * 2;
  // Floor so 3 tiles + 2 gaps are guaranteed to fit the row. A raw float here
  // makes 3*colW + 2*GAP land exactly on contentW, and sub-pixel rounding then
  // overflows on some screen densities → the 3rd tile wraps to a 2-col grid.
  const colW = Math.floor((contentW - GAP * 2) / 3);
  const gridItems = useMemo(() => {
    if (!profile) {
      return [];
    }
    if (!token) {
      return tab === 'grid' ? profile.grid : profile.likedGrid;
    }
    return tab === 'grid' ? publicPosts : publicBlogs;
  }, [profile, token, tab, publicPosts, publicBlogs]);
  const hasMoreForTab = tab === 'grid' ? postsHasMore : blogsHasMore;
  const fetchingForTab = tab === 'grid' ? postsFetching : blogsFetching;

  const toGridBlogItems = useCallback(
    (
      rows: Array<{
        id: string;
        thumbnailUrl: string | null;
        viewsCount: number;
        title?: string;
        durationSeconds?: number | null;
        publishedAt?: string | null;
      }>,
      page: number,
    ): ProfileGridItem[] =>
      rows.map((row, i) => ({
        id: `blog-${row.id}`,
        uri:
          row.thumbnailUrl?.trim() ||
          'https://placehold.co/400x400/1a202c/a0aec0/png?text=Multiflix',
        span: 1 + ((page * PROFILE_MEDIA_LIMIT + i + 1) % 4) * 0.06,
        isVideo: true,
        views: row.viewsCount,
        title: row.title,
        durationSeconds: row.durationSeconds ?? null,
        publishedAt: row.publishedAt ?? null,
      })),
    [],
  );

  const loadPostsPage = useCallback(
    async (nextPage: number) => {
      if (!token || postsFetching) {
        return;
      }
      try {
        // RTK Query caches the result; the hook above derives `publicPosts`
        // from the cache, so we don't need to mirror it in local state.
        await fetchPublicPosts({
          userId,
          page: nextPage,
          limit: PROFILE_MEDIA_LIMIT,
        }).unwrap();
      } finally {
        setPostsLoaded(true);
      }
    },
    [token, postsFetching, fetchPublicPosts, userId],
  );

  const loadBlogsPage = useCallback(
    async (nextPage: number) => {
      if (!token || blogsFetching) {
        return;
      }
      try {
        const res = await fetchPublicBlogs({
          userId,
          page: nextPage,
          limit: PROFILE_MEDIA_LIMIT,
        }).unwrap();
        const mapped = toGridBlogItems(res.items, nextPage);
        setPublicBlogs(prev =>
          nextPage === 0 ? mapped : [...prev, ...mapped],
        );
        setBlogsHasMore(res.hasMore);
        setBlogsPage(nextPage);
      } finally {
        setBlogsLoaded(true);
      }
    },
    [token, blogsFetching, fetchPublicBlogs, userId, toGridBlogItems],
  );

  React.useEffect(() => {
    if (!token) {
      return;
    }
    // Posts state is derived from the RTK cache and self-resets per userId.
    setPublicBlogs([]);
    setBlogsPage(0);
    setBlogsHasMore(false);
    setPostsLoaded(false);
    setBlogsLoaded(false);
  }, [token, userId]);

  React.useEffect(() => {
    if (!token || !profile) {
      return;
    }
    if (tab === 'grid' && !postsLoaded && !postsFetching) {
      loadPostsPage(0).catch(() => {});
      return;
    }
    if (tab === 'blogs' && !blogsLoaded && !blogsFetching) {
      loadBlogsPage(0).catch(() => {});
    }
  }, [
    token,
    profile,
    tab,
    postsLoaded,
    blogsLoaded,
    postsFetching,
    blogsFetching,
    loadPostsPage,
    loadBlogsPage,
  ]);

  const onLoadMoreTabItems = useCallback(() => {
    if (!token || fetchingForTab || !hasMoreForTab) {
      return;
    }
    if (tab === 'grid') {
      loadPostsPage(postsPage + 1).catch(() => {});
      return;
    }
    loadBlogsPage(blogsPage + 1).catch(() => {});
  }, [
    token,
    fetchingForTab,
    hasMoreForTab,
    tab,
    loadPostsPage,
    postsPage,
    loadBlogsPage,
    blogsPage,
  ]);

  const openBlogViewer = useCallback((item: ProfileGridItem) => {
    const blogId = item.id.replace(/^blog-/, '');
    if (!blogId) {
      return;
    }
    navigateToBloggingWatch(blogId);
  }, []);

  const openPostViewer = useCallback(
    (_item: ProfileGridItem, index: number) => {
      if (tab !== 'grid' || !profile) {
        return;
      }
      const orderedPosts = gridItems.map(row => ({
        id: row.id,
        // For videos, `row.uri` is the *thumbnail* — playback needs the
        // real `mediaUrl`. Falls back to the thumb for images (where
        // mediaUrl may be empty).
        uri: row.isVideo ? row.mediaUrl || row.uri : row.uri,
        likes: row.likes ?? 0,
        isVideo: row.isVideo === true,
        caption: row.caption ?? '',
        hashtags: row.hashtags ?? '',
        musicTitle: row.musicTitle ?? '',
        music: row.music ?? null,
        originalSound: row.originalSound ?? null,
        videoDurationSec: row.videoDurationSec ?? null,
        comments: row.comments ?? 0,
        likedByViewer: row.likedByViewer ?? false,
        savedByViewer: row.savedByViewer ?? false,
        createdAt: row.createdAt,
      }));
      if (orderedPosts.length === 0) {
        return;
      }
      navigation.navigate('UserProfilePostsViewer', {
        userId,
        userDisplayName: profile.displayName,
        userHandle: profile.handle,
        userAvatarUri: profile.avatarUri,
        initialPostId: orderedPosts[index]?.id ?? orderedPosts[0].id,
        initialPage: postsPage,
        hasMore: postsHasMore,
        posts: orderedPosts,
      });
    },
    [tab, profile, gridItems, navigation, userId, postsPage, postsHasMore],
  );

  if (showSkeleton) {
    return (
      <View style={styles.root}>
        <UserProfileSkeleton horizontalPad={H_PAD} />
      </View>
    );
  }

  if (!skipQuery && isError) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.topIcon}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ChevronBack />
          </Pressable>
          <Text style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}>
            Profile
          </Text>
          <View style={styles.topIcon} />
        </View>
        <View style={styles.errorBox}>
          <Text
            style={[styles.errorTitle, { fontFamily: t.fontFamily.semibold }]}
          >
            Could not load this profile
          </Text>
          <Text style={[styles.errorSub, { fontFamily: t.fontFamily.regular }]}>
            The user may not exist or the network failed.
          </Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => refetch()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading profile"
          >
            <Text
              style={[styles.retryText, { fontFamily: t.fontFamily.semibold }]}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.root}>
        <View style={styles.topBar}>
          <Pressable
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.topIcon}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ChevronBack />
          </Pressable>
          <Text style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}>
            Profile
          </Text>
          <View style={styles.topIcon} />
        </View>
        <View style={styles.errorBox}>
          <Text
            style={[styles.errorTitle, { fontFamily: t.fontFamily.semibold }]}
          >
            No profile data
          </Text>
        </View>
      </View>
    );
  }

  const profileNavTitle =
    profile.displayName.length > 10
      ? `${profile.displayName.slice(0, 8)}..`
      : profile.displayName;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        {isOwnProfileFromApi ? (
          <Pressable
            hitSlop={12}
            onPress={() => toastInfo('Notifications', 'No notifications yet.')}
            style={styles.topIcon}
            accessibilityLabel="Notifications"
            accessibilityRole="button"
          >
            <NotificationBellIcon />
          </Pressable>
        ) : (
          <Pressable
            hitSlop={12}
            onPress={() => navigation.goBack()}
            style={styles.topIcon}
            accessibilityLabel="Back"
            accessibilityRole="button"
          >
            <ChevronBack />
          </Pressable>
        )}
        <Text
          style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}
          numberOfLines={1}
        >
          {isOwnProfileFromApi ? profileNavTitle : profile.displayName}
        </Text>
        {isOwnProfileFromApi ? (
          <Pressable
            hitSlop={12}
            onPress={() => navigateToSettings()}
            style={styles.topIcon}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <SettingsGearIcon />
          </Pressable>
        ) : (
          <Pressable
            hitSlop={12}
            onPress={() => setActionsSheetOpen(true)}
            style={styles.topIcon}
            accessibilityLabel="More options"
            accessibilityRole="button"
          >
            <MoreDotsIcon />
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingBottom: 32,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={REFRESH_TINT}
            colors={[REFRESH_TINT]}
          />
        }
      >
        <Pressable
          style={[
            styles.avatarWrap,
            hasActiveStories && styles.avatarWrapWithStoryRing,
          ]}
          onPress={() => {
            if (hasActiveStories && userStories?.items) {
              navigateToStoryViewer({
                stories: userStories.items,
                authorUsername: profile.handle,
                authorDisplayName: profile.displayName,
                authorAvatarUri: profile.avatarUri,
              });
            }
          }}
          disabled={!hasActiveStories}
        >
          <UserAvatar
            uri={profile.avatarUri}
            style={styles.avatar}
            showStoryRing={hasActiveStories}
            storyRingColor={BLUE}
          />
        </Pressable>
        <Text style={[styles.handle, { fontFamily: t.fontFamily.bold }]}>
          {profile.displayName}
        </Text>
        <Text style={[styles.handleSub, { fontFamily: t.fontFamily.regular }]}>
          @{profile.handle}
        </Text>
        {profile.bio ? (
          <Text style={[styles.bio, { fontFamily: t.fontFamily.regular }]}>
            {profile.bio}
          </Text>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            <Text style={[styles.statNum, { fontFamily: t.fontFamily.bold }]}>
              {formatProfileStat(profile.posts)}
            </Text>
            <Text
              style={[styles.statLabel, { fontFamily: t.fontFamily.regular }]}
            >
              Posts
            </Text>
          </View>
          <View style={styles.statDivider} />
          {profile.isFollowersListPrivate && !isOwnProfileFromApi ? (
            <View style={styles.statCell}>
              <Text style={[styles.statNum, { fontFamily: t.fontFamily.bold }]}>
                {formatProfileStat(profile.followers)}
              </Text>
              <Text
                style={[styles.statLabel, { fontFamily: t.fontFamily.regular }]}
              >
                Followers
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.statCell}
              onPress={() => navigation.navigate('FollowersList', { userId })}
              accessibilityRole="button"
              accessibilityLabel={`View followers of @${profile.handle}`}
            >
              <Text style={[styles.statNum, { fontFamily: t.fontFamily.bold }]}>
                {formatProfileStat(profile.followers)}
              </Text>
              <Text
                style={[styles.statLabel, { fontFamily: t.fontFamily.regular }]}
              >
                Followers
              </Text>
            </Pressable>
          )}
        </View>

        {isOwnProfileFromApi ? null : useLiveFollow ? (
          <View style={styles.ctaRow}>
            <Pressable
              style={
                profile.isFollowing === true
                  ? styles.btnFollowing
                  : styles.btnFollow
              }
              onPress={() => {
                handleToggleFollow().catch(() => {});
              }}
              disabled={followBusy}
              accessibilityRole="button"
              accessibilityLabel={
                profile.isFollowing === true
                  ? 'Unfollow'
                  : profile.followsYou
                    ? 'Follow back'
                    : 'Follow'
              }
              accessibilityState={{ busy: followBusy }}
            >
              {profile.isFollowing === true ? (
                <Text
                  style={[
                    styles.btnFollowingText,
                    { fontFamily: t.fontFamily.semibold },
                  ]}
                >
                  Following
                </Text>
              ) : (
                <>
                  <PersonPlusIcon color="#FFFFFF" size={20} />
                  <Text
                    style={[
                      styles.btnFollowText,
                      { fontFamily: t.fontFamily.semibold },
                    ]}
                  >
                    {profile.followsYou ? 'Follow Back' : 'Follow'}
                  </Text>
                </>
              )}
            </Pressable>
            {profile.isFollowing === true ? (
              <Pressable
                style={styles.btnMessage}
                onPress={() =>
                  navigation.navigate('Chat', {
                    userId: profile.userId,
                    username: profile.handle.replace('@', ''),
                    fullName: profile.displayName,
                    avatarUrl: profile.avatarUri || null,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel="Message"
              >
                <MessageIcon />
                <Text
                  style={[
                    styles.btnMessageText,
                    { fontFamily: t.fontFamily.semibold },
                  ]}
                >
                  Message
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.ctaRow}>
            <Pressable
              style={styles.btnFollow}
              onPress={() => toastInfo('Follow', `Follow @${profile.handle}?`)}
              accessibilityRole="button"
              accessibilityLabel="Follow"
            >
              <PersonPlusIcon color="#FFFFFF" size={20} />
              <Text
                style={[
                  styles.btnFollowText,
                  { fontFamily: t.fontFamily.semibold },
                ]}
              >
                Follow
              </Text>
            </Pressable>
          </View>
        )}

        <View style={styles.tabBar}>
          <Pressable
            style={styles.tabHit}
            onPress={() => setTab('grid')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'grid' }}
          >
            <GridTabIcon active={tab === 'grid'} />
            {tab === 'grid' ? (
              <View style={styles.tabIndicator} />
            ) : (
              <View style={styles.tabSpacer} />
            )}
          </Pressable>
          <Pressable
            style={styles.tabHit}
            onPress={() => setTab('blogs')}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === 'blogs' }}
            accessibilityLabel="Uploaded blogs"
          >
            <MicTabIcon active={tab === 'blogs'} />
            {tab === 'blogs' ? (
              <View style={styles.tabIndicator} />
            ) : (
              <View style={styles.tabSpacer} />
            )}
          </Pressable>
        </View>

        {gridItems.length > 0 ? (
          <>
            {tab === 'blogs' ? (
              <ProfilePodcastList
                items={gridItems}
                onPressItem={openBlogViewer}
              />
            ) : (
              <ProfileMasonry
                items={gridItems}
                colW={colW}
                layout="grid"
                onPressItem={openPostViewer}
              />
            )}
            {hasMoreForTab ? (
              <Pressable
                style={styles.loadMoreBtn}
                onPress={onLoadMoreTabItems}
                disabled={fetchingForTab}
                accessibilityRole="button"
                accessibilityLabel="Load more items"
              >
                {fetchingForTab ? (
                  <ActivityIndicator size="small" color={BLUE} />
                ) : (
                  <Text
                    style={[
                      styles.loadMoreText,
                      { fontFamily: t.fontFamily.semibold },
                    ]}
                  >
                    Load more
                  </Text>
                )}
              </Pressable>
            ) : null}
          </>
        ) : fetchingForTab ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={BLUE} />
          </View>
        ) : (
          <Text
            style={[styles.emptyLikes, { fontFamily: t.fontFamily.regular }]}
          >
            {tab === 'blogs' ? 'No uploaded blogs yet.' : 'No posts yet.'}
          </Text>
        )}
      </ScrollView>

      <UserProfileActionsSheet
        visible={actionsSheetOpen}
        onClose={() => setActionsSheetOpen(false)}
        onBlock={handleOpenBlockConfirm}
        onShare={() => {
          setActionsSheetOpen(false);
          setShareProfileOpen(true);
        }}
        subject={profile.handle}
      />

      <ShareToChatSheet
        visible={shareProfileOpen}
        onClose={() => setShareProfileOpen(false)}
        profileRef={{
          userId,
          username: profile.handle,
          displayName: profile.displayName,
          avatarUrl: profile.avatarUri || null,
        }}
      />

      <ConfirmSheet
        visible={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
        onConfirm={handleConfirmBlock}
        title={`Block @${profile.handle}?`}
        message={
          "They won't be able to find your profile, posts or message you. Multiflix won't tell them you blocked them."
        }
        confirmLabel="Block"
        destructive
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 10,
  },
  topIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    color: TITLE,
    paddingHorizontal: 8,
  },
  avatarWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
    width: 112,
    height: 112,
  },
  avatarWrapWithStoryRing: {
    width: storyRingOuterDiameter(112),
    height: storyRingOuterDiameter(112),
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E8E8ED',
  },
  handle: {
    textAlign: 'center',
    fontSize: 17,
    color: TITLE,
    marginBottom: 2,
  },
  handleSub: {
    textAlign: 'center',
    fontSize: 14,
    color: MUTED,
    marginBottom: 6,
  },
  bio: {
    textAlign: 'center',
    fontSize: 14,
    color: MUTED,
    marginBottom: 22,
    paddingHorizontal: 12,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  statNum: {
    fontSize: 17,
    color: TITLE,
  },
  statLabel: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 22,
  },
  btnFollow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BLUE,
    paddingVertical: 14,
    borderRadius: 28,
  },
  btnFollowText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  btnFollowing: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BLUE,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: BG,
  },
  btnFollowingText: {
    color: BLUE,
    fontSize: 15,
  },
  btnMessage: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BLUE,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: BG,
  },
  btnMessageText: {
    color: BLUE,
    fontSize: 15,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    marginBottom: 12,
  },
  tabHit: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabIndicator: {
    marginTop: 10,
    height: 3,
    width: '100%',
    maxWidth: 72,
    borderRadius: 2,
    backgroundColor: BLUE,
  },
  tabSpacer: {
    marginTop: 10,
    height: 3,
  },
  emptyLikes: {
    textAlign: 'center',
    color: MUTED,
    paddingVertical: 32,
    fontSize: 14,
  },
  loadingBox: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  loadMoreBtn: {
    marginTop: 14,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BLUE,
    minWidth: 116,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadMoreText: {
    color: BLUE,
    fontSize: 14,
  },
  errorBox: {
    flex: 1,
    paddingHorizontal: H_PAD,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
  },
  errorTitle: {
    fontSize: 18,
    color: TITLE,
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryBtn: {
    backgroundColor: BLUE,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 15,
  },
});
