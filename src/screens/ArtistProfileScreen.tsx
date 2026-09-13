import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSelector } from 'react-redux';
import type { MusicStackParamList } from '../navigation/types';
import { useGetMusicArtistByIdQuery } from '../store/api/musicApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import type { RootState } from '../store/store';
import { useTheme } from '../theme';
import { mapAlbumListItemToRow, mapTrackDtoToRow } from '../types/music';
import { formatCount } from '../utils/formatCount';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';

const BG = '#F5F5F7';
const TITLE = '#0D0D0D';
const META = '#6B6B6B';
const H_PAD = 20;
const THUMB = 64;
const ALBUM = 120;
const ALBUM_RADIUS = 15;
const PROFILE = 120;

type Props = NativeStackScreenProps<MusicStackParamList, 'ArtistProfile'>;

function ChevronBack({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
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

function formatStreams(n: number): string {
  return `${formatCount(n)} streams`;
}

export function ArtistProfileScreen({ navigation, route }: Props) {
  useTrackScreenTime('music');
  const t = useTheme();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const { artistId } = route.params;

  const { data, isLoading, isFetching, isError, refetch } = useGetMusicArtistByIdQuery(
    artistId,
    { skip: !token || !artistId },
  );
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());

  const albums = useMemo(
    () => (data ? data.albums.map(mapAlbumListItemToRow) : []),
    [data],
  );
  const tracks = useMemo(
    () => (data ? data.tracks.map(mapTrackDtoToRow) : []),
    [data],
  );

  useEffect(() => {
    if (!token || !artistId) {
      return;
    }
    if (isLoading && !data) {
      return;
    }
    if (!isFetching && (isError || !data)) {
      navigation.goBack();
    }
  }, [artistId, data, isError, isFetching, isLoading, navigation, token]);

  const renderTrack = useCallback(
    ({ item }: { item: ReturnType<typeof mapTrackDtoToRow> }) => (
      <Pressable
        onPress={() =>
          navigation.navigate('MusicNowPlaying', { trackId: item.id })
        }
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title}`}>
        <View style={styles.row}>
          <Image source={{ uri: item.artUri }} style={styles.thumb} />
          <View style={styles.rowText}>
            <Text style={[styles.trackTitle, { fontFamily: t.fontFamily.semibold }]}>
              {item.title}
            </Text>
            <Text style={[styles.streams, { fontFamily: t.fontFamily.regular }]}>
              {formatStreams(item.streams)}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [navigation, t.fontFamily.regular, t.fontFamily.semibold],
  );

  const keyExtractor = useCallback(
    (item: ReturnType<typeof mapTrackDtoToRow>) => item.id,
    [],
  );

  if (!token) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={[styles.muted, { fontFamily: t.fontFamily.regular }]}>
          Sign in to view this artist.
        </Text>
      </View>
    );
  }

  if (isLoading && !data) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={TITLE} />
      </View>
    );
  }

  if (isError || !data) {
    return null;
  }

  const listHeader = (
    <>
      <View style={styles.profileBlock}>
        {data.profileImageUrl ? (
          <Image source={{ uri: data.profileImageUrl }} style={styles.profileImg} />
        ) : (
          <View style={[styles.profileImg, styles.profileFallback]}>
            <Text style={[styles.profileInitial, { fontFamily: t.fontFamily.bold }]}>
              {data.name.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={[styles.profileName, { fontFamily: t.fontFamily.bold }]} numberOfLines={2}>
          {data.name}
        </Text>
        {data.bio ? (
          <Text style={[styles.profileBio, { fontFamily: t.fontFamily.regular }]}>
            {data.bio}
          </Text>
        ) : null}
      </View>

      {albums.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
            Albums
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumScroll}>
            {albums.map((album) => (
              <Pressable
                key={album.id}
                style={styles.albumCard}
                onPress={() =>
                  navigation.navigate('MusicAlbumDetail', { albumId: album.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open album ${album.title}`}>
                <Image source={{ uri: album.coverUri }} style={styles.albumCover} />
                <Text
                  numberOfLines={2}
                  style={[styles.albumLabel, { fontFamily: t.fontFamily.medium }]}>
                  {album.title}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {tracks.length > 0 ? (
        <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
          Top tracks
        </Text>
      ) : null}
    </>
  );

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
        <Text style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]} numberOfLines={1}>
          Artist
        </Text>
        <View style={styles.topIcon} />
      </View>

      <FlatList
        data={tracks}
        keyExtractor={keyExtractor}
        renderItem={renderTrack}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.listContent, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          albums.length === 0 ? (
            <Text style={[styles.empty, { fontFamily: t.fontFamily.regular }]}>
              This artist has no published music yet.
            </Text>
          ) : null
        }
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  muted: {
    fontSize: 15,
    color: META,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  empty: {
    marginTop: 12,
    color: META,
    fontSize: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
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
    fontSize: 17,
    color: TITLE,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  profileBlock: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  profileImg: {
    width: PROFILE,
    height: PROFILE,
    borderRadius: PROFILE / 2,
    backgroundColor: '#E8E8ED',
  },
  profileFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 40,
    color: META,
  },
  profileName: {
    fontSize: 22,
    lineHeight: 28,
    color: TITLE,
    marginTop: 14,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 18,
    color: META,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    color: TITLE,
    marginTop: 12,
    marginBottom: 8,
  },
  albumScroll: {
    paddingVertical: 6,
    gap: 14,
  },
  albumCard: {
    width: ALBUM,
    marginRight: 14,
  },
  albumCover: {
    width: ALBUM,
    height: ALBUM,
    borderRadius: ALBUM_RADIUS,
    backgroundColor: '#E8E8ED',
  },
  albumLabel: {
    fontSize: 13,
    color: TITLE,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 16,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    backgroundColor: '#E8E8ED',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: 16,
    color: TITLE,
    lineHeight: 22,
  },
  streams: {
    fontSize: 12,
    color: META,
    marginTop: 4,
  },
});
