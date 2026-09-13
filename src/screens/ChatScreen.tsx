import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { UserAvatar } from '../components/common/UserAvatar';
import type { RootStackParamList } from '../navigation/types';
import { selectAccessToken, selectCurrentUser } from '../store/selectors';
import { useAppSelector } from '../store/hooks';
import {
  useDeleteMessageMutation,
  useGetMessagesQuery,
  useGetOrCreateConversationMutation,
  useMarkAsReadMutation,
} from '../store/api/chatApi';
import { useGetUserPublicProfileQuery } from '../store/api/usersApi';
import {
  useGetUserStoriesQuery,
  useLazyGetUserStoriesQuery,
} from '../store/api/storiesApi';
import type {
  MessageDto,
  MessageMediaDto,
  MessageMediaInput,
  MessagePostRefDto,
  MessageReplyKind,
  MessageReplyRefDto,
  MessageStoryRefDto,
} from '../types/chatApi';
import {
  emitMarkRead,
  emitStopTyping,
  emitTyping,
  joinConversation,
  leaveConversation,
  onMessageDeleted,
  onMessagesRead,
  onNewMessage,
  onUserStopTyping,
  onUserTyping,
  sendMediaMessageSocket,
  sendMessageSocket,
} from '../services/chatSocket';
import { useUploadSingleMediaMutation } from '../store/api/uploadsApi';
import { useLazyGetTrendingPostsQuery } from '../store/api/feedApi';
import {
  assetToMediaPayload,
  isVideoMime,
  pickMediaFromCamera,
  pickMediaFromLibrary,
} from '../utils/pickMedia';
import { toastError } from '../utils/toast';
import { getApiErrorMessage } from '../utils/apiError';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const BG = '#FFFFFF';
const TITLE = '#0D0D0D';
const MUTED = '#8A8A8A';
const BLUE = '#246BFD';
const SENT_BG = '#246BFD';
const SENT_TEXT = '#FFFFFF';
const RECEIVED_BG = '#F2F3F5';
const RECEIVED_TEXT = '#0D0D0D';

const MAX_MEDIA_BYTES = 10 * 1024 * 1024; // 10 MB

