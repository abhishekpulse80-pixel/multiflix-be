import {
  useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { MusicNowPlayingSkeleton } from '../components/music/MusicSkeletons';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import type { MusicStackParamList } from '../navigation/types';
import {
  useGetMusicAlbumByIdQuery,
  useGetMusicFavouritesQuery,
  useGetMusicRecommendedTracksQuery,
  useGetMusicTrackByIdQuery,
  useRecordMusicTrackPlayMutation,
  useSetMusicTrackFavouriteMutation,
} from '../store/api/musicApi';
import type { RootState } from '../store/store';
import { useTheme } from '../theme';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError } from '../utils/toast';
import {
  getAdjacentTrackId,
  getMusicTrackById,
  getUpcomingMusicRows,
  mapTrackDtoToRow,
  type MusicTrackRow,
} from '../types/music';
import { formatMusicStreamsLine } from '../utils/musicFormat';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';

const BG = '#000000';
const INK = '#FFFFFF';
const ON_PURPLE = '#FFFFFF';
const MUTED = '#AEAEB2';
const PURPLE = '#9333EA';
const HEART_OFF = '#9CA3AF';
const H_PAD = 20;

type Props = NativeStackScreenProps<MusicStackParamList, 'MusicNowPlaying'>;

function ChevronBack({ color = INK, size = 22 }: { color?: string; size?: number }) {
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

function HeartIcon({
  size = 22,
  color,
  filled,
}: {
  size?: number;
  color: string;
  filled: boolean;
}) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill={color}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
      />
    </Svg>
  );
}

function SkipBackIcon({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 6h2v12H6V6zm11 1l-7 5 7 5V7z" />
    </Svg>
  );
}

function SkipFwdIcon({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M16 18h2V6h-2v12zM6 7l7 5-7 5V7z" />
    </Svg>
  );
}

function Skip10BackIcon({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 5V2L7 6l5 4V7a6 6 0 110 12 6 6 0 01-6-6H4a8 8 0 108-8z" />
    </Svg>
  );
}

function Skip10FwdIcon({ size = 28, color = INK }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 5V2l5 4-5 4V7a6 6 0 106 6h2a8 8 0 11-8-8z" />
    </Svg>
  );
}

function PauseIcon({ size = 28, color = ON_PURPLE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
    </Svg>
  );
}

function PlayIcon({ size = 32, color = ON_PURPLE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M8 5v14l11-7L8 5z" />
    </Svg>
  );
}

function headerSubtitle(track: MusicTrackRow): string {
  const first = track.artist.split(' ')[0] ?? track.artist;
  return `${track.title} by ${first}`;
}

/** Format seconds as `m:ss` (or `h:mm:ss` for tracks ≥ 1 hour). */
function formatMusicTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  if (h > 0) {
    const mm = m.toString().padStart(2, '0');
    return `${h}:${mm}:${ss}`;
  }
  return `${m}:${ss}`;
}

