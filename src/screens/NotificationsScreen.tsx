import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  useGetUnreadNotificationsCountQuery,
  useLazyGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from '../store/api/notificationsApi';
import { useGetUserPublicProfileQuery } from '../store/api/usersApi';
import { useLazyGetUserStoriesQuery } from '../store/api/storiesApi';
import type { NotificationDto } from '../types/notificationsApi';
import { navigateToBloggingWatch } from '../navigation/rootNavigationRef';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/selectors';
import { userDisplayName } from '../utils/displayName';
import { formatRelativeTime } from '../utils/formatRelativeTime';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError } from '../utils/toast';
import { useTheme } from '../theme';

const BLUE = '#246BFD';
const TITLE_COLOR = '#0D0D0D';
const MUTED = '#8A8A8A';
const UNREAD_BG = '#F0F6FF';
const PAGE_LIMIT = 20;

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

function ArrowLeftIcon({
  size = 22,
  color = TITLE_COLOR,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12l7 7M5 12l7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** `123.5` → `₹123.50` (Indian digit grouping). */
function formatInr(n: number): string {
  if (!Number.isFinite(n)) return '';
  return `₹${n.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Pull a numeric `amount` from `meta`, coercing string values that came via FCM. */
function amountFromMeta(meta: Record<string, unknown> | null): number | null {
  const raw = meta?.amount;
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function notificationActionText(n: NotificationDto): string {
  switch (n.type) {
    case 'new_follower':
      return 'started following you';
    case 'post_like':
      return 'liked your post';
    case 'post_comment':
      return 'commented on your post';
    case 'blog_like':
      return 'liked your blog';
    case 'story_reaction':
      return 'reacted to your story';
    case 'withdrawal_approved': {
      const amt = amountFromMeta(n.meta);
      return amt != null
        ? `Your withdrawal of ${formatInr(amt)} was approved.`
        : 'Your withdrawal was approved.';
    }
    case 'withdrawal_rejected': {
      const amt = amountFromMeta(n.meta);
      const base =
        amt != null
          ? `Your withdrawal of ${formatInr(amt)} was rejected.`
          : 'Your withdrawal was rejected.';
      const note = typeof n.meta?.note === 'string' ? n.meta.note : '';
      return note ? `${base} ${note}` : base;
    }
    default:
      return '';
  }
}

/**
 * A collapsed inbox row. Like/comment notifications on the SAME post are
 * grouped into one entry ("X and N others liked your post"); everything else
 * stays as its own group of one.
 */
type NotificationGroup = {
  key: string;
  /** Most-recent notification in the group (drives avatar/post/time). */
  rep: NotificationDto;
  members: NotificationDto[];
  count: number;
  /** Unread if ANY member is unread. */
  unread: boolean;
};

/**
 * Group like/comment notifications on the same post. Input must be
 * newest-first; group order follows the newest member of each group.
 */
function groupNotifications(items: NotificationDto[]): NotificationGroup[] {
  const map = new Map<string, NotificationGroup>();
  for (const n of items) {
    let key = `single:${n.id}`;
    if ((n.type === 'post_like' || n.type === 'post_comment') && n.post) {
      key = `${n.type}:${n.post.id}`;
    } else if (n.type === 'blog_like' && n.blogId) {
      key = `blog_like:${n.blogId}`;
    } else if (n.type === 'story_reaction' && n.storyId) {
      key = `story_reaction:${n.storyId}`;
    }
    const existing = map.get(key);
    if (existing) {
      existing.members.push(n);
      existing.count += 1;
      if (!n.isRead) existing.unread = true;
    } else {
      map.set(key, { key, rep: n, members: [n], count: 1, unread: !n.isRead });
    }
  }
  return Array.from(map.values());
}

/** Action text for a (possibly grouped) row — pairs with the bold actor name. */
function groupActionText(group: NotificationGroup): string {
  const { rep, count } = group;
  if (count <= 1) return notificationActionText(rep);
  const others = count - 1;
  const suffix = others === 1 ? '1 other' : `${others} others`;
  if (rep.type === 'post_like') return `and ${suffix} liked your post`;
  if (rep.type === 'post_comment') {
    return `and ${suffix} commented on your post`;
  }
  if (rep.type === 'blog_like') return `and ${suffix} liked your blog`;
  if (rep.type === 'story_reaction') {
    return `and ${suffix} reacted to your story`;
  }
  return notificationActionText(rep);
}

export function NotificationsScreen({ navigation }: Props) {
  const t = useTheme();

  const currentUser = useAppSelector(selectCurrentUser);
  const currentUserId = currentUser?.id ?? null;
  // Cached app-wide (loaded by the profile screen) — used for the post
  // viewer's author handle when opening one of the viewer's own posts.
  const { data: mePublic } = useGetUserPublicProfileQuery(currentUserId ?? '', {
    skip: !currentUserId,
  });

  const [trigger] = useLazyGetNotificationsQuery();
  // Used to open the viewer's own story when a story_reaction is tapped.
  const [fetchOwnStories] = useLazyGetUserStoriesQuery();
  const { data: unreadData, refetch: refetchUnread } =
    useGetUnreadNotificationsCountQuery();
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isMarkingAll }] =
    useMarkAllNotificationsReadMutation();

  const [items, setItems] = useState<NotificationDto[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingFirst, setIsLoadingFirst] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isError, setIsError] = useState(false);

  const loadPage = useCallback(
    async (pageToLoad: number, mode: 'first' | 'more' | 'refresh') => {
      try {
        const res = await trigger({ page: pageToLoad, limit: PAGE_LIMIT }).unwrap();
        setItems(prev =>
          pageToLoad === 0 ? res.items : [...prev, ...res.items],
        );
        setPage(res.page);
        setHasMore(res.hasMore);
        setIsError(false);
      } catch (e: unknown) {
        setIsError(true);
        if (mode !== 'first') {
          toastError('Notifications', getApiErrorMessage(e));
        }
      }
    },
    [trigger],
  );

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await loadPage(0, 'first');
      if (!cancelled) setIsLoadingFirst(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPage]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPage(0, 'refresh');
    refetchUnread();
    setIsRefreshing(false);
  }, [loadPage, refetchUnread]);

  const onEndReached = useCallback(async () => {
    if (isLoadingMore || isLoadingFirst || !hasMore) return;
    setIsLoadingMore(true);
    await loadPage(page + 1, 'more');
    setIsLoadingMore(false);
  }, [isLoadingMore, isLoadingFirst, hasMore, page, loadPage]);

  // A like/comment notification is about the recipient's OWN post, so open it
  // in the profile posts viewer. Seed it from the notification so the post
  // shows immediately while the viewer hydrates the rest of the user's posts.
  // Returns false when the post data is missing so the caller can fall back.
  const openOwnPost = useCallback(
    (n: NotificationDto, openComments = false): boolean => {
      if (!n.post || !currentUserId || !currentUser) return false;
      navigation.navigate('UserProfilePostsViewer', {
        userId: currentUserId,
        userDisplayName: currentUser.fullName ?? '',
        userHandle: mePublic?.profile?.username ?? '',
        userAvatarUri: currentUser.avatarUrl ?? '',
        initialPostId: n.post.id,
        initialPage: 0,
        hasMore: false,
        // Comment notifications open straight into the comments sheet.
        initialCommentsPostId: openComments ? n.post.id : undefined,
        posts: [
          {
            id: n.post.id,
            uri: n.post.mediaUrl ?? n.post.thumbnailUrl ?? '',
            likes: 0,
            isVideo: n.post.mediaKind === 'short_video',
            caption: '',
            hashtags: '',
            musicTitle: '',
            music: null,
            originalSound: null,
            videoDurationSec: null,
            comments: 0,
            likedByViewer: false,
            savedByViewer: false,
          },
        ],
      });
      return true;
    },
    [currentUser, currentUserId, mePublic, navigation],
  );

  // Open the viewer's own story (the one that was reacted to) if it's still
  // alive; otherwise fall back to the reactor's profile.
  const openOwnStory = useCallback(
    (n: NotificationDto) => {
      if (!n.storyId || !currentUserId) {
        if (n.actor) navigation.navigate('UserProfile', { userId: n.actor.id });
        return;
      }
      fetchOwnStories(currentUserId)
        .unwrap()
        .then(res => {
          const items = res.items ?? [];
          const idx = items.findIndex(s => s.id === n.storyId);
          if (idx >= 0) {
            navigation.navigate('StoryViewer', {
              stories: items,
              authorUsername:
                currentUser?.fullName ?? 'You',
              authorDisplayName:
                currentUser?.fullName ?? null,
              authorAvatarUri: currentUser?.avatarUrl ?? null,
              initialIndex: idx,
            });
          } else if (n.actor) {
            // Story expired — show who reacted instead.
            navigation.navigate('UserProfile', { userId: n.actor.id });
          }
        })
        .catch(() => {
          if (n.actor) {
            navigation.navigate('UserProfile', { userId: n.actor.id });
          }
        });
    },
    [currentUser, currentUserId, fetchOwnStories, navigation],
  );

  // Route by notification type. Structured as a switch so new types can
  // be given dedicated destinations as we build them out.
  const navigateForNotification = useCallback(
    (n: NotificationDto) => {
      switch (n.type) {
        case 'withdrawal_approved':
        case 'withdrawal_rejected':
          navigation.navigate('Earnings');
          return;
        case 'post_like':
          if (openOwnPost(n)) return;
          break;
        case 'post_comment':
          // Open the post straight into the comments sheet.
          if (openOwnPost(n, true)) return;
          break;
        case 'blog_like':
          if (n.blogId) {
            navigateToBloggingWatch(n.blogId);
            return;
          }
          break;
        case 'story_reaction':
          openOwnStory(n);
          return;
        case 'new_follower':
          // Falls through to the actor's profile below.
          break;
      }
      // Fallback: open the actor's profile when there's no better target.
      if (n.actor) {
        navigation.navigate('UserProfile', { userId: n.actor.id });
      }
    },
    [navigation, openOwnPost, openOwnStory],
  );

  // Mark every unread member of a group read (optimistic + best-effort server).
  const markGroupRead = useCallback(
    (group: NotificationGroup) => {
      const unreadIds = group.members
        .filter(m => !m.isRead)
        .map(m => m.id);
      if (unreadIds.length === 0) return;
      const idSet = new Set(unreadIds);
      setItems(prev =>
        prev.map(x => (idSet.has(x.id) ? { ...x, isRead: true } : x)),
      );
      unreadIds.forEach(id => {
        markRead({ notificationId: id })
          .unwrap()
          .catch(() => {});
      });
    },
    [markRead],
  );

  // Row / thumbnail tap → the notification's target (post, story, blog…).
  const handleGroupPress = useCallback(
    (group: NotificationGroup) => {
      markGroupRead(group);
      navigateForNotification(group.rep);
    },
    [markGroupRead, navigateForNotification],
  );

  // Avatar tap → the actor's public profile (when there is one).
  const handleActorPress = useCallback(
    (group: NotificationGroup) => {
      markGroupRead(group);
      const actorId = group.rep.actor?.id;
      if (actorId) {
        navigation.navigate('UserProfile', { userId: actorId });
      } else {
        // System notification (no actor) — fall back to the target.
        navigateForNotification(group.rep);
      }
    },
    [markGroupRead, navigateForNotification, navigation],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllRead().unwrap();
      setItems(prev => prev.map(x => ({ ...x, isRead: true })));
    } catch (e: unknown) {
      toastError('Mark all read', getApiErrorMessage(e));
    }
  }, [markAllRead]);

  const unreadCount = unreadData?.count ?? 0;

  const groups = useMemo(() => groupNotifications(items), [items]);

  const renderItem = useCallback(
    ({ item: group }: { item: NotificationGroup }) => {
      const rep = group.rep;
      const isSystem = rep.actor == null;
      const name = isSystem
        ? 'Multiflix'
        : rep.actor
          ? userDisplayName(rep.actor)
          : 'Someone';
      const thumbSrc = rep.post?.thumbnailUrl || rep.post?.mediaUrl || null;
      const actionText = groupActionText(group);
      return (
        <Pressable
          onPress={() => handleGroupPress(group)}
          style={({ pressed }) => [
            styles.row,
            group.unread && styles.rowUnread,
            pressed && styles.rowPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`${name} ${actionText}`}
        >
          {isSystem ? (
            <View style={[styles.avatar, styles.systemAvatar]}>
              <Text
                style={[
                  styles.systemAvatarText,
                  { fontFamily: t.fontFamily.bold },
                ]}
              >
                M
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={() => handleActorPress(group)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`View ${name}'s profile`}
            >
              <UserAvatar uri={rep.actor?.avatarUrl} style={styles.avatar} />
            </Pressable>
          )}
          <View style={styles.textBlock}>
            <Text
              style={[styles.message, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={3}
            >
              <Text style={{ fontFamily: t.fontFamily.semibold }}>{name}</Text>
              <Text> {actionText}</Text>
            </Text>
            <Text
              style={[styles.time, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={1}
            >
              {formatRelativeTime(rep.createdAt)}
            </Text>
          </View>
          {thumbSrc ? (
            <Pressable
              onPress={() => handleGroupPress(group)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Open post"
            >
              <Image source={{ uri: thumbSrc }} style={styles.thumb} />
            </Pressable>
          ) : null}
          {group.unread ? <View style={styles.unreadDot} /> : null}
        </Pressable>
      );
    },
    [handleActorPress, handleGroupPress, t.fontFamily],
  );

  return (
    <View style={styles.root}>
<View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeftIcon />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>
          Notifications
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={handleMarkAllRead}
            hitSlop={8}
            style={styles.markAllBtn}
            disabled={isMarkingAll}
            accessibilityLabel="Mark all notifications as read"
            accessibilityRole="button"
          >
            {isMarkingAll ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <Text
                style={[
                  styles.markAllText,
                  { fontFamily: t.fontFamily.semibold },
                ]}
                numberOfLines={1}
              >
                Mark all read
              </Text>
            )}
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      {isError && items.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            Could not load notifications.
          </Text>
          <Pressable
            onPress={() => {
              setIsLoadingFirst(true);
              loadPage(0, 'first').finally(() => setIsLoadingFirst(false));
            }}
            style={styles.retryBtn}
            accessibilityRole="button"
          >
            <Text
              style={[styles.retryText, { fontFamily: t.fontFamily.semibold }]}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={group => group.key}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            groups.length === 0 ? { flexGrow: 1 } : null,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
              colors={[BLUE]}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            isLoadingFirst ? (
              <ActivityIndicator
                size="large"
                color={BLUE}
                style={styles.loader}
              />
            ) : (
              <View style={styles.center}>
                <Text
                  style={[
                    styles.emptyText,
                    { fontFamily: t.fontFamily.medium },
                  ]}
                >
                  You're all caught up.
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            isLoadingMore ? (
              <ActivityIndicator
                size="small"
                color={BLUE}
                style={styles.footerLoader}
              />
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    color: TITLE_COLOR,
  },
  markAllBtn: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: 10,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  markAllText: { fontSize: 13, color: BLUE },
  list: { paddingVertical: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowUnread: { backgroundColor: UNREAD_BG },
  rowPressed: { opacity: 0.7 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#E8E8E8',
  },
  systemAvatar: {
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  textBlock: { flex: 1, minWidth: 0 },
  message: { fontSize: 14, color: TITLE_COLOR, lineHeight: 20 },
  time: { fontSize: 12, color: MUTED, marginTop: 4 },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE,
    marginLeft: 4,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  loader: { marginTop: 40 },
  footerLoader: { marginVertical: 16 },
  retryBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 20 },
  retryText: { color: BLUE, fontSize: 15 },
});
