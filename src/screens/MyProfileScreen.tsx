import {
  useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useMemo,
  useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal';
import {
  UserAvatar,
  storyRingOuterDiameter,
} from '../components/common/UserAvatar';
import {
  NotificationBellIcon,
  SettingsGearIcon,
} from '../components/profile/ProfileHeaderIcons';
import { FeedShareIcon } from '../components/icons/FeedActionIcons';
import Svg, { Path } from 'react-native-svg';
import { ProfileMasonry } from '../components/profile/ProfileMasonry';
import { ProfilePodcastList } from '../components/profile/ProfilePodcastList';
import { ShareToChatSheet } from '../components/home/ShareToChatSheet';
import type { ProfileGridItem } from '../data/publicUserProfileMock';
import { MY_PROFILE_MOCK } from '../data/myProfileMock';
import { ProfilePhotoSourceSheet } from '../components/profile/ProfilePhotoSourceSheet';
import { ProfilePictureViewer } from '../components/profile/ProfilePictureViewer';
import {
  navigateToBloggingWatch,
  navigateToSettings,
  navigateToEditProfile,
  navigateToStoryPreview,
  navigateToStoryViewer,
  navigateToMediaPreview,
  navigateToUserProfilePostsViewer,
  navigateToFollowersList,
  navigateToNotifications,
} from '../navigation/rootNavigationRef';
import type { PlaceholderStackParamList } from '../navigation/types';
import { useDeleteBlogMutation } from '../store/api/blogsApi';
import { useGetUnreadNotificationsCountQuery } from '../store/api/notificationsApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useDeletePostMutation } from '../store/api/feedApi';
import { useGetUserStoriesQuery } from '../store/api/storiesApi';
import {
  useGetUserPublicProfileQuery,
  useLazyGetUserPublicBlogsQuery,
  useLazyGetUserPublicPostsQuery,
} from '../store/api/usersApi';
import { useStore } from 'react-redux';
import { baseApi } from '../store/api/baseApi';
import type { RootState } from '../store/store';
import type {
  UserPublicMediaQuery,
  UserPublicPostsResponseDto,
} from '../types/profileApi';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useCachedUserPublicPosts } from '../hooks/useCachedUserPublicPosts';
import { selectAccessToken, selectCurrentUser } from '../store/selectors';
import { useTheme } from '../theme';
import { formatProfileStat } from '../utils/formatProfileStat';
import { toastError } from '../utils/toast';
import {
  CAMERA_PERMISSION_BLOCKED_CODE,
  openAppSettings,
} from '../utils/cameraPermission';
import {
  assetToMediaPayload,
  isVideoMime,
  pickMediaFromCamera,
  pickMediaFromLibrary,
  type CameraMode,
} from '../utils/pickMedia';
import type { ProfilePhotoSource } from '../components/profile/ProfilePhotoSourceSheet';
import { openTrimEditor } from '../utils/trimVideo';

const BG = '#FFFFFF';
const BLUE = '#246BFD';
const TITLE = '#0D0D0D';
const MUTED = '#6B6B6B';
const H_PAD = 14;
const GAP = 5;
const TAB_BAR_RESERVE = 88;
const PROFILE_MEDIA_LIMIT = 12;

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

