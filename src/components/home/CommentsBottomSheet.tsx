import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '../common/UserAvatar';
import {
  navigateToMyProfile,
  navigateToUserProfile,
} from '../../navigation/rootNavigationRef';
import type { FeedPostData } from './FeedPost';
import { useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/selectors';
import {
  commentDtoToSheetRow,
  useCreatePostCommentMutation,
  useGetPostCommentsQuery,
  useLazyGetPostCommentsQuery,
} from '../../store/api/commentsApi';
import type { CommentDto } from '../../types/commentsApi';
import { formatCount } from '../../utils/formatCount';
import { formatRelativeTime } from '../../utils/formatRelativeTime';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError } from '../../utils/toast';
import { useTheme } from '../../theme';

const SHEET_BG = '#121212';
const HANDLE = '#3A3A3A';
const TITLE = '#FFFFFF';
const DIVIDER = 'rgba(255,255,255,0.08)';
const INPUT_BG = '#2A2A2C';
const PLACEHOLDER = '#8E8E93';
const COMMENT_TEXT = '#D6D6D6';
const SEND_BLUE = '#246BFD';

type SheetRow = ReturnType<typeof commentDtoToSheetRow>;

type Props = {
  visible: boolean;
  post: FeedPostData | null;
  onRequestClose: () => void;
  /** Fired after a new comment is successfully posted — used by the
   * feed to optimistically bump the comments count badge. */
  onCommentCreated?: (postId: string) => void;
};

function dedupeCommentsById(chunks: CommentDto[][]): CommentDto[] {
  const seen = new Set<string>();
  const out: CommentDto[] = [];
  for (const chunk of chunks) {
    for (const c of chunk) {
      if (seen.has(c.id)) {
        continue;
      }
      seen.add(c.id);
      out.push(c);
    }
  }
  return out;
}