function BackArrowIcon({
  size = 22,
  color = TITLE,
}: {
  size?: number;
  color?: string;
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

function SendIcon({
  size = 22,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
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

function PlusIcon({
  size = 22,
  color = MUTED,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PlayIcon({
  size = 28,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7z" />
    </Svg>
  );
}

function CloseIcon({
  size = 24,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6l12 12M18 6L6 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function TypingDots() {
  const a1 = useRef(new Animated.Value(0)).current;
  const a2 = useRef(new Animated.Value(0)).current;
  const a3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const mk = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(v, {
            toValue: 1,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 300,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
    const loops = [mk(a1, 0), mk(a2, 150), mk(a3, 300)];
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [a1, a2, a3]);

  const dot = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
    transform: [
      {
        translateY: v.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -3],
        }),
      },
    ],
  });

  return (
    <View style={styles.typingDotsRow}>
      <Animated.View style={[styles.typingDot, dot(a1)]} />
      <Animated.View style={[styles.typingDot, dot(a2)]} />
      <Animated.View style={[styles.typingDot, dot(a3)]} />
    </View>
  );
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function replyKindFallback(kind: MessageReplyKind): string {
  switch (kind) {
    case 'image':
      return 'Photo';
    case 'video':
      return 'Video';
    case 'post':
      return 'Shared a post';
    case 'story':
      return 'Story reply';
    default:
      return 'Message';
  }
}

function replyPreviewFromRef(ref: MessageReplyRefDto): string {
  if (ref.text && ref.text.length > 0) return ref.text;
  return replyKindFallback(ref.kind);
}

function replyPreviewFromMessage(msg: MessageDto): string {
  if (msg.text && msg.text.length > 0) return msg.text;
  if (msg.media) return msg.media.kind === 'video' ? 'Video' : 'Photo';
  if (msg.postRef) return 'Shared a post';
  if (msg.profileRef) return 'Shared a profile';
  if (msg.storyRef) return 'Story reply';
  return 'Message';
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateHeader(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  if (isSameLocalDay(d, now)) {
    return 'Today';
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameLocalDay(d, yesterday)) {
    return 'Yesterday';
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }
  return d.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Wraps a chat-bubble row with a horizontal swipe gesture. Swiping inward
 * (right-to-left for sent, left-to-right for received) past the threshold
 * triggers `onReply`. The bubble springs back when released.
 */
function SwipeableBubble({
  isMine,
  onReply,
  children,
}: {
  isMine: boolean;
  onReply: () => void;
  children: React.ReactNode;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const triggeredRef = useRef(false);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Capture only when the gesture is clearly horizontal so vertical
        // scrolls in the FlatList are unaffected. We answer in BOTH the bubble
        // and capture phases so the bubble wins the responder race against the
        // list's scroll view (which otherwise sometimes claims the swipe).
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        onMoveShouldSetPanResponderCapture: (_, g) =>
          Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
        // Once the swipe is ours, never hand it back mid-gesture — the FlatList
        // requesting the responder is what caused the swipe to "lose
        // interaction" and never fire the reply.
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => {
          triggeredRef.current = false;
        },
        onPanResponderMove: (_, g) => {
          // Allowed swipe direction depends on which side the bubble sits.
          const raw = isMine ? Math.min(0, g.dx) : Math.max(0, g.dx);
          const capped = Math.max(-80, Math.min(80, raw));
          translateX.setValue(capped);
        },
        onPanResponderRelease: (_, g) => {
          const past = Math.abs(g.dx) > 60;
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 0,
          }).start();
          if (past && !triggeredRef.current) {
            triggeredRef.current = true;
            onReply();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [isMine, onReply, translateX],
  );

  return (
    <Animated.View
      style={{ transform: [{ translateX }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export function ChatScreen({ navigation, route }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { userId: otherUserId, username, fullName, avatarUrl } = route.params;
  const token = useAppSelector(selectAccessToken);
  const currentUser = useAppSelector(selectCurrentUser);
  const myId = currentUser?.id ?? '';

  // Warm the other user's public profile cache for the profile screen.
  useGetUserPublicProfileQuery(otherUserId, {
    skip: !token || !otherUserId,
  });

  // Active stories for both participants — used to detect deleted/expired
  // story replies so we can hide their preview cards.
  const { data: myActiveStories } = useGetUserStoriesQuery(myId, {
    skip: !token || !myId,
    refetchOnMountOrArgChange: true,
  });
  const { data: otherActiveStories } = useGetUserStoriesQuery(otherUserId, {
    skip: !token || !otherUserId,
    refetchOnMountOrArgChange: true,
  });

  const storiesByAuthor = useMemo(() => {
    const map = new Map<string, { loaded: boolean; ids: Set<string> }>();
    if (myId) {
      map.set(myId, {
        loaded: myActiveStories !== undefined,
        ids: new Set(myActiveStories?.items?.map(s => s.id) ?? []),
      });
    }
    if (otherUserId) {
      map.set(otherUserId, {
        loaded: otherActiveStories !== undefined,
        ids: new Set(otherActiveStories?.items?.map(s => s.id) ?? []),
      });
    }
    return map;
  }, [myId, otherUserId, myActiveStories, otherActiveStories]);

  const isStoryRefAlive = useCallback(
    (ref: MessageStoryRefDto): boolean => {
      const entry = storiesByAuthor.get(ref.authorId);
      // Unknown author or not yet loaded — treat as alive (don't hide preemptively).
      if (!entry || !entry.loaded) {
        return true;
      }
      return entry.ids.has(ref.storyId);
    },
    [storiesByAuthor],
  );

  const [convId, setConvId] = useState<string | null>(
    route.params.conversationId ?? null,
  );
  const [localMessages, setLocalMessages] = useState<MessageDto[]>([]);
  const [inputText, setInputText] = useState('');
  const [otherTyping, setOtherTyping] = useState(false);
  const flatListRef = useRef<FlatList<MessageDto>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const otherTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const didInitialScrollRef = useRef(false);

  const [attachSheetOpen, setAttachSheetOpen] = useState(false);
  const [viewingMedia, setViewingMedia] = useState<MessageMediaDto | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [otherLastReadAt, setOtherLastReadAt] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<MessageDto | null>(null);

  const [getOrCreate] = useGetOrCreateConversationMutation();
  const [markAsRead] = useMarkAsReadMutation();
  const [deleteMessage] = useDeleteMessageMutation();
  const [uploadSingleMedia] = useUploadSingleMediaMutation();

  // Resolve conversation ID
  useEffect(() => {
    if (convId || !token) return;
    getOrCreate(otherUserId)
      .unwrap()
      .then(res => setConvId(res.conversationId))
      .catch(() => {});
  }, [convId, token, otherUserId, getOrCreate]);

  // Mark conversation as read when opened (REST = unread badge, socket = realtime "Seen")
  useEffect(() => {
    if (convId) {
      markAsRead(convId).catch(() => {});
      emitMarkRead(convId);
    }
  }, [convId, markAsRead]);

  // Fetch existing messages (force refetch on mount so shared posts sent
  // while this screen was unmounted are picked up).
  const { data: messagesData, isLoading: msgsLoading } = useGetMessagesQuery(
    { conversationId: convId!, page: 0, limit: 50 },
    { skip: !convId || !token, refetchOnMountOrArgChange: true },
  );

  // Seed local messages from API
  useEffect(() => {
    if (messagesData?.items) {
      setLocalMessages(messagesData.items);
    }
    if (messagesData?.otherUserLastReadAt !== undefined) {
      setOtherLastReadAt(messagesData.otherUserLastReadAt ?? null);
    }
  }, [messagesData]);

  // On initial load of messages, force scroll to bottom (newest message).
  // Multiple passes handle async image/layout settling in shared-post cards.
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (msgsLoading) return;
    if (localMessages.length === 0) return;

    didInitialScrollRef.current = true;
    const delays = [0, 100, 300, 600];
    const timers = delays.map(d =>
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, d),
    );
    return () => {
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgsLoading, localMessages.length]);

  // Reset initial-scroll flag when switching conversations
  useEffect(() => {
    didInitialScrollRef.current = false;
  }, [convId]);

  // Join socket room + listen for new messages / typing
  useEffect(() => {
    if (!convId) return;
    joinConversation(convId);

    const cleanupMsg = onNewMessage(msg => {
      if (msg.conversationId === convId) {
        setLocalMessages(prev => {
          // Deduplicate
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Hide "typing…" immediately when a new message arrives from them
        if (msg.senderId !== myId) {
          setOtherTyping(false);
          if (otherTypingTimeoutRef.current) {
            clearTimeout(otherTypingTimeoutRef.current);
            otherTypingTimeoutRef.current = null;
          }
        }
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    const cleanupTyping = onUserTyping(data => {
      if (data.conversationId !== convId || data.userId === myId) return;
      setOtherTyping(true);
      // Auto-clear if we don't get a stop_typing within 4s
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
      }
      otherTypingTimeoutRef.current = setTimeout(() => {
        setOtherTyping(false);
      }, 4000);
    });

    const cleanupStopTyping = onUserStopTyping(data => {
      if (data.conversationId !== convId || data.userId === myId) return;
      setOtherTyping(false);
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
        otherTypingTimeoutRef.current = null;
      }
    });

    // Read receipts — other user opened / re-opened the conversation
    const cleanupMessagesRead = onMessagesRead(data => {
      if (data.conversationId !== convId || data.userId === myId) return;
      setOtherLastReadAt(prev => {
        if (!prev) return data.at;
        return new Date(data.at) > new Date(prev) ? data.at : prev;
      });
    });

    // A message was deleted (by us on another device, or by the sender) —
    // drop it from the open thread in realtime.
    const cleanupMessageDeleted = onMessageDeleted(data => {
      if (data.conversationId !== convId) return;
      setLocalMessages(prev => prev.filter(m => m.id !== data.messageId));
    });

    return () => {
      // Tell others we stopped typing when leaving the screen
      if (isTypingRef.current) {
        emitStopTyping(convId);
        isTypingRef.current = false;
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
        otherTypingTimeoutRef.current = null;
      }
      leaveConversation(convId);
      cleanupMsg();
      cleanupTyping();
      cleanupStopTyping();
      cleanupMessagesRead();
      cleanupMessageDeleted();
    };
  }, [convId, myId]);

  const handleInputChange = useCallback(
    (text: string) => {
      setInputText(text);
      if (!convId) return;

      if (text.length === 0) {
        if (isTypingRef.current) {
          emitStopTyping(convId);
          isTypingRef.current = false;
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
        return;
      }

      if (!isTypingRef.current) {
        emitTyping(convId);
        isTypingRef.current = true;
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          emitStopTyping(convId);
          isTypingRef.current = false;
        }
        typingTimeoutRef.current = null;
      }, 2500);
    },
    [convId],
  );

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed || !convId) return;
    setInputText('');
    // Stop typing immediately on send
    if (isTypingRef.current) {
      emitStopTyping(convId);
      isTypingRef.current = false;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    sendMessageSocket(convId, trimmed, replyingTo?.id ?? null);
    setReplyingTo(null);
  }, [inputText, convId, replyingTo]);

  // ── Media attachment flow ─────────────────────────────────────────────
  const uploadAndSendMedia = useCallback(
    async (asset: ReturnType<typeof assetToMediaPayload>) => {
      if (!asset || !convId) return;

      const kind: 'image' | 'video' = isVideoMime(asset.type)
        ? 'video'
        : 'image';

      setUploading(true);
      try {
        const res = await uploadSingleMedia({
          uri: asset.uri,
          name: asset.name,
          type: asset.type,
        }).unwrap();

        const fileUrl = res?.file?.url;
        if (!fileUrl) {
          throw new Error('Upload did not return a URL');
        }

        const media: MessageMediaInput = {
          url: fileUrl,
          kind,
          sizeBytes: res.file.size ?? 0,
        };
        sendMediaMessageSocket(convId, media, '', replyingTo?.id ?? null);
        setReplyingTo(null);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Upload failed';
        Alert.alert('Upload failed', msg);
      } finally {
        setUploading(false);
      }
    },
    [convId, uploadSingleMedia, replyingTo],
  );

  const pickFromLibrary = useCallback(async () => {
    setAttachSheetOpen(false);
    try {
      const asset = await pickMediaFromLibrary();
      if (!asset) return;

      if (asset.fileSize && asset.fileSize > MAX_MEDIA_BYTES) {
        Alert.alert('File too large', 'Please select a file under 10 MB.');
        return;
      }
      const payload = assetToMediaPayload(asset);
      if (!payload) {
        Alert.alert('Unsupported file', 'Could not read the selected file.');
        return;
      }
      await uploadAndSendMedia(payload);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not pick media';
      Alert.alert('Error', msg);
    }
  }, [uploadAndSendMedia]);

  const pickFromCamera = useCallback(
    async (mode: 'photo' | 'video') => {
      setAttachSheetOpen(false);
      try {
        const asset = await pickMediaFromCamera(mode);
        if (!asset) return;

        if (asset.fileSize && asset.fileSize > MAX_MEDIA_BYTES) {
          Alert.alert('File too large', 'Please capture a file under 10 MB.');
          return;
        }
        const payload = assetToMediaPayload(asset);
        if (!payload) {
          Alert.alert('Unsupported file', 'Could not read the captured file.');
          return;
        }
        await uploadAndSendMedia(payload);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not capture media';
        Alert.alert('Error', msg);
      }
    },
    [uploadAndSendMedia],
  );

  const [fetchTrending] = useLazyGetTrendingPostsQuery();

  const openPostPreview = useCallback(
    async (ref: MessagePostRefDto) => {
      const uri = ref.mediaUrl || ref.thumbnailUrl;
      if (!uri) return;
      // Start at the shared post, then continue into TRENDING posts
      // (Instagram-style "keep scrolling"). The shared post is seeded first so
      // it shows instantly; trending fills the rest.
      type ViewerPost =
        RootStackParamList['TrendingPostsViewer']['posts'][number];
      const seed: ViewerPost = {
        id: ref.postId,
        uri,
        likes: 0,
        isVideo: ref.mediaKind === 'video',
        caption: ref.caption ?? '',
        hashtags: '',
        musicTitle: '',
        music: null,
        originalSound: null,
        videoDurationSec: null,
        comments: 0,
        likedByViewer: false,
        savedByViewer: false,
        authorId: ref.authorId,
        authorUsername: ref.authorName || 'user',
        authorAvatarUri: ref.authorAvatarUrl,
        authorDisplayName: ref.authorName,
      };
      let rest: ViewerPost[] = [];
      try {
        const res = await fetchTrending(undefined).unwrap();
        rest = (res.items ?? [])
          .filter(p => p.id !== ref.postId)
          .map(p => ({
            id: p.id,
            uri: p.media.url?.trim() || '',
            likes: p.likesCount,
            isVideo: p.mediaKind === 'short_video',
            caption: p.caption ?? '',
            hashtags: p.hashtags ?? '',
            musicTitle: p.musicTitle ?? '',
            music: p.music ?? null,
            originalSound: p.originalSound ?? null,
            videoDurationSec: p.durationSeconds ?? null,
            comments: p.commentsCount,
            likedByViewer: p.likedByViewer,
            savedByViewer: p.savedByViewer,
            createdAt: p.createdAt,
            authorId: p.authorId,
            authorUsername: p.authorUsername,
            authorAvatarUri: p.authorAvatarUrl,
            authorDisplayName: p.authorFullName,
          }));
      } catch {
        // Trending unavailable — still open the shared post on its own.
      }
      navigation.navigate('TrendingPostsViewer', {
        initialPostId: ref.postId,
        posts: [seed, ...rest],
      });
    },
    [fetchTrending, navigation],
  );

  const [fetchUserStories] = useLazyGetUserStoriesQuery();

  const openStoryPreview = useCallback(
    async (ref: MessageStoryRefDto) => {
      try {
        const res = await fetchUserStories(ref.authorId).unwrap();
        const items = res.items ?? [];
        const idx = items.findIndex((s) => s.id === ref.storyId);
        if (idx < 0) {
          toastError(
            'Story unavailable',
            'This story is no longer available.',
          );
          return;
        }
        navigation.navigate('StoryViewer', {
          stories: items,
          authorUsername: ref.authorUsername || items[idx].authorUsername,
          authorAvatarUri: null,
          initialIndex: idx,
        });
      } catch {
        toastError(
          'Could not open story',
          'Please check your connection and try again.',
        );
      }
    },
    [fetchUserStories, navigation],
  );

  // Filter out messages whose sole content was a story reply for a story that
  // has been deleted/expired. Messages with text/media/postRef stay (the dead
  // storyRef preview is hidden in renderMessage but the rest is preserved).
  const displayMessages = useMemo(() => {
    return localMessages.filter(m => {
      if (!m.storyRef) return true;
      if (isStoryRefAlive(m.storyRef)) return true;
      const hasOtherContent =
        !!m.text || !!m.media || !!m.postRef || !!m.profileRef;
      return hasOtherContent;
    });
  }, [localMessages, isStoryRefAlive]);

  // Index of the last own message the other user has "seen" (createdAt <= their lastRead).
  const lastSeenIndex = useMemo(() => {
    if (!otherLastReadAt) return -1;
    const readTs = new Date(otherLastReadAt).getTime();
    if (Number.isNaN(readTs)) return -1;
    for (let i = displayMessages.length - 1; i >= 0; i--) {
      const m = displayMessages[i];
      if (m.senderId !== myId) continue;
      if (new Date(m.createdAt).getTime() <= readTs) return i;
    }
    return -1;
  }, [displayMessages, myId, otherLastReadAt]);

  // Long-press your own message to delete it (for everyone).
  const confirmDeleteMessage = useCallback(
    (message: MessageDto) => {
      if (message.senderId !== myId) return;
      Alert.alert(
        'Delete message',
        'This message will be deleted for everyone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              // Optimistically remove; restore if the request fails.
              setLocalMessages(prev => prev.filter(m => m.id !== message.id));
              deleteMessage({ messageId: message.id })
                .unwrap()
                .catch((e: unknown) => {
                  setLocalMessages(prev =>
                    prev.some(m => m.id === message.id)
                      ? prev
                      : [...prev, message].sort(
                          (a, b) =>
                            new Date(a.createdAt).getTime() -
                            new Date(b.createdAt).getTime(),
                        ),
                  );
                  toastError('Delete', getApiErrorMessage(e));
                });
            },
          },
        ],
      );
    },
    [myId, deleteMessage],
  );

  const renderMessage = useCallback(
    ({ item, index }: { item: MessageDto; index: number }) => {
      const isMine = item.senderId === myId;
      const prev = index > 0 ? displayMessages[index - 1] : null;
      const showDateHeader =
        !prev ||
        !isSameLocalDay(new Date(prev.createdAt), new Date(item.createdAt));
      const ref = item.postRef;
      const profileRef = item.profileRef;
      const storyRef = item.storyRef;
      const storyRefAlive = storyRef ? isStoryRefAlive(storyRef) : false;
      const media = item.media;
      const hasText = !!item.text && item.text.length > 0;
      const showSeen = isMine && index === lastSeenIndex;

      return (
        <View>
          {showDateHeader ? (
            <View style={styles.dateHeaderWrap}>
              <Text
                style={[
                  styles.dateHeaderText,
                  { fontFamily: t.fontFamily.medium },
                ]}
              >
                {formatDateHeader(item.createdAt)}
              </Text>
            </View>
          ) : null}
          <SwipeableBubble
            isMine={isMine}
            onReply={() => setReplyingTo(item)}
          >
          <View
            style={[
              styles.bubbleRow,
              isMine ? styles.bubbleRowRight : styles.bubbleRowLeft,
            ]}
          >
          <View
          style={[
            styles.bubbleWrap,
            isMine ? styles.bubbleWrapRight : styles.bubbleWrapLeft,
          ]}
        >
          <Text
            style={[
              styles.bubbleTime,
              { fontFamily: t.fontFamily.regular },
              isMine ? styles.bubbleTimeRight : styles.bubbleTimeLeft,
            ]}
          >
            {formatMsgTime(item.createdAt)}
          </Text>
          {item.replyTo ? (
            <View
              style={[
                styles.replyChip,
                isMine ? styles.replyChipRight : styles.replyChipLeft,
              ]}
            >
              <Text
                style={[
                  styles.replyChipName,
                  { fontFamily: t.fontFamily.semibold },
                ]}
                numberOfLines={1}
              >
                {item.replyTo.senderId === myId
                  ? 'You'
                  : fullName || username || 'User'}
              </Text>
              <Text
                style={[
                  styles.replyChipText,
                  { fontFamily: t.fontFamily.regular },
                ]}
                numberOfLines={1}
              >
                {replyPreviewFromRef(item.replyTo)}
              </Text>
            </View>
          ) : null}

          {media ? (
            <Pressable
              style={({ pressed }) => [
                styles.mediaCard,
                pressed ? styles.postCardPressed : null,
              ]}
              onPress={() => setViewingMedia(media)}
              onLongPress={() => confirmDeleteMessage(item)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel={
                media.kind === 'video' ? 'Open video' : 'Open image'
              }
            >
              <Image
                source={{
                  uri: media.thumbnailUrl || media.url,
                }}
                style={styles.mediaThumb}
                resizeMode="cover"
              />
              {media.kind === 'video' ? (
                <View style={styles.mediaPlayOverlay} pointerEvents="none">
                  <View style={styles.mediaPlayCircle}>
                    <PlayIcon size={24} />
                  </View>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {ref ? (
            <Pressable
              style={({ pressed }) => [
                styles.postCard,
                isMine ? styles.postCardSent : styles.postCardReceived,
                pressed ? styles.postCardPressed : null,
              ]}
              onPress={() => void openPostPreview(ref)}
              onLongPress={() => confirmDeleteMessage(item)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel="Open shared post"
            >
              {ref.thumbnailUrl ? (
                <Image
                  source={{ uri: ref.thumbnailUrl }}
                  style={styles.postThumb}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.postThumb, styles.postThumbFallback]} />
              )}
              {ref.mediaKind === 'video' ? (
                <View style={styles.videoBadge}>
                  <Text
                    style={[
                      styles.videoBadgeText,
                      { fontFamily: t.fontFamily.semibold },
                    ]}
                  >
                    ▶ Video
                  </Text>
                </View>
              ) : null}
              <View style={styles.postCardMeta}>
                <Text
                  style={[
                    styles.postCardAuthor,
                    { fontFamily: t.fontFamily.semibold },
                    isMine ? { color: SENT_TEXT } : { color: RECEIVED_TEXT },
                  ]}
                  numberOfLines={1}
                >
                  {ref.authorName || 'Shared post'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {profileRef ? (
            <Pressable
              style={({ pressed }) => [
                styles.profileCard,
                isMine ? styles.postCardSent : styles.postCardReceived,
                pressed ? styles.postCardPressed : null,
              ]}
              onPress={() =>
                navigation.navigate('UserProfile', {
                  userId: profileRef.userId,
                })
              }
              onLongPress={() => confirmDeleteMessage(item)}
              delayLongPress={350}
              accessibilityRole="button"
              accessibilityLabel={`Open ${
                profileRef.displayName || profileRef.username
              }'s profile`}
            >
              <UserAvatar
                uri={profileRef.avatarUrl}
                style={styles.profileCardAvatar}
              />
              <View style={styles.profileCardMeta}>
                <Text
                  style={[
                    styles.profileCardName,
                    { fontFamily: t.fontFamily.semibold },
                    isMine ? { color: SENT_TEXT } : { color: RECEIVED_TEXT },
                  ]}
                  numberOfLines={1}
                >
                  {profileRef.displayName || profileRef.username}
                </Text>
                {profileRef.username ? (
                  <Text
                    style={[
                      styles.profileCardHandle,
                      { fontFamily: t.fontFamily.regular },
                      isMine
                        ? { color: 'rgba(255,255,255,0.8)' }
                        : { color: MUTED },
                    ]}
                    numberOfLines={1}
                  >
                    @{profileRef.username}
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.profileCardCta,
                    { fontFamily: t.fontFamily.regular },
                    isMine
                      ? { color: 'rgba(255,255,255,0.65)' }
                      : { color: MUTED },
                  ]}
                  numberOfLines={1}
                >
                  View profile
                </Text>
              </View>
            </Pressable>
          ) : null}

          {storyRef ? (
            <View
              style={[
                styles.storyRefWrap,
                isMine ? styles.storyRefWrapRight : styles.storyRefWrapLeft,
              ]}
            >
              <Text
                style={[
                  styles.storyRefLabel,
                  { fontFamily: t.fontFamily.regular },
                ]}
                numberOfLines={1}
              >
                Replied to story
              </Text>
              {storyRefAlive ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.storyRefCard,
                    pressed ? styles.postCardPressed : null,
                  ]}
                  onPress={() => void openStoryPreview(storyRef)}
                  onLongPress={() => confirmDeleteMessage(item)}
                  delayLongPress={350}
                  accessibilityRole="button"
                  accessibilityLabel="Open story"
                >
                  {storyRef.thumbnailUrl ? (
                    <Image
                      source={{ uri: storyRef.thumbnailUrl }}
                      style={styles.storyRefThumb}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      style={[styles.storyRefThumb, styles.postThumbFallback]}
                    />
                  )}
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {hasText ? (
            <Pressable
              onLongPress={() => confirmDeleteMessage(item)}
              delayLongPress={350}
              style={[
                styles.bubble,
                isMine ? styles.bubbleSent : styles.bubbleReceived,
                ref || media || storyRef ? styles.bubbleAfterCard : null,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  { fontFamily: t.fontFamily.regular },
                  isMine ? { color: SENT_TEXT } : { color: RECEIVED_TEXT },
                ]}
              >
                {item.text}
              </Text>
            </Pressable>
          ) : null}

          {showSeen ? (
            <Text
              style={[styles.seenLabel, { fontFamily: t.fontFamily.regular }]}
            >
              Seen
            </Text>
          ) : null}
        </View>
        </View>
        </SwipeableBubble>
        </View>
      );
    },
    [
      displayMessages,
      isStoryRefAlive,
      myId,
      fullName,
      username,
      t.fontFamily,
      openPostPreview,
      openStoryPreview,
      confirmDeleteMessage,
      lastSeenIndex,
    ],
  );

  const messageKey = useCallback((item: MessageDto) => item.id, []);

  const loading = !convId || msgsLoading;

  return (
    <View style={styles.root}>
{/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.headerBtn}
        >
          <BackArrowIcon />
        </Pressable>
        <Pressable
          style={styles.headerUser}
          onPress={() =>
            navigation.navigate('UserProfile', { userId: otherUserId })
          }
          accessibilityRole="button"
          accessibilityLabel={`Open ${fullName}'s profile`}
        >
          <UserAvatar uri={avatarUrl ?? null} style={styles.headerAvatar} />
          <View style={styles.headerInfo}>
            <Text
              style={[styles.headerName, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={1}
            >
              {fullName}
            </Text>
            {username ? (
              <Text
                style={[
                  styles.headerHandle,
                  { fontFamily: t.fontFamily.regular },
                ]}
                numberOfLines={1}
              >
                @{username}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </View>
      <View style={styles.headerDivider} />

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={20}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={BLUE} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={displayMessages}
            keyExtractor={messageKey}
            renderItem={renderMessage}
            contentContainerStyle={[styles.msgList, { paddingBottom: 8 }]}
            showsVerticalScrollIndicator={false}
            // "handled" lets per-bubble swipe-to-reply (and other in-row
            // touchables) work while the keyboard is open: the default
            // "never" installs a capture-phase tap-to-dismiss that steals the
            // gesture before the bubble's PanResponder can claim it. Unhandled
            // taps on empty space still dismiss the keyboard.
            keyboardShouldPersistTaps="handled"
            initialNumToRender={50}
            onContentSizeChange={() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }}
            onLayout={() => {
              if (!didInitialScrollRef.current) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            ListEmptyComponent={
              <Text
                style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}
              >
                Say hello!
              </Text>
            }
          />
        )}

        {/* Typing indicator */}
        {otherTyping && !loading ? (
          <View style={styles.typingWrap}>
            <View style={styles.typingBubble}>
              <TypingDots />
            </View>
            <Text
              style={[styles.typingLabel, { fontFamily: t.fontFamily.regular }]}
              numberOfLines={1}
            >
              {fullName || username || 'User'} is typing…
            </Text>
          </View>
        ) : null}

        {/* Reply preview pill (above input bar) */}
        {replyingTo ? (
          <View style={styles.replyBar}>
            <View style={styles.replyBarBorder} />
            <View style={styles.replyBarContent}>
              <Text
                style={[
                  styles.replyBarLabel,
                  { fontFamily: t.fontFamily.semibold },
                ]}
                numberOfLines={1}
              >
                Replying to{' '}
                {replyingTo.senderId === myId
                  ? 'yourself'
                  : fullName || username || 'User'}
              </Text>
              <Text
                style={[
                  styles.replyBarText,
                  { fontFamily: t.fontFamily.regular },
                ]}
                numberOfLines={1}
              >
                {replyPreviewFromMessage(replyingTo)}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyingTo(null)}
              hitSlop={10}
              style={styles.replyBarClose}
              accessibilityRole="button"
              accessibilityLabel="Cancel reply"
            >
              <CloseIcon size={18} color={MUTED} />
            </Pressable>
          </View>
        ) : null}

        {/* Input bar */}
        <View
          style={[
            styles.inputBar,
            { paddingBottom: Math.max(12, insets.bottom) },
          ]}
        >
          <Pressable
            style={[styles.attachBtn, uploading && styles.sendBtnDisabled]}
            onPress={() => setAttachSheetOpen(true)}
            disabled={uploading || !convId}
            accessibilityRole="button"
            accessibilityLabel="Attach media"
          >
            {uploading ? (
              <ActivityIndicator size="small" color={BLUE} />
            ) : (
              <PlusIcon size={22} color={BLUE} />
            )}
          </Pressable>
          <View style={styles.inputWrap}>
            <TextInput
              style={[styles.input, { fontFamily: t.fontFamily.regular }]}
              placeholder="Type a message..."
              placeholderTextColor="#BBBBC4"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={5000}
              returnKeyType="default"
            />
          </View>
          <Pressable
            style={[
              styles.sendBtn,
              (!inputText.trim() || !convId) && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || !convId}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            <SendIcon size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Attach action sheet */}
      <Modal
        visible={attachSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAttachSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setAttachSheetOpen(false)}
        >
          <Pressable
            style={[
              styles.sheetContainer,
              { paddingBottom: Math.max(16, insets.bottom) },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.sheetGrabber} />
            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={pickFromLibrary}
            >
              <Text
                style={[
                  styles.sheetItemText,
                  { fontFamily: t.fontFamily.medium },
                ]}
              >
                Photo or Video
              </Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => pickFromCamera('photo')}
            >
              <Text
                style={[
                  styles.sheetItemText,
                  { fontFamily: t.fontFamily.medium },
                ]}
              >
                Take Photo
              </Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => pickFromCamera('video')}
            >
              <Text
                style={[
                  styles.sheetItemText,
                  { fontFamily: t.fontFamily.medium },
                ]}
              >
                Record Video
              </Text>
            </Pressable>
            <View style={[styles.sheetDivider, { marginVertical: 6 }]} />
            <Pressable
              style={({ pressed }) => [
                styles.sheetItem,
                pressed && styles.sheetItemPressed,
              ]}
              onPress={() => setAttachSheetOpen(false)}
            >
              <Text
                style={[
                  styles.sheetItemText,
                  styles.sheetCancelText,
                  { fontFamily: t.fontFamily.semibold },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full-screen media viewer */}
      <Modal
        visible={!!viewingMedia}
        transparent
        animationType="fade"
        onRequestClose={() => setViewingMedia(null)}
      >
        <View style={styles.viewerRoot}>
          <Pressable
            style={styles.viewerClose}
            onPress={() => setViewingMedia(null)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <CloseIcon size={26} />
          </Pressable>
          {viewingMedia?.kind === 'video' ? (
            <Video
              source={{ uri: viewingMedia.url }}
              style={styles.viewerVideo}
              controls
              resizeMode="contain"
              paused={false}
            />
          ) : viewingMedia ? (
            <Image
              source={{ uri: viewingMedia.url }}
              style={styles.viewerImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  flex1: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerUser: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E8E8E8',
  },
  headerInfo: {
    marginLeft: 10,
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontSize: 16,
    color: TITLE,
  },
  headerHandle: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ECECEC',
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 60,
    color: MUTED,
    fontSize: 15,
  },
  msgList: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  dateHeaderWrap: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F2F3F5',
    marginVertical: 10,
  },
  dateHeaderText: {
    fontSize: 12,
    color: MUTED,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    maxWidth: '92%',
  },
  bubbleRowLeft: {
    alignSelf: 'flex-start',
  },
  bubbleRowRight: {
    alignSelf: 'flex-end',
  },
  bubbleWrap: {
    maxWidth: '85%',
  },
  bubbleWrapLeft: {
    alignSelf: 'flex-start',
  },
  bubbleWrapRight: {
    alignSelf: 'flex-end',
  },
  bubbleTime: {
    fontSize: 11,
    color: MUTED,
    marginBottom: 4,
  },
  bubbleTimeLeft: {
    textAlign: 'left',
  },
  bubbleTimeRight: {
    textAlign: 'right',
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleSent: {
    backgroundColor: SENT_BG,
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: RECEIVED_BG,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleAfterCard: {
    marginTop: 4,
  },
  seenLabel: {
    fontSize: 11,
    color: MUTED,
    marginTop: 3,
    textAlign: 'right',
  },
  postCard: {
    width: 220,
    borderRadius: 16,
    overflow: 'hidden',
  },
  profileCard: {
    width: 240,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 12,
  },
  profileCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3E3E3',
  },
  profileCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  profileCardName: {
    fontSize: 15,
  },
  profileCardHandle: {
    fontSize: 12,
    marginTop: 1,
  },
  profileCardCta: {
    fontSize: 12,
    marginTop: 4,
  },
  postCardSent: {
    backgroundColor: SENT_BG,
  },
  postCardReceived: {
    backgroundColor: RECEIVED_BG,
  },
  postCardPressed: {
    opacity: 0.85,
  },
  postThumb: {
    width: '100%',
    height: 220,
    backgroundColor: '#E3E3E3',
  },
  postThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Story-reply preview (snippet above the text bubble). */
  storyRefWrap: {
    maxWidth: '78%',
    marginBottom: 4,
  },
  storyRefWrapLeft: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  storyRefWrapRight: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  storyRefLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    marginBottom: 4,
  },
  storyRefCard: {
    width: 56,
    height: 92,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E3E3E3',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  storyRefThumb: {
    width: '100%',
    height: '100%',
  },
  videoBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  videoBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  postCardMeta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  postCardAuthor: {
    fontSize: 13,
  },
  typingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  typingBubble: {
    backgroundColor: RECEIVED_BG,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 8,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: MUTED,
    marginHorizontal: 2,
  },
  typingLabel: {
    fontSize: 11,
    color: MUTED,
    marginLeft: 8,
    flexShrink: 1,
  },
  /* Inline reply chip rendered above a message bubble. */
  replyChip: {
    backgroundColor: '#F2F3F5',
    borderLeftWidth: 3,
    borderLeftColor: BLUE,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    maxWidth: '100%',
  },
  replyChipLeft: {
    alignSelf: 'flex-start',
  },
  replyChipRight: {
    alignSelf: 'flex-end',
  },
  replyChipName: {
    fontSize: 12,
    color: BLUE,
  },
  replyChipText: {
    fontSize: 12,
    color: MUTED,
    marginTop: 1,
  },
  /* Reply preview pill above the input bar. */
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F8F8FA',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECEC',
  },
  replyBarBorder: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: BLUE,
    borderRadius: 2,
    marginRight: 10,
  },
  replyBarContent: {
    flex: 1,
    minWidth: 0,
  },
  replyBarLabel: {
    fontSize: 13,
    color: BLUE,
  },
  replyBarText: {
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  replyBarClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ECECEC',
    backgroundColor: BG,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: '#F2F3F5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.select({ ios: 10, default: 6 }),
    maxHeight: 120,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    fontSize: 15,
    color: TITLE,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  mediaCard: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: RECEIVED_BG,
  },
  mediaThumb: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E3E3E3',
  },
  mediaPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPlayCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: BG,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetGrabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDE2',
    marginBottom: 12,
  },
  sheetItem: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  sheetItemPressed: {
    opacity: 0.6,
  },
  sheetItemText: {
    fontSize: 16,
    color: TITLE,
  },
  sheetCancelText: {
    color: '#E0413C',
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ECECEC',
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerClose: {
    position: 'absolute',
    top: 44,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  viewerImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  viewerVideo: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
});