function PlusIcon({
  color = '#FFFFFF',
  size = 16,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function EditProfileOutlineIcon({
  color = BLUE,
  size = 20,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UploadOutlineIcon({
  color = BLUE,
  size = 20,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MyProfilePostsSkeleton({ colW }: { colW: number }) {
  const placeholders = Array.from({ length: 9 }, (_, index) => ({
    id: `sk-${index}`,
    height: colW + 50,
  }));
  return (
    <View style={styles.skeletonGrid}>
      {placeholders.map(item => (
        <View
          key={item.id}
          style={[
            styles.skeletonTile,
            {
              width: colW,
              height: item.height,
            },
          ]}
        />
      ))}
    </View>
  );
}

export function MyProfileScreen(
  _: NativeStackScreenProps<PlaceholderStackParamList, 'MyProfile'>,
) {
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const [tab, setTab] = useState<'grid' | 'podcasts'>('grid');
  const token = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector(selectCurrentUser);

  // ── Story photo picker state
  const [storyPickerOpen, setStoryPickerOpen] = useState(false);
  const [storyPickBusy, setStoryPickBusy] = useState(false);
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  // ── Profile picture full-screen viewer (opened via long-press on avatar)
  const [avatarViewerOpen, setAvatarViewerOpen] = useState(false);

  // ── Upload media picker state
  const [uploadPickerOpen, setUploadPickerOpen] = useState(false);
  const [uploadPickBusy, setUploadPickBusy] = useState(false);

  const [deletePost] = useDeletePostMutation();
  const [deleteBlog] = useDeleteBlogMutation();

  // ── Delete modal state (works for both posts and blogs)
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const p = useMemo(() => MY_PROFILE_MOCK, []);
  const currentUserId = currentUser?.id ?? null;
  const dispatch = useAppDispatch();
  const reduxStore = useStore<RootState>();
  const [fetchPublicPosts, { isFetching: postsFetching }] =
    useLazyGetUserPublicPostsQuery();
  const {
    gridItems: cachedPublicPosts,
    maxPage: cachedPostsMaxPage,
    hasMore: cachedPostsHasMore,
  } = useCachedUserPublicPosts(currentUserId);
  const publicPosts = cachedPublicPosts;
  const postsPage = Math.max(cachedPostsMaxPage, 0);
  const postsHasMore = cachedPostsHasMore;
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [fetchPublicBlogs, { isFetching: blogsFetching }] =
    useLazyGetUserPublicBlogsQuery();
  const [publicBlogs, setPublicBlogs] = useState<ProfileGridItem[]>([]);
  const [blogsPage, setBlogsPage] = useState(0);
  const [blogsHasMore, setBlogsHasMore] = useState(false);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const {
    data: mePublic,
    isLoading: mePublicLoading,
    refetch: refetchPublicProfile,
  } = useGetUserPublicProfileQuery(currentUserId ?? '', {
    skip: !token || !currentUserId,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
  });
  /**
   * True while we still don't have *any* public profile data — first
   * mount before the query resolves. Used to swap stat numbers and bio
   * for skeleton bars instead of showing the placeholder fallback values
   * (1 / 1 / 1) that look like real data.
   */
  const profileLoading =
    !!token && !!currentUserId && (mePublicLoading || !mePublic);

  const { data: userStories, refetch: refetchUserStories } =
    useGetUserStoriesQuery(currentUserId ?? '', {
      skip: !token || !currentUserId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    });
  const hasActiveStories = (userStories?.items?.length ?? 0) > 0;

  // Pull-to-refresh: refresh the profile + stories, and reload the post/blog
  // grids (they reload off the *Loaded flags).
  const { refreshing, onRefresh } = usePullToRefresh(() => {
    setPostsLoaded(false);
    setBlogsLoaded(false);
    return Promise.all([
      token && currentUserId ? refetchPublicProfile() : null,
      token && currentUserId ? refetchUserStories() : null,
    ]);
  });

  // Unread-notification indicator on the bell. Refetches on focus so the dot
  // clears after the user opens (and marks read) the notifications screen.
  const { data: unreadNotifications, refetch: refetchUnreadNotifications } =
    useGetUnreadNotificationsCountQuery(undefined, {
      skip: !token || !currentUserId,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: true,
    });
  const hasUnreadNotifications = (unreadNotifications?.count ?? 0) > 0;

  const profileView = useMemo(() => {
    const publicProfile = mePublic?.profile;
    const displayName =
      currentUser?.fullName?.trim() ||
      p.displayName;
    const headerTitle =
      displayName.length > 10 ? `${displayName.slice(0, 8)}..` : displayName;
    const interestsBio =
      publicProfile?.interests && publicProfile.interests.length > 0
        ? publicProfile.interests.slice(0, 4).join(' · ')
        : null;
    return {
      displayName,
      headerTitle,
      handle: publicProfile?.username ?? p.handle,
      bio: interestsBio ?? p.bio,
      avatarUri:
        currentUser?.avatarUrl?.trim() ||
        publicProfile?.avatarUrl?.trim() ||
        (currentUserId ? '' : p.avatarUri),
      posts: publicProfile?.postsCount ?? p.posts,
      followers: publicProfile?.followersCount ?? p.followers,
      likes: publicProfile?.likesCount ?? p.likes,
    };
  }, [currentUser, mePublic, p]);

  // avatar URI comes directly from the public profile / store (no local upload preview here)
  const avatarDisplayUri = profileView.avatarUri;

  // ── Story photo pick handler
  const handleStorySource = useCallback(
    async (source: ProfilePhotoSource) => {
      setStoryPickerOpen(false);
      if (storyPickBusy) {
        return;
      }
      setStoryPickBusy(true);
      try {
        let asset;
        if (source === 'library') {
          asset = await pickMediaFromLibrary();
        } else if (source === 'camera-photo') {
          asset = await pickMediaFromCamera('photo' as CameraMode);
        } else if (source === 'camera-video') {
          asset = await pickMediaFromCamera('video' as CameraMode);
        } else {
          asset = await pickMediaFromCamera('video' as CameraMode);
        }
        if (asset?.uri) {
          const payload = assetToMediaPayload(asset);
          if (payload) {
            const isVideo = isVideoMime(payload.type);

            if (isVideo) {
              // Story videos can be any length up to 60 s (mirroring posts).
              // The trim editor caps the duration; no minimum so the user
              // can record a short clip and ship it as-is.
              const trimResult = await openTrimEditor(payload.uri, 60);
              if (!trimResult) {
                setStoryPickBusy(false);
                return;
              }
              const videoUri = trimResult.outputPath.startsWith('/')
                ? `file://${trimResult.outputPath}`
                : trimResult.outputPath;
              navigateToStoryPreview({
                imageUri: videoUri,
                fileName: payload.name,
                mimeType: payload.type,
                isVideo: true,
              });
            } else {
              navigateToStoryPreview({
                imageUri: payload.uri,
                fileName: payload.name,
                mimeType: payload.type,
              });
            }
          }
        }
      } catch (e: unknown) {
        const blocked =
          e instanceof Error && e.message === CAMERA_PERMISSION_BLOCKED_CODE;
        if (blocked) {
          Alert.alert(
            'Camera access',
            'Camera permission is off for Multiflix. Enable it in Settings.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  openAppSettings().catch(() => {});
                },
              },
            ],
          );
        } else {
          toastError('Story', 'Could not open media picker.');
        }
      } finally {
        setStoryPickBusy(false);
      }
    },
    [storyPickBusy],
  );

  // ── Upload media pick handler (photo or video → post creation flow)
  const handleUploadSource = useCallback(
    async (source: ProfilePhotoSource) => {
      setUploadPickerOpen(false);
      if (uploadPickBusy) {
        return;
      }
      setUploadPickBusy(true);
      try {
        let asset;
        if (source === 'library') {
          asset = await pickMediaFromLibrary();
        } else if (source === 'camera-photo') {
          asset = await pickMediaFromCamera('photo' as CameraMode);
        } else if (source === 'camera-video') {
          asset = await pickMediaFromCamera('video' as CameraMode);
        } else {
          // fallback for plain 'camera' (shouldn't happen with showCameraModePicker)
          asset = await pickMediaFromCamera('video' as CameraMode);
        }
        if (asset?.uri) {
          const payload = assetToMediaPayload(asset);
          if (payload) {
            const isVideo = isVideoMime(payload.type);

            if (isVideo) {
              // Open native trim editor for videos
              const trimResult = await openTrimEditor(payload.uri, 60);
              if (!trimResult) {
                // User cancelled trimming
                setUploadPickBusy(false);
                return;
              }
              navigateToMediaPreview({
                mediaUri: trimResult.outputPath.startsWith('/')
                  ? `file://${trimResult.outputPath}`
                  : trimResult.outputPath,
                fileName: payload.name,
                mimeType: payload.type,
                isVideo: true,
              });
            } else {
              navigateToMediaPreview({
                mediaUri: payload.uri,
                fileName: payload.name,
                mimeType: payload.type,
                isVideo: false,
              });
            }
          }
        }
      } catch (e: unknown) {
        const blocked =
          e instanceof Error && e.message === CAMERA_PERMISSION_BLOCKED_CODE;
        if (blocked) {
          Alert.alert(
            'Camera access',
            'Camera permission is off for Multiflix. Enable it in Settings.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  openAppSettings().catch(() => {});
                },
              },
            ],
          );
        } else {
          toastError('Upload', 'Could not open media picker.');
        }
      } finally {
        setUploadPickBusy(false);
      }
    },
    [uploadPickBusy],
  );

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      // Reset loaded flag so the grid refetches page 0 on every focus (e.g.
      // after creating a post). Posts themselves are derived from the RTK
      // cache and will update automatically when the fetch resolves.
      setPostsLoaded(false);
      // Refresh the bell's unread indicator each time the tab is focused
      // (e.g. returning from the notifications screen after marking read).
      if (token && currentUserId) {
        void refetchUnreadNotifications();
      }
      return undefined;
    }, [token, currentUserId, refetchUnreadNotifications]),
  );

  const contentW = screenW - H_PAD * 2;
  // Floor so 3 tiles + 2 gaps are guaranteed to fit the row. A raw float here
  // makes 3*colW + 2*GAP land exactly on contentW, and sub-pixel rounding then
  // overflows on some screen densities → the 3rd tile wraps to a 2-col grid.
  const colW = Math.floor((contentW - GAP * 2) / 3);
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
      if (!token || !currentUserId || postsFetching) {
        return;
      }
      try {
        // RTK Query caches the result; `publicPosts` is derived from the
        // cache via `useCachedUserPublicPosts`, so no local mirror needed.
        await fetchPublicPosts({
          userId: currentUserId,
          page: nextPage,
          limit: PROFILE_MEDIA_LIMIT,
        }).unwrap();
      } finally {
        setPostsLoaded(true);
      }
    },
    [token, currentUserId, postsFetching, fetchPublicPosts],
  );

  const loadBlogsPage = useCallback(
    async (nextPage: number) => {
      if (!token || !currentUserId || blogsFetching) {
        return;
      }
      try {
        const res = await fetchPublicBlogs({
          userId: currentUserId,
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
    [token, currentUserId, blogsFetching, fetchPublicBlogs, toGridBlogItems],
  );

  const openBlogViewer = useCallback((item: ProfileGridItem) => {
    const blogId = item.id.replace(/^blog-/, '');
    if (!blogId) {
      return;
    }
    navigateToBloggingWatch(blogId);
  }, []);

  const openPostViewer = useCallback(
    (_item: ProfileGridItem, index: number) => {
      if (!currentUserId || !currentUser) return;
      const orderedPosts = publicPosts.map(row => ({
        id: row.id,
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
      if (orderedPosts.length === 0) return;
      const avatarUri = mePublic?.profile?.avatarUrl ?? '';
      navigateToUserProfilePostsViewer({
        userId: currentUserId,
        userDisplayName: currentUser.fullName ?? '',
        userHandle: mePublic?.profile?.username ?? '',
        userAvatarUri: avatarUri,
        initialPostId: orderedPosts[index]?.id ?? orderedPosts[0].id,
        initialPage: postsPage,
        hasMore: postsHasMore,
        posts: orderedPosts,
      });
    },
    [
      currentUserId,
      currentUser,
      publicPosts,
      postsPage,
      postsHasMore,
      mePublic,
    ],
  );

  const confirmDeleteItem = useCallback(
    (item: ProfileGridItem, _index: number) => {
      setDeleteTargetId(item.id);
      setDeleteModalVisible(true);
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId || deleting) return;
    setDeleting(true);
    const isBlog = deleteTargetId.startsWith('blog-');
    try {
      if (isBlog) {
        const realId = deleteTargetId.replace(/^blog-/, '');
        await deleteBlog(realId).unwrap();
        setPublicBlogs(prev => prev.filter(b => b.id !== deleteTargetId));
      } else {
        await deletePost(deleteTargetId).unwrap();
        // Remove the deleted post from every cached `getUserPublicPosts`
        // page for the current user so the grid updates immediately.
        const state = reduxStore.getState() as unknown as {
          api: {
            queries: Record<
              string,
              { endpointName?: string; originalArgs?: unknown } | undefined
            >;
          };
        };
        for (const q of Object.values(state.api.queries)) {
          if (q?.endpointName !== 'getUserPublicPosts' || !q.originalArgs) {
            continue;
          }
          const args = q.originalArgs as UserPublicMediaQuery;
          if (args.userId !== currentUserId) continue;
          dispatch(
            baseApi.util.updateQueryData(
              'getUserPublicPosts' as never,
              args as never,
              ((draft: UserPublicPostsResponseDto) => {
                draft.items = draft.items.filter(
                  it => it.id !== deleteTargetId,
                );
              }) as never,
            ),
          );
        }
      }
      setDeleteModalVisible(false);
      setDeleteTargetId(null);
    } catch {
      toastError(
        isBlog ? 'Blog' : 'Post',
        `Could not delete ${isBlog ? 'blog' : 'post'}.`,
      );
    } finally {
      setDeleting(false);
    }
  }, [
    deleteTargetId,
    deleting,
    deletePost,
    deleteBlog,
    currentUserId,
    dispatch,
    reduxStore,
  ]);

  const handleDeleteCancel = useCallback(() => {
    if (deleting) return;
    setDeleteModalVisible(false);
    setDeleteTargetId(null);
  }, [deleting]);

  React.useEffect(() => {
    if (!token || !currentUserId) {
      return;
    }
    // Posts state is derived from the RTK cache and self-resets per userId.
    setPostsLoaded(false);
    setPublicBlogs([]);
    setBlogsPage(0);
    setBlogsHasMore(false);
    setBlogsLoaded(false);
  }, [token, currentUserId]);

  React.useEffect(() => {
    if (
      tab !== 'grid' ||
      !token ||
      !currentUserId ||
      postsLoaded ||
      postsFetching
    ) {
      return;
    }
    loadPostsPage(0).catch(() => {});
  }, [tab, token, currentUserId, postsLoaded, postsFetching, loadPostsPage]);

  React.useEffect(() => {
    if (
      tab !== 'podcasts' ||
      !token ||
      !currentUserId ||
      blogsLoaded ||
      blogsFetching
    ) {
      return;
    }
    loadBlogsPage(0).catch(() => {});
  }, [tab, token, currentUserId, blogsLoaded, blogsFetching, loadBlogsPage]);

  const onLoadMorePosts = useCallback(() => {
    if (tab !== 'grid' || !postsHasMore || postsFetching) {
      return;
    }
    loadPostsPage(postsPage + 1).catch(() => {});
  }, [tab, postsHasMore, postsFetching, loadPostsPage, postsPage]);

  const onLoadMorePodcasts = useCallback(() => {
    if (tab !== 'podcasts' || !blogsHasMore || blogsFetching) {
      return;
    }
    loadBlogsPage(blogsPage + 1).catch(() => {});
  }, [tab, blogsHasMore, blogsFetching, loadBlogsPage, blogsPage]);

  // Memoized so an unrelated re-render doesn't spread-copy the lists into a new
  // array (and a new reference passed down) every time.
  const gridItems = useMemo(
    () =>
      tab === 'podcasts'
        ? token
          ? [...publicBlogs]
          : []
        : token
        ? [...publicPosts]
        : [...p.grid],
    [tab, token, publicBlogs, publicPosts, p.grid],
  );
  // Only show the skeleton when there's genuinely nothing to show yet. With
  // cached items present (e.g. a post-save refetch from the User-tag
  // invalidation), keep the grid mounted — swapping grid↔skeleton mid-render
  // reparents host views and crashes Fabric ("child already has a parent").
  const showPostsSkeleton =
    tab === 'grid' &&
    token != null &&
    currentUserId != null &&
    !postsLoaded &&
    publicPosts.length === 0;
  const showPodcastsSkeleton =
    tab === 'podcasts' &&
    token != null &&
    currentUserId != null &&
    !blogsLoaded &&
    publicBlogs.length === 0;
  const showGridSkeleton = showPostsSkeleton || showPodcastsSkeleton;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          hitSlop={12}
          onPress={() => navigateToNotifications()}
          style={styles.topIcon}
          accessibilityLabel={
            hasUnreadNotifications
              ? 'Notifications, unread'
              : 'Notifications'
          }
          accessibilityRole="button"
        >
          <NotificationBellIcon />
          {hasUnreadNotifications ? (
            <View style={styles.notifDot} />
          ) : null}
        </Pressable>
        <Text
          style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}
          numberOfLines={1}
        >
          {profileView.headerTitle}
        </Text>
        <View style={styles.topRightCluster}>
          <Pressable
            hitSlop={12}
            onPress={() => setShareProfileOpen(true)}
            style={styles.topIcon}
            accessibilityLabel="Share my profile"
            accessibilityRole="button"
          >
            <FeedShareIcon size={22} color="#0D0D0D" />
          </Pressable>
          <Pressable
            hitSlop={12}
            onPress={() => navigateToSettings()}
            style={styles.topIcon}
            accessibilityLabel="Settings"
            accessibilityRole="button"
          >
            <SettingsGearIcon />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: H_PAD,
          paddingBottom: 16 + TAB_BAR_RESERVE,
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
        <View
          style={[
            styles.avatarWrap,
            hasActiveStories && {
              width: storyRingOuterDiameter(112),
              height: storyRingOuterDiameter(112),
            },
          ]}
        >
          <Pressable
            style={[
              styles.avatarStack,
              hasActiveStories && styles.avatarStackWithStoryRing,
            ]}
            onPress={() => {
              if (hasActiveStories && userStories?.items) {
                navigateToStoryViewer({
                  stories: userStories.items,
                  authorUsername: profileView.handle,
                  authorDisplayName:
                    profileView.displayName ?? null,
                  authorAvatarUri: avatarDisplayUri,
                });
              }
            }}
            onLongPress={() => {
              const hasAvatar =
                !!avatarDisplayUri && avatarDisplayUri.trim().length > 0;
              const openStory = () => {
                if (hasActiveStories && userStories?.items) {
                  navigateToStoryViewer({
                    stories: userStories.items,
                    authorUsername: profileView.handle,
                    authorAvatarUri: avatarDisplayUri,
                  });
                }
              };
              const openAvatar = () => {
                setAvatarViewerOpen(true);
              };

              // Both → ask. Only one → open it directly. Neither → no-op.
              if (hasAvatar && hasActiveStories) {
                Alert.alert('Profile', '', [
                  { text: 'View Story', onPress: openStory },
                  {
                    text: 'View Profile Picture',
                    onPress: openAvatar,
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              } else if (hasAvatar) {
                openAvatar();
              } else if (hasActiveStories) {
                openStory();
              }
            }}
            // Tap is no-op when there are no stories, but long-press is
            // still useful (to view the profile picture full-screen), so
            // we don't disable the Pressable any more.
            delayLongPress={350}
          >
            <UserAvatar
              uri={avatarDisplayUri}
              style={styles.avatar}
              showStoryRing={hasActiveStories}
              storyRingColor={BLUE}
            />
          </Pressable>
          <Pressable
            style={[
              styles.addStoryFab,
              storyPickBusy && styles.addStoryFabBusy,
            ]}
            onPress={() => {
              if (!storyPickBusy) {
                setStoryPickerOpen(true);
              }
            }}
            disabled={storyPickBusy}
            accessibilityLabel="Add story"
            accessibilityRole="button"
          >
            <PlusIcon />
          </Pressable>
        </View>

        <Text style={[styles.handle, { fontFamily: t.fontFamily.bold }]}>
          {profileView.displayName}
        </Text>
        <Text style={[styles.handleSub, { fontFamily: t.fontFamily.regular }]}>
          @{profileView.handle}
        </Text>
        {profileLoading ? (
          <View
            style={styles.bioSkeleton}
            accessibilityLabel="Loading bio"
            accessibilityRole="progressbar"
          />
        ) : (
          <Text style={[styles.bio, { fontFamily: t.fontFamily.regular }]}>
            {profileView.bio}
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.statCell}>
            {profileLoading ? (
              <View style={styles.statNumSkeleton} />
            ) : (
              <Text style={[styles.statNum, { fontFamily: t.fontFamily.bold }]}>
                {formatProfileStat(profileView.posts)}
              </Text>
            )}
            <Text
              style={[styles.statLabel, { fontFamily: t.fontFamily.regular }]}
            >
              Posts
            </Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable
            style={styles.statCell}
            onPress={() => {
              if (currentUserId) navigateToFollowersList(currentUserId, 'followers');
            }}
            accessibilityRole="button"
            accessibilityLabel="View followers and following"
            disabled={profileLoading}
          >
            {profileLoading ? (
              <View style={styles.statNumSkeleton} />
            ) : (
              <Text style={[styles.statNum, { fontFamily: t.fontFamily.bold }]}>
                {formatProfileStat(profileView.followers)}
              </Text>
            )}
            <Text
              style={[styles.statLabel, { fontFamily: t.fontFamily.regular }]}
            >
              Followers
            </Text>
          </Pressable>
        </View>

        <View style={styles.ctaRow}>
          <Pressable
            style={styles.btnOutline}
            onPress={() => navigateToEditProfile()}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <EditProfileOutlineIcon />
            <Text
              style={[
                styles.btnOutlineText,
                { fontFamily: t.fontFamily.semibold },
              ]}
            >
              Edit Profile
            </Text>
          </Pressable>
          <Pressable
            style={styles.btnOutline}
            onPress={() => {
              if (!uploadPickBusy) {
                setUploadPickerOpen(true);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel="Upload media"
          >
            <UploadOutlineIcon />
            <Text
              style={[
                styles.btnOutlineText,
                { fontFamily: t.fontFamily.semibold },
              ]}
            >
              Upload Media
            </Text>
          </Pressable>
        </View>

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
            onPress={() => setTab('podcasts')}
            accessibilityRole="tab"
            accessibilityLabel="Your podcasts"
            accessibilityState={{ selected: tab === 'podcasts' }}
          >
            <MicTabIcon active={tab === 'podcasts'} />
            {tab === 'podcasts' ? (
              <View style={styles.tabIndicator} />
            ) : (
              <View style={styles.tabSpacer} />
            )}
          </Pressable>
        </View>

        {/* Stable keys per branch so Fabric fully unmounts one subtree before
            mounting the next, instead of reparenting a host view at the same
            sibling index ("child already has a parent"). */}
        {showGridSkeleton ? (
          <MyProfilePostsSkeleton key="profile-grid-skeleton" colW={colW} />
        ) : gridItems.length > 0 ? (
          tab === 'podcasts' ? (
            <ProfilePodcastList
              key="profile-podcast-list"
              items={gridItems}
              onPressItem={openBlogViewer}
              onMoreItem={token ? confirmDeleteItem : undefined}
            />
          ) : (
            <ProfileMasonry
              key="profile-grid-masonry"
              items={gridItems}
              colW={colW}
              layout="grid"
              onPressItem={openPostViewer}
              onLongPressItem={token ? confirmDeleteItem : undefined}
            />
          )
        ) : (
          <Text
            key="profile-grid-empty"
            style={[styles.emptySaved, { fontFamily: t.fontFamily.regular }]}
          >
            {tab === 'podcasts'
              ? token
                ? 'No podcasts yet.'
                : 'Sign in to see your podcasts.'
              : 'No posts yet.'}
          </Text>
        )}
        {tab === 'grid' && postsHasMore ? (
          <Pressable
            style={styles.loadMoreBtn}
            onPress={onLoadMorePosts}
            disabled={postsFetching}
            accessibilityRole="button"
            accessibilityLabel="Load more posts"
          >
            {postsFetching ? (
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
        {tab === 'podcasts' && blogsHasMore ? (
          <Pressable
            style={styles.loadMoreBtn}
            onPress={onLoadMorePodcasts}
            disabled={blogsFetching}
            accessibilityRole="button"
            accessibilityLabel="Load more podcasts"
          >
            {blogsFetching ? (
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
      </ScrollView>

      <ShareToChatSheet
        visible={shareProfileOpen}
        onClose={() => setShareProfileOpen(false)}
        profileRef={
          currentUserId
            ? {
                userId: currentUserId,
                username: mePublic?.profile?.username ?? '',
                displayName: currentUser?.fullName ?? '',
                avatarUrl: currentUser?.avatarUrl ?? null,
              }
            : null
        }
      />
      <ProfilePhotoSourceSheet
        visible={storyPickerOpen}
        onClose={() => setStoryPickerOpen(false)}
        onSelectSource={source => {
          void handleStorySource(source);
        }}
        title="Add story"
        libraryLabel="Gallery"
        cameraLabel="Camera"
        showCameraModePicker
      />
      <ProfilePhotoSourceSheet
        visible={uploadPickerOpen}
        onClose={() => setUploadPickerOpen(false)}
        onSelectSource={source => {
          void handleUploadSource(source);
        }}
        title="Upload media"
        libraryLabel="Gallery"
        cameraLabel="Camera"
        showCameraModePicker
      />
      <DeleteConfirmModal
        visible={deleteModalVisible}
        title={
          deleteTargetId?.startsWith('blog-') ? 'Delete Blog' : 'Delete Post'
        }
        message={
          deleteTargetId?.startsWith('blog-')
            ? 'Are you sure you want to delete this blog? This action cannot be undone.'
            : 'Are you sure you want to delete this post? This action cannot be undone.'
        }
        deleting={deleting}
        onCancel={handleDeleteCancel}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />

      {/* Full-screen profile picture viewer (opened via long-press on avatar). */}
      <ProfilePictureViewer
        visible={avatarViewerOpen}
        uri={avatarDisplayUri}
        onClose={() => setAvatarViewerOpen(false)}
      />

      {/* Blocking overlay while a picked video is being prepared (copy +
          resolve of large HD files can take a few seconds before the trim
          editor appears). Also swallows stray taps so the flow can't be
          re-triggered mid-prepare. */}
      {storyPickBusy || uploadPickBusy ? (
        <View style={styles.prepOverlay} pointerEvents="auto">
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.prepText}>Loading, please wait…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  prepOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 10000,
    elevation: 10000,
  },
  prepText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  notifDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  topRightCluster: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 8,
    marginBottom: 12,
    position: 'relative',
    width: 112,
    height: 112,
  },
  avatarStack: {
    width: 112,
    height: 112,
    borderRadius: 56,
    overflow: 'hidden',
  },
  /** Do not clip the story ring; ring is drawn outside the 112×112 avatar. */
  avatarStackWithStoryRing: {
    width: storyRingOuterDiameter(112),
    height: storyRingOuterDiameter(112),
    borderRadius: 0,
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E8E8ED',
  },
  addStoryFab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BG,
  },
  addStoryFabBusy: {
    opacity: 0.55,
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
  btnOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: BLUE,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: BG,
  },
  btnOutlineText: {
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
    maxWidth: 120,
    borderRadius: 2,
    backgroundColor: BLUE,
  },
  tabSpacer: {
    marginTop: 10,
    height: 3,
  },
  emptySaved: {
    textAlign: 'center',
    color: MUTED,
    paddingVertical: 32,
    fontSize: 14,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  skeletonTile: {
    borderRadius: 4,
    backgroundColor: '#EEF0F4',
  },
  // Profile-header skeletons (shown while public profile API is loading)
  bioSkeleton: {
    height: 14,
    width: 180,
    borderRadius: 7,
    backgroundColor: '#EEF0F4',
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'center',
  },
  statNumSkeleton: {
    height: 18,
    width: 36,
    borderRadius: 9,
    backgroundColor: '#EEF0F4',
    marginBottom: 6,
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
});
