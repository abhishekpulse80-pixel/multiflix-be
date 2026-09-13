import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
import {
  FlatList,
  RefreshControl,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { MusicHomeSkeleton } from '../components/music/MusicSkeletons';
import type { MusicStackParamList } from '../navigation/types';
import { useGetMusicFavouritesQuery } from '../store/api/musicApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import type { RootState } from '../store/store';
import { useTheme } from '../theme';
import { mapTrackDtoToRow, type MusicTrackRow } from '../types/music';
import { formatMusicStreamsLine } from '../utils/musicFormat';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';

const BG = '#F5F5F7';
const INK = '#0D0D0D';
const MUTED = '#6B6B6B';
const PURPLE = '#9333EA';
const H_PAD = 20;

type Props = NativeStackScreenProps<MusicStackParamList, 'MusicFavourites'>;

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

function HeartOutlineIcon({ size = 56, color = '#C9C9CF' }: { size?: number; color?: string }) {
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

export function MusicFavouritesScreen({ navigation }: Props) {
  useTrackScreenTime('music');
  const t = useTheme();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetMusicFavouritesQuery(undefined, { skip: !token });
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());

  const rows = useMemo<MusicTrackRow[]>(
    () => data?.items.map(mapTrackDtoToRow) ?? [],
    [data],
  );

  // No on-mount audio prefetch: warming favourites the user only scrolls past
  // was a speculative cellular-data cost. Tracks cache lazily on first play
  // (plus a 1-track lookahead during playback).

  const keyExtractor = useCallback((item: MusicTrackRow) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: MusicTrackRow }) => (
      <Pressable
        style={styles.row}
        onPress={() =>
          navigation.navigate('MusicNowPlaying', { trackId: item.id })
        }
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title}`}>
        <FastImage
          source={{ uri: item.artUri, priority: FastImage.priority.normal }}
          style={styles.thumb}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.rowText}>
          <Text
            numberOfLines={1}
            style={[styles.trackTitle, { fontFamily: t.fontFamily.semibold }]}>
            {item.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.artist, { fontFamily: t.fontFamily.regular }]}
            onPress={(e) => {
              e.stopPropagation();
              if (item.artistId) {
                navigation.navigate('ArtistProfile', { artistId: item.artistId });
              }
            }}
            suppressHighlighting>
            {item.artist}
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.streams, { fontFamily: t.fontFamily.regular }]}>
            {formatMusicStreamsLine(item.streams)}
          </Text>
        </View>
      </Pressable>
    ),
    [navigation, t.fontFamily.regular, t.fontFamily.semibold],
  );

  const header = (
    <>
<View style={[styles.topBar, { paddingTop: 12 }]}>
      <Pressable
        hitSlop={12}
        onPress={() => navigation.goBack()}
        style={styles.topIcon}
        accessibilityLabel="Back"
        accessibilityRole="button">
        <ChevronBack />
      </Pressable>
      <Text style={[styles.navTitle, { fontFamily: t.fontFamily.semibold }]}>
        My Favourites
      </Text>
      <View style={styles.topIcon} />
    </View>
    </>
  );

  if (!token) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centered}>
          <Text style={[styles.muted, { fontFamily: t.fontFamily.regular }]}>
            Sign in to see favourites.
          </Text>
        </View>
      </View>
    );
  }

  if (isLoading && !data) {
    return (
      <View style={styles.root}>
        {header}
        <MusicHomeSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centered}>
          <Text style={[styles.errorText, { fontFamily: t.fontFamily.medium }]}>
            Could not load favourites.
          </Text>
          <Pressable
            onPress={() => {
              void refetch();
            }}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry">
            <Text style={[styles.retryLabel, { fontFamily: t.fontFamily.semibold }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <View style={styles.root}>
        {header}
        <View style={styles.centered}>
          <HeartOutlineIcon />
          <Text style={[styles.emptyTitle, { fontFamily: t.fontFamily.semibold }]}>
            No favourites yet
          </Text>
          <Text style={[styles.emptyBody, { fontFamily: t.fontFamily.regular }]}>
            Tap the heart on any track to save it here.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {header}
      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 16 + 88 }]}
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
    fontSize: 16,
    color: INK,
    paddingHorizontal: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  muted: {
    fontSize: 15,
    color: MUTED,
  },
  errorText: {
    fontSize: 16,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryLabel: {
    fontSize: 16,
    color: PURPLE,
  },
  emptyTitle: {
    fontSize: 17,
    color: INK,
    marginTop: 16,
  },
  emptyBody: {
    fontSize: 14,
    color: MUTED,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: H_PAD,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: '#E8E8ED',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 16,
    color: INK,
  },
  artist: {
    fontSize: 13,
    color: MUTED,
    marginTop: 3,
  },
  streams: {
    fontSize: 13,
    color: MUTED,
    marginTop: 3,
  },
});
