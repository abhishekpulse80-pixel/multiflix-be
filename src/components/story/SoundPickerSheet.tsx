import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Sound = {
  id: string;
  title: string;
  artist: string;
  duration: string;
  /** Background color for the album-art placeholder tile. */
  color: string;
  /** Single letter shown inside the album-art tile. */
  initial: string;
};

export type SoundPickerSheetProps = {
  visible: boolean;
  selectedSoundId: string | null;
  onSelectSound: (id: string | null) => void;
  onClose: () => void;
};

// ─── Dummy data ───────────────────────────────────────────────────────────────

export const DUMMY_SOUNDS: Sound[] = [
  {
    id: '1',
    title: 'As It Was',
    artist: 'Harry Styles',
    duration: '01:00',
    color: '#7C3AED',
    initial: 'A',
  },
  {
    id: '2',
    title: 'Jiggle Jiggle',
    artist: 'Duke & Jones, Louis Thero...',
    duration: '00:40',
    color: '#059669',
    initial: 'J',
  },
  {
    id: '3',
    title: 'About Damn Time',
    artist: 'Lizzo',
    duration: '01:30',
    color: '#0EA5E9',
    initial: 'A',
  },
  {
    id: '4',
    title: 'Sunroof',
    artist: 'Nicky Youre, Dazy',
    duration: '00:50',
    color: '#B45309',
    initial: 'S',
  },
  {
    id: '5',
    title: 'Late Night Talking',
    artist: 'Harry Styles',
    duration: '01:00',
    color: '#6D28D9',
    initial: 'L',
  },
  {
    id: '6',
    title: 'STAY',
    artist: 'The Kid Laroi, Justin Bieb...',
    duration: '00:45',
    color: '#1E293B',
    initial: 'S',
  },
  {
    id: '7',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    duration: '01:00',
    color: '#DB2777',
    initial: 'H',
  },
  {
    id: '8',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    duration: '01:20',
    color: '#DC2626',
    initial: 'B',
  },
  {
    id: '9',
    title: 'Levitating',
    artist: 'Dua Lipa',
    duration: '01:10',
    color: '#0D9488',
    initial: 'L',
  },
];

// ─── Inline icons ─────────────────────────────────────────────────────────────

function CloseIcon({ size = 20, color = '#0D0D0D' }: { size?: number; color?: string }) {
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

function SearchIcon({ size = 16, color = '#9CA3AF' }: { size?: number; color?: string }) {
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

function CheckIcon({ size = 18, color = '#246BFD' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17l-5-5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UnselectedCircle({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#E0325C" strokeWidth={2} />
    </Svg>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function SoundRow({
  item,
  selected,
  onPress,
}: {
  item: Sound;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${item.title} by ${item.artist}`}
    >
      {/* Album art */}
      <View style={[styles.albumArt, { backgroundColor: item.color }]}>
        <Text style={styles.albumInitial}>{item.initial}</Text>
      </View>

      {/* Text info */}
      <View style={styles.rowInfo}>
        <Text style={styles.songTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {item.artist}
        </Text>
        <Text style={styles.songDuration}>{item.duration}</Text>
      </View>

      {/* Selection indicator */}
      <View style={styles.indicator}>
        {selected ? <CheckIcon /> : <UnselectedCircle />}
      </View>
    </Pressable>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

export function SoundPickerSheet({
  visible,
  selectedSoundId,
  onSelectSound,
  onClose,
}: SoundPickerSheetProps) {
  const [query, setQuery] = useState('');

  const filtered = DUMMY_SOUNDS.filter(
    s =>
      s.title.toLowerCase().includes(query.toLowerCase()) ||
      s.artist.toLowerCase().includes(query.toLowerCase()),
  );

  const handleSelect = (id: string) => {
    onSelectSound(selectedSoundId === id ? null : id);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop */}
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        {/* Sheet */}
        <View style={styles.sheet}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close sounds"
              hitSlop={12}
            >
              <CloseIcon />
            </Pressable>
            <Text style={styles.headerTitle}>Sounds</Text>
            {/* Spacer to center title */}
            <View style={styles.headerSpacer} />
          </View>

          {/* Pink accent underline */}
          <View style={styles.accentLine} />

          {/* Search bar */}
          <View style={styles.searchWrap}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
              accessibilityLabel="Search sounds"
            />
          </View>

          {/* List */}
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SoundRow
                item={item}
                selected={selectedSoundId === item.id}
                onPress={() => handleSelect(item.id)}
              />
            )}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No sounds found.</Text>
            }
          />
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 32,
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  closeBtn: {
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
  headerSpacer: {
    width: 40,
  },
  accentLine: {
    alignSelf: 'center',
    width: 32,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#E0325C',
    marginBottom: 16,
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0D0D0D',
    paddingVertical: 0,
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
  albumArt: {
    width: 60,
    height: 60,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  albumInitial: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
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
  indicator: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 24,
  },
});
