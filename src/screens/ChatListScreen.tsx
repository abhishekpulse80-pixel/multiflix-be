import {
  useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useEffect,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '../components/common/UserAvatar';
import type { RootStackParamList } from '../navigation/types';
import { selectAccessToken, selectCurrentUser } from '../store/selectors';
import { useAppSelector } from '../store/hooks';
import {
  useGetConnectionStoriesQuery,
  useGetUserStoriesQuery,
} from '../store/api/storiesApi';
import {
  useSearchConnectionsQuery,
  useBlockUserMutation,
} from '../store/api/usersApi';
import {
  useGetConversationsQuery,
  useHideConversationMutation,
  useDeleteConversationMutation,
} from '../store/api/chatApi';
import type { ConnectionStoryAuthor } from '../types/storiesApi';
import type { ConnectionSearchItemDto } from '../types/userSearchApi';
import type { ConversationDto } from '../types/chatApi';
import { userDisplayName } from '../utils/displayName';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { ConversationActionsSheet } from '../components/chat/ConversationActionsSheet';
import { ConfirmSheet } from '../components/common/ConfirmSheet';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastSuccess } from '../utils/toast';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatList'>;

const BG = '#FFFFFF';
const TITLE = '#0D0D0D';
const MUTED = '#8A8A8A';
const BLUE = '#246BFD';
/** Grayed-out story ring for authors whose stories the viewer has fully seen. */
const STORY_RING_SEEN = '#C7C7CC';

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

