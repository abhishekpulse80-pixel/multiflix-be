import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '../common/UserAvatar';
import {
  useGetConversationsQuery,
  useGetOrCreateConversationMutation,
  useSendMessageRestMutation,
} from '../../store/api/chatApi';
import {
  useGetFollowingQuery,
  useSearchConnectionsQuery,
} from '../../store/api/usersApi';
import type {
  MessagePostRefInput,
  MessageProfileRefInput,
} from '../../types/chatApi';
import type { ConnectionSearchItemDto } from '../../types/userSearchApi';
import { useAppSelector } from '../../store/hooks';
import { selectAccessToken, selectCurrentUser } from '../../store/selectors';
import { toastError, toastSuccess } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { userDisplayName } from '../../utils/displayName';
import { useTheme } from '../../theme';

const BG = '#121212';
const TITLE = '#FFFFFF';
const MUTED = '#8E8E93';
const BORDER = 'rgba(255,255,255,0.08)';
const AVATAR_BG = '#2A2A2C';
const INPUT_BG = '#2A2A2C';
const SEND_BLUE = '#3B82F6';

type Recipient = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Provide exactly one of postRef / profileRef — what gets shared to chat. */
  postRef?: MessagePostRefInput | null;
  profileRef?: MessageProfileRefInput | null;
};

function SearchIcon({ size = 18, color = MUTED }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CloseIcon({ size = 22, color = TITLE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShareToChatSheet({
  visible,
  onClose,
  postRef,
  profileRef,
}: Props) {
  const t = useTheme();
  const token = useAppSelector(selectAccessToken);

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sendingFor, setSendingFor] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  const currentUser = useAppSelector(selectCurrentUser);
  const currentUserId = currentUser?.id;

  const { data: conversationsData, isLoading: convsLoading } =
    useGetConversationsQuery(undefined, { skip: !token || !visible });
  const conversations = conversationsData?.items ?? [];

  // People the user follows — shown by default so they don't have to search
  // (Instagram-style). Skipped while searching or when not signed in.
  const { data: followingData, isFetching: followingLoading } =
    useGetFollowingQuery(
      { userId: currentUserId ?? '', page: 0, limit: 50 },
      { skip: !token || !visible || !currentUserId },
    );
  const following = followingData?.items ?? [];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: searchResults, isFetching: searchLoading } =
    useSearchConnectionsQuery(
      { q: debouncedQuery, limit: 20 },
      { skip: !token || !visible || debouncedQuery.length === 0 },
    );

  const [getOrCreateConv] = useGetOrCreateConversationMutation();
  const [sendMessageRest] = useSendMessageRestMutation();

  useEffect(() => {
    if (!visible) {
      setSearchText('');
      setDebouncedQuery('');
      setSendingFor(null);
    }
  }, [visible]);

  const onPressRecipient = useCallback(
    async (r: Recipient) => {
      if (!postRef && !profileRef) return;
      if (sendingFor) return;
      setSendingFor(r.id);
      try {
        const { conversationId } = await getOrCreateConv(r.id).unwrap();
        await sendMessageRest({
          conversationId,
          text: '',
          postRef: postRef ?? null,
          profileRef: profileRef ?? null,
        }).unwrap();
        toastSuccess(
          'Sent',
          `Shared with ${userDisplayName(r)}`,
        );
        onClose();
      } catch (e: unknown) {
        toastError('Could not share', getApiErrorMessage(e));
      } finally {
        setSendingFor(null);
      }
    },
    [postRef, profileRef, sendingFor, getOrCreateConv, sendMessageRest, onClose],
  );

  // Convert conversations → recipients; hide when searching
  const recentRecipients: Recipient[] = conversations.map((c) => ({
    id: c.otherUser.id,
    username: c.otherUser.username,
    fullName: c.otherUser.fullName,
    avatarUrl: c.otherUser.avatarUrl,
  }));

  const searchRecipients: Recipient[] = (searchResults?.items ?? []).map(
    (u: ConnectionSearchItemDto) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      avatarUrl: u.avatarUrl,
    }),
  );

  const followingRecipients: Recipient[] = following.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    avatarUrl: u.avatarUrl,
  }));

  // Default list = recent chats first, then the people you follow, deduped
  // by user id so someone in both doesn't appear twice.
  const defaultRecipients: Recipient[] = (() => {
    const seen = new Set<string>();
    const out: Recipient[] = [];
    for (const r of [...recentRecipients, ...followingRecipients]) {
      if (seen.has(r.id)) {
        continue;
      }
      seen.add(r.id);
      out.push(r);
    }
    return out;
  })();

  const isSearching = debouncedQuery.length > 0;
  const listData = isSearching ? searchRecipients : defaultRecipients;
  const listLoading = isSearching
    ? searchLoading
    : convsLoading || followingLoading;

  const renderRecipient = ({ item }: { item: Recipient }) => {
    const sending = sendingFor === item.id;
    const displayName = userDisplayName(item);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.row,
          { opacity: pressed || sending ? 0.6 : 1 },
        ]}
        onPress={() => {
          void onPressRecipient(item);
        }}
        disabled={!!sendingFor}
        accessibilityRole="button"
        accessibilityLabel={`Send to ${displayName}`}
      >
        <UserAvatar
          uri={item.avatarUrl}
          style={styles.avatar}
          accessibilityLabel={displayName}
        />
        <View style={styles.rowText}>
          <Text
            style={[styles.rowName, { fontFamily: t.fontFamily.semibold }]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          <Text
            style={[styles.rowHandle, { fontFamily: t.fontFamily.regular }]}
            numberOfLines={1}
          >
            @{item.username}
          </Text>
        </View>
        {sending ? (
          <ActivityIndicator size="small" color={MUTED} />
        ) : (
          <Text style={[styles.sendLabel, { fontFamily: t.fontFamily.semibold }]}>
            Send
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
      >
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
              Share to…
            </Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
              <CloseIcon />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <SearchIcon />
            <TextInput
              ref={searchInputRef}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search users"
              placeholderTextColor={MUTED}
              keyboardAppearance="dark"
              style={[
                styles.searchInput,
                { fontFamily: t.fontFamily.regular },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </View>

          {!isSearching ? (
            <Text
              style={[styles.sectionLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              {recentRecipients.length > 0 ? 'Recent chats' : 'Suggested'}
            </Text>
          ) : null}

          {listLoading && listData.length === 0 ? (
            <View style={styles.emptyWrap}>
              <ActivityIndicator size="small" color={MUTED} />
            </View>
          ) : listData.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text
                style={[styles.emptyText, { fontFamily: t.fontFamily.regular }]}
              >
                {isSearching
                  ? 'No users found.'
                  : 'No one to share with yet. Search above to find someone.'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(item) => item.id}
              renderItem={renderRecipient}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 24,
    maxHeight: '80%',
    minHeight: '55%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A3A3A',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    color: TITLE,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: INPUT_BG,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: TITLE,
    fontSize: 15,
    padding: 0,
  },
  sectionLabel: {
    fontSize: 13,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  listContent: {
    paddingBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: AVATAR_BG,
  },
  rowText: {
    flex: 1,
  },
  rowName: {
    fontSize: 15,
    color: TITLE,
  },
  rowHandle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  sendLabel: {
    color: SEND_BLUE,
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: BORDER,
    marginLeft: 56,
  },
  emptyWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    textAlign: 'center',
  },
});
