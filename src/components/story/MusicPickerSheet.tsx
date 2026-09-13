import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  useGetMusicRecommendedTracksQuery,
  useSearchMusicQuery,
} from '../../store/api/musicApi';
import { useListOriginalSoundsQuery } from '../../store/api/soundsApi';
import { MUSIC_TRIM_MS, MusicTrimScrubber } from './MusicTrimScrubber';

/**
 * Sheet for picking a music track to attach to a Story, with an inline
 * 15-second trim scrubber. Designed to replace the dummy `SoundPickerSheet`
 * (kept around for back-compat until Subtask 4 cuts it over).
 *
 * Behavior:
 *   1. List of recommended tracks (default) or search results.
 *   2. Tap a track → enters trim mode for that track.
 *   3. Drag the 15s window, preview, then "Use this clip" → onConfirm.
 *   4. "Remove music" sends `null` — caller stores no music.
 */

// ─── Public types ───────────────────────────────────────────────────────────

export type SelectedStoryMusic = {
  /**
   * Where the audio came from. `track` = curated music catalog (sent to
   * the backend as `musicTrackId`). `original_sound` = creator-extracted
   * sound (sent as `attachedOriginalSoundId`). The caller branches on
   * this to decide which field to put on the post-create payload.
   *
   * Optional + defaults to 'track' so existing callers that haven't
   * been updated still get the right behaviour.
   */
  source?: 'track' | 'original_sound';
  /** MusicTrack id or OriginalSound id (depending on `source`). */
  trackId: string;
  title: string;
  artistName: string | null;
  artUrl: string;
  audioUrl: string;
  durationSeconds: number;
  trimStartMs: number;
};

export type MusicPickerSheetProps = {
  visible: boolean;
  /** Currently selected music, if any (used to show "Remove music"). */
  selected: SelectedStoryMusic | null;
  onConfirm: (music: SelectedStoryMusic | null) => void;
  onClose: () => void;
  /**
   * Trim window length in ms. Defaults to 15 000 (story behavior).
   * Posts pass a larger value: 30 000 for images, up to 60 000 for video.
   */
  windowMs?: number;
  /**
   * If true, an "Original" tab is shown alongside "Library" so the user
   * can attach a creator-extracted Original Sound. Off by default — only
   * the post composer enables it for now (stories stay track-only).
   */
  showOriginalSoundsTab?: boolean;
};

// ─── Internal track row shape ───────────────────────────────────────────────

type Row = {
  id: string;
  title: string;
  artistName: string;
  artUrl: string;
  audioUrl: string;
  durationSeconds: number | null;
  /** Tagged so handleConfirm knows which back-end field to populate. */
  source: 'track' | 'original_sound';
};

// ─── Icons ──────────────────────────────────────────────────────────────────

