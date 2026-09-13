import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useFocusEffect } from '@react-navigation/native';
import React,
  { useCallback,
  useMemo,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Video, { type VideoRef } from 'react-native-video';
import type { RootStackParamList } from '../navigation/types';
import {
  useGetOriginalSoundByIdQuery,
  useGetPostsUsingSoundQuery,
} from '../store/api/soundsApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useAppSelector } from '../store/hooks';
import { selectAccessToken } from '../store/selectors';
import { useAdaptiveMediaUrl } from '../hooks/useAdaptiveMediaUrl';
import type { SoundPostListItem } from '../types/soundsApi';
import { useTheme } from '../theme';
import { formatCount } from '../utils/formatCount';
import {
  assetToMediaPayload,
  isVideoMime,
  pickMediaFromCamera,
  pickMediaFromLibrary,
  type CameraMode,
} from '../utils/pickMedia';
import { openTrimEditor } from '../utils/trimVideo';
import { toastError } from '../utils/toast';
import { getApiErrorMessage } from '../utils/apiError';
import {
  ProfilePhotoSourceSheet,
  type ProfilePhotoSource,
} from '../components/profile/ProfilePhotoSourceSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'SoundDetail'>;

const BG = '#FFFFFF';
const INK = '#0D0D0D';
const MUTED = '#6B6B6B';
const PINK = '#FCE3E6';
const ACCENT = '#246BFD';
const H_PAD = 16;
const COLS = 3;
const GAP = 4;

function ChevronBack({ size = 24, color = INK }: { size?: number; color?: string }) {
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

function NoteIcon({ size = 48, color = ACCENT }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
    </Svg>
  );
}

function PlayBadge({ size = 32 }: { size?: number }) {
  return (
    <View
      style={[
        styles.playBadge,
        { width: size, height: size, borderRadius: size / 2 },
      ]}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill={ACCENT}>
        <Path d="M8 5v14l11-7L8 5z" />
      </Svg>
    </View>
  );
}

export function SoundDetailScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { soundId, initialTitle, initialArtUrl } = route.params;
  const token = useAppSelector(selectAccessToken);
  const { width: screenW } = useWindowDimensions();

  const detail = useGetOriginalSoundByIdQuery(soundId, {
    skip: !token,
    refetchOnMountOrArgChange: true,
  });
  const postsQ = useGetPostsUsingSoundQuery(
    { soundId, page: 0, limit: 30 },
    { skip: !token, refetchOnMountOrArgChange: true },
  );
  const { refreshing, onRefresh } = usePullToRefresh(() => postsQ.refetch());

  const sound = detail.data ?? null;
  const items = postsQ.data?.items ?? [];
  const total = postsQ.data?.total ?? 0;
  const title = sound?.title ?? initialTitle ?? 'Original sound';
  // We use the owner's avatar (or the post thumbnail if no avatar) as art —
  // mirrors how the picker row is shown so the visual identity is stable.
  const artUrl = sound?.ownerAvatarUrl ?? initialArtUrl ?? null;
  const audioUrl = sound?.audioUrl ?? null;
  const adaptiveAudioUrl = useAdaptiveMediaUrl(audioUrl ?? '', 'audio', token);
  const durationSeconds = sound?.durationSeconds ?? null;
  const ownerHandle = sound?.ownerUsername ? `@${sound.ownerUsername}` : null;

  // ── Audio preview (play/pause on art) ───────────────────────────────────
  const videoRef = useRef<VideoRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = useCallback(() => {
    if (!audioUrl) return;
    setIsPlaying(prev => !prev);
  }, [audioUrl]);

  // Pause when the screen loses focus so audio doesn't bleed across screens.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setIsPlaying(false);
      };
    }, []),
  );

  const cellSize = useMemo(
    () => Math.floor((screenW - H_PAD * 2 - GAP * (COLS - 1)) / COLS),
    [screenW],
  );

  const [useSoundBusy, setUseSoundBusy] = useState(false);
  const [sourceSheetOpen, setSourceSheetOpen] = useState(false);

  const handleUseThisSound = useCallback(() => {
    if (useSoundBusy) return;
    setSourceSheetOpen(true);
  }, [useSoundBusy]);

  // Mirror MusicFeedScreen's flow exactly — pick media (camera or gallery),
  // trim video clips, then push MediaPreview with this sound pre-attached
  // so the user lands in the same preview/caption flow as a normal upload.
  const handleUseSoundSource = useCallback(
    async (source: ProfilePhotoSource) => {
      setSourceSheetOpen(false);
      if (useSoundBusy) return;
      setUseSoundBusy(true);
      try {
        let asset;
        if (source === 'library') {
          asset = await pickMediaFromLibrary();
        } else if (source === 'camera-photo') {
          asset = await pickMediaFromCamera('photo' as CameraMode);
        } else if (source === 'camera-video') {
          asset = await pickMediaFromCamera('video' as CameraMode);
        } else {
          asset = await pickMediaFromCamera('video' as CameraMode);
        }
        if (!asset?.uri) return;
        const payload = assetToMediaPayload(asset);
        if (!payload) return;

        const isVideo = isVideoMime(payload.type);
        let mediaUri = payload.uri;

        if (isVideo) {
          const trimResult = await openTrimEditor(payload.uri, 60);
          if (!trimResult) {
            return;
          }
          mediaUri = trimResult.outputPath.startsWith('/')
            ? `file://${trimResult.outputPath}`
            : trimResult.outputPath;
        }

        navigation.navigate('MediaPreview', {
          mediaUri,
          fileName: payload.name,
          mimeType: payload.type,
          isVideo,
          initialMusic: audioUrl
            ? {
                // Tagged so MediaPreview / CreatePost route this through the
                // attachedOriginalSoundId field on the backend instead of
                // the curated musicTrackId path.
                source: 'original_sound',
                trackId: soundId,
                title,
                artistName: ownerHandle,
                artUrl: artUrl ?? '',
                audioUrl,
                durationSeconds: durationSeconds ?? 30,
                trimStartMs: 0,
              }
            : undefined,
        });
      } catch (e: unknown) {
        toastError('Use this sound', getApiErrorMessage(e));
      } finally {
        setUseSoundBusy(false);
      }
    },
    [
      useSoundBusy,
      audioUrl,
      soundId,
      title,
      ownerHandle,
      artUrl,
      durationSeconds,
      navigation,
    ],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SoundPostListItem; index: number }) => {
      const col = index % COLS;
      const marginRight = col === COLS - 1 ? 0 : GAP;
      const thumb = item.thumbnailUrl || item.mediaUrl || '';
      return (
        <Pressable
          style={[
            styles.cell,
            {
              width: cellSize,
              height: cellSize * 1.5,
              marginRight,
              marginBottom: GAP,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open video">
          <Image
            source={{ uri: thumb }}
            style={styles.thumb}
            resizeMode="cover"
          />
          <View style={styles.playOverlay} pointerEvents="none">
            <PlayBadge />
          </View>
          <View style={styles.countBadge} pointerEvents="none">
            <Svg width={10} height={10} viewBox="0 0 24 24" fill="#FFFFFF">
              <Path d="M8 5v14l11-7L8 5z" />
            </Svg>
            <Text
              style={[styles.countText, { fontFamily: t.fontFamily.semibold }]}
              numberOfLines={1}>
              {formatCount(item.likesCount)}
            </Text>
          </View>
        </Pressable>
      );
    },
    [cellSize, t.fontFamily.semibold],
  );

  const keyExtractor = useCallback((item: SoundPostListItem) => item.id, []);

  return (
    <View style={styles.root}>
<View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={styles.topBtn}
          accessibilityRole="button"
          accessibilityLabel="Back">
          <ChevronBack />
        </Pressable>
      </View>

      <View style={styles.header}>
        <Pressable
          style={styles.artCircle}
          onPress={togglePlay}
          disabled={!audioUrl}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause sound' : 'Play sound'}>
          {artUrl ? (
            <Image source={{ uri: artUrl }} style={styles.artImg} resizeMode="cover" />
          ) : (
            <NoteIcon />
          )}
          {audioUrl ? (
            <View style={styles.artOverlay} pointerEvents="none">
              <View style={styles.artPlayBtn}>
                {isPlaying ? (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </Svg>
                ) : (
                  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFFFFF">
                    <Path d="M8 5v14l11-7L8 5z" />
                  </Svg>
                )}
              </View>
            </View>
          ) : null}
        </Pressable>
        <View style={styles.headerText}>
          <Text
            style={[styles.title, { fontFamily: t.fontFamily.bold }]}
            numberOfLines={1}>
            {title}
          </Text>
          {ownerHandle ? (
            <Text
              style={[styles.artist, { fontFamily: t.fontFamily.medium }]}
              numberOfLines={1}>
              {ownerHandle}
            </Text>
          ) : null}
          <Text
            style={[styles.subtitle, { fontFamily: t.fontFamily.regular }]}
            numberOfLines={1}>
            {`${formatCount(total)} ${total === 1 ? 'Post' : 'Posts'}`}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.useSoundWrap}>
        <Pressable
          onPress={handleUseThisSound}
          disabled={useSoundBusy || !audioUrl}
          style={[
            styles.useSoundBtn,
            (useSoundBusy || !audioUrl) ? styles.useSoundBtnDisabled : null,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Use this sound">
          {useSoundBusy ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Svg width={18} height={18} viewBox="0 0 24 24" fill="#FFFFFF">
                <Path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z" />
              </Svg>
              <Text
                style={[styles.useSoundText, { fontFamily: t.fontFamily.semibold }]}>
                Use this sound
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {postsQ.isFetching && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : postsQ.isError ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            Could not load posts.
          </Text>
          <Pressable onPress={() => postsQ.refetch()} hitSlop={8}>
            <Text style={[styles.retryLink, { fontFamily: t.fontFamily.semibold }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            Be the first to use this sound.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={COLS}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={REFRESH_TINT}
              colors={[REFRESH_TINT]}
            />
          }
        />
      )}

      <ProfilePhotoSourceSheet
        visible={sourceSheetOpen}
        onClose={() => setSourceSheetOpen(false)}
        onSelectSource={source => {
          void handleUseSoundSource(source);
        }}
        title="Upload media"
        libraryLabel="Gallery"
        cameraLabel="Camera"
        showCameraModePicker
      />

      {audioUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: adaptiveAudioUrl }}
          paused={!isPlaying}
          repeat
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onEnd={() => setIsPlaying(false)}
          onError={() => setIsPlaying(false)}
          style={styles.hiddenPlayer}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    height: 48,
  },
  topBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 18,
    gap: 16,
  },
  artCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artImg: { width: '100%', height: '100%' },
  artOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  artPlayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenPlayer: { width: 0, height: 0, position: 'absolute' },
  headerText: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, color: INK },
  artist: { fontSize: 14, color: INK, marginTop: 2 },
  subtitle: { fontSize: 14, color: MUTED, marginTop: 4 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
    marginHorizontal: H_PAD,
  },
  useSoundWrap: {
    paddingHorizontal: H_PAD,
    paddingTop: 14,
    paddingBottom: 6,
  },
  useSoundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 10,
    backgroundColor: ACCENT,
  },
  useSoundBtnDisabled: { opacity: 0.6 },
  useSoundText: { color: '#FFFFFF', fontSize: 15 },
  gridContent: {
    paddingHorizontal: H_PAD,
    paddingTop: GAP * 2,
    paddingBottom: 24,
  },
  cell: {
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  thumb: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadge: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(36, 107, 253, 0.9)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  countText: { color: '#FFFFFF', fontSize: 10 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: { fontSize: 15, color: MUTED, textAlign: 'center' },
  retryLink: { fontSize: 15, color: ACCENT },
});
