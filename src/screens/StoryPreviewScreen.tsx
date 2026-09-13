import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
  type PanGestureHandlerStateChangeEvent,
  type PinchGestureHandlerStateChangeEvent,
} from 'react-native-gesture-handler';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import {
  MusicPickerSheet,
  type SelectedStoryMusic,
} from '../components/story/MusicPickerSheet';
import { MediaMusicPlayer } from '../components/common/MediaMusicPlayer';
import { useCreateStoryMutation, useUploadSingleMediaMutation } from '../store';
import { getApiErrorMessage } from '../utils/apiError';
import { localImageUriToUploadPayload } from '../utils/pickProfilePhoto';
import { toCreateStoryFileRef } from '../utils/toCreateStoryFileRef';
import { toastError } from '../utils/toast';
import type {
  StoryMediaTransformDto,
  StoryTextOverlayDto,
} from '../types/storiesApi';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Music trim window for stories — mirrors the post-create flow:
 *  - image story → fixed 30 s window
 *  - video story → matches the video duration, capped at 60 s
 */
const STORY_VIDEO_MAX_SECONDS = 60;
const IMAGE_MUSIC_WINDOW_MS = 30_000;
const MAX_VIDEO_MUSIC_MS = STORY_VIDEO_MAX_SECONDS * 1000;

type Props = NativeStackScreenProps<RootStackParamList, 'StoryPreview'>;

const TEXT_COLORS = ['#FFFFFF', '#000000', '#FF3B5C', '#F4D03F', '#246BFD'];
/** Continuous text-size range used by the editor's slider. */
const TEXT_SIZE_MIN = 14;
const TEXT_SIZE_MAX = 60;
const DEFAULT_TEXT_SIZE = 28;

/**
 * Inline horizontal slider for picking text size in the story text editor.
 * Tap or drag anywhere on the track to set the value. Renders a filled
 * portion + a draggable thumb + the current pt label on the right.
 */
function TextSizeSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const fraction =
    trackWidth > 0
      ? Math.max(
          0,
          Math.min(1, (value - TEXT_SIZE_MIN) / (TEXT_SIZE_MAX - TEXT_SIZE_MIN)),
        )
      : 0;
  const thumbX = fraction * trackWidth;

  const valueRef = useRef(value);
  valueRef.current = value;

  const updateFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) {
        return;
      }
      const f = Math.max(0, Math.min(1, x / trackWidth));
      const next = Math.round(
        TEXT_SIZE_MIN + f * (TEXT_SIZE_MAX - TEXT_SIZE_MIN),
      );
      if (next !== valueRef.current) {
        onChange(next);
      }
    },
    [onChange, trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => {
          updateFromX(e.nativeEvent.locationX);
        },
        onPanResponderMove: e => {
          updateFromX(e.nativeEvent.locationX);
        },
      }),
    [updateFromX],
  );

  return (
    <View style={sliderStyles.wrap}>
      <View
        style={sliderStyles.trackHit}
        onLayout={e => {
          setTrackWidth(e.nativeEvent.layout.width);
        }}
        {...panResponder.panHandlers}
      >
        <View style={sliderStyles.track} />
        <View style={[sliderStyles.fill, { width: thumbX }]} />
        <View
          style={[
            sliderStyles.thumb,
            { left: Math.max(0, thumbX - SLIDER_THUMB / 2) },
          ]}
        />
      </View>
      <Text style={sliderStyles.value}>{String(value)}pt</Text>
    </View>
  );
}

const SLIDER_THUMB = 22;
const sliderStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trackHit: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#246BFD',
  },
  thumb: {
    position: 'absolute',
    top: (32 - SLIDER_THUMB) / 2,
    width: SLIDER_THUMB,
    height: SLIDER_THUMB,
    borderRadius: SLIDER_THUMB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#246BFD',
  },
  value: {
    minWidth: 40,
    textAlign: 'right',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});

// ─── Icons ───────────────────────────────────────────────────────────────────

