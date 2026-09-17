import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Video, {
  type OnProgressData,
  type VideoRef,
} from 'react-native-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import {
  navigateToMusicFeed,
  navigateToUserProfile,
} from '../navigation/rootNavigationRef';
import type {
  StoryDto,
  StoryReactionType,
  StoryViewerDto,
} from '../types/storiesApi';
import { UserAvatar } from '../components/common/UserAvatar';
import { FeedVideo } from '../components/common/FeedVideo';
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal';
import {
  useGetStoryViewersQuery,
  useGetStoryReactionsQuery,
  useReactToStoryMutation,
  useRecordStoryViewMutation,
  useDeleteStoryMutation,
  useGetStoryMediaStatusQuery,
} from '../store/api/storiesApi';
import {
  useGetOrCreateConversationMutation,
  useSendMessageRestMutation,
} from '../store/api/chatApi';
import { getApiErrorMessage } from '../utils/apiError';
import { userDisplayName } from '../utils/displayName';
import { toastError } from '../utils/toast';
import { useAppSelector } from '../store/hooks';
import { selectAccessToken, selectCurrentUser } from '../store/selectors';
import { useAdaptiveMediaUrl } from '../hooks/useAdaptiveMediaUrl';
import { useGetMusicTrackAudioStatusQuery } from '../store/api/musicApi';

/* ─── constants ─────────────────────────────────────────────── */

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const STORY_DURATION_MS = 5_000;
const MAX_VIDEO_STORY_MS = 60_000;
const PROGRESS_BAR_H = 2.5;
const PROGRESS_GAP = 3;
const HEADER_TOP = 12;
/** Solid-black chrome band at the top (progress + author row + caption). */
const TOP_BAND = 132;
/** Solid-black chrome band at the bottom (DM bar + safe area). */
const BOTTOM_BAND = 92;

/** Progress-bar duration for a story. Videos use their own duration (capped); images use the default. */
function getStoryDurationMs(s: StoryDto): number {
  if (
    s.mediaKind === 'short_video' &&
    s.durationSeconds != null &&
    s.durationSeconds > 0
  ) {
    return Math.min(MAX_VIDEO_STORY_MS, Math.ceil(s.durationSeconds * 1000));
  }
  return STORY_DURATION_MS;
}

/** Single reaction surfaced by the heart button (no picker UI). */
const HEART_REACTION: StoryReactionType = 'happy';

/** Default music window when no caller-provided value is available. */
const DEFAULT_STORY_MUSIC_WINDOW_MS = 30_000;

/**
 * Hidden audio player for a story's attached music track. Seeks to
 * `trimStartMs` once the track loads, loops within `windowMs` via
 * `onProgress`, and pauses with the rest of the viewer.
 *
 * Calls `onReady` once when the track has loaded, so the parent screen
 * can hold the auto-hide timer until music is buffered.
 */
function StoryMusicPlayer({
  audioUrl,
  trackId,
  trimStartMs,
  paused,
  onReady,
  windowMs,
}: {
  audioUrl: string;
  trackId: string;
  trimStartMs: number;
  paused: boolean;
  onReady?: () => void;
  windowMs?: number;
}) {
  const ref = useRef<VideoRef>(null);
  const token = useAppSelector(selectAccessToken);
  const { data: audioStatus } = useGetMusicTrackAudioStatusQuery(
    { trackId, networkSpeedMbps: undefined },
    { skip: !token || !audioUrl, pollingInterval: 3000 },
  );
  const adaptiveAudioUrl =
    audioStatus?.status === 'ready' && audioStatus.recommendedUrl
      ? audioStatus.recommendedUrl
      : audioUrl;
  const startSec = trimStartMs / 1000;
  const endSec = startSec + (windowMs ?? DEFAULT_STORY_MUSIC_WINDOW_MS) / 1000;

  const handleLoad = useCallback(() => {
    ref.current?.seek(startSec);
    onReady?.();
  }, [startSec, onReady]);

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      if (data.currentTime >= endSec || data.currentTime < startSec - 0.25) {
        ref.current?.seek(startSec);
      }
    },
    [endSec, startSec],
  );

  return (
    <Video
      ref={ref}
      source={{ uri: adaptiveAudioUrl }}
      paused={paused}
      onLoad={handleLoad}
      onProgress={handleProgress}
      progressUpdateInterval={150}
      repeat
      playInBackground={false}
      playWhenInactive={false}
      style={hiddenAudioStyle}
    />
  );
}

