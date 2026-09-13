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
import { ConfirmSheet } from '../components/common/ConfirmSheet';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  useGetBlockedUsersQuery,
  useUnblockUserMutation,
} from '../store/api/usersApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { getApiErrorMessage } from '../utils/apiError';
import { userDisplayName } from '../utils/displayName';
import { toastError, toastSuccess } from '../utils/toast';
import { useTheme } from '../theme';

const BLUE = '#246BFD';
const TITLE_COLOR = '#0D0D0D';
const MUTED = '#8A8A8A';

type Props = NativeStackScreenProps<RootStackParamList, 'BlockedUsers'>;

type BlockedItem = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
  blockedAt: string;
};

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

export function BlockedUsersScreen({ navigation }: Props) {
  const t = useTheme();

  const { data, isFetching, isError, refetch } = useGetBlockedUsersQuery({
    page: 0,
    limit: 50,
  });
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());
  const [unblockUser] = useUnblockUserMutation();
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pendingUnblock, setPendingUnblock] = useState<BlockedItem | null>(null);

  const handleRequestUnblock = useCallback(
    (item: BlockedItem) => {
      if (busyIds.has(item.id)) {
        return;
      }
      setPendingUnblock(item);
    },
    [busyIds],
  );

  const handleConfirmUnblock = useCallback(() => {
    const item = pendingUnblock;
    if (!item) {
      return;
    }
    setBusyIds(prev => new Set(prev).add(item.id));
    unblockUser(item.id)
      .unwrap()
      .then(() => {
        toastSuccess('Unblocked', `@${item.username} has been unblocked.`);
        refetch().catch(() => {});
      })
      .catch((e: unknown) => {
        toastError('Could not unblock user', getApiErrorMessage(e));
      })
      .finally(() => {
        setBusyIds(prev => {
          const s = new Set(prev);
          s.delete(item.id);
          return s;
        });
      });
  }, [pendingUnblock, unblockUser, refetch]);

  const renderItem = useCallback(
    ({ item }: { item: BlockedItem }) => {
      const busy = busyIds.has(item.id);
      return (
        <View style={styles.row}>
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
          <Pressable
            style={styles.unblockBtn}
            onPress={() => handleRequestUnblock(item)}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={`Unblock ${item.username}`}
          >
            {busy ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <Text
                style={[
                  styles.unblockBtnText,
                  { fontFamily: t.fontFamily.semibold },
                ]}
              >
                Unblock
              </Text>
            )}
          </Pressable>
        </View>
      );
    },
    [busyIds, handleRequestUnblock, t.fontFamily],
  );

  return (
    <View style={styles.root}>
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
          Blocked Users
        </Text>
        <View style={styles.backBtn} />
      </View>

      {isError && !data ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            Could not load blocked users.
          </Text>
          <Pressable
            onPress={() => {
              refetch().catch(() => {});
            }}
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
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            !data?.items?.length ? { flexGrow: 1 } : null,
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
              <ActivityIndicator size="large" color={BLUE} style={styles.loader} />
            ) : (
              <View style={styles.center}>
                <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
                  You haven't blocked anyone.
                </Text>
              </View>
            )
          }
        />
      )}

      <ConfirmSheet
        visible={pendingUnblock !== null}
        onClose={() => setPendingUnblock(null)}
        onConfirm={handleConfirmUnblock}
        title={
          pendingUnblock ? `Unblock @${pendingUnblock.username}?` : 'Unblock user?'
        }
        message="They will be able to see your profile, posts and message you again. Existing follow connections are not restored."
        confirmLabel="Unblock"
      />
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
  unblockBtn: {
    minWidth: 92,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: BLUE,
    backgroundColor: '#FFFFFF',
  },
  unblockBtnText: { fontSize: 13, color: BLUE },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  loader: { marginTop: 40 },
  retryBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 20 },
  retryText: { color: BLUE, fontSize: 15 },
});
