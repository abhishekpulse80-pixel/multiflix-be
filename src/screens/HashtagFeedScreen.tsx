import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo } from 'react';
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
import type { RootStackParamList } from '../navigation/types';
import { useGetPostsByHashtagQuery } from '../store/api/feedApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useAppSelector } from '../store/hooks';
import { selectAccessToken } from '../store/selectors';
import type { FeedPostDto } from '../types/feedApi';
import { useTheme } from '../theme';
import { formatCount } from '../utils/formatCount';

type Props = NativeStackScreenProps<RootStackParamList, 'HashtagFeed'>;

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

function HashIcon({ size = 56, color = ACCENT }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10 3L8 21M16 3l-2 18M3 9h18M3 15h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlayBadge({ size = 32 }: { size?: number }) {
  return (
    <View style={[styles.playBadge, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill={ACCENT}>
        <Path d="M8 5v14l11-7L8 5z" />
      </Svg>
    </View>
  );
}

export function HashtagFeedScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { tag } = route.params;
  const token = useAppSelector(selectAccessToken);
  const { width: screenW } = useWindowDimensions();

  const { data, isFetching, isError, refetch } = useGetPostsByHashtagQuery(
    { tag, page: 0, limit: 30 },
    { skip: !token, refetchOnMountOrArgChange: true },
  );
  const { refreshing, onRefresh } = usePullToRefresh(() => refetch());

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  const cellSize = useMemo(
    () => Math.floor((screenW - H_PAD * 2 - GAP * (COLS - 1)) / COLS),
    [screenW],
  );

  // Fixed-size cells → FlatList can skip on-the-fly measurement.
  // Row height = cell height (cellSize * 1.5) + its marginBottom (GAP).
  const rowHeight = cellSize * 1.5 + GAP;
  const getItemLayout = useCallback(
    (_data: ArrayLike<FeedPostDto> | null | undefined, index: number) => ({
      length: rowHeight,
      offset: rowHeight * Math.floor(index / COLS),
      index,
    }),
    [rowHeight],
  );

  const onPressPost = useCallback(
    (postId: string) => {
      const posts = items.map((p: FeedPostDto) => ({
        id: p.id,
        uri: p.media.url ?? '',
        likes: p.likesCount,
        isVideo: p.mediaKind === 'short_video',
        caption: p.caption ?? '',
        hashtags: p.hashtags ?? '',
        musicTitle: p.musicTitle ?? '',
        music: p.music ?? null,
        originalSound: p.originalSound ?? null,
        videoDurationSec: p.durationSeconds ?? null,
        comments: p.commentsCount,
        likedByViewer: p.likedByViewer,
        savedByViewer: p.savedByViewer,
        createdAt: p.createdAt,
        authorId: p.authorId,
        authorUsername: p.authorUsername,
      }));
      navigation.navigate('TrendingPostsViewer', {
        initialPostId: postId,
        posts,
      });
    },
    [items, navigation],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: FeedPostDto; index: number }) => {
      const col = index % COLS;
      const marginRight = col === COLS - 1 ? 0 : GAP;
      const isVideo = item.mediaKind === 'short_video';
      const thumb = item.thumbnailUrl || item.media.url || '';
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
          onPress={() => onPressPost(item.id)}
          accessibilityRole="button"
          accessibilityLabel={isVideo ? 'Open video' : 'Open post'}>
          <Image
            source={{ uri: thumb }}
            style={styles.thumb}
            resizeMode="cover"
          />
          {isVideo ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <PlayBadge />
            </View>
          ) : null}
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
    [cellSize, onPressPost, t.fontFamily.semibold],
  );

  const keyExtractor = useCallback((item: FeedPostDto) => item.id, []);

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
        <View style={styles.hashCircle}>
          <HashIcon />
        </View>
        <View style={styles.headerText}>
          <Text
            style={[styles.tag, { fontFamily: t.fontFamily.bold }]}
            numberOfLines={1}>
            {tag}
          </Text>
          <Text
            style={[styles.subtitle, { fontFamily: t.fontFamily.regular }]}
            numberOfLines={1}>
            {`${formatCount(total)} ${total === 1 ? 'Post' : 'Posts'}`}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {isFetching && items.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : isError ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            Could not load posts.
          </Text>
          <Pressable onPress={() => refetch()} hitSlop={8}>
            <Text style={[styles.retryLink, { fontFamily: t.fontFamily.semibold }]}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { fontFamily: t.fontFamily.medium }]}>
            No posts with this hashtag yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
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
  hashCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  tag: {
    fontSize: 24,
    color: INK,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E8E8E8',
    marginHorizontal: H_PAD,
  },
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
  thumb: {
    width: '100%',
    height: '100%',
  },
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
  countText: {
    color: '#FFFFFF',
    fontSize: 10,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
  },
  retryLink: {
    fontSize: 15,
    color: ACCENT,
  },
});
