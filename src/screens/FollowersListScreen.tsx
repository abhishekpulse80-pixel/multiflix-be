import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import { UserAvatar } from '../components/common/UserAvatar';
import { navigateToUserProfile } from '../navigation/rootNavigationRef';
import {
  useGetFollowersQuery,
  useGetFollowingQuery,
  useFollowUserMutation,
  useUnfollowUserMutation,
} from '../store/api/usersApi';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/selectors';
import { getApiErrorMessage } from '../utils/apiError';
import { userDisplayName } from '../utils/displayName';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { toastError } from '../utils/toast';
import { useTheme } from '../theme';

const BLUE = '#246BFD';
const TITLE_COLOR = '#0D0D0D';
const MUTED = '#8A8A8A';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowersList'>;

type TabKey = 'followers' | 'following';

function ArrowLeftIcon({ size = 22, color = TITLE_COLOR }: { size?: number; color?: string }) {
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

type ListItem = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  isFollowedBack: boolean;
  followsYou: boolean;
};

export function FollowersListScreen({ navigation, route }: Props) {
  const { userId, initialTab } = route.params;
  const t = useTheme();
  const currentUser = useAppSelector(selectCurrentUser);
  const isOwnProfile = !!currentUser?.id && currentUser.id === userId;

  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTab === 'following' ? 'following' : 'followers',
  );

  const followersQ = useGetFollowersQuery({ userId });
  const followingQ = useGetFollowingQuery(
    { userId },
    // Only own profile shows the Following tab, so skip otherwise.
    { skip: !isOwnProfile },
  );

  const activeQ = activeTab === 'followers' ? followersQ : followingQ;
  const { data, isFetching, isError, refetch } = activeQ;
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  const [followUser] = useFollowUserMutation();
  const [unfollowUser] = useUnfollowUserMutation();

  // Local optimistic state for follow toggles
  const [localFollowState, setLocalFollowState] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const handleToggleFollow = useCallback(
    async (item: ListItem) => {
      if (busyIds.has(item.id)) return;
      const currentlyFollowing =
        localFollowState[item.id] ?? item.isFollowedBack;
      const next = !currentlyFollowing;

      // Optimistic update
      setLocalFollowState(prev => ({ ...prev, [item.id]: next }));
      setBusyIds(prev => new Set(prev).add(item.id));

      try {
        if (next) {
          await followUser(item.id).unwrap();
        } else {
          await unfollowUser(item.id).unwrap();
        }
      } catch (e: unknown) {
        // Revert on error
        setLocalFollowState(prev => ({ ...prev, [item.id]: currentlyFollowing }));
        toastError('Follow', getApiErrorMessage(e));
      } finally {
        setBusyIds(prev => {
          const s = new Set(prev);
          s.delete(item.id);
          return s;
        });
      }
    },
    [busyIds, localFollowState, followUser, unfollowUser],
  );

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      const isMe = item.id === currentUser?.id;
      const following = localFollowState[item.id] ?? item.isFollowedBack;
      const busy = busyIds.has(item.id);

      // "Follow Back" whenever the listed user already follows you (works on
      // any list/tab); otherwise plain "Follow" / "Following".
      const followLabel = following
        ? 'Following'
        : item.followsYou
          ? 'Follow Back'
          : 'Follow';

      return (
        <Pressable
          style={styles.row}
          onPress={() => navigateToUserProfile(item.id)}
          accessibilityRole="button"
          accessibilityLabel={`View ${item.username} profile`}
        >
          <UserAvatar uri={item.avatarUrl} style={styles.avatar} />
          <View style={styles.info}>
            <Text
              style={[styles.displayName, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={1}
            >
              {userDisplayName(item)}
            </Text>
            <Text
              style={[styles.handle, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={1}
            >
              @{item.username}
            </Text>
          </View>
          {!isMe ? (
            <Pressable
              style={[
                styles.followBtn,
                following ? styles.followBtnFollowing : styles.followBtnDefault,
              ]}
              onPress={(e) => {
                e.stopPropagation?.();
                void handleToggleFollow(item);
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel={following ? 'Unfollow' : followLabel}
            >
              {busy ? (
                <ActivityIndicator
                  size="small"
                  color={following ? BLUE : '#FFFFFF'}
                />
              ) : (
                <Text
                  style={[
                    styles.followBtnText,
                    { fontFamily: t.fontFamily.semibold },
                    following
                      ? styles.followBtnTextFollowing
                      : styles.followBtnTextDefault,
                  ]}
                >
                  {followLabel}
                </Text>
              )}
            </Pressable>
          ) : null}
        </Pressable>
      );
    },
    [currentUser?.id, localFollowState, busyIds, t.fontFamily, handleToggleFollow, activeTab, isOwnProfile],
  );

  const emptyText =
    activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.';
  const errorText =
    activeTab === 'followers'
      ? 'Could not load followers.'
      : 'Could not load following list.';
  const headerTitle = !isOwnProfile
    ? 'Followers'
    : activeTab === 'followers'
      ? 'Followers'
      : 'Following';

  return (
    <View style={styles.root}>
{/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.backBtn}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <ArrowLeftIcon />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>
          {headerTitle}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tabs — only on own profile */}
      {isOwnProfile ? (
        <View style={styles.tabsBar}>
          <Pressable
            onPress={() => setActiveTab('followers')}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'followers' }}
          >
            <Text
              style={[
                styles.tabText,
                {
                  fontFamily:
                    activeTab === 'followers'
                      ? t.fontFamily.semibold
                      : t.fontFamily.medium,
                },
                activeTab === 'followers' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Followers
            </Text>
            {activeTab === 'followers' ? <View style={styles.tabUnderline} /> : null}
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('following')}
            style={styles.tabBtn}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === 'following' }}
          >
            <Text
              style={[
                styles.tabText,
                {
                  fontFamily:
                    activeTab === 'following'
                      ? t.fontFamily.semibold
                      : t.fontFamily.medium,
                },
                activeTab === 'following' ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              Following
            </Text>
            {activeTab === 'following' ? <View style={styles.tabUnderline} /> : null}
          </Pressable>
        </View>
      ) : null}

      {isError && !data ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            {errorText}
          </Text>
          <Pressable
            onPress={() => { refetch().catch(() => {}); }}
            style={styles.retryBtn}
            accessibilityRole="button"
          >
            <Text style={[styles.retryText, { fontFamily: t.fontFamily.semibold }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            (!data?.items?.length) ? { flexGrow: 1 } : null,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={REFRESH_TINT}
              colors={[REFRESH_TINT]}
            />
          }
          ListEmptyComponent={
            isFetching ? (
              <ActivityIndicator
                size="large"
                color={BLUE}
                style={styles.loader}
              />
            ) : (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
                  {emptyText}
                </Text>
              </View>
            )
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, color: TITLE_COLOR },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabText: { fontSize: 15 },
  tabTextActive: { color: TITLE_COLOR },
  tabTextInactive: { color: MUTED },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
    backgroundColor: BLUE,
  },
  list: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E8E8' },
  info: { flex: 1, minWidth: 0 },
  displayName: { fontSize: 15, color: TITLE_COLOR },
  handle: { fontSize: 13, color: MUTED, marginTop: 2 },
  followBtn: {
    minWidth: 100,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  followBtnDefault: { backgroundColor: BLUE },
  followBtnFollowing: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  followBtnText: { fontSize: 13 },
  followBtnTextDefault: { color: '#FFFFFF' },
  followBtnTextFollowing: { color: BLUE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  loader: { marginTop: 40 },
  retryBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 20 },
  retryText: { color: BLUE, fontSize: 15 },
});
