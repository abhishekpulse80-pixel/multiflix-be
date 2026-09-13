import React, { useCallback, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

/**
 * Music trim window length depends on the post media:
 *  - image post → fixed 30 s
 *  - video post → matches the video duration, capped at MAX_VIDEO_MUSIC_MS
 */
const IMAGE_MUSIC_WINDOW_MS = 30_000;
const MAX_VIDEO_MUSIC_MS = 60_000;

type Props = NativeStackScreenProps<RootStackParamList, 'MediaPreview'>;

/* ─── Icons ──────────────────────────────────────────────────── */

function ArrowLeftIcon({
  size = 24,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
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

/* ─── Screen ─────────────────────────────────────────────────── */

export function MediaPreviewScreen({ navigation, route }: Props) {
  const { mediaUri, fileName, mimeType, isVideo, initialMusic } = route.params;
  const insets = useSafeAreaInsets();

  const [soundPickerVisible, setSoundPickerVisible] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<SelectedStoryMusic | null>(
    initialMusic ?? null,
  );
  /** Source video duration (s), captured from `<Video onLoad>` for videos. */
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);

  // Music window length the picker should enforce. Image posts always use
  // 30 s; video posts match the source video, capped at 60 s. While we
  // don't yet have the loaded duration, we conservatively use the cap.
  const musicWindowMs = isVideo
    ? Math.min(
        MAX_VIDEO_MUSIC_MS,
        Math.round((videoDurationSec ?? MAX_VIDEO_MUSIC_MS / 1000) * 1000),
      )
    : IMAGE_MUSIC_WINDOW_MS;

  const handleDiscard = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNext = useCallback(() => {
    // Auto-derive a "Track — Artist" display label so older code that still
    // reads `soundTitle` (e.g. legacy post rendering paths) keeps working.
    const soundTitle = selectedMusic
      ? selectedMusic.artistName
        ? `${selectedMusic.title} — ${selectedMusic.artistName}`
        : selectedMusic.title
      : null;
    // The picker tags each selection with its origin. Map the universal
    // `trackId` field to the backend-shaped field (`musicTrackId` for
    // curated tracks, `attachedOriginalSoundId` for OriginalSounds) before
    // handing it to CreatePost.
    const isOriginalSound = selectedMusic?.source === 'original_sound';
    navigation.navigate('CreatePost', {
      mediaUri,
      fileName,
      mimeType,
      isVideo,
      soundTitle,
      musicTrackId:
        selectedMusic && !isOriginalSound ? selectedMusic.trackId : null,
      attachedOriginalSoundId:
        selectedMusic && isOriginalSound ? selectedMusic.trackId : null,
      musicTrimStartMs: selectedMusic?.trimStartMs ?? null,
    });
  }, [navigation, mediaUri, fileName, mimeType, isVideo, selectedMusic]);

  return (
    <View style={styles.root}>
{/* Full-screen media preview. Videos render via Video so we can
          capture duration via `onLoad` and use it to size the music window. */}
      {isVideo ? (
        <Video
          source={{ uri: mediaUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          repeat
          // Mute the source video when the user has picked music so they
          // hear only the curated track in the preview.
          muted={selectedMusic != null}
          onLoad={(e) => {
            if (typeof e.duration === 'number' && e.duration > 0) {
              setVideoDurationSec(e.duration);
            }
          }}
        />
      ) : (
        <Image
          source={{ uri: mediaUri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}

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

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top }]}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          accessibilityLabel="Go back"
          hitSlop={12}
        >
          <ArrowLeftIcon />
        </Pressable>

        {/* Add Sound pill — label dynamically reflects the picked track. */}
        <Pressable
          onPress={() => setSoundPickerVisible(true)}
          style={styles.addSoundPill}
          accessibilityLabel={
            selectedMusic ? `Sound: ${selectedMusic.title}` : 'Add Sound'
          }
        >
          <MusicNoteIcon size={14} />
          <Text style={styles.addSoundText} numberOfLines={1}>
            {selectedMusic ? selectedMusic.title : 'Add Sound'}
          </Text>
        </Pressable>

        {/* Spacer so pill stays centered */}
        <View style={styles.iconBtn} />
      </View>

      {/* Bottom buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {/* Selected music chip */}
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
            >
              <Text style={styles.chipRemoveText}>✕</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.buttonRow}>
          <Pressable
            style={({ pressed }) => [
              styles.discardBtn,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleDiscard}
            accessibilityLabel="Discard"
          >
            <Text style={styles.discardText}>Discard</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleNext}
            accessibilityLabel="Next"
          >
            <Text style={styles.nextText}>Next</Text>
          </Pressable>
        </View>
      </View>

      {/* Music picker — window length matches the post media:
          30 s for image posts, video duration capped at 60 s for video. */}
      <MusicPickerSheet
        visible={soundPickerVisible}
        selected={selectedMusic}
        onConfirm={(music) => {
          setSelectedMusic(music);
          setSoundPickerVisible(false);
        }}
        onClose={() => setSoundPickerVisible(false)}
        windowMs={musicWindowMs}
        // Posts can attach a creator's Original Sound; stories still
        // only use the curated catalog (their picker omits this prop).
        showOriginalSoundsTab
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },

  /* Top bar */
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
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

  /* Bottom bar */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.35)',
    gap: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  discardBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,200,200,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B4C4C',
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
  nextText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* Sound chip */
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
});