function SendPlaneIcon({ size = 20, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CommentsBottomSheet({
  visible,
  post,
  onRequestClose,
  onCommentCreated,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height: screenH } = useWindowDimensions();
  const currentUser = useAppSelector(selectCurrentUser);
  const currentUserId = currentUser?.id;
  const [draft, setDraft] = useState('');
  const [extraDtos, setExtraDtos] = useState<CommentDto[]>([]);
  const [nextPage, setNextPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tailFromCreate, setTailFromCreate] = useState<CommentDto[]>([]);
  const [relativeTimeTick, setRelativeTimeTick] = useState(0);
  const [kbHeight, setKbHeight] = useState(0);
  const prevVisible = useRef(false);

  const postId = post?.id;
  const skipQuery = !visible || !postId;

  const {
    data: firstPage,
    isLoading: isLoadingFirst,
    isFetching: isFetchingFirst,
    isError,
    refetch,
  } = useGetPostCommentsQuery(
    { postId: postId ?? '', page: 0, limit: 20 },
    { skip: skipQuery || !postId },
  );

  const [fetchMore] = useLazyGetPostCommentsQuery();
  const [createComment, { isLoading: isSending }] =
    useCreatePostCommentMutation();

  // Track the keyboard so we can cap the sheet within the safe area instead
  // of letting KeyboardAvoidingView shove the fixed-height sheet up under
  // the notch. iOS reports `keyboardWillShow` (smoother); Android `Did`.
  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => {
      setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKbHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Visible height of the modal area, measured via onLayout. On Android
  // (windowSoftInputMode=adjustResize) this SHRINKS when the keyboard opens,
  // so the bottom-anchored sheet already clears the keyboard — no manual
  // offset. iOS does NOT resize, so there we lift the sheet by the keyboard
  // height ourselves.
  const [wrapH, setWrapH] = useState(0);
  const isAndroid = Platform.OS === 'android';
  const topSafe = insets.top + 8;
  const measuredH = wrapH > 0 ? wrapH : screenH;
  // Space available above the keyboard inside the modal.
  const usableH = isAndroid ? measuredH : measuredH - kbHeight;
  // Target ~78% of the full screen, clamped to what's actually visible so
  // the top never slides under the notch.
  const sheetH = Math.max(
    160,
    Math.min(Math.round(screenH * 0.78), usableH - topSafe),
  );
  // iOS needs to ride above the keyboard; Android's window already did it.
  const sheetMarginBottom = isAndroid ? 0 : kbHeight;

  useEffect(() => {
    if (!visible) {
      setDraft('');
      setTailFromCreate([]);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !prevVisible.current) {
      setExtraDtos([]);
      setNextPage(1);
    }
    prevVisible.current = visible;
  }, [visible]);

  useEffect(() => {
    setExtraDtos([]);
    setNextPage(1);
    setTailFromCreate([]);
  }, [postId]);

  useEffect(() => {
    if (firstPage) {
      setHasMore(firstPage.hasMore);
    }
  }, [firstPage]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }
    const id = setInterval(() => {
      setRelativeTimeTick(n => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, [visible]);

  const mergedDtos = useMemo(
    () =>
      dedupeCommentsById([
        firstPage?.comments ?? [],
        extraDtos,
        tailFromCreate,
      ]),
    [firstPage?.comments, extraDtos, tailFromCreate],
  );

  const listRows: SheetRow[] = useMemo(
    () => mergedDtos.map(commentDtoToSheetRow),
    [mergedDtos],
  );

  const loadMore = useCallback(async () => {
    if (!postId || !hasMore || loadingMore || isLoadingFirst) {
      return;
    }
    setLoadingMore(true);
    try {
      const res = await fetchMore({
        postId,
        page: nextPage,
        limit: 20,
      }).unwrap();
      setExtraDtos(prev => [...prev, ...res.comments]);
      setNextPage(p => p + 1);
      setHasMore(res.hasMore);
    } catch (e: unknown) {
      toastError('Could not load comments', getApiErrorMessage(e));
    } finally {
      setLoadingMore(false);
    }
  }, [postId, hasMore, loadingMore, isLoadingFirst, fetchMore, nextPage]);

  const onSend = useCallback(async () => {
    const text = draft.trim();
    if (!postId || text.length === 0 || isSending) {
      return;
    }
    try {
      const { comment } = await createComment({ postId, text }).unwrap();
      setDraft('');
      setExtraDtos([]);
      setNextPage(1);
      setTailFromCreate(prev => dedupeCommentsById([prev, [comment]]));
      onCommentCreated?.(postId);
    } catch (e: unknown) {
      toastError('Could not post comment', getApiErrorMessage(e));
    }
  }, [postId, draft, isSending, createComment, onCommentCreated]);

  const openUserProfile = useCallback(
    (userId: string) => {
      if (!userId) {
        return;
      }
      onRequestClose();
      if (currentUserId && userId === currentUserId) {
        navigateToMyProfile();
      } else {
        navigateToUserProfile(userId);
      }
    },
    [currentUserId, onRequestClose],
  );

  const renderComment = useCallback(
    ({ item }: { item: SheetRow }) => {
      const posted = formatRelativeTime(item.createdAt);
      return (
        <View style={styles.commentRow}>
          <Pressable
            onPress={() => openUserProfile(item.userId)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${item.userName}'s profile`}
            hitSlop={6}
          >
            <UserAvatar uri={item.avatarUri} style={styles.commentAvatar} />
          </Pressable>
          <View style={styles.commentBody}>
            <View style={styles.commentMetaRow}>
              <Pressable
                onPress={() => openUserProfile(item.userId)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${item.userName}'s profile`}
                style={styles.commentUserPressable}
                hitSlop={6}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.commentUser,
                    { fontFamily: t.fontFamily.bold },
                  ]}
                >
                  {item.userName}
                </Text>
              </Pressable>
              {posted.length > 0 ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.commentPosted,
                    { fontFamily: t.fontFamily.regular },
                  ]}
                >
                  {posted}
                </Text>
              ) : null}
            </View>
            <Text
              style={[styles.commentText, { fontFamily: t.fontFamily.regular }]}
            >
              {item.body}
            </Text>
          </View>
        </View>
      );
    },
    [openUserProfile, t.fontFamily.bold, t.fontFamily.regular],
  );

  const keyExtractor = useCallback((item: SheetRow) => item.id, []);

  const totalForTitle = firstPage?.total ?? post?.comments ?? 0;
  const title =
    post != null ? `${formatCount(totalForTitle)} Comments` : 'Comments';

  const listEmpty =
    !isLoadingFirst && !isFetchingFirst && !isError && listRows.length === 0;

  const listHeader = useMemo(() => {
    if (isError) {
      return (
        <View style={styles.banner}>
          <Text
            style={[styles.bannerText, { fontFamily: t.fontFamily.regular }]}
          >
            Could not load comments.
          </Text>
          <Pressable
            onPress={() => refetch().catch(() => {})}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading comments"
          >
            <Text
              style={[styles.retryLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              Retry
            </Text>
          </Pressable>
        </View>
      );
    }
    return null;
  }, [isError, refetch, t.fontFamily]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onRequestClose}
      statusBarTranslucent
    >
      <View
        style={styles.modalWrap}
        onLayout={e => {
          const h = e.nativeEvent.layout.height;
          if (h > 0 && Math.abs(h - wrapH) > 1) {
            setWrapH(h);
          }
        }}
      >
        <Pressable
          style={styles.backdrop}
          onPress={onRequestClose}
          accessibilityLabel="Close comments"
        />
        <View style={styles.kav}>
          <View
            style={[
              styles.sheet,
              { height: sheetH, marginBottom: sheetMarginBottom },
            ]}
          >
            <View style={styles.sheetTop}>
              <View style={styles.handle} />
              <Text
                style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}
              >
                {title}
              </Text>
              <View style={styles.divider} />
            </View>
            {isLoadingFirst && listRows.length === 0 ? (
              <View style={styles.centerFill}>
                <ActivityIndicator color={SEND_BLUE} size="large" />
              </View>
            ) : (
              <FlatList
                data={listRows}
                extraData={relativeTimeTick}
                keyExtractor={keyExtractor}
                renderItem={renderComment}
                style={styles.list}
                contentContainerStyle={[
                  styles.listContent,
                  listRows.length === 0 ? styles.listContentEmpty : null,
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                ListHeaderComponent={listHeader}
                ListEmptyComponent={
                  listEmpty ? (
                    <Text
                      style={[
                        styles.emptyText,
                        { fontFamily: t.fontFamily.regular },
                      ]}
                    >
                      No comments yet. Be the first to comment.
                    </Text>
                  ) : null
                }
                ListFooterComponent={
                  loadingMore ? (
                    <View style={styles.footerLoad}>
                      <ActivityIndicator color={SEND_BLUE} />
                    </View>
                  ) : null
                }
                onEndReached={() => {
                  loadMore().catch(() => {});
                }}
                onEndReachedThreshold={0.35}
              />
            )}
            <View
              style={[
                styles.inputRow,
                {
                  paddingBottom:
                    kbHeight > 0 ? 12 : Math.max(12, insets.bottom),
                },
              ]}
            >
              <TextInput
                style={[styles.input, { fontFamily: t.fontFamily.regular }]}
                placeholder="Add comment..."
                placeholderTextColor={PLACEHOLDER}
                keyboardAppearance="dark"
                value={draft}
                onChangeText={setDraft}
                editable={!isSending && !!postId}
                maxLength={2000}
                multiline={false}
              />
              <Pressable
                style={[
                  styles.sendBtn,
                  (!draft.trim() || isSending || !postId) &&
                    styles.sendBtnDisabled,
                ]}
                onPress={() => onSend().catch(() => {})}
                disabled={!draft.trim() || isSending || !postId}
                accessibilityLabel="Send comment"
                accessibilityRole="button"
              >
                {isSending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <SendPlaneIcon size={18} color="#FFFFFF" />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  kav: {
    width: '100%',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  sheetTop: {
    flexShrink: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: HANDLE,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 16,
    color: TITLE,
    textAlign: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 16,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  listContentEmpty: {
    justifyContent: 'center',
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentBody: {
    flex: 1,
  },
  commentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
    minWidth: 0,
  },
  commentUserPressable: {
    flex: 1,
    minWidth: 0,
  },
  commentUser: {
    fontSize: 14,
    color: TITLE,
  },
  commentPosted: {
    fontSize: 12,
    color: PLACEHOLDER,
    flexShrink: 0,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: COMMENT_TEXT,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: DIVIDER,
    gap: 10,
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: INPUT_BG,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 12, default: 10 }),
    fontSize: 15,
    color: TITLE,
    maxHeight: 44,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SEND_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
  banner: {
    paddingBottom: 12,
    alignItems: 'center',
    gap: 8,
  },
  bannerText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: INPUT_BG,
  },
  retryLabel: {
    fontSize: 14,
    color: SEND_BLUE,
  },
  emptyText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    paddingVertical: 24,
  },
  footerLoad: {
    paddingVertical: 12,
    alignItems: 'center',
  },
});
