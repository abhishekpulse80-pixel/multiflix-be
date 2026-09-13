import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Easing,
  FlatList,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Video, {
  type OnLoadData,
  type OnProgressData,
  type VideoRef,
} from 'react-native-video';
import { VIDEO_BUFFER_CONFIG } from '../utils/videoBufferConfig';
import { useAdaptiveMediaUrl } from '../hooks/useAdaptiveMediaUrl';
import FastImage from '@d11/react-native-fast-image';
import Orientation from 'react-native-orientation-locker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { BloggingWatchSkeleton } from '../components/blogging/BloggingSkeletons';
import { UserAvatar } from '../components/common/UserAvatar';
import { FeedHeartIcon } from '../components/icons/FeedActionIcons';
import {
  getBloggingPostById,
  getFollowingFeedExcept,
  type BloggingPost,
} from '../data/bloggingFeedMock';
import { navigateToUserProfile } from '../navigation/rootNavigationRef';
import type { BloggingStackParamList } from '../navigation/types';
import { useAppSelector } from '../store/hooks';
import {
  useGetBlogByIdQuery,
  useGetBlogsQuery,
  useIncrementBlogViewMutation,
  useSetBlogFavoriteMutation,
} from '../store/api/blogsApi';
import { selectAccessToken } from '../store/selectors';
import { useTheme } from '../theme';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCount } from '../utils/formatCount';
import { formatDuration } from '../utils/formatDuration';
import { mapBlogListItemDtoToBloggingPost } from '../utils/mapBlogDtoToBloggingPost';
import { toastError } from '../utils/toast';

const H_PAD = 16;
const TITLE = '#FFFFFF';
const MUTED = '#AEAEB2';
/** Lighter than MUTED for the blog author · date · views line (readability on black). */
const META = '#C7C7CC';
const LINK = '#246BFD';

type Props = NativeStackScreenProps<BloggingStackParamList, 'BloggingWatch'>;

function ChevronDownIcon({ size = 22, color }: { size?: number; color: string }) {
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

function PauseIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </Svg>
  );
}