function CloseIcon({ size = 20, color = '#0D0D0D' }) {
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

function BackIcon({ size = 22, color = '#0D0D0D' }) {
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

function SearchIcon({ size = 16, color = '#9CA3AF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDuration(seconds: number | null): string {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m)}:${s.toString().padStart(2, '0')}`;
}

// ─── Track row ──────────────────────────────────────────────────────────────

function TrackRow({
  row,
  selected,
  onPress,
  minTrackSeconds,
}: {
  row: Row;
  selected: boolean;
  onPress: () => void;
  minTrackSeconds: number;
}) {
  // Tracks with no duration metadata can't be safely trimmed (we'd have to
  // assume the window length and lose the scrubber). Treat them the same
  // as too-short.
  const noDuration = row.durationSeconds == null;
  const tooShort =
    row.durationSeconds != null && row.durationSeconds < minTrackSeconds;
  const disabled = noDuration || tooShort;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
        disabled && styles.rowDisabled,
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${row.title} by ${row.artistName}`}
      accessibilityState={{ selected, disabled }}
    >
      <Image source={{ uri: row.artUrl }} style={styles.albumArt} />
      <View style={styles.rowInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {row.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {row.artistName}
        </Text>
        <Text style={styles.songDuration}>
          {noDuration
            ? 'Length unknown — unavailable'
            : tooShort
              ? 'Too short for 15s clip'
              : formatDuration(row.durationSeconds)}
        </Text>
      </View>
      {selected ? <View style={styles.selectedDot} /> : null}
    </Pressable>
  );
}

// ─── Sheet ──────────────────────────────────────────────────────────────────

export function MusicPickerSheet({
  visible,
  selected,
  onConfirm,
  onClose,
  windowMs,
  showOriginalSoundsTab,
}: MusicPickerSheetProps) {
  const windowMsValue = windowMs ?? MUSIC_TRIM_MS;
  const minTrackSeconds = windowMsValue / 1000;
  const [query, setQuery] = useState('');
  const [trimRow, setTrimRow] = useState<Row | null>(null);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [activeTab, setActiveTab] = useState<'library' | 'original'>('library');

  const trimmed = query.trim();
  const isSearching = trimmed.length >= 2;
  const showLibrary = activeTab === 'library';

  const recommended = useGetMusicRecommendedTracksQuery(undefined, {
    skip: !visible || !showLibrary || isSearching,
  });
  const search = useSearchMusicQuery(
    { q: trimmed, limit: 30 },
    { skip: !visible || !showLibrary || !isSearching },
  );
  const originalSounds = useListOriginalSoundsQuery(
    { page: 0, limit: 30 },
    { skip: !visible || showLibrary },
  );

  const rows: Row[] = useMemo(() => {
    if (!showLibrary) {
      // Original-sounds tab — same row shape, branding-different source.
      // We filter to clips at least the trim-window long; anything shorter
      // can't fill the post's audio slot.
      const items = originalSounds.data?.items ?? [];
      return items
        .filter(
          s =>
            s.audioUrl != null &&
            (s.durationSeconds ?? 0) >= minTrackSeconds,
        )
        .map(s => ({
          id: s.id,
          title: s.title,
          artistName: `@${s.ownerUsername}`,
          artUrl: s.ownerAvatarUrl ?? '',
          audioUrl: s.audioUrl as string,
          durationSeconds: s.durationSeconds,
          source: 'original_sound' as const,
        }));
    }
    const dtos = isSearching
      ? search.data?.tracks ?? []
      : recommended.data?.items ?? [];
    return dtos.map(d => ({
      id: d.id,
      title: d.title,
      artistName: d.artist?.name ?? d.artistName,
      artUrl: d.artUrl,
      audioUrl: d.audioUrl,
      durationSeconds: d.durationSeconds,
      source: 'track' as const,
    }));
  }, [
    showLibrary,
    isSearching,
    recommended.data,
    search.data,
    originalSounds.data,
    minTrackSeconds,
  ]);

  const loading = showLibrary
    ? isSearching
      ? search.isFetching
      : recommended.isFetching
    : originalSounds.isFetching;

  // Reset transient state when the sheet is closed.
  useEffect(() => {
    if (!visible) {
      setTrimRow(null);
      setTrimStartMs(0);
      setQuery('');
      setActiveTab('library');
    }
  }, [visible]);

  // Clear the search box when flipping to the Original tab so we don't
  // show stale music-search results while the user's eyes adjust.
  useEffect(() => {
    setQuery('');
  }, [activeTab]);

  const handleSelectRow = (row: Row) => {
    setTrimRow(row);
    setTrimStartMs(selected?.trackId === row.id ? selected.trimStartMs : 0);
  };

  const handleConfirm = () => {
    if (!trimRow || trimRow.durationSeconds == null) return;
    onConfirm({
      source: trimRow.source,
      trackId: trimRow.id,
      title: trimRow.title,
      artistName: trimRow.artistName || null,
      artUrl: trimRow.artUrl,
      audioUrl: trimRow.audioUrl,
      durationSeconds: trimRow.durationSeconds,
      trimStartMs,
    });
  };

  const handleRemoveMusic = () => {
    onConfirm(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.headerBtn}
              onPress={trimRow ? () => setTrimRow(null) : onClose}
              accessibilityRole="button"
              accessibilityLabel={trimRow ? 'Back to list' : 'Close music picker'}
              hitSlop={12}
            >
              {trimRow ? <BackIcon /> : <CloseIcon />}
            </Pressable>
            <Text style={styles.headerTitle}>
              {trimRow ? 'Trim clip' : 'Add music'}
            </Text>
            <View style={styles.headerBtn} />
          </View>

          <View style={styles.accentLine} />

          {trimRow ? (
            // ── Trim mode ───────────────────────────────────────────────────
            <View style={styles.trimWrap}>
              <View style={styles.trimHeader}>
                <Image
                  source={{ uri: trimRow.artUrl }}
                  style={styles.trimArt}
                />
                <View style={styles.trimMeta}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {trimRow.title}
                  </Text>
                  <Text style={styles.songArtist} numberOfLines={1}>
                    {trimRow.artistName}
                  </Text>
                </View>
              </View>

              <MusicTrimScrubber
                trackId={trimRow.id}
                audioUrl={trimRow.audioUrl}
                durationSeconds={trimRow.durationSeconds ?? minTrackSeconds}
                trimStartMs={trimStartMs}
                onTrimStartChange={setTrimStartMs}
                windowMs={windowMsValue}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.confirmBtn,
                  pressed && styles.confirmBtnPressed,
                ]}
                onPress={handleConfirm}
                accessibilityRole="button"
              >
                <Text style={styles.confirmBtnText}>Use this clip</Text>
              </Pressable>
            </View>
          ) : (
            // ── List mode ───────────────────────────────────────────────────
            <>
              {/* Library / Original tab toggle — only when the host screen
                  enabled it (post composer). Stories skip this and stay
                  on the curated catalog. */}
              {showOriginalSoundsTab ? (
                <View style={styles.tabsRow}>
                  <Pressable
                    style={[
                      styles.tabBtn,
                      showLibrary && styles.tabBtnActive,
                    ]}
                    onPress={() => setActiveTab('library')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: showLibrary }}>
                    <Text
                      style={[
                        styles.tabLabel,
                        showLibrary && styles.tabLabelActive,
                      ]}>
                      Library
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.tabBtn,
                      !showLibrary && styles.tabBtnActive,
                    ]}
                    onPress={() => setActiveTab('original')}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !showLibrary }}>
                    <Text
                      style={[
                        styles.tabLabel,
                        !showLibrary && styles.tabLabelActive,
                      ]}>
                      Original
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {/* Search is only meaningful for the curated library. The
                  Original tab is browse-only for now (catalog is small). */}
              {showLibrary ? (
                <View style={styles.searchWrap}>
                  <SearchIcon />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search songs or artists"
                    placeholderTextColor="#9CA3AF"
                    value={query}
                    onChangeText={setQuery}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    accessibilityLabel="Search music"
                  />
                </View>
              ) : null}

              {loading ? (
                <View style={styles.loadingWrap}>
                  <ActivityIndicator color="#246BFD" />
                </View>
              ) : (
                <FlatList
                  data={rows}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item }) => (
                    <TrackRow
                      row={item}
                      selected={selected?.trackId === item.id}
                      onPress={() => handleSelectRow(item)}
                      minTrackSeconds={minTrackSeconds}
                    />
                  )}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.emptyText}>
                      {showLibrary
                        ? isSearching
                          ? 'No songs match your search.'
                          : 'No songs available.'
                        : 'No original sounds yet. Be the first — your next video will create one.'}
                    </Text>
                  }
                />
              )}

              {selected ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.removeBtn,
                    pressed && styles.removeBtnPressed,
                  ]}
                  onPress={handleRemoveMusic}
                  accessibilityRole="button"
                >
                  <Text style={styles.removeBtnText}>Remove music</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    minHeight: '50%',
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    marginTop: 10,
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  accentLine: {
    alignSelf: 'center',
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#246BFD',
    marginBottom: 12,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: '#0D0D0D',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D0D0D',
    paddingVertical: 0,
  },
  loadingWrap: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: '#F9FAFB',
  },
  rowDisabled: {
    opacity: 0.45,
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  songTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0D0D0D',
  },
  songArtist: {
    fontSize: 13,
    color: '#6B7280',
  },
  songDuration: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#246BFD',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 24,
  },
  trimWrap: {
    paddingHorizontal: 4,
  },
  trimHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  trimArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  trimMeta: {
    flex: 1,
  },
  confirmBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: '#246BFD',
    borderRadius: 14,
    alignItems: 'center',
  },
  confirmBtnPressed: {
    opacity: 0.85,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  removeBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    alignItems: 'center',
  },
  removeBtnPressed: {
    backgroundColor: '#F9FAFB',
  },
  removeBtnText: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '600',
  },
});
