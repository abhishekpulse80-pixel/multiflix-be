import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  Vibration,
  View,
  type NativeSyntheticEvent,
  type TextLayoutEventData,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Circle } from 'react-native-svg';
// Path removed — PlayOverlayIcon replaced by FeedVideo
import { UserAvatar } from '../common/UserAvatar';
import { FeedVideo } from '../common/FeedVideo';
import { MediaMusicPlayer } from '../common/MediaMusicPlayer';
import { useAdaptiveMediaUrl } from '../../hooks/useAdaptiveMediaUrl';
import type { PostMusicDto } from '../../types/feedApi';
import {
  FeedBookmarkIcon,
  FeedCommentIcon,
  FeedHeartIcon,
  FeedShareIcon,
} from '../icons/FeedActionIcons';
import { ShareToChatSheet } from './ShareToChatSheet';
import { PostActionsSheet } from './PostActionsSheet';
import {
  navigateToHashtagFeed,
  navigateToMusicFeed,
  navigateToSoundDetail,
} from '../../navigation/rootNavigationRef';
import {
  useSetPostLikeMutation,
  useSetPostSaveMutation,
} from '../../store/api/feedApi';
import { useBlockUserMutation } from '../../store/api/usersApi';
import { ConfirmSheet } from '../common/ConfirmSheet';
import { formatCount } from '../../utils/formatCount';
import { parseHashtags } from '../../utils/parseHashtags';
import { toastError, toastSuccess } from '../../utils/toast';
import { getApiErrorMessage } from '../../utils/apiError';
import { useTheme } from '../../theme';
import { useAppSelector } from '../../store/hooks';
import { selectAccessToken } from '../../store/selectors';
import type { MessagePostRefInput } from '../../types/chatApi';

/** Lines of caption shown before the "more" toggle collapses it. */
const CAPTION_COLLAPSED_LINES = 2;

export type FeedPostData = {
  id: string;
  /** Public profile id (e.g. trending `u4` for Jenny Wilson). */
  userId: string;
  imageUri: string;
  avatarUri: string;
  userName: string;

  fullName: string;
  caption: string;
  hashtags: string;
  musicTitle: string;
  /**
   * Curated music attached to the post (real catalog). When set, the
   * source video audio is muted and this clip plays instead.
   */
  music?: PostMusicDto | null;
  /**
   * True if the uploader explicitly muted the original video audio. Honoured
   * regardless of whether a music track is attached. Defaults to false.
   */
  originalAudioMuted?: boolean;
  /**
   * The post's own extracted sound (attribution label). Shown only when no
   * music is attached; tapping opens the SoundDetail screen. Playback is
   * unaffected — the video keeps playing its own audio.
   */
  originalSound?: {
    soundId: string;
    title: string;
    ownerUsername: string;
  } | null;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  /** Whether the current user liked this post (from API / cache). */
  likedByViewer?: boolean;
  /** Whether the current user saved/bookmarked this post (from API / cache). */
  savedByViewer?: boolean;
  /** True when mediaKind is 'short_video'. */
  isVideo?: boolean;
  /** Source video duration in seconds (used to size the music window). */
  videoDurationSec?: number | null;
  /** Poster / thumbnail for video posts (shown while loading). */
  posterUri?: string;
  /** ISO upload timestamp — shown as relative time in the 3-dot menu. */
  createdAt?: string;
};

type Props = {
  post: FeedPostData;
  width: number;
  height: number;
  topInset: number;

  /** Receives the post so the parent can keep a single stable handler. */
  onPressComments?: (post: FeedPostData) => void;
  onPressProfile?: (userId: string) => void;
  onPressReport?: (postId: string) => void;
  /** True when this post is the currently visible item in the pager. */
  isVisible?: boolean;
};

function MoreDotsIcon({
  color = '#FFFFFF',
  size = 24,
}: {
  color?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Circle cx="12" cy="5" r="2" />
      <Circle cx="12" cy="12" r="2" />
      <Circle cx="12" cy="19" r="2" />
    </Svg>
  );
}

