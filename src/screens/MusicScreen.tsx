import {
  useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import Svg, { Path } from 'react-native-svg';
import { useSelector } from 'react-redux';
import { MusicHomeSkeleton } from '../components/music/MusicSkeletons';
import type { MusicStackParamList } from '../navigation/types';
import {
  useGetMusicAlbumsQuery,
  useGetMusicArtistsQuery,
  useGetMusicRecommendedTracksQuery,
  useSearchMusicQuery,
} from '../store/api/musicApi';
import type { RootState } from '../store/store';
import { useTheme } from '../theme';
import {
  mapAlbumListItemToRow,
  mapTrackDtoToRow,
  type MusicAlbumRow,
  type MusicTrackRow,
} from '../types/music';
import { formatCount } from '../utils/formatCount';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';

const BG = '#F5F5F7';
const TITLE = '#0D0D0D';
const SUB = '#3D3D45';
const META = '#6B6B6B';
const H_PAD = 20;
const THUMB = 64;
const ALBUM = 120;
const ALBUM_RADIUS = 15;
const ALBUM_BORDER = '#3B82F6';

function formatStreams(n: number): string {
  return `${formatCount(n)} streams`;
}

function HeaderHeartIcon({
  size = 24,
  color = TITLE,
}: {
  size?: number;
  color?: string;
}) {
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

export function MusicScreen() {
  useTrackScreenTime('music');
  const t = useTheme();
  const token = useSelector((s: RootState) => s.auth.accessToken);
  const navigation =
    useNavigation<NativeStackNavigationProp<MusicStackParamList, 'MusicHome'>>();

  const {
    data: albumsData,
    isLoading: albumsLoading,
    isError: albumsError,
    refetch: refetchAlbums,
  } = useGetMusicAlbumsQuery(undefined, { skip: !token });
  const {
    data: tracksData,
    isLoading: tracksLoading,
    isError: tracksError,
    refetch: refetchTracks,
  } = useGetMusicRecommendedTracksQuery(undefined, { skip: !token });
  const {
    data: trendingData,
    isLoading: trendingLoading,
    isError: trendingError,
    refetch: refetchTrending,
  } = useGetMusicRecommendedTracksQuery(
    { page: 0, limit: 10 },
    { skip: !token },
  );
  const {
    data: artistsData,
    refetch: refetchArtists,
  } = useGetMusicArtistsQuery({ page: 0, limit: 30 }, { skip: !token });

  const { refreshing, onRefresh } = usePullToRefresh(() =>
    Promise.all([refetchAlbums(), refetchTracks(), refetchTrending()]),
  );

  const listRef = useRef<FlatList>(null);
  // Re-pressing the Music tab while it's focused scrolls to top + refreshes,
  // same as the Home tab.
  useEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return undefined;
    const unsub = (
      tabNav as { addListener: (e: string, cb: () => void) => () => void }
    ).addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      void onRefresh();
    });
    return unsub;
  }, [navigation, onRefresh]);

  // Search state (inline). Empty debounced query → show the normal home view.
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const searchActive = debouncedQuery.length > 0;

  const {
    data: searchData,
    isFetching: searchFetching,
    isError: searchError,
  } = useSearchMusicQuery(
    { q: debouncedQuery, limit: 20 },
    { skip: !token || !searchActive },
  );

  const searchTrackRows = useMemo(
    () => searchData?.tracks.map(mapTrackDtoToRow) ?? [],
    [searchData],
  );
  const searchAlbumRows = useMemo(
    () => searchData?.albums.map(mapAlbumListItemToRow) ?? [],
    [searchData],
  );

  const albumRows = useMemo(
    () => albumsData?.items.map(mapAlbumListItemToRow) ?? [],
    [albumsData],
  );
  const recommendRows = useMemo(
    () => tracksData?.items.map(mapTrackDtoToRow) ?? [],
    [tracksData],
  );
  const trendingRows = useMemo(
    () => trendingData?.items.map(mapTrackDtoToRow) ?? [],
    [trendingData],
  );

  // No on-mount audio prefetch: pre-warming tracks the user only browses past
  // (and may never play) was a large speculative cellular-data cost. Tracks now
  // cache lazily on first play, plus a 1-track lookahead during playback.

  const showHomeSkeleton = Boolean(
    token &&
      ((albumsLoading && !albumsData) ||
        (tracksLoading && !tracksData) ||
        (trendingLoading && !trendingData)),
  );
  const hasError = albumsError || tracksError || trendingError;

  const renderItem = useCallback(
    ({ item }: { item: MusicTrackRow }) => (
      <Pressable
        onPress={() => navigation.navigate('MusicNowPlaying', { trackId: item.id })}
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
    [navigation, t.fontFamily.regular, t.fontFamily.semibold],
  );

  const keyExtractor = useCallback((item: MusicTrackRow) => item.id, []);

  const searchBar = (
    <View style={styles.searchWrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search tracks or albums…"
        placeholderTextColor={META}
        style={[styles.searchInput, { fontFamily: t.fontFamily.regular }]}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
      />
      {query.length > 0 ? (
        <Pressable
          onPress={() => {
            setQuery('');
            setDebouncedQuery('');
          }}
          hitSlop={8}
          style={styles.searchClearBtn}
          accessibilityRole="button"
          accessibilityLabel="Clear search">
          <Text style={[styles.searchClearText, { fontFamily: t.fontFamily.semibold }]}>
            ×
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  const idleSections = (
    <>
      <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
        Albums
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.albumScroll}>
        {albumRows.map((album: MusicAlbumRow) => (
          <Pressable
            key={album.id}
            style={styles.albumCard}
            onPress={() => navigation.navigate('MusicAlbumDetail', { albumId: album.id })}
            accessibilityRole="button"
            accessibilityLabel={`Open album ${album.title}`}>
            <FastImage
              source={{
                uri: album.coverUri,
                priority: FastImage.priority.normal,
              }}
              style={[
                styles.albumCover,
                album.featured && styles.albumCoverFeatured,
              ]}
              resizeMode={FastImage.resizeMode.cover}
            />
            <Text
              numberOfLines={2}
              style={[styles.albumLabel, { fontFamily: t.fontFamily.medium }]}>
              {album.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {trendingRows.length > 0 ? (
        <>
          <Text
            style={[
              styles.sectionTitle,
              { fontFamily: t.fontFamily.semibold },
            ]}>
            Trending
          </Text>
          <View style={styles.trendingList}>
            {trendingRows.map((item: MusicTrackRow) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate('MusicNowPlaying', { trackId: item.id })
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
                    <Text
                      style={[
                        styles.trackTitle,
                        { fontFamily: t.fontFamily.semibold },
                      ]}>
                      {item.title}
                    </Text>
                    <Text
                      style={[
                        styles.artist,
                        { fontFamily: t.fontFamily.regular },
                      ]}
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
                      style={[
                        styles.streams,
                        { fontFamily: t.fontFamily.regular },
                      ]}>
                      {formatStreams(item.streams)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {(artistsData?.items.length ?? 0) > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
            Artists
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.artistScroll}>
            {artistsData!.items.map((a) => (
              <Pressable
                key={a.id}
                style={styles.artistCard}
                onPress={() =>
                  navigation.navigate('ArtistProfile', { artistId: a.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open artist ${a.name}`}>
                {a.profileImageUrl ? (
                  <FastImage
                    source={{
                      uri: a.profileImageUrl,
                      priority: FastImage.priority.normal,
                    }}
                    style={styles.artistAvatar}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                ) : (
                  <View style={[styles.artistAvatar, styles.artistAvatarFallback]}>
                    <Text
                      style={[
                        styles.artistInitial,
                        { fontFamily: t.fontFamily.bold },
                      ]}>
                      {a.name.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text
                  numberOfLines={1}
                  style={[styles.artistLabel, { fontFamily: t.fontFamily.medium }]}>
                  {a.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      <Text
        style={[
          styles.sectionTitle,
          styles.recommendTitle,
          { fontFamily: t.fontFamily.semibold },
        ]}>
        Recommend for you
      </Text>
    </>
  );

  const searchSections = (
    <>
      {searchAlbumRows.length > 0 ? (
        <>
          <Text
            style={[styles.sectionTitle, { fontFamily: t.fontFamily.semibold }]}>
            Albums
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.albumScroll}>
            {searchAlbumRows.map((album: MusicAlbumRow) => (
              <Pressable
                key={album.id}
                style={styles.albumCard}
                onPress={() =>
                  navigation.navigate('MusicAlbumDetail', { albumId: album.id })
                }
                accessibilityRole="button"
                accessibilityLabel={`Open album ${album.title}`}>
                <FastImage
                  source={{
                    uri: album.coverUri,
                    priority: FastImage.priority.normal,
                  }}
                  style={[
                    styles.albumCover,
                    album.featured && styles.albumCoverFeatured,
                  ]}
                  resizeMode={FastImage.resizeMode.cover}
                />
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
      <Text
        style={[
          styles.sectionTitle,
          styles.recommendTitle,
          { fontFamily: t.fontFamily.semibold },
        ]}>
        Tracks
      </Text>
      {searchFetching && searchTrackRows.length === 0 ? (
        <ActivityIndicator
          color={ALBUM_BORDER}
          style={styles.searchInlineLoader}
        />
      ) : null}
    </>
  );

  const listHeader = (
    <View style={[styles.headerBlock, { paddingTop: 12 }]}>
      <View style={styles.heroRow}>
        <Text style={[styles.heroTitle, { fontFamily: t.fontFamily.bold }]}>
          Listen The Latest{'\n'}Musics
        </Text>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.navigate('MusicFavourites')}
          style={styles.favBtn}
          accessibilityRole="button"
          accessibilityLabel="My favourites">
          <HeaderHeartIcon />
        </Pressable>
      </View>

      {searchBar}

      {searchActive ? searchSections : idleSections}
    </View>
  );

  if (!token) {
    return (
      <View style={[styles.root, styles.centered]}>
        <Text style={[styles.muted, { fontFamily: t.fontFamily.regular }]}>
          Sign in to browse music.
        </Text>
      </View>
    );
  }

  if (showHomeSkeleton) {
    return (
      <View style={styles.root}>
        <MusicHomeSkeleton />
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={[styles.root, styles.centered, styles.errorPad]}>
        <Text style={[styles.errorText, { fontFamily: t.fontFamily.medium }]}>
          Could not load music.
        </Text>
        <Pressable
          onPress={() => {
            void refetchAlbums();
            void refetchTracks();
            void refetchTrending();
            void refetchArtists();
          }}
          style={styles.retryBtn}
          accessibilityRole="button"
          accessibilityLabel="Retry loading music">
          <Text style={[styles.retryLabel, { fontFamily: t.fontFamily.semibold }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const listData = searchActive ? searchTrackRows : recommendRows;

  const listEmptyComponent =
    searchActive && !searchFetching ? (
      searchError ? (
        <Text
          style={[styles.searchEmpty, { fontFamily: t.fontFamily.medium }]}>
          Could not search. Please try again.
        </Text>
      ) : searchTrackRows.length === 0 && searchAlbumRows.length === 0 ? (
        <Text
          style={[styles.searchEmpty, { fontFamily: t.fontFamily.medium }]}>
          {`No results for "${debouncedQuery}".`}
        </Text>
      ) : null
    ) : null;

  return (
    <View style={styles.root}>
<FlatList
        ref={listRef}
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmptyComponent}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 16 + 88 },
        ]}
        keyboardShouldPersistTaps="handled"
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
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPad: {
    paddingHorizontal: 24,
  },
  muted: {
    fontSize: 15,
    color: META,
  },
  errorText: {
    fontSize: 16,
    color: META,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryLabel: {
    fontSize: 16,
    color: ALBUM_BORDER,
  },
  listContent: {
    paddingHorizontal: H_PAD,
  },
  headerBlock: {
    marginBottom: 8,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  heroTitle: {
    flex: 1,
    fontSize: 28,
    lineHeight: 34,
    color: TITLE,
    letterSpacing: -0.3,
  },
  favBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 16,
    color: TITLE,
    marginTop: 24,
  },
  recommendTitle: {
    marginTop: 28,
    marginBottom: 4,
  },
  albumScroll: {
    flexDirection: 'row',
    gap: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  trendingList: {
    marginTop: 4,
  },
  artistScroll: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  artistCard: {
    width: 76,
    alignItems: 'center',
  },
  artistAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E8E8ED',
  },
  artistAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistInitial: {
    fontSize: 26,
    color: META,
  },
  artistLabel: {
    marginTop: 8,
    fontSize: 12,
    color: TITLE,
    textAlign: 'center',
    width: '100%',
  },
  searchWrap: {
    position: 'relative',
    marginTop: 16,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    paddingRight: 36,
    fontSize: 14,
    color: TITLE,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchClearBtn: {
    position: 'absolute',
    right: 10,
    top: 0,
    bottom: 0,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchClearText: {
    color: META,
    fontSize: 18,
    lineHeight: 18,
  },
  searchInlineLoader: {
    marginTop: 12,
  },
  searchEmpty: {
    textAlign: 'center',
    marginTop: 24,
    color: META,
    fontSize: 14,
    paddingHorizontal: 20,
  },
  albumCard: {
    width: ALBUM,
  },
  albumCover: {
    width: ALBUM,
    height: ALBUM,
    borderRadius: ALBUM_RADIUS,
    backgroundColor: '#E8E8ED',
  },
  albumCoverFeatured: {
    borderWidth: 1,
    borderColor: ALBUM_BORDER,
  },
  albumLabel: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 17,
    color: SUB,
    textAlign: 'center',
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
