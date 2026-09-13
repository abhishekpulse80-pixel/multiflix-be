import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '../components/common/UserAvatar';
import { ConversationActionsSheet } from '../components/chat/ConversationActionsSheet';
import { ConfirmSheet } from '../components/common/ConfirmSheet';
import type { RootStackParamList } from '../navigation/types';
import {
  useGetHiddenConversationsQuery,
  useUnhideConversationMutation,
  useDeleteConversationMutation,
} from '../store/api/chatApi';
import { useBlockUserMutation } from '../store/api/usersApi';
import type { ConversationDto } from '../types/chatApi';
import { userDisplayName } from '../utils/displayName';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastSuccess } from '../utils/toast';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'HiddenChats'>;

const TITLE = '#0D0D0D';
const MUTED = '#8A8A8A';
const BLUE = '#246BFD';

function BackArrowIcon({ size = 22, color = TITLE }: { size?: number; color?: string }) {
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

function formatTime(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD}d`;
}

export function HiddenChatsScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const { data, isLoading, refetch } = useGetHiddenConversationsQuery();
  const conversations = data?.items ?? [];
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());

  const [unhideConversation] = useUnhideConversationMutation();
  const [deleteConversation] = useDeleteConversationMutation();
  const [blockUser] = useBlockUserMutation();
  const [actionConv, setActionConv] = useState<ConversationDto | null>(null);
  const [confirm, setConfirm] = useState<{
    type: 'delete' | 'block';
    conv: ConversationDto;
  } | null>(null);

  const onUnhide = useCallback(() => {
    const conv = actionConv;
    setActionConv(null);
    if (!conv) return;
    unhideConversation(conv.id)
      .unwrap()
      .then(() => toastSuccess('Chat restored'))
      .catch(e => toastError('Could not restore chat', getApiErrorMessage(e)));
  }, [actionConv, unhideConversation]);

  const onConfirmAction = useCallback(() => {
    const c = confirm;
    if (!c) return;
    if (c.type === 'delete') {
      deleteConversation(c.conv.id)
        .unwrap()
        .then(() => toastSuccess('Chat deleted'))
        .catch(e => toastError('Could not delete chat', getApiErrorMessage(e)));
    } else {
      blockUser(c.conv.otherUser.id)
        .unwrap()
        .then(() => {
          toastSuccess('User blocked');
          refetch();
        })
        .catch(e => toastError('Could not block user', getApiErrorMessage(e)));
    }
  }, [confirm, deleteConversation, blockUser, refetch]);

  const confirmTitle = !confirm
    ? ''
    : confirm.type === 'block'
      ? `Block @${confirm.conv.otherUser.username}?`
      : 'Delete chat?';
  const confirmMessage = !confirm
    ? ''
    : confirm.type === 'block'
      ? 'They will no longer be able to message you or see your profile.'
      : 'This removes the conversation and its messages from your list. The other person keeps their copy.';
  const confirmLabel = confirm?.type === 'block' ? 'Block' : 'Delete';

  const renderConversation = useCallback(
    ({ item }: { item: ConversationDto }) => {
      const displayName = userDisplayName(item.otherUser);
      const timeStr = item.lastMessage
        ? formatTime(item.lastMessage.createdAt)
        : '';
      return (
        <Pressable
          style={styles.threadRow}
          onPress={() =>
            navigation.navigate('Chat', {
              userId: item.otherUser.id,
              username: item.otherUser.username,
              fullName: displayName,
              avatarUrl: item.otherUser.avatarUrl,
              conversationId: item.id,
            })
          }
          onLongPress={() => setActionConv(item)}
          delayLongPress={300}
          accessibilityRole="button"
          accessibilityLabel={`Chat with ${displayName}`}>
          <UserAvatar uri={item.otherUser.avatarUrl} style={styles.avatar} />
          <View style={styles.threadText}>
            <Text
              style={[styles.threadName, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={1}>
              {displayName}
            </Text>
            {item.lastMessage ? (
              <Text
                style={[styles.threadMsg, { fontFamily: t.fontFamily.regular }]}
                numberOfLines={1}>
                {item.lastMessage.text}
              </Text>
            ) : null}
          </View>
          {timeStr ? (
            <Text style={[styles.threadTime, { fontFamily: t.fontFamily.regular }]}>
              {timeStr}
            </Text>
          ) : null}
        </Pressable>
      );
    },
    [navigation, t.fontFamily],
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <BackArrowIcon />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>
          Hidden Chats
        </Text>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator size="small" color={BLUE} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={item => item.id}
          renderItem={renderConversation}
          contentContainerStyle={{
            paddingBottom: Math.max(20, insets.bottom + 12),
            flexGrow: conversations.length === 0 ? 1 : undefined,
          }}
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
            <View style={styles.center}>
              <Text style={[styles.empty, { fontFamily: t.fontFamily.medium }]}>
                No hidden chats
              </Text>
            </View>
          }
        />
      )}

      <ConversationActionsSheet
        visible={actionConv !== null}
        subject={actionConv ? userDisplayName(actionConv.otherUser) : undefined}
        primaryLabel="Unhide chat"
        onClose={() => setActionConv(null)}
        onHide={onUnhide}
        onDelete={() => {
          const c = actionConv;
          setActionConv(null);
          if (c) setConfirm({ type: 'delete', conv: c });
        }}
        onBlock={() => {
          const c = actionConv;
          setActionConv(null);
          if (c) setConfirm({ type: 'block', conv: c });
        }}
      />

      <ConfirmSheet
        visible={confirm !== null}
        onClose={() => setConfirm(null)}
        onConfirm={onConfirmAction}
        title={confirmTitle}
        message={confirmMessage}
        confirmLabel={confirmLabel}
        destructive
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
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, color: TITLE },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E8E8E8' },
  threadText: { flex: 1, marginLeft: 14, minWidth: 0 },
  threadName: { fontSize: 16, color: TITLE },
  threadMsg: { fontSize: 14, color: MUTED, marginTop: 2 },
  threadTime: { fontSize: 12, color: MUTED, marginLeft: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', color: MUTED, fontSize: 15 },
});