export const FeedPost = React.memo(function FeedPost({
  post,
  width,
  height,
  topInset,
  onPressComments,
  onPressProfile,
  onPressReport,
  isVisible = false,
}: Props) {
  const t = useTheme();
  const token = useAppSelector(selectAccessToken);
  const adaptiveImageUri = useAdaptiveMediaUrl(
    post.isVideo ? '' : post.imageUri,
    'image',
    token,
    isVisible,
  );
  const [liked, setLiked] = useState(() => post.likedByViewer ?? false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [setPostLike] = useSetPostLikeMutation();
  // Caption truncation: measure the full line count once (numberOfLines is
  // left off until then), then clamp to CAPTION_COLLAPSED_LINES with a
  // "more"/"less" toggle so a long caption can't take over the screen.
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [captionFullLines, setCaptionFullLines] = useState<number | null>(null);
  // Parse once per caption/hashtags string — avoids re-running the regex on
  // every unrelated re-render (isVisible toggles, like/save/expand state).
  const captionTokens = useMemo(
    () => parseHashtags(post.caption),
    [post.caption],
  );
  const hashtagTokens = useMemo(
    () => parseHashtags(post.hashtags),
    [post.hashtags],
  );
  const onCaptionTextLayout = useCallback(
    (e: NativeSyntheticEvent<TextLayoutEventData>) => {
      // Read synchronously — the native event is recycled before the state
      // updater runs, so `e.nativeEvent` would be null inside it.
      const count = e.nativeEvent?.lines?.length ?? 0;
      setCaptionFullLines(prev => prev ?? count);
    },
    [],
  );
  const [saved, setSaved] = useState(() => post.savedByViewer ?? false);
  const [setPostSave] = useSetPostSaveMutation();
  const [shareOpen, setShareOpen] = useState(false);
  // "Share profile" now sends the profile into a chat (not the OS share sheet).
  const [shareProfileOpen, setShareProfileOpen] = useState(false);
  // 3-dots actions menu (Share profile + Report + Block).
  const [actionsOpen, setActionsOpen] = useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [blockUser] = useBlockUserMutation();
  /**
   * Buffering / loading state for the source video. Music playback is
   * paused until this flips to false so the curated track doesn't start
   * before the video is ready (the user otherwise hears silence/audio
   * out of sync with the visuals).
   */
  const [videoLoading, setVideoLoading] = useState<boolean>(
    () => post.isVideo === true,
  );
  /**
   * Mirrors the FeedVideo's effective paused state (tap-to-pause + visibility).
   * Music must pause/resume together with the video; otherwise tapping the
   * video to pause leaves the music playing and they drift out of sync.
   */
  const [videoPaused, setVideoPaused] = useState<boolean>(false);

  const postRef = useMemo<MessagePostRefInput>(() => {
    const thumb = post.isVideo
      ? post.posterUri ?? post.imageUri
      : post.imageUri;
    return {
      postId: post.id,
      thumbnailUrl: thumb,
      mediaUrl: post.imageUri,
      caption: post.caption,
      authorId: post.userId,
      authorName: post.fullName || post.userName,
      authorAvatarUrl: post.avatarUri || null,
      mediaKind: post.isVideo ? 'video' : 'image',
    };
  }, [
    post.id,
    post.isVideo,
    post.posterUri,
    post.imageUri,
    post.caption,
    post.userId,
    post.fullName,
    post.userName,
    post.avatarUri,
  ]);

  useEffect(() => {
    setLiked(post.likedByViewer ?? false);
    setLikesCount(post.likes);
    setSaved(post.savedByViewer ?? false);
  }, [post.id, post.likedByViewer, post.likes, post.savedByViewer]);

  const onToggleLike = useCallback(async () => {
    const next = !liked;
    setLiked(next);
    setLikesCount(c => Math.max(0, c + (next ? 1 : -1)));
    try {
      // Don't overwrite local state with the server response — a rapid
      // second tap may have already flipped the state again, and this
      // would clobber the user's most recent intent. The next feed
      // refetch will reconcile any drift from concurrent likes.
      await setPostLike({ postId: post.id, liked: next }).unwrap();
    } catch (e: unknown) {
      setLiked(!next);
      setLikesCount(c => Math.max(0, c + (next ? -1 : 1)));
      toastError('Could not update like', getApiErrorMessage(e));
    }
  }, [liked, post.id, setPostLike]);

  const onToggleSave = useCallback(async () => {
    const next = !saved;
    setSaved(next);
    try {
      await setPostSave({ postId: post.id, saved: next }).unwrap();
    } catch (e: unknown) {
      setSaved(!next);
      toastError('Could not update save', getApiErrorMessage(e));
    }
  }, [saved, post.id, setPostSave]);

  /** Instagram-style: double-tap only LIKES (never unlikes). */
  const onDoubleTapLike = useCallback(() => {
    if (liked) return;
    // Short tactile bump on the like — Instagram/TikTok pattern.
    // Failures are silent — vibration is nice-to-have, not load-bearing.
    try {
      // Android honors the duration; iOS uses its system default.
      Vibration.vibrate(50);
    } catch {
      /* swallow — older devices / unsupported simulators */
    }
    setLiked(true);
    setLikesCount(c => c + 1);
    setPostLike({ postId: post.id, liked: true })
      .unwrap()
      // Trust the optimistic state — see onToggleLike for rationale.
      .catch((e: unknown) => {
        setLiked(false);
        setLikesCount(c => Math.max(0, c - 1));
        toastError('Could not like', getApiErrorMessage(e));
      });
  }, [liked, post.id, setPostLike]);

  /** Double-tap detector for the image (non-video) case. */
  const lastImgTapRef = useRef(0);
  const onImagePress = useCallback(() => {
    const now = Date.now();
    if (now - lastImgTapRef.current < 300) {
      lastImgTapRef.current = 0;
      onDoubleTapLike();
      return;
    }
    lastImgTapRef.current = now;
  }, [onDoubleTapLike]);

  return (
    <View style={[styles.cell, { width, height }]}>
      {post.isVideo ? (
        <FeedVideo
          uri={post.imageUri}
          posterUri={post.posterUri}
          style={StyleSheet.absoluteFill}
          isVisible={isVisible}
          // Mute source-video audio when (a) curated music is attached so
          // the viewer only hears the chosen clip, or (b) the uploader
          // explicitly toggled "Mute original audio" at upload time.
          muted={post.music != null || post.originalAudioMuted === true}
          loop
          showControls
          onDoubleTap={onDoubleTapLike}
          // Drives the music gate: while buffering, music stays paused.
          onLoadingChange={setVideoLoading}
          // Mirrors tap-to-pause / visibility into music playback so the
          // two stay in sync.
          onPauseChange={setVideoPaused}
        />
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={onImagePress}>
          <FastImage
            source={{ uri: adaptiveImageUri, priority: FastImage.priority.high }}
            style={StyleSheet.absoluteFill}
            resizeMode="contain"
            accessibilityLabel={`Post by ${post.userName}`}
          />
        </Pressable>
      )}


      {/* Hidden audio player for the curated track. Only mounted while
          this post is the visible item in the pager so we don't waste a
          decoder on off-screen cards. `key` forces a fresh seek when the
          track changes between posts. Window length matches the post:
          30 s for image posts, video duration capped at 60 s for videos.
          Paused while the video is still buffering so audio doesn't
          start before the visuals (sync-safety). */}
      {isVisible && post.music ? (
        <MediaMusicPlayer
          key={`feed-music-${post.id}-${post.music.trackId}`}
          audioUrl={post.music.audioUrl}
          trimStartMs={post.music.trimStartMs}
          // Music is paused whenever the video is buffering OR the user
          // has paused it — keeps audio in lockstep with the visuals.
          paused={
            post.isVideo === true && (videoLoading || videoPaused)
          }
          windowMs={
            post.isVideo
              ? Math.min(
                  60_000,
                  Math.round((post.videoDurationSec ?? 60) * 1000),
                )
              : 30_000
          }
        />
      ) : null}

      <View
        style={[styles.actionsRail, { top: topInset + 8 }]}
        pointerEvents="box-none"
      >
        <View style={styles.actionsStack}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              onToggleLike().catch(() => {});
            }}
            accessibilityLabel={liked ? 'Unlike' : 'Like'}
            accessibilityState={{ selected: liked }}
          >
            <FeedHeartIcon color="#FFFFFF" filled={liked} />
            <Text
              style={[
                styles.actionCount,
                { fontFamily: t.fontFamily.semibold },
              ]}
            >
              {formatCount(Math.max(0, likesCount))}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => onPressComments?.(post)}
            accessibilityLabel="Comments"
          >
            <FeedCommentIcon color="#FFFFFF" />
            <Text
              style={[
                styles.actionCount,
                { fontFamily: t.fontFamily.semibold },
              ]}
            >
              {formatCount(post.comments)}
            </Text>
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => setShareOpen(true)}
            accessibilityLabel="Share"
          >
            <FeedShareIcon color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => {
              onToggleSave().catch(() => {});
            }}
            accessibilityLabel={saved ? 'Unsave' : 'Save'}
            accessibilityState={{ selected: saved }}
          >
            <FeedBookmarkIcon color="#FFFFFF" filled={saved} />
          </Pressable>

          <Pressable
            style={styles.actionBtn}
            onPress={() => setActionsOpen(true)}
            accessibilityLabel="More options"
          >
            <MoreDotsIcon />
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottomMeta]} pointerEvents="box-none">
        {onPressProfile ? (
          <Pressable
            style={styles.metaRow}
            onPress={() => onPressProfile(post.userId)}
            accessibilityRole="button"
            accessibilityLabel={`View ${post.userName} profile`}
          >
            <UserAvatar
              uri={post.avatarUri}
              style={styles.avatar}
              accessibilityLabel={post.userName}
            />
            <View style={styles.metaText}>
              <Text
                style={[styles.userName, { fontFamily: t.fontFamily.bold }]}
              >
                {post.fullName}
              </Text>
              <Text
                style={[styles.userRole, { fontFamily: t.fontFamily.regular }]}
              >
                @{post.userName}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.metaRow}>
            <UserAvatar
              uri={post.avatarUri}
              style={styles.avatar}
              accessibilityLabel={post.userName}
            />
            <View style={styles.metaText}>
              <Text
                style={[styles.userName, { fontFamily: t.fontFamily.bold }]}
              >
                {post.fullName}
              </Text>
              <Text
                style={[styles.userRole, { fontFamily: t.fontFamily.regular }]}
              >
                @{post.userName}
              </Text>
            </View>
          </View>
        )}
        <Text
          style={[
            styles.caption,
            { fontFamily: t.fontFamily.regular },
            // Hide the unclamped first render used purely to measure lines.
            captionFullLines == null ? styles.captionMeasuring : null,
          ]}
          numberOfLines={
            captionFullLines == null || captionExpanded
              ? undefined
              : CAPTION_COLLAPSED_LINES
          }
          onTextLayout={onCaptionTextLayout}>
          {captionTokens.map((tok, i) =>
            tok.type === 'hashtag' ? (
              <Text
                key={`c-${i}`}
                style={styles.hash}
                onPress={() => navigateToHashtagFeed(tok.tag)}>
                {tok.value}
              </Text>
            ) : (
              <Text key={`c-${i}`}>{tok.value}</Text>
            ),
          )}
          {post.caption && post.hashtags ? ' ' : ''}
          {hashtagTokens.map((tok, i) =>
            tok.type === 'hashtag' ? (
              <Text
                key={`h-${i}`}
                style={styles.hash}
                onPress={() => navigateToHashtagFeed(tok.tag)}>
                {tok.value}
              </Text>
            ) : (
              <Text key={`h-${i}`} style={styles.hash}>
                {tok.value}
              </Text>
            ),
          )}
        </Text>
        {(captionFullLines ?? 0) > CAPTION_COLLAPSED_LINES ? (
          <Text
            style={[styles.captionMore, { fontFamily: t.fontFamily.semibold }]}
            onPress={() => setCaptionExpanded(v => !v)}
            suppressHighlighting>
            {captionExpanded ? 'less' : 'more'}
          </Text>
        ) : null}
        {post.musicTitle ? (
          post.music?.trackId ? (
            <Pressable
              style={styles.musicRow}
              onPress={() => {
                // Branch on the music source: curated tracks open the
                // music-feed grid; original sounds open the new
                // SoundDetail screen with a "Use this sound" CTA.
                if (post.music?.source === 'original_sound') {
                  navigateToSoundDetail({
                    soundId: post.music.trackId,
                    initialTitle: post.music.title ?? post.musicTitle,
                    initialArtUrl: post.music.artUrl ?? null,
                  });
                } else {
                  navigateToMusicFeed({
                    trackId: post.music!.trackId,
                    initialTitle: post.music?.title ?? post.musicTitle,
                    initialArtUrl: post.music?.artUrl ?? null,
                  });
                }
              }}
              accessibilityRole="button"
              accessibilityLabel={`Open posts using ${post.musicTitle}`}
            >
              <Text style={styles.disc}>♪</Text>
              <Text
                style={[styles.musicTitle, { fontFamily: t.fontFamily.medium }]}
                numberOfLines={1}
              >
                {post.musicTitle}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.musicRow}>
              <Text style={styles.disc}>♪</Text>
              <Text
                style={[styles.musicTitle, { fontFamily: t.fontFamily.medium }]}
                numberOfLines={1}
              >
                {post.musicTitle}
              </Text>
            </View>
          )
        ) : post.originalSound ? (
          // Source post whose audio became a reusable Original Sound.
          // Attribution only — the video plays its own audio; tapping
          // opens the sound's detail page (TikTok-style).
          <Pressable
            style={styles.musicRow}
            onPress={() =>
              navigateToSoundDetail({
                soundId: post.originalSound!.soundId,
                initialTitle: post.originalSound!.title,
                initialArtUrl: post.avatarUri || null,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`Open original sound by ${post.originalSound.ownerUsername}`}
          >
            <Text style={styles.disc}>♪</Text>
            <Text
              style={[styles.musicTitle, { fontFamily: t.fontFamily.medium }]}
              numberOfLines={1}
            >
              {`Original sound — @${post.originalSound.ownerUsername}`}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ShareToChatSheet
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        postRef={postRef}
      />

      <ShareToChatSheet
        visible={shareProfileOpen}
        onClose={() => setShareProfileOpen(false)}
        profileRef={{
          userId: post.userId,
          username: post.userName,
          displayName: post.fullName || post.userName,
          avatarUrl: post.avatarUri || null,
        }}
      />

      <PostActionsSheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        subject={post.userName}
        createdAt={post.createdAt}
        onShareProfile={() => {
          setActionsOpen(false);
          setShareProfileOpen(true);
        }}
        onReport={() => {
          setActionsOpen(false);
          onPressReport?.(post.id);
        }}
        onBlock={() => {
          setActionsOpen(false);
          setBlockConfirmOpen(true);
        }}
      />

      <ConfirmSheet
        visible={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
        onConfirm={() => {
          blockUser(post.userId)
            .unwrap()
            .then(() => {
              toastSuccess('Blocked', `@${post.userName} has been blocked.`);
            })
            .catch((e: unknown) => {
              toastError('Could not block user', getApiErrorMessage(e));
            });
        }}
        title={`Block @${post.userName}?`}
        message={
          "They won't be able to find your profile, posts or message you. Multiflix won't tell them you blocked them."
        }
        confirmLabel="Block"
        destructive
      />
    </View>
  );
});

const styles = StyleSheet.create({
  cell: {
    backgroundColor: '#0D0D0D',
  },
  actionsRail: {
    position: 'absolute',
    right: 8,
    width: 56,
    justifyContent: 'flex-end',
    alignItems: 'center',
    bottom: 40,
  },
  actionsStack: {
    gap: 18,
    alignItems: 'center',
  },
  actionBtn: {
    alignItems: 'center',
  },
  actionCount: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomMeta: {
    position: 'absolute',
    left: 0,
    right: 72,
    bottom: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderColor: '#FFFFFF',
    marginRight: 12,
  },
  metaText: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  userRole: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captionMeasuring: {
    opacity: 0,
  },
  captionMore: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  hash: {
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '600',
  },
  musicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  disc: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  musicTitle: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
