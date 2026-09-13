import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo } from 'react';
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
import { MusicAlbumDetailSkeleton } from '../components/music/MusicSkeletons';
import type { MusicStackParamList } from '../navigation/types';
import { useGetMusicAlbumByIdQuery } from '../store/api/musicApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import type { RootState } from '../store/store';
import { useTheme } from '../theme';
import { mapAlbumDetailResponse, type MusicTrackRow } from '../types/music';
import { formatCount } from '../utils/formatCount';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';

const BG = '#F5F5F7';
const TITLE = '#0D0D0D';
const META = '#6B6B6B';
const H_PAD = 20;
const THUMB = 64;
const PROFILE = 88;
const PROFILE_RADIUS = 12;

type Props = NativeStackScreenProps<MusicStackParamList, 'MusicAlbumDetail'>;

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
  return `${formatCount(n)} / streams`;
}

export function MusicAlbumDetailScreen({ navigation, route }: Props) {
  useTrackScreenTime('music');
  const t = useTheme();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const { albumId } = route.params;

  const { data, isLoading, isFetching, isError, refetch } = useGetMusicAlbumByIdQuery(
    albumId,
    { skip: !token || !albumId },
  );
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());

  const mapped = useMemo(() => (data ? mapAlbumDetailResponse(data) : null), [data]);
  const album = mapped?.detail ?? null;
  const tracks = mapped?.tracks ?? [];

  useEffect(() => {
    if (!token || !albumId) {
      return;
    }
    if (isLoading && !data) {
      return;
    }
    if (!isFetching && (isError || !data)) {
      navigation.goBack();
    }
  }, [albumId, data, isError, isFetching, isLoading, navigation, token]);

  // No on-open audio prefetch: warming the album's top tracks before the user
  // plays anything was a speculative cellular-data cost. Tracks cache lazily on
  // first play (plus a 1-track lookahead during playback).

  const renderTrack = useCallback(
    ({ item }: { item: MusicTrackRow }) => (
      <Pressable
        onPress={() =>
          navigation.navigate('MusicNowPlaying', {
            trackId: item.id,
            sourceAlbumId: albumId,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.title}`}>
        <View style={styles.row}>
          <FastImage
            source={{ uri: item.artUri, priority: FastImage.priority.normal }}
            style={styles.thumb}
            resizeMode={FastImage.resizeMode.cover}
          />
          <View style={styles.rowText}>
            <Text style={[styles.trackTitle, { fontFamily: t.fontFamily.semibold }]}>
              {item.title}
            </Text>
            <Text
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
            <Text style={[styles.streams, { fontFamily: t.fontFamily.regular }]}>
              {formatStreams(item.streams)}
            </Text>
          </View>
        </View>
      </Pressable>
    ),
    [albumId, navigation, t.fontFamily.regular, t.fontFamily.semibold],
  );

  const keyExtractor = useCallback((item: MusicTrackRow) => item.id, []);

  if (!token) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={[styles.muted, { fontFamily: t.fontFamily.regular }]}>
          Sign in to view this album.
        </Text>
      </View>
    );
  }

  if (isLoading && !data) {
    return <MusicAlbumDetailSkeleton />;
  }

  if (isError || !album) {
    return null;
  }

  const listHeader = (
    <>
      <View style={styles.profileBlock}>
        <Pressable
          onPress={() => {
            if (album.artistId) {
              navigation.navigate('ArtistProfile', { artistId: album.artistId });
            }
          }}
          accessibilityRole="button"
          accessibilityLabel={`Open artist ${album.artistName}`}>
          <FastImage
            source={{
              uri: album.profileUri || album.coverUri,
              priority: FastImage.priority.high,
            }}
            style={styles.profileImg}
            resizeMode={FastImage.resizeMode.cover}
          />
        </Pressable>
        <View style={styles.profileText}>
          <Text
            style={[styles.profileName, { fontFamily: t.fontFamily.bold }]}
            onPress={() => {
              if (album.artistId) {
                navigation.navigate('ArtistProfile', { artistId: album.artistId });
              }
            }}
            suppressHighlighting>
            {album.artistName}
          </Text>
          {album.artistEmail.length > 0 ? (
            <Text style={[styles.profileEmail, { fontFamily: t.fontFamily.regular }]}>
              {album.artistEmail}
            </Text>
          ) : null}
          {album.membership.length > 0 ? (
            <Text style={[styles.profileMeta, { fontFamily: t.fontFamily.regular }]}>
              {album.membership}
            </Text>
          ) : null}
          <Text style={[styles.profileBio, { fontFamily: t.fontFamily.regular }]}>
            {album.bio}
          </Text>
        </View>
      </View>
      <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
        Album Songs
      </Text>
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
          Album
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
          <Text style={[styles.empty, { fontFamily: t.fontFamily.regular }]}>
            No tracks in this album yet.
          </Text>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 28,
  },
  profileImg: {
    width: PROFILE,
    height: PROFILE,
    borderRadius: PROFILE_RADIUS,
    backgroundColor: '#E8E8ED',
  },
  profileText: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: 20,
    lineHeight: 26,
    color: TITLE,
  },
  profileEmail: {
    fontSize: 13,
    color: META,
    marginTop: 6,
  },
  profileMeta: {
    fontSize: 13,
    color: META,
    marginTop: 4,
  },
  profileBio: {
    fontSize: 13,
    lineHeight: 18,
    color: META,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    color: TITLE,
    marginBottom: 8,
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
  artist: {
    fontSize: 14,
    color: META,
    marginTop: 4,
  },
  streams: {
    fontSize: 12,
    color: META,
    marginTop: 4,
  },
});