function PlayLargeIcon({ size = 28, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

function Skip10BackIcon({ size = 30, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V2L7 6l5 4V7a6 6 0 110 12 6 6 0 01-6-6H4a8 8 0 108-8z"
        fill={color}
      />
    </Svg>
  );
}

function Skip10ForwardIcon({ size = 30, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5V2l5 4-5 4V7a6 6 0 106 6h2a8 8 0 11-8-8z"
        fill={color}
      />
    </Svg>
  );
}

function PrevBlogIcon({ size = 26, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 6h2.2v12H6zM20 6v12L9.5 12z" />
    </Svg>
  );
}

function NextBlogIcon({ size = 26, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M15.8 6H18v12h-2.2zM4 6l10.5 6L4 18z" />
    </Svg>
  );
}

function FullscreenEnterIcon({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function FullscreenExitIcon({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Stack-of-lines glyph used to open the fullscreen "Up Next" panel. */
function QueueIcon({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h13M3 12h13M3 18h9M18 14v8M14 18l4-4 4 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function PanelCloseIcon({
  size = 20,
  color,
}: {
  size?: number;
  color: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Left arrow shown top-left in fullscreen to exit (YouTube-style). */
function BackArrowIcon({ size = 24, color }: { size?: number; color: string }) {
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


export function BloggingWatchScreen({ navigation, route }: Props) {
  useTrackScreenTime('blogging');
  const t = useTheme();
  const { width: screenW, height: screenH } = useWindowDimensions();
  // In landscape fullscreen the cutout/notch sits along the top edge of
  // the screen — `right` here is what was the top in portrait. We use
  // both top + right insets so the close button is always tappable.
  const safeAreaInsets = useSafeAreaInsets();
  const { postId } = route.params;
  const token = useAppSelector(selectAccessToken);
  const [setBlogFavorite, { isLoading: favSaving }] =
    useSetBlogFavoriteMutation();
  const [incrementBlogView] = useIncrementBlogViewMutation();
  const countedPostIdRef = useRef<string | null>(null);

  // Video state
  const videoRef = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(false);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const iconTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [screenFocused, setScreenFocused] = useState(true);
  const progressBarRef = useRef<View>(null);
  // Seekbar scrubbing: measured bar width (synchronous, via onLayout) + a
  // live drag value so the fill/time track the finger before committing.
  const barWidthRef = useRef(0);
  const [scrubbing, setScrubbing] = useState(false);
  const scrubbingRef = useRef(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Ref mirrors of the fullscreen state used by enter/exit so the guards
  // read live values (not stale closure state) when the user mashes the
  // toggle. `fsBusyRef` blocks a new transition until the current animation
  // (and its orientation/status-bar side effects) fully settles — without
  // it, overlapping Animated.timing + rapid Orientation locks crash.
  const isFullscreenRef = useRef(false);
  const fsBusyRef = useRef(false);
  /** Right-side "Up Next" panel inside fullscreen — closed by default. */
  const [upNextOpen, setUpNextOpen] = useState(false);

  // Smooth-transition machinery: the <Video> is rendered ONCE in an
  // absolute-positioned animated container that interpolates between the
  // inline slot (a placeholder in the list header) and a full-window rect.
  // Because the same instance is reused, there's no re-buffer, no black
  // flash, and no resume-seek to babysit.
  const fsProgress = useRef(new Animated.Value(0)).current;
  // Measured height of the pinned "Now Playing" chrome row. The player is
  // pinned directly below it (YouTube-style) so the Up Next list scrolls
  // underneath while the player stays put.
  const [chromeH, setChromeH] = useState(52);

  // Actual available content size (the screen MINUS the safe-area insets
  // applied by RootNavigator's SafeAreaView). The fullscreen player sizes
  // to THIS, not the raw window — otherwise the container overruns the
  // bottom safe area and the seekbar/timer at its bottom edge fall
  // off-screen under the home indicator.
  const [rootSize, setRootSize] = useState({ w: screenW, h: screenH });

  const {
    data: blogDetail,
    isFetching: blogDetailFetching,
    isError: blogDetailError,
  } = useGetBlogByIdQuery(postId, { skip: !token });
  const { data: bloggingCatalog } = useGetBlogsQuery(
    { tab: 'blogging' },
    { skip: !token },
  );

  const current = useMemo(() => {
    if (token && blogDetail?.blog) {
      return mapBlogListItemDtoToBloggingPost(blogDetail.blog);
    }
    return getBloggingPostById(postId);
  }, [token, blogDetail, postId]);
  const adaptiveVideoUrl = useAdaptiveMediaUrl(
    current?.videoUrl ?? '',
    'video',
    token,
  );

  const suggestions = useMemo(() => {
    if (token && bloggingCatalog?.items) {
      const mapped = bloggingCatalog.items
        .map(row => mapBlogListItemDtoToBloggingPost(row))
        .filter(p => p.id !== postId);
      const fromFollowing = mapped.filter(p => p.fromFollowing);
      const rest = mapped.filter(p => !p.fromFollowing);
      return [...fromFollowing, ...rest];
    }
    return current ? getFollowingFeedExcept(current.id) : [];
  }, [token, bloggingCatalog, postId, current]);

  // The full blog list (in display order) backing the prev/next buttons.
  const playlist = useMemo(
    () =>
      token && bloggingCatalog?.items
        ? bloggingCatalog.items.map(row => mapBlogListItemDtoToBloggingPost(row))
        : [],
    [token, bloggingCatalog],
  );
  const playlistIndex = useMemo(
    () => playlist.findIndex(p => p.id === postId),
    [playlist, postId],
  );
  const prevBlogId =
    playlistIndex > 0 ? playlist[playlistIndex - 1].id : null;
  const nextBlogId =
    playlistIndex >= 0 && playlistIndex < playlist.length - 1
      ? playlist[playlistIndex + 1].id
      : null;

  useEffect(() => {
    if (!token) {
      return;
    }
    if (countedPostIdRef.current === postId) {
      return;
    }
    countedPostIdRef.current = postId;
    incrementBlogView({ blogId: postId }).catch(() => {});
  }, [token, postId, incrementBlogView]);

  // Reset video state when post changes (e.g. picking a related blog).
  useEffect(() => {
    setPaused(false);
    setVideoLoading(true);
    setVideoError(false);
    setDuration(0);
    setCurrentTime(0);
  }, [postId]);

  useFocusEffect(
    useCallback(() => {
      setScreenFocused(true);
      // Inline (portrait) this screen is white → the central RootNavigator
      // status-bar controller already shows dark icons. We only override the
      // bar while in landscape fullscreen (see enter/exitFullscreen).
      return () => {
        setScreenFocused(false);
      };
    }, []),
  );

  const onVideoLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setVideoLoading(false);
  }, []);

  const onVideoSeek = useCallback(() => {
    setVideoLoading(false);
  }, []);

  const onVideoProgress = useCallback((data: OnProgressData) => {
    // While the user is dragging the seekbar, don't let playback progress
    // fight the scrub position.
    if (scrubbingRef.current) return;
    setCurrentTime(data.currentTime);
  }, []);

  const onVideoBuffer = useCallback(({ isBuffering }: { isBuffering: boolean }) => {
    setVideoLoading(isBuffering);
  }, []);

  const onVideoError = useCallback((e: { error: { errorString?: string } }) => {
    console.warn('[BlogWatch] Video error:', e.error?.errorString ?? e);
    setVideoError(true);
    setVideoLoading(false);
  }, []);

  const showControlsBriefly = useCallback(() => {
    setShowControls(true);
    if (iconTimer.current) clearTimeout(iconTimer.current);
    iconTimer.current = setTimeout(() => setShowControls(false), 2500);
  }, []);

  // Tapping the video reveals the controls (seekbar, fullscreen, play/skip);
  // tapping again hides them. Play/pause is the center button, not the tap.
  const toggleControls = useCallback(() => {
    if (showControls) {
      if (iconTimer.current) clearTimeout(iconTimer.current);
      setShowControls(false);
    } else {
      showControlsBriefly();
    }
  }, [showControls, showControlsBriefly]);

  const togglePlayPause = useCallback(() => {
    setPaused(prev => !prev);
    showControlsBriefly();
  }, [showControlsBriefly]);

  const skipBy = useCallback(
    (deltaSeconds: number) => {
      if (duration <= 0) return;
      const target = Math.max(
        0,
        Math.min(duration, currentTime + deltaSeconds),
      );
      videoRef.current?.seek(target);
      setCurrentTime(target);
      showControlsBriefly();
    },
    [currentTime, duration, showControlsBriefly],
  );

  // Skip to an adjacent blog in the list by swapping the postId in place
  // (no remount — queries/video state reset on the postId change).
  const goToBlog = useCallback(
    (id: string | null) => {
      if (!id) return;
      navigation.setParams({ postId: id });
      showControlsBriefly();
    },
    [navigation, showControlsBriefly],
  );

  const enterFullscreen = useCallback(() => {
    // Ignore the tap if we're already fullscreen or a transition is still
    // settling — this is what stops rapid double-taps from stacking
    // animations + orientation locks and crashing.
    if (fsBusyRef.current || isFullscreenRef.current) {
      return;
    }
    fsBusyRef.current = true;
    isFullscreenRef.current = true;

    // The Video is rendered in an absolute-positioned animated container
    // that never unmounts — no re-buffer, no resume-seek, no black flash.
    setIsFullscreen(true);
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: 'none' },
    });
    Orientation.lockToLandscape();
    StatusBar.setBarStyle('light-content');
    // Immersive: hide the status bar (and Android nav-bar background) so the
    // player fills the whole screen with no system chrome.
    StatusBar.setHidden(true, 'fade');
    if (Platform.OS === 'android') {
      StatusBar.setTranslucent(false);
      StatusBar.setBackgroundColor('#000000');
    }
    fsProgress.stopAnimation();
    Animated.timing(fsProgress, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      fsBusyRef.current = false;
    });
  }, [fsProgress, navigation]);

  const exitFullscreen = useCallback(() => {
    if (fsBusyRef.current || !isFullscreenRef.current) {
      return;
    }
    fsBusyRef.current = true;
    isFullscreenRef.current = false;

    setUpNextOpen(false);
    fsProgress.stopAnimation();
    Animated.timing(fsProgress, {
      toValue: 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start(() => {
      setIsFullscreen(false);
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
      Orientation.lockToPortrait();
      // Restore the system status bar for the inline (now black) screen.
      StatusBar.setHidden(false, 'fade');
      StatusBar.setBarStyle('light-content');
      if (Platform.OS === 'android') {
        StatusBar.setBackgroundColor('#000000');
      }
      fsBusyRef.current = false;
    });
  }, [fsProgress, navigation]);

  // Safety: if the user navigates away while still in fullscreen, restore
  // portrait + show the parent tab bar again so the rest of the app isn't
  // stuck sideways and the next screen has its tabs.
  useEffect(() => {
    const tabsNavigator = navigation.getParent();
    return () => {
      Orientation.lockToPortrait();
      // Make sure the status bar is visible again if we left while fullscreen;
      // barStyle restoration is owned by the central controller on route change.
      StatusBar.setHidden(false);
      tabsNavigator?.setOptions({ tabBarStyle: undefined });
    };
  }, [navigation]);

  // Android hardware back: exit fullscreen first, only leave the screen
  // on a second press. Previously this was handled by the Modal's
  // onRequestClose; with the Modal gone we wire it up directly.
  useEffect(() => {
    if (!isFullscreen) {
      return undefined;
    }
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitFullscreen();
      return true; // consume the event
    });
    return () => sub.remove();
  }, [isFullscreen, exitFullscreen]);

  /** Map a touch X (relative to the bar) to a time using the measured width. */
  const timeFromTouchX = useCallback(
    (locationX: number): number => {
      const w = barWidthRef.current;
      if (duration <= 0 || w <= 0) return 0;
      const x = Math.max(0, Math.min(locationX, w));
      return (x / w) * duration;
    },
    [duration],
  );

  // Begin/continue a scrub — preview the position (don't seek the video yet).
  const onScrubTouch = useCallback(
    (locationX: number) => {
      if (duration <= 0) return;
      scrubbingRef.current = true;
      setScrubbing(true);
      setScrubTime(timeFromTouchX(locationX));
      showControlsBriefly();
    },
    [duration, timeFromTouchX, showControlsBriefly],
  );

  // Commit the scrub on release: seek the video to the final position.
  const onScrubRelease = useCallback(
    (locationX: number) => {
      if (duration <= 0) {
        scrubbingRef.current = false;
        setScrubbing(false);
        return;
      }
      const target = timeFromTouchX(locationX);
      videoRef.current?.seek(target);
      setCurrentTime(target);
      scrubbingRef.current = false;
      setScrubbing(false);
    },
    [duration, timeFromTouchX],
  );

  const onVideoEnd = useCallback(() => {
    if (suggestions.length > 0) {
      // `setParams` instead of `replace` so the screen instance is reused
      // (same as the music player swapping tracks). The existing
      // `useEffect([postId])` resets video state, and any in-flight
      // queries pick up the new postId without a fresh mount.
      navigation.setParams({ postId: suggestions[0].id });
    }
  }, [suggestions, navigation]);

  const videoPaused = paused || !screenFocused;

  const miniH = useMemo(
    () => Math.min(220, Math.round(screenW * (9 / 16))),
    [screenW],
  );

  const showWatchSkeleton = Boolean(
    token &&
      blogDetail === undefined &&
      blogDetailFetching &&
      !blogDetailError,
  );

  // While scrubbing, show the dragged position; otherwise live playback time.
  const displayTime = scrubbing ? scrubTime : currentTime;
  const progressFraction = duration > 0 ? displayTime / duration : 0;

  const onPickRelated = useCallback(
    (id: string) => {
      // Same idea as `onVideoEnd`: swap the postId in place so the
      // mounted screen just reloads its data, no new screen pushed.
      navigation.setParams({ postId: id });
    },
    [navigation],
  );

  const onToggleWatchFavorite = useCallback(async () => {
    if (!token || !current) {
      return;
    }
    const next = !current.isFavorite;
    try {
      await setBlogFavorite({
        blogId: current.id,
        favorited: next,
      }).unwrap();
    } catch (e: unknown) {
      toastError('Could not update favorite', getApiErrorMessage(e));
    }
  }, [token, current, setBlogFavorite]);

  const renderRelated = useCallback(
    ({ item }: { item: BloggingPost }) => (
      <View style={styles.relatedRow}>
        <Pressable
          onPress={() => onPickRelated(item.id)}
          accessibilityRole="button"
          accessibilityLabel={item.title}>
          <FastImage
            source={{ uri: item.coverUri, priority: FastImage.priority.normal }}
            style={styles.relatedThumb}
            resizeMode={FastImage.resizeMode.cover}
          />
        </Pressable>
        <View style={styles.relatedText}>
          <Pressable
            onPress={() => onPickRelated(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.title}>
            <Text
              style={[styles.relatedTitle, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={2}>
              {item.title}
            </Text>
          </Pressable>
          <View style={styles.relatedMetaRow}>
            <Pressable
              onPress={() => navigateToUserProfile(item.authorId)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.authorName} profile`}>
              <Text style={[styles.relatedMeta, { fontFamily: t.fontFamily.regular }]}>
                {item.authorName}
              </Text>
            </Pressable>
            <Text style={[styles.relatedMeta, { fontFamily: t.fontFamily.regular }]}>
              {' '}
              · {item.dateLabel} · {formatCount(item.viewsCount)} views
            </Text>
          </View>
        </View>
      </View>
    ),
    [onPickRelated, t.fontFamily.regular, t.fontFamily.semibold],
  );

  const relatedKey = useCallback((item: BloggingPost) => item.id, []);

  if (showWatchSkeleton) {
    return (
      <BloggingWatchSkeleton
        miniPlayerHeight={miniH}
        onGoBack={() => navigation.goBack()}
      />
    );
  }

  if (!current) {
    return (
      <View style={[styles.fallback, { paddingTop: 24 }]}>
        <Text style={[styles.fallbackText, { fontFamily: t.fontFamily.medium }]}>
          Post not found.
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.fallbackBtn}>
          <Text style={[styles.fallbackBtnText, { fontFamily: t.fontFamily.semibold }]}>
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const renderPlayerContents = ({
    variant,
  }: {
    variant: 'inline' | 'fullscreen';
  }) => {
    const fs = variant === 'fullscreen';
    const videoUrl = adaptiveVideoUrl;
    const canShowVideo = !!videoUrl && !videoError;
    return (
      <>
        {/* Video layer */}
        {canShowVideo && videoUrl ? (
          <View style={StyleSheet.absoluteFill}>
            <Video
              ref={videoRef}
              source={{
                uri: videoUrl,
                shouldCache: true,
                bufferConfig: VIDEO_BUFFER_CONFIG,
              }}
              style={StyleSheet.absoluteFill}
              resizeMode="contain"
              // Pause ONLY on explicit user pause / screen blur. Do NOT gate
              // on `videoLoading` (buffer state): on iOS, pausing during a
              // transient buffer perturbs the AVPlayer, which flips the
              // buffer flag again, producing an endless play/pause loop —
              // especially right after the fullscreen resize animation.
              // The buffering spinner below still uses `videoLoading` for
              // visuals; it just no longer drives playback.
              paused={videoPaused}
              repeat={false}
              muted={false}
              playInBackground={false}
              playWhenInactive={false}
              onLoad={onVideoLoad}
              onProgress={onVideoProgress}
              onBuffer={onVideoBuffer}
              onSeek={onVideoSeek}
              onError={onVideoError}
              onEnd={onVideoEnd}
            />
          </View>
        ) : null}

        {/* Poster overlay while loading / error / no URL */}
        {!current.videoUrl || videoLoading || videoError ? (
          <View
            style={[StyleSheet.absoluteFill, styles.posterOverlay]}
            pointerEvents="none">
            <FastImage
              source={{ uri: current.coverUri, priority: FastImage.priority.high }}
              style={StyleSheet.absoluteFill}
              resizeMode={FastImage.resizeMode.cover}
            />
            {videoLoading && current.videoUrl && !videoError ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Tap anywhere on the video to reveal/hide the controls overlay. */}
        <Pressable
          style={styles.miniCenterTap}
          onPress={toggleControls}
          accessibilityLabel={showControls ? 'Hide controls' : 'Show controls'}
          accessibilityRole="button"
        />

        {/* Top-left back button — fullscreen only, shows with the controls
            overlay (YouTube-style). Tapping exits fullscreen. Offset by the
            safe-area insets so it clears the notch in either landscape. */}
        {fs && showControls ? (
          <Pressable
            onPress={exitFullscreen}
            hitSlop={12}
            style={[
              styles.fsBackBtn,
              {
                top: 12 + safeAreaInsets.top,
                left: 12 + safeAreaInsets.left,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Exit fullscreen">
            <BackArrowIcon size={24} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Center controls: skip back, play/pause, skip forward */}
        {showControls ? (
          <View
            style={[styles.centerControlsRow, { gap: fs ? 36 : 14 }]}
            pointerEvents="box-none">
            <Pressable
              onPress={() => goToBlog(prevBlogId)}
              disabled={!prevBlogId}
              hitSlop={10}
              style={[styles.sideSkipBtn, !prevBlogId && styles.ctrlDisabled]}
              accessibilityLabel="Previous blog"
              accessibilityRole="button"
              accessibilityState={{ disabled: !prevBlogId }}>
              <PrevBlogIcon size={fs ? 32 : 26} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => skipBy(-10)}
              hitSlop={10}
              style={styles.sideSkipBtn}
              accessibilityLabel="Skip back 10 seconds"
              accessibilityRole="button">
              <Skip10BackIcon size={fs ? 36 : 30} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={togglePlayPause}
              hitSlop={10}
              style={styles.playFab}
              accessibilityLabel={videoPaused ? 'Play' : 'Pause'}
              accessibilityRole="button">
              {videoPaused ? (
                <PlayLargeIcon size={fs ? 40 : 36} color="#FFFFFF" />
              ) : (
                <PauseIcon size={fs ? 36 : 32} color="#FFFFFF" />
              )}
            </Pressable>
            <Pressable
              onPress={() => skipBy(10)}
              hitSlop={10}
              style={styles.sideSkipBtn}
              accessibilityLabel="Skip forward 10 seconds"
              accessibilityRole="button">
              <Skip10ForwardIcon size={fs ? 36 : 30} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={() => goToBlog(nextBlogId)}
              disabled={!nextBlogId}
              hitSlop={10}
              style={[styles.sideSkipBtn, !nextBlogId && styles.ctrlDisabled]}
              accessibilityLabel="Next blog"
              accessibilityRole="button"
              accessibilityState={{ disabled: !nextBlogId }}>
              <NextBlogIcon size={fs ? 32 : 26} color="#FFFFFF" />
            </Pressable>
          </View>
        ) : null}

        {/* "Up Next" panel trigger — fullscreen only, with the controls. */}
        {fs && showControls ? (
          <Pressable
            onPress={() => setUpNextOpen((v) => !v)}
            hitSlop={10}
            style={[
              styles.queueBtn,
              {
                right: 56 + safeAreaInsets.right,
                bottom: 40 + safeAreaInsets.bottom,
              },
            ]}
            accessibilityLabel={
              upNextOpen ? 'Hide Up Next list' : 'Show Up Next list'
            }
            accessibilityRole="button">
            <QueueIcon size={20} color="#FFFFFF" />
          </Pressable>
        ) : null}

        {/* Fullscreen toggle (bottom-right) — shows with the controls. */}
        {showControls ? (
          <Pressable
            onPress={fs ? exitFullscreen : enterFullscreen}
            hitSlop={10}
            style={[
              styles.fullscreenBtn,
              fs
                ? {
                    right: 10 + safeAreaInsets.right,
                    bottom: 40 + safeAreaInsets.bottom,
                  }
                : null,
            ]}
            accessibilityLabel={fs ? 'Exit fullscreen' : 'Enter fullscreen'}
            accessibilityRole="button">
            {fs ? (
              <FullscreenExitIcon size={20} color="#FFFFFF" />
            ) : (
              <FullscreenEnterIcon size={20} color="#FFFFFF" />
            )}
          </Pressable>
        ) : null}

        {/* Bottom overlay: time + progress — shows/hides with the controls. */}
        {showControls ? (
        <View
          style={[
            styles.miniBottomBar,
            fs
              ? {
                  bottom: safeAreaInsets.bottom,
                  paddingLeft: 12 + safeAreaInsets.left,
                  paddingRight: 12 + safeAreaInsets.right,
                }
              : null,
          ]}
          pointerEvents="box-none">
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { fontFamily: t.fontFamily.regular }]}>
              {formatDuration(displayTime)}
            </Text>
            <Text style={[styles.timeText, { fontFamily: t.fontFamily.regular }]}>
              {formatDuration(duration)}
            </Text>
          </View>
          <View
            ref={progressBarRef}
            style={styles.progressHitArea}
            onLayout={e => {
              barWidthRef.current = e.nativeEvent.layout.width;
            }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={evt => onScrubTouch(evt.nativeEvent.locationX)}
            onResponderMove={evt => onScrubTouch(evt.nativeEvent.locationX)}
            onResponderRelease={evt => onScrubRelease(evt.nativeEvent.locationX)}
            onResponderTerminate={evt => onScrubRelease(evt.nativeEvent.locationX)}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressFraction * 100}%` },
                ]}
              />
              <View
                style={[
                  styles.progressKnob,
                  { left: `${progressFraction * 100}%` },
                ]}
              />
            </View>
          </View>
        </View>
        ) : null}
      </>
    );
  };

  // Pinned chrome row ("Now Playing" + minimize + favourite). Stays fixed
  // at the top while the list scrolls beneath it. Measures its own height so
  // the player can be pinned directly below it.
  const chromeRow = (
    <View
      style={[styles.chromeRow, { paddingTop: 10 }]}
      onLayout={e => {
        const h = e.nativeEvent.layout.height;
        if (h > 0 && Math.abs(h - chromeH) > 1) {
          setChromeH(h);
        }
      }}>
      <Pressable
        onPress={() => navigation.navigate('BloggingMain')}
        hitSlop={12}
        style={styles.chromeHit}
        accessibilityLabel="Minimize player"
        accessibilityRole="button">
        <ChevronDownIcon color={TITLE} />
      </Pressable>
      <Text
        style={[styles.chromeHint, { fontFamily: t.fontFamily.regular }]}
        numberOfLines={1}>
        Now Playing
      </Text>
      {token ? (
        <Pressable
          onPress={() => {
            onToggleWatchFavorite().catch(() => {});
          }}
          disabled={favSaving}
          style={styles.chromeHit}
          accessibilityRole="button"
          accessibilityLabel={
            current.isFavorite ? 'Remove from favorites' : 'Add to favorites'
          }
          accessibilityState={{ selected: current.isFavorite }}
        >
          <FeedHeartIcon
            size={24}
            color={TITLE}
            filled={current.isFavorite}
            variant="svg"
          />
        </Pressable>
      ) : (
        <View style={styles.chromeHit} />
      )}
    </View>
  );

  // Scrollable content begins below the pinned chrome + player.
  const listHeader = (
    <View>
      <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.bold }]}>
        {current.title}
      </Text>
      {current.description ? (
        <Text style={[styles.sectionSub, { fontFamily: t.fontFamily.regular }]}>
          {current.description}
        </Text>
      ) : null}

      <View style={styles.authorMetaRow}>
        <Pressable
          onPress={() => navigateToUserProfile(current.authorId)}
          accessibilityRole="button"
          accessibilityLabel={`View ${current.authorName} profile`}
          style={styles.authorAvatarBtn}>
          <UserAvatar uri={current.avatarUri} style={styles.authorAvatar} />
        </Pressable>
        <Pressable
          onPress={() => navigateToUserProfile(current.authorId)}
          accessibilityRole="button"
          accessibilityLabel={`View ${current.authorName} profile`}>
          <Text style={[styles.authorMeta, { fontFamily: t.fontFamily.regular }]}>
            {current.authorName}
          </Text>
        </Pressable>
        <Text style={[styles.authorMeta, { fontFamily: t.fontFamily.regular }]}>
          {' '}
          · {current.dateLabel} · {formatCount(current.viewsCount)} views
        </Text>
      </View>

      {suggestions.length > 0 ? (
        <Text style={[styles.upNextLabel, { fontFamily: t.fontFamily.semibold }]}>
          Up Next
        </Text>
      ) : null}
    </View>
  );

  // Pinned region height = chrome + player + a little breathing room. The
  // list content is offset by this so it starts just below the player.
  const pinnedRegionH = chromeH + miniH + 16;

  return (
    <View
      style={[styles.root, isFullscreen && styles.rootFullscreen]}
      onLayout={e => {
        const { width: w, height: h } = e.nativeEvent.layout;
        if (
          w > 0 &&
          h > 0 &&
          (Math.abs(w - rootSize.w) > 1 || Math.abs(h - rootSize.h) > 1)
        ) {
          setRootSize({ w, h });
        }
      }}>
      {/* Scrollable content (title, author, Up Next) — scrolls UNDER the
          pinned chrome + player, which sit on top with an opaque bg. */}
      <FlatList
        data={suggestions}
        keyExtractor={relatedKey}
        renderItem={renderRelated}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[
          styles.listPad,
          { paddingTop: pinnedRegionH, paddingBottom: 28 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Pinned chrome row — fixed at the top, opaque so list scrolls under
          it. Hidden in fullscreen (the player covers everything). */}
      {!isFullscreen ? (
        <View style={styles.pinnedChrome}>{chromeRow}</View>
      ) : null}

      {/* Animated player container — single <Video> instance, never
          unmounts. Pinned just below the chrome when inline; interpolates
          to a full-window rect in fullscreen. Because it's pinned (not in
          the scroll view) the Up Next list scrolls beneath it. */}
      <Animated.View
        style={[
          styles.animatedPlayerBase,
          {
            // Fullscreen target extends BEYOND the safe-area-inset root by
            // the inset amounts (negative offsets), so the black player
            // covers the ENTIRE physical screen — including the bands that
            // would otherwise show the white SafeAreaView background.
            top: fsProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [chromeH, -safeAreaInsets.top],
            }),
            left: fsProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [H_PAD, -safeAreaInsets.left],
            }),
            // Size to the live window (useWindowDimensions updates on
            // rotation) rather than the onLayout-measured rootSize, which can
            // lag a frame behind the landscape flip and leave white side
            // bands. With the negative-inset offsets above, screenW/screenH
            // (the full window) exactly cover the physical screen.
            width: fsProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [screenW - H_PAD * 2, screenW],
            }),
            height: fsProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [miniH, screenH],
            }),
            borderRadius: fsProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ]}>
        {renderPlayerContents({
          variant: isFullscreen ? 'fullscreen' : 'inline',
        })}
      </Animated.View>

      {/* Up Next side panel — only rendered while in fullscreen and the
          panel is opened from the queue button. Sits above the animated
          player so it can intercept taps. */}
      {isFullscreen && upNextOpen ? (
        <View
          style={[
            styles.upNextPanel,
            {
              paddingTop: safeAreaInsets.top,
              paddingRight: safeAreaInsets.right,
              paddingBottom: safeAreaInsets.bottom,
            },
          ]}>
          <View style={styles.upNextHeader}>
            <Text style={styles.upNextTitle}>Up Next</Text>
            <Pressable
              onPress={() => setUpNextOpen(false)}
              hitSlop={16}
              style={styles.upNextCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close Up Next list">
              <PanelCloseIcon size={20} color="#FFFFFF" />
            </Pressable>
          </View>
          <FlatList
            data={suggestions}
            keyExtractor={relatedKey}
            renderItem={({ item }) => (
              <Pressable
                style={styles.upNextRow}
                onPress={() => {
                  onPickRelated(item.id);
                  setUpNextOpen(false);
                }}
                accessibilityRole="button"
                accessibilityLabel={item.title}>
                <FastImage
                  source={{ uri: item.coverUri, priority: FastImage.priority.normal }}
                  style={styles.upNextThumb}
                  resizeMode={FastImage.resizeMode.cover}
                />
                <View style={styles.upNextText}>
                  <Text style={styles.upNextItemTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.upNextItemMeta} numberOfLines={1}>
                    {item.authorName}
                  </Text>
                </View>
              </Pressable>
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.upNextListPad}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  rootFullscreen: {
    backgroundColor: '#000000',
  },
  chromeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  /** Fixed top region holding the chrome row — opaque so the scrolling Up
      Next list passes invisibly beneath it. */
  pinnedChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    zIndex: 5,
  },
  chromeHit: {
    width: 40,
    alignItems: 'center',
  },
  chromeHint: {
    flex: 1,
    textAlign: 'center',
    fontSize: 13,
    color: MUTED,
  },
  miniPlayer: {
    // Height-reserved placeholder in the list header. The animated player
    // container at the screen root paints over this slot.
    marginHorizontal: H_PAD,
    marginBottom: 20,
  },
  animatedPlayerBase: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  miniGradient: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  miniCenterTap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControlsRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  sideSkipBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlDisabled: {
    opacity: 0.3,
  },
  fullscreenBtn: {
    position: 'absolute',
    right: 10,
    bottom: 40,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
  },
  /** Top-left fullscreen back button (YouTube-style). `top`/`left` are set
      inline from safe-area insets. */
  fsBackBtn: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 20,
  },
  /** Sits to the LEFT of the fullscreen-exit button. */
  queueBtn: {
    position: 'absolute',
    right: 56, // 10 + 36 + 10 gutter
    bottom: 40,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
  },
  // ── Up Next side panel (fullscreen only) ──
  upNextPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 320,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.15)',
  },
  upNextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  upNextTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  upNextCloseBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  upNextListPad: {
    paddingVertical: 8,
  },
  upNextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  upNextThumb: {
    width: 88,
    height: 56,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  },
  upNextText: {
    flex: 1,
  },
  upNextItemTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  upNextItemMeta: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 4,
  },
  playFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniBottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  miniTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  miniAuthor: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  timeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  posterOverlay: {
    backgroundColor: '#000',
  },
  loadingCenter: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Larger invisible touch target so the thin track is easy to grab/drag.
  progressHitArea: {
    marginTop: 8,
    paddingVertical: 9,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: LINK,
  },
  progressKnob: {
    position: 'absolute',
    top: -4,
    marginLeft: -6,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 18,
    color: TITLE,
    paddingHorizontal: H_PAD,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: MUTED,
    paddingHorizontal: H_PAD,
    marginBottom: 12,
    lineHeight: 18,
  },
  upNextLabel: {
    fontSize: 16,
    color: TITLE,
    paddingHorizontal: H_PAD,
    marginTop: 4,
    marginBottom: 8,
  },
  authorMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    marginBottom: 12,
  },
  authorAvatarBtn: {
    marginRight: 8,
  },
  authorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  authorMeta: {
    fontSize: 12,
    color: META,
  },
  listPad: {
    paddingTop: 0,
  },
  relatedRow: {
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  relatedThumb: {
    width: 128,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  relatedText: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
  },
  relatedTitle: {
    fontSize: 15,
    color: TITLE,
    lineHeight: 20,
  },
  relatedMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 4,
  },
  relatedMeta: {
    fontSize: 12,
    color: META,
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackText: {
    fontSize: 16,
    color: MUTED,
    marginBottom: 16,
  },
  fallbackBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  fallbackBtnText: {
    color: LINK,
    fontSize: 16,
  },
});