function CloseIcon({
  size = 22,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
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

function MusicNoteIcon({
  size = 16,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18V5l12-2v13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6 21a3 3 0 100-6 3 3 0 000 6zM18 19a3 3 0 100-6 3 3 0 000 6z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

function measureImageSize(
  uri: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

/**
 * One draggable text overlay. Holds its own gesture state so dragging one
 * overlay doesn't re-render the whole screen on every move tick. Commits
 * the new normalized x/y back up via `onPositionChange` only on release.
 */
function DraggableTextOverlay({
  index,
  overlay,
  canvasW,
  canvasH,
  onPositionChange,
  onTap,
}: {
  index: number;
  overlay: StoryTextOverlayDto;
  canvasW: number;
  canvasH: number;
  onPositionChange: (index: number, x: number, y: number) => void;
  onTap: (index: number) => void;
}) {
  const startRef = useRef({ x: 0, y: 0 });
  const movedRef = useRef(false);
  const [drag, setDrag] = useState({ dx: 0, dy: 0 });

  const baseLeft = overlay.x * canvasW;
  const baseTop = overlay.y * canvasH;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderGrant: () => {
          startRef.current = { x: baseLeft, y: baseTop };
          movedRef.current = false;
        },
        onPanResponderMove: (_, g) => {
          if (Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2) {
            movedRef.current = true;
          }
          setDrag({ dx: g.dx, dy: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          if (movedRef.current) {
            const newX = startRef.current.x + g.dx;
            const newY = startRef.current.y + g.dy;
            const clampedX = Math.max(0, Math.min(canvasW - 4, newX)) / canvasW;
            const clampedY = Math.max(0, Math.min(canvasH - 4, newY)) / canvasH;
            onPositionChange(index, clampedX, clampedY);
          } else {
            onTap(index);
          }
          setDrag({ dx: 0, dy: 0 });
        },
        onPanResponderTerminate: () => {
          setDrag({ dx: 0, dy: 0 });
        },
      }),
    [baseLeft, baseTop, canvasW, canvasH, index, onPositionChange, onTap],
  );

  return (
    <View
      style={[
        styles.overlayItem,
        {
          left: baseLeft + drag.dx,
          top: baseTop + drag.dy,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Text
        style={{
          color: overlay.color,
          fontSize: overlay.fontSize,
          fontWeight: '700',
          textShadowColor: 'rgba(0,0,0,0.55)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 4,
        }}
      >
        {overlay.text}
      </Text>
    </View>
  );
}

export function StoryPreviewScreen({ navigation, route }: Props) {
  const { imageUri, fileName, mimeType, isVideo = false } = route.params;
  const insets = useSafeAreaInsets();

  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SelectedStoryMusic | null>(
    null,
  );
  const [posting, setPosting] = useState(false);
  const [showInTrending, setShowInTrending] = useState(true);
  const [optionsOpen, setOptionsOpen] = useState(false);
  /** Source video duration captured from `<Video onLoad>` (video stories only). */
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);

  // Music window length the picker enforces and the preview player loops.
  // Image stories use a fixed 30 s; video stories match the source video,
  // capped at 60 s (fall back to the cap until the duration is known).
  const musicWindowMs = useMemo(
    () =>
      isVideo
        ? Math.min(
            MAX_VIDEO_MUSIC_MS,
            Math.round((videoDurationSec ?? STORY_VIDEO_MAX_SECONDS) * 1000),
          )
        : IMAGE_MUSIC_WINDOW_MS,
    [isVideo, videoDurationSec],
  );

  // ── Text overlay editor (image stories only)
  const [overlays, setOverlays] = useState<StoryTextOverlayDto[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState('#FFFFFF');
  const [draftSize, setDraftSize] = useState(DEFAULT_TEXT_SIZE);

  const [canvasSize, setCanvasSize] = useState<{ w: number; h: number } | null>(
    null,
  );

  const openEditorForNew = useCallback(() => {
    setEditingIndex(null);
    setDraftText('');
    setDraftColor('#FFFFFF');
    setDraftSize(DEFAULT_TEXT_SIZE);
    setEditorOpen(true);
  }, []);

  const openEditorForEdit = useCallback(
    (index: number) => {
      const o = overlays[index];
      if (!o) return;
      setEditingIndex(index);
      setDraftText(o.text);
      setDraftColor(o.color);
      setDraftSize(o.fontSize);
      setEditorOpen(true);
    },
    [overlays],
  );

  const onConfirmEditor = useCallback(() => {
    const trimmed = draftText.trim();
    if (trimmed.length === 0) {
      setEditorOpen(false);
      return;
    }
    if (editingIndex !== null) {
      setOverlays(prev =>
        prev.map((o, i) =>
          i === editingIndex
            ? { ...o, text: trimmed, color: draftColor, fontSize: draftSize }
            : o,
        ),
      );
    } else {
      setOverlays(prev => [
        ...prev,
        {
          text: trimmed,
          x: 0.1,
          y: 0.45,
          color: draftColor,
          fontSize: draftSize,
        },
      ]);
    }
    setEditorOpen(false);
  }, [draftText, draftColor, draftSize, editingIndex]);

  const onDeleteCurrent = useCallback(() => {
    if (editingIndex === null) return;
    setOverlays(prev => prev.filter((_, i) => i !== editingIndex));
    setEditorOpen(false);
  }, [editingIndex]);

  const updateOverlayPosition = useCallback(
    (index: number, x: number, y: number) => {
      setOverlays(prev =>
        prev.map((o, i) => (i === index ? { ...o, x, y } : o)),
      );
    },
    [],
  );

  // ── Pinch + pan transform on the media ──────────────────────────────────
  // Uses the legacy `Animated` API (no reanimated dependency). We track
  // a *committed* base value plus an *in-flight* gesture value, and combine
  // them with `Animated.add`/`Animated.multiply` so updates feel native
  // smooth. On gesture end, the in-flight value is folded into the base.
  const baseScale = useRef(new Animated.Value(1)).current;
  const pinchScale = useRef(new Animated.Value(1)).current;
  const baseTx = useRef(new Animated.Value(0)).current;
  const baseTy = useRef(new Animated.Value(0)).current;
  const panTx = useRef(new Animated.Value(0)).current;
  const panTy = useRef(new Animated.Value(0)).current;
  /** Last committed values — used when sending the transform on post. */
  const transformRef = useRef({ scale: 1, translateX: 0, translateY: 0 });

  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: pinchScale } }],
    { useNativeDriver: true },
  );
  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: panTx, translationY: panTy } }],
    { useNativeDriver: true },
  );

  const onPinchStateChange = useCallback(
    (e: PinchGestureHandlerStateChangeEvent) => {
      if (e.nativeEvent.oldState === State.ACTIVE) {
        const next = clamp(
          transformRef.current.scale * e.nativeEvent.scale,
          0.5,
          5,
        );
        transformRef.current.scale = next;
        baseScale.setValue(next);
        pinchScale.setValue(1);
      }
    },
    [baseScale, pinchScale],
  );

  const onPanStateChange = useCallback(
    (e: PanGestureHandlerStateChangeEvent) => {
      if (e.nativeEvent.oldState === State.ACTIVE) {
        transformRef.current.translateX += e.nativeEvent.translationX;
        transformRef.current.translateY += e.nativeEvent.translationY;
        baseTx.setValue(transformRef.current.translateX);
        baseTy.setValue(transformRef.current.translateY);
        panTx.setValue(0);
        panTy.setValue(0);
      }
    },
    [baseTx, baseTy, panTx, panTy],
  );

  const pinchRef = useRef(null);
  const panRef = useRef(null);

  const [uploadMedia] = useUploadSingleMediaMutation();
  const [createStory] = useCreateStoryMutation();

  const handlePostToStory = useCallback(async () => {
    if (posting) {
      return;
    }

    // Video stories must be within the 60 s cap (the pick-time trim
    // editor enforces this; we keep a safety check in case some other
    // entry point bypasses it).
    if (
      isVideo &&
      videoDurationSec != null &&
      videoDurationSec > STORY_VIDEO_MAX_SECONDS + 0.5
    ) {
      toastError(
        'Story',
        `Video must be at most ${String(STORY_VIDEO_MAX_SECONDS)} seconds.`,
      );
      return;
    }

    const payload = localImageUriToUploadPayload(imageUri, {
      fileName,
      mimeType,
    });
    if (!payload) {
      toastError('Story', 'Could not read this media.');
      return;
    }
    setPosting(true);
    try {
      const uploadRes = await uploadMedia(payload).unwrap();
      const file = toCreateStoryFileRef(uploadRes.file);
      const dims = isVideo ? null : await measureImageSize(imageUri);
      const soundTitle = selectedMusic
        ? selectedMusic.artistName
          ? `${selectedMusic.title} — ${selectedMusic.artistName}`
          : selectedMusic.title
        : null;
      // Normalize pan offsets to a fraction of the canvas so the same
      // payload renders consistently on different screen sizes. Skip
      // sending when the user didn't transform anything (identity).
      const t = transformRef.current;
      const w = canvasSize?.w ?? 0;
      const h = canvasSize?.h ?? 0;
      const isIdentity =
        Math.abs(t.scale - 1) < 0.001 &&
        Math.abs(t.translateX) < 0.5 &&
        Math.abs(t.translateY) < 0.5;
      const mediaTransform: StoryMediaTransformDto | null = isIdentity
        ? null
        : {
            scale: t.scale,
            translateX: w > 0 ? t.translateX / w : 0,
            translateY: h > 0 ? t.translateY / h : 0,
          };
      await createStory({
        mediaKind: isVideo ? 'short_video' : 'image',
        file,
        soundTitle,
        musicTrackId: selectedMusic?.trackId ?? null,
        musicTrimStartMs: selectedMusic?.trimStartMs ?? null,
        caption: null,
        mediaWidth: dims?.width ?? null,
        mediaHeight: dims?.height ?? null,
        // Send the actual measured video duration so the viewer's
        // progress bar + music window match the clip exactly.
        durationSeconds: isVideo ? videoDurationSec ?? null : null,
        showInTrending,
        textOverlays: overlays,
        mediaTransform,
      }).unwrap();

      navigation.goBack();
    } catch (e: unknown) {
      toastError('Story', getApiErrorMessage(e));
    } finally {
      setPosting(false);
    }
  }, [
    posting,
    imageUri,
    fileName,
    mimeType,
    isVideo,
    videoDurationSec,
    uploadMedia,
    createStory,
    selectedMusic,
    showInTrending,
    overlays,
    canvasSize,
    navigation,
  ]);

  return (
    <View style={styles.root}>
{/* ── Full-screen media (pinch + pan transformable). Pinch and pan
              are nested as `simultaneousHandlers` so the user can zoom
              and reposition at the same time, like Instagram. */}
      <PinchGestureHandler
        ref={pinchRef}
        simultaneousHandlers={panRef}
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}>
        <Animated.View style={StyleSheet.absoluteFill}>
          <PanGestureHandler
            ref={panRef}
            simultaneousHandlers={pinchRef}
            minPointers={1}
            maxPointers={2}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}>
            <Animated.View
              style={[
                styles.image,
                {
                  transform: [
                    { translateX: Animated.add(baseTx, panTx) },
                    { translateY: Animated.add(baseTy, panTy) },
                    { scale: Animated.multiply(baseScale, pinchScale) },
                  ],
                },
              ]}>
              {isVideo ? (
                <Video
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                  repeat
                  // Mute the source video preview when music has been
                  // picked, so the user only hears their selected clip.
                  muted={selectedMusic != null}
                  onLoad={e => {
                    if (typeof e.duration === 'number' && e.duration > 0) {
                      setVideoDurationSec(e.duration);
                    }
                  }}
                />
              ) : (
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="cover"
                />
              )}
            </Animated.View>
          </PanGestureHandler>
        </Animated.View>
      </PinchGestureHandler>

      {/* Loop the attached track continuously while composing (Instagram-style).
          The source video is muted above when music is set, so no double audio.
          Paused while the picker sheet is open (it previews its own audio). */}
      {selectedMusic ? (
        <MediaMusicPlayer
          audioUrl={selectedMusic.audioUrl}
          trimStartMs={selectedMusic.trimStartMs}
          windowMs={musicWindowMs}
          paused={soundPickerVisible}
        />
      ) : null}

      {/* ── Text overlay canvas. Captures its own size once via onLayout so
              the PanResponder can convert finger pixels to normalized 0..1
              coords for storage. Works for both image and video stories. */}
      <View
        style={styles.overlayCanvas}
        pointerEvents="box-none"
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          if (width > 0 && height > 0) {
            setCanvasSize({ w: width, h: height });
          }
        }}
      >
        {canvasSize
          ? overlays.map((o, i) => (
              <DraggableTextOverlay
                key={`o-${i}`}
                index={i}
                overlay={o}
                canvasW={canvasSize.w}
                canvasH={canvasSize.h}
                onPositionChange={updateOverlayPosition}
                onTap={openEditorForEdit}
              />
            ))
          : null}
      </View>

      {/* ── Right-side vertical icon strip (Snapchat-style).
              The close (X) is the first icon, replacing the old left-side
              back arrow. Anchored just below the safe-area top so there's
              no extra dead space. */}
      <View
        style={[styles.rightRail, { top: insets.top }]}
        pointerEvents="box-none"
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.railBtn}
          accessibilityLabel="Close"
          accessibilityRole="button"
          hitSlop={6}
        >
          <CloseIcon size={20} />
        </Pressable>

        <Pressable
          onPress={openEditorForNew}
          style={styles.railBtn}
          accessibilityLabel="Add text"
          accessibilityRole="button"
          hitSlop={6}
        >
          <Text style={styles.railAaText}>Aa</Text>
        </Pressable>

        <Pressable
          onPress={() => setSoundPickerVisible(true)}
          style={styles.railBtn}
          accessibilityLabel={
            selectedMusic ? `Sound: ${selectedMusic.title}` : 'Add sound'
          }
          accessibilityRole="button"
          hitSlop={6}
        >
          <MusicNoteIcon size={20} />
          {selectedMusic ? <View style={styles.railBadge} /> : null}
        </Pressable>

        <Pressable
          onPress={() => setOptionsOpen(true)}
          style={styles.railBtn}
          accessibilityLabel="More options"
          accessibilityRole="button"
          hitSlop={6}
        >
          <Text style={styles.railDots}>⋯</Text>
        </Pressable>
      </View>

      {/* ── Dark scrim — bottom */}
      <View style={[styles.bottomScrim, { paddingBottom: insets.bottom + 16 }]}>
        {/* Selected music chip — tap ✕ to remove the track before posting. */}
        {selectedMusic ? (
          <View style={styles.soundChip}>
            <Image
              source={{ uri: selectedMusic.artUrl }}
              style={styles.chipArtImage}
            />
            <View style={styles.chipInfo}>
              <Text style={styles.chipTitle} numberOfLines={1}>
                {selectedMusic.title}
              </Text>
              <Text style={styles.chipArtist} numberOfLines={1}>
                {selectedMusic.artistName ?? ''}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedMusic(null)}
              hitSlop={10}
              style={styles.chipRemove}
              accessibilityRole="button"
              accessibilityLabel="Remove music"
            >
              <Text style={styles.chipRemoveText}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.postBtn,
              (pressed || posting) && { opacity: 0.85 },
              posting && styles.postBtnDisabled,
            ]}
            onPress={() => {
              void handlePostToStory();
            }}
            disabled={posting}
            accessibilityRole="button"
            accessibilityLabel="Post to Story"
          >
            {posting ? (
              <ActivityIndicator color="#246BFD" />
            ) : (
              <Text style={styles.postBtnText}>Post to Story</Text>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── Text editor modal */}
      <Modal
        visible={editorOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEditorOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.editorBackdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEditorOpen(false)}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          />
          <View style={styles.editorCard}>
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              placeholder="Type something…"
              placeholderTextColor="rgba(255,255,255,0.5)"
              style={[
                styles.editorInput,
                { color: draftColor, fontSize: draftSize },
              ]}
              multiline
              autoFocus
              maxLength={300}
            />

            {/* Color chips */}
            <View style={styles.editorRow}>
              {TEXT_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => setDraftColor(c)}
                  style={[
                    styles.colorChip,
                    { backgroundColor: c },
                    draftColor === c && styles.chipSelected,
                  ]}
                  accessibilityLabel={`Color ${c}`}
                />
              ))}
            </View>

            {/* Size slider */}
            <View style={styles.editorRow}>
              <TextSizeSlider value={draftSize} onChange={setDraftSize} />
            </View>

            {/* Actions */}
            <View style={styles.editorActions}>
              {editingIndex !== null ? (
                <Pressable
                  onPress={onDeleteCurrent}
                  style={styles.editorBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                >
                  <Text style={styles.editorDeleteText}>Delete</Text>
                </Pressable>
              ) : (
                <View style={styles.editorBtn} />
              )}
              <Pressable
                onPress={onConfirmEditor}
                style={[styles.editorBtn, styles.editorDoneBtn]}
                accessibilityRole="button"
                accessibilityLabel="Done"
              >
                <Text style={styles.editorDoneText}>Done</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Music picker sheet — window length matches the story media:
              30 s for image stories, video duration capped at 60 s for video. */}
      <MusicPickerSheet
        visible={soundPickerVisible}
        selected={selectedMusic}
        onConfirm={music => {
          setSelectedMusic(music);
          setSoundPickerVisible(false);
        }}
        onClose={() => setSoundPickerVisible(false)}
        windowMs={musicWindowMs}
      />

      {/* ── Options popover (triggered by the header three-dots) */}
      <Modal
        visible={optionsOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.optionsBackdrop}
          onPress={() => setOptionsOpen(false)}
        />
        <View
          style={[
            styles.optionsCard,
            // Rail starts at insets.top, the dots is the 4th button:
            // 4 * (40 height + 14 gap) ≈ 216 → anchor card just below it.
            { top: insets.top + 220 },
          ]}
        >
          <View style={styles.trendingRow}>
            <View style={styles.trendingTextWrap}>
              <Text style={styles.trendingTitle}>Show on Trending</Text>
              <Text style={styles.trendingSubtitle}>
                Let everyone discover this story on the Trending page
              </Text>
            </View>
            <Switch
              value={showInTrending}
              onValueChange={setShowInTrending}
              trackColor={{ false: 'rgba(255,255,255,0.25)', true: '#246BFD' }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="rgba(255,255,255,0.25)"
              disabled={posting}
              accessibilityLabel="Show on Trending"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  image: {
    ...StyleSheet.absoluteFill,
  },

  // Text overlay layer (sits on top of the media, below the chrome scrims).
  overlayCanvas: {
    ...StyleSheet.absoluteFill,
  },
  overlayItem: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // Top scrim — solid black band (matches StoryViewer chrome)
  topScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#000000',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  aaPill: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aaPillText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  addSoundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 24,
    maxWidth: 200,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  addSoundText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Right-side vertical icon strip
  rightRail: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
    gap: 14,
  },
  railBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  railAaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  railDots: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginTop: -8, // visual centering for the ⋯ glyph
  },
  /** Small blue dot shown over the music icon when a track is attached. */
  railBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#246BFD',
  },
  // Options popover (anchored under the header)
  optionsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  optionsCard: {
    position: 'absolute',
    right: 12,
    minWidth: 280,
    maxWidth: 320,
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },

  // Bottom scrim — solid black band (matches StoryViewer chrome)
  bottomScrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#000000',
    gap: 16,
  },

  // Show on Trending toggle (inside options popover)
  trendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  trendingTextWrap: {
    flex: 1,
  },
  trendingTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trendingSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  /* Selected-music chip (with ✕ remove) — mirrors MediaPreviewScreen. */
  soundChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  chipArtImage: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  chipInfo: {
    flex: 1,
    gap: 2,
  },
  chipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  chipArtist: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  chipRemove: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemoveText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  postBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  postBtnDisabled: {
    opacity: 0.75,
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#246BFD',
  },
  nextBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#246BFD',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#246BFD',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.45,
          shadowRadius: 14,
        }
      : { elevation: 8 }),
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Text editor modal
  editorBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'flex-end',
  },
  editorCard: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    gap: 14,
  },
  editorInput: {
    minHeight: 60,
    maxHeight: 160,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  editorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  colorChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  sizeChip: {
    minWidth: 36,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },
  sizeChipTextSelected: {
    color: '#000000',
  },
  chipSelected: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  editorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  editorBtn: {
    minWidth: 80,
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorDoneBtn: {
    backgroundColor: '#246BFD',
  },
  editorDoneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  editorDeleteText: {
    color: '#E0413C',
    fontSize: 14,
    fontWeight: '600',
  },
});