const hiddenAudioStyle = { width: 0, height: 0, position: 'absolute' as const };

/* ─── helpers ───────────────────────────────────────────────── */

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function EyeIcon({
  size = 20,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronDownIcon({
  size = 18,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 9l6 6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function MoreIcon({
  size = 22,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M5 12a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0zm5 0a2 2 0 114 0 2 2 0 01-4 0z" />
    </Svg>
  );
}

function HeartIcon({
  size = 24,
  filled = false,
  color = '#FFFFFF',
  fillColor = '#FF3B5C',
}: {
  size?: number;
  filled?: boolean;
  color?: string;
  fillColor?: string;
}) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={fillColor}>
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={color}
        strokeWidth={1.8}
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

/* ─── component ─────────────────────────────────────────────── */

type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

export function StoryViewerScreen({ route, navigation }: Props) {
  // Viewing stories does not earn — only feed, music and blogging are tracked.
  const {
    stories,
    authorUsername,
    authorDisplayName,
    authorAvatarUri,
    initialIndex = 0,
    authorQueue,
    queueIndex = 0,
  } = route.params;

  const currentUser = useAppSelector(selectCurrentUser);
  const accessToken = useAppSelector(selectAccessToken);
  // Pause the story while the screen is not focused (e.g. after navigating to
  // a viewer's profile) so it doesn't auto-advance/close in the background and
  // is still here, paused, when the user comes back.
  const isFocused = useIsFocused();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [paused, setPaused] = useState(false);
  const [viewersPanelOpen, setViewersPanelOpen] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [videoLoading, setVideoLoading] = useState(
    stories[initialIndex]?.mediaKind === 'short_video',
  );
  /**
   * Loading gates for the auto-hide timer. Image stories wait on `onLoadEnd`,
   * stories with music wait on the music's `onLoad`. Video stories already
   * use `videoLoading` from `<FeedVideo>`. The timer doesn't tick until
   * everything relevant is ready.
   */
  const [imageLoaded, setImageLoaded] = useState(
    stories[initialIndex]?.mediaKind !== 'image',
  );
  const [musicLoaded, setMusicLoaded] = useState(
    stories[initialIndex]?.music == null,
  );
  const [deleteStory] = useDeleteStoryMutation();

  const progressAnims = useRef<Animated.Value[]>(
    stories.map(() => new Animated.Value(0)),
  ).current;

  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const story: StoryDto = stories[currentIndex];
  const [mediaPollingActive, setMediaPollingActive] = useState(true);
  useEffect(() => {
    setMediaPollingActive(true);
    const timeout = setTimeout(() => setMediaPollingActive(false), 5 * 60_000);
    return () => clearTimeout(timeout);
  }, [story.id]);
  const { data: mediaStatus } = useGetStoryMediaStatusQuery(story.id, {
    skip:
      !isFocused ||
      !mediaPollingActive ||
      story.mediaKind !== 'short_video',
    pollingInterval: mediaPollingActive ? 3000 : 0,
    skipPollingIfUnfocused: true,
  });
  const adaptiveStoryImageUrl = useAdaptiveMediaUrl(
    story.mediaKind === 'image' ? story.media?.url ?? '' : '',
    'image',
    accessToken,
  );
  const isAuthor = currentUser?.id === story.authorId;

  const { data: viewersData, isFetching: viewersFetching } =
    useGetStoryViewersQuery(story.id, { skip: !isAuthor });

  // `currentData` is scoped to the CURRENT story id (undefined while a newly
  // selected story's reactions load) so we never show a previous story's
  // reaction; refetch on mount/arg-change so reopening a story always
  // reflects the persisted reaction.
  const { currentData: reactionsData } = useGetStoryReactionsQuery(story.id, {
    refetchOnMountOrArgChange: true,
  });
  const [reactToStory] = useReactToStoryMutation();
  const [recordStoryView] = useRecordStoryViewMutation();
  const [getOrCreateConv] = useGetOrCreateConversationMutation();
  const [sendDirectMessage] = useSendMessageRestMutation();
  const [messageText, setMessageText] = useState('');
  const [sendingDm, setSendingDm] = useState(false);
  const [composing, setComposing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height so the DM bar lifts above it; pause story playback
  // while the keyboard is up (covered by the `composing` state below).
  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, e => {
      const height = e.endCoordinates?.height
        ? e.endCoordinates?.height - (Platform.OS === 'ios' ? 45 : 0)
        : 0;
      setKeyboardHeight(height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  // Pause progress + video while the user is composing a reply.
  useEffect(() => {
    if (composing) setPaused(true);
    else setPaused(false);
  }, [composing]);

  // Record a distinct view when the visible story changes. Backend skips
  // self-views, but guard here too so the mutation isn't wasted.
  useEffect(() => {
    if (!story.id || isAuthor) return;
    recordStoryView({ storyId: story.id })
      .unwrap()
      .catch(() => {
        // Best-effort — viewing UX doesn't need to fail on a tracking miss.
      });
  }, [story.id, isAuthor, recordStoryView]);
  const [localReaction, setLocalReaction] = useState<StoryReactionType | null>(
    null,
  );

  // Single source of truth: mirror the server's viewer reaction for the
  // current story. Keyed on story.id + reactionsData so switching stories or
  // receiving fresh data updates the heart — and (crucially) so reopening a
  // story restores the persisted reaction instead of resetting to null.
  useEffect(() => {
    setLocalReaction(reactionsData?.viewerReaction ?? null);
  }, [story.id, reactionsData]);

  const handleReaction = useCallback(
    async (reaction: StoryReactionType) => {
      // Optimistic toggle
      const next = localReaction === reaction ? null : reaction;
      setLocalReaction(next);
      try {
        await reactToStory({ storyId: story.id, reaction }).unwrap();
      } catch {
        // Revert on failure
        setLocalReaction(localReaction);
      }
    },
    [localReaction, reactToStory, story.id],
  );

  const heartFilled = localReaction === HEART_REACTION;
  const handleHeartTap = useCallback(() => {
    void handleReaction(HEART_REACTION);
  }, [handleReaction]);

  const handleSendDm = useCallback(async () => {
    const text = messageText.trim();
    if (!text || isAuthor || sendingDm) return;
    setSendingDm(true);
    try {
      const conv = await getOrCreateConv(story.authorId).unwrap();
      await sendDirectMessage({
        conversationId: conv.conversationId,
        text,
        // Snapshot the story so the chat bubble can render a "Replied to
        // story" preview that survives the story's 24h expiry.
        storyRef: {
          storyId: story.id,
          mediaUrl: story.media?.url ?? '',
          thumbnailUrl: story.media?.url ?? '',
          mediaKind: story.mediaKind,
          authorId: story.authorId,
          authorUsername: story.authorUsername,
        },
      }).unwrap();
      setMessageText('');
    } catch (e) {
      toastError('Could not send', getApiErrorMessage(e));
    }
    setSendingDm(false);
  }, [
    messageText,
    isAuthor,
    sendingDm,
    getOrCreateConv,
    sendDirectMessage,
    story.id,
    story.authorId,
    story.authorUsername,
    story.media?.url,
    story.mediaKind,
  ]);

  /* ── progress animation ── */

  // Reset progress bars & loading gates whenever we land on a new story
  useEffect(() => {
    for (let i = currentIndex; i < stories.length; i++) {
      progressAnims[i].setValue(0);
    }
    for (let i = 0; i < currentIndex; i++) {
      progressAnims[i].setValue(1);
    }
    const next = stories[currentIndex];
    setVideoLoading(next?.mediaKind === 'short_video');
    setImageLoaded(next?.mediaKind !== 'image');
    setMusicLoaded(next?.music == null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // The timer can only tick once the story's media AND music (if any) are
  // ready. Otherwise the user could blink past a story before they ever
  // saw or heard it.
  const mediaLoading =
    stories[currentIndex]?.mediaKind === 'short_video'
      ? videoLoading
      : !imageLoaded;
  const musicLoading = stories[currentIndex]?.music != null && !musicLoaded;
  const isStoryLoading = mediaLoading || musicLoading;

  // Drive (or stop) the current bar's animation based on pause + load + focus.
  useEffect(() => {
    if (paused || isStoryLoading || !isFocused) {
      animRef.current?.stop();
      return;
    }
    const anim = Animated.timing(progressAnims[currentIndex], {
      toValue: 1,
      duration: getStoryDurationMs(stories[currentIndex]),
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });
    return () => {
      animRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused, isStoryLoading, currentIndex, isFocused]);

  /* ── navigation helpers ── */

  const goNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev < stories.length - 1) {
        return prev + 1;
      }
      // Last story of this author. If a multi-author queue is present and
      // there's a next author, advance to their first story; otherwise close.
      if (authorQueue && queueIndex < authorQueue.length - 1) {
        const nextIdx = queueIndex + 1;
        const g = authorQueue[nextIdx];
        navigation.replace('StoryViewer', {
          stories: g.stories,
          authorUsername: g.authorUsername,
          authorDisplayName: g.authorDisplayName,
          authorAvatarUri: g.authorAvatarUri,
          initialIndex: 0,
          authorQueue,
          queueIndex: nextIdx,
        });
      } else {
        navigation.goBack();
      }
      return prev;
    });
  }, [stories.length, navigation, authorQueue, queueIndex]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev > 0) {
        return prev - 1;
      }
      // First story of this author. If a multi-author queue is present and
      // there's a previous author, jump back to their last story.
      if (authorQueue && queueIndex > 0) {
        const prevIdx = queueIndex - 1;
        const g = authorQueue[prevIdx];
        navigation.replace('StoryViewer', {
          stories: g.stories,
          authorUsername: g.authorUsername,
          authorDisplayName: g.authorDisplayName,
          authorAvatarUri: g.authorAvatarUri,
          initialIndex: Math.max(0, g.stories.length - 1),
          authorQueue,
          queueIndex: prevIdx,
        });
      }
      return 0;
    });
  }, [navigation, authorQueue, queueIndex]);

  /* ── tap zones ── */

  const handleTap = useCallback(
    (evt: { nativeEvent: { locationX: number } }) => {
      const x = evt.nativeEvent.locationX;
      if (x < SCREEN_W * 0.3) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goPrev, goNext],
  );

  /* ── long press = pause ── */

  const handleLongPressIn = useCallback(() => setPaused(true), []);
  const handleLongPressOut = useCallback(() => setPaused(false), []);

  /* ── viewers panel ── */

  const toggleViewersPanel = useCallback(() => {
    setViewersPanelOpen(prev => {
      const next = !prev;
      setPaused(next);
      return next;
    });
  }, []);

  /* ── delete story ── */

  const handleDeletePress = useCallback(() => {
    setPaused(true);
    setDeleteModalVisible(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setPaused(false);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteStory({
        storyId: story.id,
        authorId: story.authorId,
      }).unwrap();
      navigation.goBack();
    } catch {
      toastError('Story', 'Could not delete story.');
      setDeleting(false);
      setDeleteModalVisible(false);
      setPaused(false);
    }
  }, [deleting, deleteStory, story.id, story.authorId, navigation]);

  /* ── close ── */

  const handleClose = useCallback(() => navigation.goBack(), [navigation]);

  /* ── render ── */

  const mediaUrl =
    story.mediaKind === 'short_video' &&
    mediaStatus?.status === 'ready' &&
    mediaStatus.hlsUrl
      ? mediaStatus.hlsUrl
      : story.media?.url;
  const barWidth =
    (SCREEN_W - 16 - PROGRESS_GAP * (stories.length - 1)) / stories.length;

  return (
    <View style={styles.root}>
{/* Story media: full-width inside the middle band (between the solid
          black top/bottom chrome). `cover` fills the band edge-to-edge so
          tall/wide content stretches to 100% width with minimal cropping.
          The author's pinch/pan transform from the editor (if any) is
          applied here as a static `transform` style so the viewer sees the
          same framing the author chose. */}
      {(() => {
        const mt = story.mediaTransform;
        const canvasH = SCREEN_H - TOP_BAND - BOTTOM_BAND;
        // `mediaTransform.translateX/Y` are normalized to canvas size.
        const transformStyle = mt
          ? {
              transform: [
                { translateX: mt.translateX * SCREEN_W },
                { translateY: mt.translateY * canvasH },
                { scale: mt.scale },
              ],
            }
          : null;
        if (!mediaUrl) {
          return (
            <View style={[styles.storyImage, { backgroundColor: '#1A1A1A' }]} />
          );
        }
        return story.mediaKind === 'short_video' ? (
          <FeedVideo
            uri={mediaUrl}
            style={[styles.storyImage, transformStyle]}
            isVisible={!paused && isFocused}
            // When music is attached, the source video is muted so the
            // viewer only hears the curated track (paired with the hidden
            // music Video below).
            muted={story.music != null}
            loop={false}
            showControls={false}
            resizeMode="cover"
            onLoadingChange={setVideoLoading}
          />
        ) : (
          <Image
            source={{ uri: adaptiveStoryImageUrl }}
            style={[styles.storyImage, transformStyle]}
            resizeMode="cover"
            onLoadEnd={() => setImageLoaded(true)}
          />
        );
      })()}

      {/* Hidden music player — plays the attached track from `trimStartMs`
          and loops within a window matching the story media (video length
          for video stories, 30 s default for image stories). `key` remounts
          the player per story so a fresh seek happens after `onLoad`. */}
      {story.music ? (
        <StoryMusicPlayer
          key={`music-${story.id}`}
          audioUrl={story.music.audioUrl}
          trackId={story.music.trackId}
          trimStartMs={story.music.trimStartMs}
          paused={paused || isStoryLoading || !isFocused}
          onReady={() => setMusicLoaded(true)}
          windowMs={
            story.mediaKind === 'short_video' &&
            story.durationSeconds != null &&
            story.durationSeconds > 0
              ? Math.min(60_000, Math.round(story.durationSeconds * 1000))
              : 30_000
          }
        />
      ) : null}

      {/* Text overlays (positioned over the media band, no touch capture). */}
      {story.textOverlays && story.textOverlays.length > 0 ? (
        <View style={styles.overlayLayer} pointerEvents="none">
          {story.textOverlays.map((o, i) => (
            <Text
              key={`tov-${i}`}
              style={[
                styles.overlayText,
                {
                  left: `${Math.min(0.98, Math.max(0, o.x)) * 100}%`,
                  top: `${Math.min(0.98, Math.max(0, o.y)) * 100}%`,
                  color: o.color,
                  fontSize: o.fontSize,
                },
              ]}>
              {o.text}
            </Text>
          ))}
        </View>
      ) : null}

      {/* Tap zones overlay */}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={handleTap}
        onLongPress={handleLongPressIn}
        onPressOut={handleLongPressOut}
        delayLongPress={200}
      />

      {/* Top overlay: progress bars + user info */}
      <View style={styles.topOverlay} pointerEvents="box-none">
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {stories.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressTrack,
                {
                  width: barWidth,
                  marginRight: i < stories.length - 1 ? PROGRESS_GAP : 0,
                },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* User info row */}
        <View style={styles.userRow}>
          <Pressable
            style={styles.userInfoTap}
            onPress={() => {
              // Self-stories stay on the viewer — there's no separate
              // public profile screen for the current user (tapping the
              // bottom tab is the right path for that).
              if (!isAuthor && story.authorId) {
                navigateToUserProfile(story.authorId);
              }
            }}
            disabled={isAuthor || !story.authorId}
            accessibilityRole="button"
            accessibilityLabel={`Open ${authorUsername}'s profile`}
            hitSlop={6}
          >
            <UserAvatar uri={authorAvatarUri} style={styles.avatar} />
            <Text style={styles.username} numberOfLines={1}>
              {story.authorFullName?.trim() ||
                authorDisplayName?.trim() ||
                story.authorUsername ||
                authorUsername}
            </Text>
            <Text style={styles.timeAgo}>{timeAgo(story.createdAt)}</Text>
          </Pressable>

          <View style={styles.headerActions}>
            {isAuthor ? (
              <Pressable
                onPress={handleDeletePress}
                style={styles.headerBtn}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Delete story"
              >
                <MoreIcon size={20} />
              </Pressable>
            ) : null}
            <Pressable
              onPress={handleClose}
              style={styles.headerBtn}
              hitSlop={12}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </Pressable>
          </View>
        </View>

        {/* Sound title (renders inside the top chrome band). When a curated
            track is attached, tapping it opens that track's music feed — same
            as tapping the music row on a post. */}
        {story.soundTitle ? (
          story.music?.trackId ? (
            <Pressable
              style={styles.captionWrap}
              onPress={() =>
                navigateToMusicFeed({
                  trackId: story.music!.trackId,
                  initialTitle: story.music?.title ?? story.soundTitle ?? undefined,
                  initialArtUrl: story.music?.artUrl ?? null,
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`Open posts using ${story.soundTitle}`}
              hitSlop={6}
            >
              <Text style={styles.captionText} numberOfLines={1}>
                🎵 {story.soundTitle}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.captionWrap} pointerEvents="none">
              <Text style={styles.captionText} numberOfLines={1}>
                🎵 {story.soundTitle}
              </Text>
            </View>
          )
        ) : null}
      </View>

      {/* Bottom DM bar — hidden for author and while the viewers panel is open. */}
      {!isAuthor && !viewersPanelOpen ? (
        <View
          style={[
            styles.dmBar,
            // iOS: the window doesn't resize, so lift the bar above the
            // keyboard manually. Android: windowSoftInputMode=adjustResize
            // already shrinks the window (bottom:0 sits above the keyboard),
            // so adding keyboardHeight here would double-offset the bar up
            // the screen.
            Platform.OS === 'ios' && keyboardHeight > 0
              ? { bottom: keyboardHeight }
              : null,
          ]}
        >
          <View style={styles.dmInputWrap}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Send message"
              placeholderTextColor="rgba(255,255,255,0.7)"
              style={styles.dmInput}
              autoCapitalize="sentences"
              autoCorrect
              returnKeyType="send"
              onFocus={() => setComposing(true)}
              onBlur={() => setComposing(false)}
              onSubmitEditing={() => void handleSendDm()}
              editable={!sendingDm}
            />
          </View>
          <Pressable
            onPress={handleHeartTap}
            hitSlop={8}
            style={styles.dmIconBtn}
            accessibilityRole="button"
            accessibilityLabel={heartFilled ? 'Remove like' : 'Like story'}
            accessibilityState={{ selected: heartFilled }}
          >
            <HeartIcon filled={heartFilled} />
          </Pressable>
          {messageText.trim().length > 0 ? (
            <Pressable
              onPress={() => void handleSendDm()}
              hitSlop={8}
              style={styles.dmIconBtn}
              disabled={sendingDm}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              {sendingDm ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <SendIcon />
              )}
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {/* Viewers indicator (author only) */}
      {isAuthor ? (
        <Pressable
          style={styles.viewersBtn}
          onPress={toggleViewersPanel}
          accessibilityRole="button"
          accessibilityLabel="View story viewers"
        >
          <EyeIcon size={18} />
          <Text style={styles.viewersCount}>
            {viewersData?.viewers?.length ?? story.viewsCount}
          </Text>
          <ChevronDownIcon size={16} color="rgba(255,255,255,0.8)" />
        </Pressable>
      ) : null}

      {/* Viewers panel */}
      {isAuthor && viewersPanelOpen ? (
        <View style={styles.viewersPanel}>
          <View style={styles.viewersPanelHeader}>
            <Text style={styles.viewersPanelTitle}>Viewers</Text>
            <Pressable onPress={toggleViewersPanel} hitSlop={12}>
              <Text style={styles.viewersPanelClose}>✕</Text>
            </Pressable>
          </View>
          {viewersFetching ? (
            <ActivityIndicator color="#FFFFFF" style={styles.viewersLoader} />
          ) : !viewersData?.viewers?.length ? (
            <Text style={styles.viewersEmpty}>No viewers yet</Text>
          ) : (
            <FlatList
              data={viewersData.viewers}
              keyExtractor={(item: StoryViewerDto) => item.id}
              style={styles.viewersList}
              renderItem={({ item }: { item: StoryViewerDto }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.viewerRow,
                    pressed && { opacity: 0.6 },
                  ]}
                  onPress={() => navigateToUserProfile(item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${userDisplayName(item)}'s profile`}>
                  <UserAvatar
                    uri={item.avatarUrl}
                    style={styles.viewerAvatar}
                  />
                  <View style={styles.viewerInfo}>
                    <Text style={styles.viewerName} numberOfLines={1}>
                      {userDisplayName(item)}
                    </Text>
                    <Text style={styles.viewerHandle} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      ) : null}

      <DeleteConfirmModal
        visible={deleteModalVisible}
        title="Delete Story"
        message="Are you sure you want to delete this story? This action cannot be undone."
        deleting={deleting}
        onCancel={handleDeleteCancel}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
      />
    </View>
  );
}

/* ─── styles ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  storyImage: {
    position: 'absolute',
    top: TOP_BAND,
    bottom: BOTTOM_BAND,
    left: 0,
    right: 0,
    width: SCREEN_W,
  },
  overlayLayer: {
    position: 'absolute',
    top: TOP_BAND,
    bottom: BOTTOM_BAND,
    left: 0,
    right: 0,
  },
  overlayText: {
    position: 'absolute',
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* Top overlay */
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: HEADER_TOP,
    paddingHorizontal: 8,
  },

  /* Progress bars */
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    height: PROGRESS_BAR_H,
    borderRadius: PROGRESS_BAR_H / 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: PROGRESS_BAR_H / 2,
    backgroundColor: '#FFFFFF',
  },

  /* User info */
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingHorizontal: 4,
  },
  /** Inner tappable region — avatar + username + time. Flex shrinks to
   *  leave room for the absolute-positioned header actions on the right. */
  userInfoTap: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
    flexShrink: 1,
  },
  timeAgo: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    marginLeft: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 16,
  },
  headerBtn: {
    padding: 4,
  },
  closeIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },

  /* Caption (inside top chrome) */
  captionWrap: {
    marginTop: 8,
    paddingHorizontal: 8,
  },
  captionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 18,
  },

  /* Bottom DM bar — solid-black tray so icons stay visible whether the bar
     sits over the bottom chrome band or is lifted above the keyboard. */
  dmBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 16 : 16,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dmInputWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderColor: 'rgba(255,255,255,0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
  },
  dmInput: {
    color: '#FFFFFF',
    fontSize: 14,
    padding: 0,
  },
  dmIconBtn: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Viewers button */
  viewersBtn: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  viewersCount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Viewers panel */
  viewersPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_H * 0.45,
    backgroundColor: 'rgba(20,20,20,0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  viewersPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  viewersPanelTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  viewersPanelClose: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  viewersLoader: {
    marginTop: 20,
  },
  viewersEmpty: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  viewersList: {
    paddingHorizontal: 20,
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  viewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  viewerInfo: {
    flex: 1,
    minWidth: 0,
  },
  viewerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  viewerHandle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: 1,
  },
});