export function MusicNowPlayingScreen({ navigation, route }: Props) {
  useTrackScreenTime('music');
  const t = useTheme();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const { width: screenW } = useWindowDimensions();
  const { sourceAlbumId } = route.params;
  // Keep the active track in local state so switching tracks updates the
  // player in-place instead of remounting the screen via navigation.replace.
  const [trackId, setTrackId] = useState<string>(route.params.trackId);

  const { data: recommendedData, isLoading: recLoading } =
    useGetMusicRecommendedTracksQuery(undefined, { skip: !token });
  const { data: albumData, isLoading: albumLoading } = useGetMusicAlbumByIdQuery(
    sourceAlbumId ?? '',
    { skip: !token || !sourceAlbumId },
  );

  // Authoritative favourite flag for whatever track is open, independent of
  // which list it came from (favourites pagination, recommended, search…).
  const { data: trackDetail } = useGetMusicTrackByIdQuery(trackId, {
    skip: !token || !trackId,
  });

  // Favourites cache (shared with the Favourites screen) — used as a fast
  // fallback while the single-track query loads, and to resolve a
  // favourite-only track that isn't in the recommended/album catalog.
  const { data: favouritesData } = useGetMusicFavouritesQuery(undefined, {
    skip: !token,
  });
  const favouriteRows = useMemo(
    () => favouritesData?.items.map(mapTrackDtoToRow) ?? [],
    [favouritesData],
  );
  const favouritedIds = useMemo(
    () => new Set(favouriteRows.map(r => r.id)),
    [favouriteRows],
  );
  const detailRow = useMemo(
    () => (trackDetail?.track ? mapTrackDtoToRow(trackDetail.track) : undefined),
    [trackDetail],
  );

  const catalog = useMemo((): MusicTrackRow[] => {
    if (sourceAlbumId) {
      if (!albumData) {
        return [];
      }
      return albumData.tracks.map(mapTrackDtoToRow);
    }
    return recommendedData?.items.map(mapTrackDtoToRow) ?? [];
  }, [albumData, recommendedData, sourceAlbumId]);

  const catalogLoading = sourceAlbumId ? albumLoading : recLoading;

  const resolvedCurrent = useMemo(
    // Resolve from catalog → favourites → single-track detail, so any track
    // opened by id (from any list) still resolves for display/playback.
    () =>
      getMusicTrackById(trackId, catalog) ??
      getMusicTrackById(trackId, favouriteRows) ??
      detailRow,
    [catalog, favouriteRows, detailRow, trackId],
  );
  // Keep the last track resolved FOR THIS trackId so a transient cache churn
  // (e.g. a list refetch after favouriting) can't momentarily blank the Now
  // Playing screen into the "Track not found" fallback.
  const lastResolvedRef = useRef<MusicTrackRow | undefined>(undefined);
  if (resolvedCurrent && resolvedCurrent.id === trackId) {
    lastResolvedRef.current = resolvedCurrent;
  }
  const current =
    resolvedCurrent ??
    (lastResolvedRef.current?.id === trackId
      ? lastResolvedRef.current
      : undefined);
  const upcoming = useMemo(
    () => getUpcomingMusicRows(trackId, catalog),
    [catalog, trackId],
  );

  const player = useMusicPlayer();
  const {
    track: playerTrack,
    playing,
    currentTime,
    duration,
    loadTrack,
    togglePlay,
    seekTo,
    skipBy,
    setOnTrackEnd,
    setNowPlayingFocused,
  } = player;

  const [liked, setLiked] = useState(false);
  const [setMusicFavourite, { isLoading: favSaving }] =
    useSetMusicTrackFavouriteMutation();
  const [recordPlay] = useRecordMusicTrackPlayMutation();
  const playCountedRef = useRef(false);

  // Scrubbing state — while the user drags the bar, display this value instead of `currentTime`.
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);
  const scrubbingRef = useRef(false);
  const durationRef = useRef(0);
  const barWidthRef = useRef(0);
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // Reset local-only state (scrub + play-counted flag) when the track changes.
  useEffect(() => {
    setScrubbing(false);
    setScrubValue(0);
    scrubbingRef.current = false;
    playCountedRef.current = false;
  }, [trackId]);

  // Sync heart state. The single-track endpoint is authoritative once loaded;
  // until then fall back to the favourites cache / catalog flag so the heart
  // is right immediately when opened from the Favourites screen.
  const detailFav = trackDetail?.track.favouritedByViewer;
  const isFavourited =
    detailFav !== undefined
      ? detailFav
      : favouritedIds.has(trackId) || (current?.favouritedByViewer ?? false);
  useEffect(() => {
    setLiked(isFavourited);
  }, [isFavourited]);

  const onToggleFavourite = useCallback(async () => {
    if (!current) return;
    const next = !liked;
    setLiked(next);
    try {
      const res = await setMusicFavourite({
        trackId: current.id,
        favourited: next,
      }).unwrap();
      setLiked(res.favourited);
    } catch (e: unknown) {
      setLiked(!next);
      toastError('Could not update favourite', getApiErrorMessage(e));
    }
  }, [current, liked, setMusicFavourite]);

  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;
  const displayProgress = scrubbing ? scrubValue : progress;

  const artSize = useMemo(() => Math.min(screenW - H_PAD * 2, 320), [screenW]);

  const barW = screenW - H_PAD * 2;
  const fillW = Math.round(barW * displayProgress);

  // Push the screen's selected track into the player whenever it changes
  // (initial mount, prev/next, or tapping an upcoming row). Also publishes
  // the current catalog as the player's queue so the MiniPlayer can step
  // prev/next when this screen isn't visible.
  useEffect(() => {
    if (current?.id && current?.audioUrl) {
      const queue = catalog
        .filter(row => !!row.audioUrl)
        .map(row => ({
          id: row.id,
          audioUrl: row.audioUrl as string,
          title: row.title,
          artist: row.artist,
          artUri: row.artUri,
          artistId: row.artistId ?? null,
        }));
      loadTrack(
        {
          id: current.id,
          audioUrl: current.audioUrl,
          title: current.title,
          artist: current.artist,
          artUri: current.artUri,
          artistId: current.artistId ?? null,
        },
        queue,
        sourceAlbumId ?? null,
      );
    }
  }, [
    current?.id,
    current?.audioUrl,
    current?.title,
    current?.artist,
    current?.artUri,
    current?.artistId,
    catalog,
    sourceAlbumId,
    loadTrack,
  ]);

  // Hide the MiniPlayer while NowPlaying is the focused screen.
  useFocusEffect(
    useCallback(() => {
      setNowPlayingFocused(true);
      return () => setNowPlayingFocused(false);
    }, [setNowPlayingFocused]),
  );

  // Count one stream after 3s of playback per track-open. Reads from the
  // shared player's currentTime, since the Video lives in the provider.
  useEffect(() => {
    if (
      !playCountedRef.current &&
      currentTime >= 3 &&
      current?.id &&
      playerTrack?.id === current.id
    ) {
      playCountedRef.current = true;
      recordPlay(current.id)
        .unwrap()
        .catch(() => {
          playCountedRef.current = false;
        });
    }
  }, [currentTime, current?.id, playerTrack?.id, recordPlay]);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: evt => {
          scrubbingRef.current = true;
          setScrubbing(true);
          const w = barWidthRef.current || 1;
          const ratio = clamp01(evt.nativeEvent.locationX / w);
          setScrubValue(ratio);
        },
        onPanResponderMove: evt => {
          const w = barWidthRef.current || 1;
          // `locationX` on move is finger-relative-to-responder-view — what we want.
          setScrubValue(clamp01(evt.nativeEvent.locationX / w));
        },
        onPanResponderRelease: () => {
          const dur = durationRef.current;
          const target = scrubValue;
          if (dur > 0) {
            const seconds = clamp01(target) * dur;
            seekTo(seconds);
          }
          scrubbingRef.current = false;
          setScrubbing(false);
        },
        onPanResponderTerminate: () => {
          scrubbingRef.current = false;
          setScrubbing(false);
        },
      }),
    [scrubValue, seekTo],
  );

  const goPrev = useCallback(() => {
    const id = getAdjacentTrackId(trackId, 'prev', catalog);
    if (id) {
      setTrackId(id);
    }
  }, [catalog, trackId]);

  const goNext = useCallback(() => {
    const id = getAdjacentTrackId(trackId, 'next', catalog);
    if (id) {
      setTrackId(id);
    }
  }, [catalog, trackId]);

  // When the current track finishes in the provider, advance.
  useEffect(() => {
    setOnTrackEnd(() => goNext());
    return () => setOnTrackEnd(null);
  }, [goNext, setOnTrackEnd]);

  if (!token) {
    return (
      <View style={[styles.fallback, { paddingTop: 40 }]}>
        <Text style={[styles.fallbackText, { fontFamily: t.fontFamily.medium }]}>
          Sign in to play music.
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.fallbackLink, { fontFamily: t.fontFamily.semibold }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (catalogLoading && catalog.length === 0) {
    return <MusicNowPlayingSkeleton />;
  }

  if (!current) {
    return (
      <View style={[styles.fallback, { paddingTop: 40 }]}>
        <Text style={[styles.fallbackText, { fontFamily: t.fontFamily.medium }]}>
          Track not found.
        </Text>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={[styles.fallbackLink, { fontFamily: t.fontFamily.semibold }]}>Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
<View style={[styles.topBar, { paddingTop: 12 }]}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.topIcon}
          accessibilityLabel="Back"
          accessibilityRole="button">
          <ChevronBack />
        </Pressable>
        <Text style={[styles.navTitle, { fontFamily: t.fontFamily.semibold }]} numberOfLines={1}>
          {headerSubtitle(current)}
        </Text>
        <Pressable
          hitSlop={12}
          onPress={() => {
            onToggleFavourite().catch(() => {});
          }}
          disabled={favSaving || !current}
          style={styles.topIcon}
          accessibilityLabel={liked ? 'Remove from favourites' : 'Add to favourites'}
          accessibilityRole="button">
          <HeartIcon color={liked ? PURPLE : HEART_OFF} filled={liked} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.body, { paddingBottom: 96 }]}
        showsVerticalScrollIndicator={false}>
        <View style={[styles.artWrap, { width: artSize, height: artSize }]}>
          <Image
            source={{ uri: current.artUri }}
            style={styles.art}
            resizeMode="cover"
            accessibilityLabel={current.title}
          />
        </View>

        <Text style={[styles.songTitle, { fontFamily: t.fontFamily.bold }]}>{current.title}</Text>
        <Text
          style={[styles.songArtist, { fontFamily: t.fontFamily.regular }]}
          onPress={() => {
            if (current.artistId) {
              navigation.navigate('ArtistProfile', { artistId: current.artistId });
            }
          }}
          suppressHighlighting>
          {current.artist}
        </Text>

        <View
          style={[styles.progressHit, { width: barW }]}
          onLayout={e => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) barWidthRef.current = w;
          }}
          {...panResponder.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(displayProgress * 100),
          }}>
          <View style={styles.progressOuter}>
            <View style={[styles.progressFill, { width: fillW }]} />
          </View>
          <View
            style={[
              styles.progressThumb,
              { left: Math.max(0, fillW - 7) },
            ]}
          />
        </View>

        <View style={[styles.timeRow, { width: barW }]}>
          <Text
            style={[styles.timeText, { fontFamily: t.fontFamily.regular }]}
            accessibilityLabel="Current time">
            {formatMusicTime(
              scrubbing ? scrubValue * duration : currentTime,
            )}
          </Text>
          <Text
            style={[styles.timeText, { fontFamily: t.fontFamily.regular }]}
            accessibilityLabel="Track duration">
            {formatMusicTime(duration)}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            style={styles.sideCtrl}
            onPress={goPrev}
            accessibilityLabel="Previous track"
            accessibilityRole="button">
            <SkipBackIcon />
          </Pressable>
          <Pressable
            style={styles.sideCtrl}
            onPress={() => skipBy(-10)}
            accessibilityLabel="Skip back 10 seconds"
            accessibilityRole="button">
            <Skip10BackIcon />
          </Pressable>
          <Pressable
            style={styles.playMain}
            onPress={togglePlay}
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            accessibilityRole="button">
            {playing ? (
              <PauseIcon size={30} color={ON_PURPLE} />
            ) : (
              <PlayIcon size={34} color={ON_PURPLE} />
            )}
          </Pressable>
          <Pressable
            style={styles.sideCtrl}
            onPress={() => skipBy(10)}
            accessibilityLabel="Skip forward 10 seconds"
            accessibilityRole="button">
            <Skip10FwdIcon />
          </Pressable>
          <Pressable
            style={styles.sideCtrl}
            onPress={goNext}
            accessibilityLabel="Next track"
            accessibilityRole="button">
            <SkipFwdIcon />
          </Pressable>
        </View>

        <Text style={[styles.sectionLabel, { fontFamily: t.fontFamily.bold }]}>Upcoming</Text>

        {upcoming.map((item) => (
          <Pressable
            key={item.id}
            style={styles.upRow}
            onPress={() => setTrackId(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.title}>
            <Image source={{ uri: item.artUri }} style={styles.upThumb} />
            <View style={styles.upText}>
              <Text style={[styles.upTitle, { fontFamily: t.fontFamily.semibold }]}>
                {item.title}
              </Text>
              <Text
                style={[styles.upMeta, { fontFamily: t.fontFamily.regular }]}
                onPress={(e) => {
                  e.stopPropagation();
                  if (item.artistId) {
                    navigation.navigate('ArtistProfile', { artistId: item.artistId });
                  }
                }}
                suppressHighlighting>
                {item.artist}
              </Text>
              <Text style={[styles.upMeta, { fontFamily: t.fontFamily.regular }]}>
                {formatMusicStreamsLine(item.streams)}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 12,
  },
  topIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 15,
    color: INK,
    paddingHorizontal: 8,
  },
  scroll: {
    flex: 1,
  },
  body: {
    alignItems: 'stretch',
    paddingHorizontal: H_PAD,
  },
  artWrap: {
    alignSelf: 'center',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    marginTop: 8,
    marginBottom: 28,
  },
  art: {
    width: '100%',
    height: '100%',
  },
  songTitle: {
    alignSelf: 'center',
    fontSize: 26,
    color: INK,
    textAlign: 'center',
    marginBottom: 8,
    maxWidth: '100%',
  },
  songArtist: {
    alignSelf: 'center',
    fontSize: 16,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: '100%',
  },
  progressHit: {
    alignSelf: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 4,
  },
  timeRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 12,
    color: MUTED,
  },
  progressOuter: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: PURPLE,
  },
  progressThumb: {
    position: 'absolute',
    alignSelf: 'center',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: PURPLE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 14,
    marginBottom: 36,
  },
  sideCtrl: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playMain: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PURPLE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  sectionLabel: {
    fontSize: 18,
    color: INK,
    marginBottom: 14,
  },
  upRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  upThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
  },
  upText: {
    flex: 1,
    minWidth: 0,
  },
  upTitle: {
    fontSize: 16,
    color: INK,
  },
  upMeta: {
    fontSize: 13,
    color: MUTED,
    marginTop: 3,
  },
  fallback: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fallbackText: {
    color: MUTED,
    fontSize: 16,
    marginBottom: 16,
  },
  fallbackLink: {
    color: PURPLE,
    fontSize: 16,
  },
});