function SearchIcon({ size = 22, color = TITLE }: { size?: number; color?: string }) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Yesterday';
  return `${diffD}d`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function ChatListScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const token = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const currentUserId = currentUser?.id;
  const {
    data: connectionStories,
    isLoading: storiesLoading,
    refetch: refetchStories,
  } = useGetConnectionStoriesQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });

  const { data: ownStories, refetch: refetchOwnStories } =
    useGetUserStoriesQuery(currentUserId ?? '', {
      skip: !token || !currentUserId,
      refetchOnMountOrArgChange: true,
    });
  const hasOwnActiveStories = (ownStories?.items?.length ?? 0) > 0;

  const storyAuthors = connectionStories?.authors ?? [];

  // ─── Conversations ──────────────────────────────────────────────────────
  const {
    data: conversationsData,
    isLoading: convsLoading,
    refetch: refetchConvs,
  } = useGetConversationsQuery(undefined, { skip: !token });

  const conversations = conversationsData?.items ?? [];
  const hiddenCount = conversationsData?.hiddenCount ?? 0;

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([refetchConvs(), refetchStories(), refetchOwnStories()]),
  );

  // ─── Long-press conversation actions (hide / delete / block) ────────────
  const [hideConversation] = useHideConversationMutation();
  const [deleteConversation] = useDeleteConversationMutation();
  const [blockUser] = useBlockUserMutation();
  const [actionConv, setActionConv] = useState<ConversationDto | null>(null);
  const [confirm, setConfirm] = useState<{
    type: 'delete' | 'block';
    conv: ConversationDto;
  } | null>(null);

  const onHideChat = useCallback(() => {
    const conv = actionConv;
    setActionConv(null);
    if (!conv) return;
    // No success toast — hiding is a quiet action; the row just disappears.
    hideConversation(conv.id)
      .unwrap()
      .catch(e => toastError('Could not hide chat', getApiErrorMessage(e)));
  }, [actionConv, hideConversation]);

  const onConfirmAction = useCallback(() => {
    const c = confirm;
    if (!c) return;
    setConfirm(null); // close the confirm sheet immediately
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
          refetchConvs();
        })
        .catch(e => toastError('Could not block user', getApiErrorMessage(e)));
    }
  }, [confirm, deleteConversation, blockUser, refetchConvs]);

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

  // Refetch conversations + stories when the screen gains focus (e.g. returning
  // from ChatScreen, or after a connection has just posted a new story).
  const isFocused = useIsFocused();
  useEffect(() => {
    if (isFocused && token) {
      refetchConvs();
      refetchStories();
      if (currentUserId) {
        refetchOwnStories();
      }
    }
  }, [
    isFocused,
    token,
    currentUserId,
    refetchConvs,
    refetchStories,
    refetchOwnStories,
  ]);

  // ─── Search state ─────────────────────────────────────────────────────
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchText.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  const { data: searchResults, isFetching: searchLoading } =
    useSearchConnectionsQuery(
      { q: debouncedQuery, limit: 20 },
      { skip: !token || debouncedQuery.length === 0 },
    );

  const onOpenSearch = useCallback(() => {
    setSearchOpen(true);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, []);

  const onCloseSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchText('');
    setDebouncedQuery('');
  }, []);

  const onPressSearchResult = useCallback(
    (item: ConnectionSearchItemDto) => {
      onCloseSearch();
      navigation.navigate('Chat', {
        userId: item.id,
        username: item.username,
        fullName: userDisplayName(item),
        avatarUrl: item.avatarUrl,
      });
    },
    [navigation, onCloseSearch],
  );

  const onPressStoryAuthor = useCallback(
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
      navigation.navigate('StoryViewer', {
        ...queue[startIndex],
        authorQueue: queue,
        queueIndex: startIndex,
      });
    },
    [navigation, storyAuthors],
  );

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
            <View style={styles.threadTopRow}>
              <Text
                style={[
                  styles.threadName,
                  item.isUnread
                    ? { fontFamily: t.fontFamily.bold }
                    : { fontFamily: t.fontFamily.semibold },
                ]}
                numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.threadTimeRow}>
                {timeStr ? (
                  <Text
                    style={[
                      styles.threadTime,
                      { fontFamily: t.fontFamily.regular },
                      item.isUnread && { color: BLUE },
                    ]}>
                    {timeStr}
                  </Text>
                ) : null}
                {item.isUnread ? <View style={styles.unreadDot} /> : null}
              </View>
            </View>
            {item.lastMessage ? (
              <Text
                style={[
                  styles.threadMsg,
                  item.isUnread
                    ? { fontFamily: t.fontFamily.medium, color: TITLE }
                    : { fontFamily: t.fontFamily.regular },
                ]}
                numberOfLines={1}>
                {item.lastMessage.text}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [navigation, t.fontFamily],
  );

  const convKey = useCallback((item: ConversationDto) => item.id, []);

  return (
    <View style={styles.root}>
{/* Header */}
      {searchOpen ? (
        <View style={styles.header}>
          <Pressable onPress={onCloseSearch} hitSlop={12} style={styles.headerBtn}>
            <BackArrowIcon />
          </Pressable>
          <View style={styles.searchInputWrap}>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { fontFamily: t.fontFamily.regular }]}
              placeholder="Search connections..."
              placeholderTextColor="#BBBBC4"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchText.length > 0 ? (
              <Pressable
                onPress={() => setSearchText('')}
                hitSlop={8}
                style={styles.clearBtn}
              >
                <CloseIcon size={16} color={MUTED} />
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={styles.headerBtn}>
            <BackArrowIcon />
          </Pressable>
          <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>
            Messages
          </Text>
          <Pressable onPress={onOpenSearch} hitSlop={12} style={styles.headerBtn}>
            <SearchIcon />
          </Pressable>
        </View>
      )}

      {/* Search results */}
      {searchOpen ? (
        <View style={styles.searchResults}>
          {searchLoading ? (
            <ActivityIndicator
              size="small"
              color={BLUE}
              style={{ marginTop: 32 }}
            />
          ) : debouncedQuery.length > 0 &&
            (searchResults?.items ?? []).length === 0 ? (
            <Text style={[styles.empty, { fontFamily: t.fontFamily.medium }]}>
              No connections found
            </Text>
          ) : (
            <FlatList
              data={searchResults?.items ?? []}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.threadRow}
                  onPress={() => onPressSearchResult(item)}
                >
                  <UserAvatar uri={item.avatarUrl} style={styles.avatar} />
                  <View style={styles.threadText}>
                    <Text
                      style={[
                        styles.threadName,
                        { fontFamily: t.fontFamily.semibold },
                      ]}
                      numberOfLines={1}
                    >
                      {userDisplayName(item)}
                    </Text>
                    <Text
                      style={[
                        styles.searchUsername,
                        { fontFamily: t.fontFamily.regular },
                      ]}
                      numberOfLines={1}
                    >
                      @{item.username}
                    </Text>
                  </View>
                </Pressable>
              )}
              contentContainerStyle={{
                paddingBottom: Math.max(20, insets.bottom + 12),
              }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          )}
        </View>
      ) : (
        <>
      {/* Stories row */}
      {hasOwnActiveStories || storyAuthors.length > 0 ? (
        <View style={styles.storiesSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.storiesContent}
          >
            {hasOwnActiveStories && ownStories?.items ? (
              <Pressable
                key="own-story"
                style={styles.storyItem}
                onPress={() =>
                  navigation.navigate('StoryViewer', {
                    stories: ownStories.items,
                    authorUsername:
                      currentUser?.fullName ?? 'You',
                    authorDisplayName:
                      currentUser?.fullName ?? null,
                    authorAvatarUri: currentUser?.avatarUrl,
                  })
                }
              >
                <UserAvatar
                  uri={currentUser?.avatarUrl}
                  style={styles.storyAvatar}
                  showStoryRing
                  storyRingColor={BLUE}
                />
                <Text
                  style={[styles.storyName, { fontFamily: t.fontFamily.medium }]}
                  numberOfLines={1}
                >
                  {currentUser?.username ?? 'You'}
                </Text>
              </Pressable>
            ) : null}
            {storyAuthors.map(author => (
              <Pressable
                key={author.userId}
                style={styles.storyItem}
                onPress={() => onPressStoryAuthor(author)}
              >
                <UserAvatar
                  uri={author.avatarUrl}
                  style={styles.storyAvatar}
                  showStoryRing
                  storyRingColor={author.hasUnseen ? BLUE : STORY_RING_SEEN}
                />
                <Text
                  style={[styles.storyName, { fontFamily: t.fontFamily.medium }]}
                  numberOfLines={1}
                >
                  {author.username}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : storiesLoading ? (
        <View style={styles.storiesSection}>
          <ActivityIndicator size="small" color={BLUE} style={{ marginVertical: 12 }} />
        </View>
      ) : null}

      {/* Divider */}
      {hasOwnActiveStories || storyAuthors.length > 0 ? (
        <View style={styles.divider} />
      ) : null}

      {/* Hidden chats entry — only when the user has hidden conversations. */}
      {hiddenCount > 0 ? (
        <Pressable
          style={styles.hiddenRow}
          onPress={() => navigation.navigate('HiddenChats')}
          accessibilityRole="button"
          accessibilityLabel={`Hidden chats, ${hiddenCount}`}>
          <Text
            style={[styles.hiddenRowText, { fontFamily: t.fontFamily.semibold }]}>
            Hidden ({hiddenCount})
          </Text>
        </Pressable>
      ) : null}

      {/* Conversations list */}
      {convsLoading ? (
        <ActivityIndicator
          size="small"
          color={BLUE}
          style={{ marginTop: 32 }}
        />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={convKey}
          renderItem={renderConversation}
          contentContainerStyle={{
            paddingBottom: Math.max(20, insets.bottom + 12),
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
            <Text style={[styles.empty, { fontFamily: t.fontFamily.medium }]}>
              No conversations yet
            </Text>
          }
        />
      )}
        </>
      )}

      <ConversationActionsSheet
        visible={actionConv !== null}
        subject={
          actionConv ? userDisplayName(actionConv.otherUser) : undefined
        }
        onClose={() => setActionConv(null)}
        onHide={onHideChat}
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
  root: { flex: 1, backgroundColor: BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 52,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: TITLE,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F3F5',
    borderRadius: 20,
    marginLeft: 8,
    paddingHorizontal: 14,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: TITLE,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 4,
  },
  searchResults: {
    flex: 1,
  },
  searchUsername: {
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  storiesSection: {
    paddingTop: 4,
  },
  storiesContent: {
    paddingHorizontal: 16,
    gap: 16,
  },
  storyItem: {
    alignItems: 'center',
    width: 64,
  },
  storyAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8E8E8',
  },
  storyName: {
    fontSize: 11,
    color: TITLE,
    marginTop: 4,
    textAlign: 'center',
    width: 64,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginTop: 8,
  },
  threadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E8E8E8',
  },
  threadText: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  threadTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  threadName: {
    fontSize: 16,
    color: TITLE,
    flex: 1,
    marginRight: 8,
  },
  threadTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  threadTime: {
    fontSize: 12,
    color: MUTED,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLUE,
  },
  threadMsg: {
    fontSize: 14,
    color: MUTED,
    flex: 1,
    marginRight: 8,
  },
  empty: {
    textAlign: 'center',
    marginTop: 60,
    color: MUTED,
    fontSize: 15,
  },
  hiddenRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  hiddenRowText: {
    fontSize: 15,
    color: BLUE,
  },
});
