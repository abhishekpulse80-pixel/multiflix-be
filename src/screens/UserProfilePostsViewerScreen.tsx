import {
  useFocusEffect,
  useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { CommentsBottomSheet } from '../components/home/CommentsBottomSheet';
import { FeedPost, type FeedPostData } from '../components/home/FeedPost';
import { ReportSheet } from '../components/home/ReportSheet';
import type { RootStackParamList } from '../navigation/types';
import { navigateToUserProfile } from '../navigation/rootNavigationRef';
import { useLazyGetUserPublicPostsQuery } from '../store/api/usersApi';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfilePostsViewer'>;
type ViewerPost = Props['route']['params']['posts'][number];

const PAGE_LIMIT = 12;

function ChevronBack({
  size = 22,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
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

function toFeedPost(
  row: ViewerPost,
  userId: string,
  userDisplayName: string,
  userHandle: string,
  userAvatarUri: string,
): FeedPostData {
  return {
    id: row.id,
    userId,
    imageUri: row.uri,
    avatarUri: userAvatarUri,
    userName: userHandle,
    fullName: userDisplayName,
    caption: row.caption,
    hashtags: row.hashtags,
    musicTitle: row.musicTitle,
    music: row.music ?? null,
    originalSound: row.originalSound ?? null,
    videoDurationSec: row.videoDurationSec ?? null,
    likes: row.likes,
    comments: row.comments,
    saves: 0,
    shares: 0,
    likedByViewer: row.likedByViewer,
    savedByViewer: row.savedByViewer ?? false,
    createdAt: row.createdAt,
    isVideo: row.isVideo,
  };
}

function mergeById(existing: ViewerPost[], incoming: ViewerPost[]): ViewerPost[] {
  const next = [...existing];
  const idxById = new Map(next.map((p, idx) => [p.id, idx]));
  incoming.forEach((row) => {
    const idx = idxById.get(row.id);
    if (idx == null) {
      idxById.set(row.id, next.length);
      next.push(row);
      return;
    }
    next[idx] = row;
  });
  return next;
}

export function UserProfilePostsViewerScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const {
    posts: seedPosts,
    initialPostId,
    userId,
    userDisplayName,
    userHandle,
    userAvatarUri,
    initialPage,
    hasMore: initialHasMore,
    initialCommentsPostId,
  } = route.params;

  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const [viewportH, setViewportH] = useState(0);
  const [posts, setPosts] = useState<ViewerPost[]>(seedPosts);
  const [lastPage, setLastPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);
  const [commentsPost, setCommentsPost] = useState<FeedPostData | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const [fetchPostsPage] = useLazyGetUserPublicPostsQuery();

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.item) {
        setVisiblePostId((first.item as FeedPostData).id);
      } else {
        setVisiblePostId(null);
      }
    },
  ).current;
  const listRef = useRef<FlatList<FeedPostData>>(null);
  const didInitialScrollRef = useRef(false);

  const listH = viewportH > 0 ? viewportH : windowHeight;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      return undefined;
    }, []),
  );

  const feedItems = useMemo(
    () =>
      posts.map((p) =>
        toFeedPost(p, userId, userDisplayName, userHandle, userAvatarUri),
      ),
    [posts, userId, userDisplayName, userHandle, userAvatarUri],
  );

  useEffect(() => {
    if (didInitialScrollRef.current || feedItems.length === 0) {
      return;
    }
    const idx = feedItems.findIndex((p) => p.id === initialPostId);
    if (idx < 0) {
      return;
    }
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      listRef.current?.scrollToIndex({ index: idx, animated: false });
    });
  }, [feedItems, initialPostId]);

  // Opened from a comment notification → auto-open the comments sheet once.
  const didOpenCommentsRef = useRef(false);
  useEffect(() => {
    if (didOpenCommentsRef.current || !initialCommentsPostId) return;
    const target = feedItems.find(p => p.id === initialCommentsPostId);
    if (!target) return;
    didOpenCommentsRef.current = true;
    setCommentsPost(target);
  }, [feedItems, initialCommentsPostId]);

  useEffect(() => {
    fetchPostsPage({ userId, page: 0, limit: PAGE_LIMIT })
      .unwrap()
      .then((res) => {
        const page0: ViewerPost[] = res.items.map((row) => ({
          id: row.id,
          uri:
            row.mediaUrl?.trim() ||
            'https://placehold.co/400x400/1a202c/a0aec0/png?text=Multiflix',
          caption: row.caption ?? '',
          hashtags: row.hashtags ?? '',
          musicTitle: row.musicTitle ?? '',
          music: row.music ?? null,
          originalSound: row.originalSound ?? null,
          comments: row.commentsCount,
          likes: row.likesCount,
          isVideo: row.mediaKind === 'short_video',
          likedByViewer: row.likedByViewer ?? false,
          savedByViewer: row.savedByViewer ?? false,
          createdAt: row.createdAt,
        }));
        setPosts((prev) => mergeById(page0, prev));
        setLastPage((p) => (p < 0 ? 0 : p));
        setHasMore(res.hasMore || initialHasMore);
      })
      .catch(() => {});
  }, [fetchPostsPage, userId, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) {
      return;
    }
    const nextPage = lastPage + 1;
    setLoadingMore(true);
    try {
      const res = await fetchPostsPage({
        userId,
        page: nextPage,
        limit: PAGE_LIMIT,
      }).unwrap();
      const mapped: ViewerPost[] = res.items.map((row) => ({
        id: row.id,
        uri:
          row.mediaUrl?.trim() ||
          'https://placehold.co/400x400/1a202c/a0aec0/png?text=Multiflix',
        caption: row.caption ?? '',
        hashtags: row.hashtags ?? '',
        musicTitle: row.musicTitle ?? '',
        music: row.music ?? null,
        originalSound: row.originalSound ?? null,
        comments: row.commentsCount,
        likes: row.likesCount,
        isVideo: row.mediaKind === 'short_video',
        likedByViewer: row.likedByViewer ?? false,
        savedByViewer: row.savedByViewer ?? false,
        createdAt: row.createdAt,
      }));
      setPosts((prev) => mergeById(prev, mapped));
      setLastPage(nextPage);
      setHasMore(res.hasMore);
    } catch {
      // keep current list
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, lastPage, fetchPostsPage, userId]);

  const getItemLayout = useCallback(
    (_: ArrayLike<FeedPostData> | null | undefined, index: number) => ({
      length: listH,
      offset: listH * index,
      index,
    }),
    [listH],
  );

  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setViewportH(h);
    }
  }, []);

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      {viewportH > 0 ? (
        <FlatList
          ref={listRef}
          style={styles.list}
          data={feedItems}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FeedPost
              post={item}
              width={screenWidth}
              height={listH}
              topInset={10}
              onPressComments={() => setCommentsPost(item)}
              onPressProfile={(uid) => navigateToUserProfile(uid)}
              onPressReport={(pid) => setReportPostId(pid)}
              isVisible={isFocused && visiblePostId === item.id}
            />
          )}
          extraData={`${String(isFocused)}_${visiblePostId ?? ''}`}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          snapToInterval={listH}
          getItemLayout={getItemLayout}
          // Off: avoids the Fabric/Android "child already has a parent" mount
          // crash from clipping/recycling full-screen video cells.
          removeClippedSubviews={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          onEndReached={loadMore}
          onEndReachedThreshold={0.65}
        />
      ) : null}

      <View style={styles.topBar}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ChevronBack />
        </Pressable>
      </View>
      {loadingMore ? (
        <View style={styles.loadingMoreOverlay} pointerEvents="none">
          <ActivityIndicator color="#FFFFFF" size="small" />
        </View>
      ) : null}
      <CommentsBottomSheet
        visible={commentsPost != null}
        post={commentsPost}
        onRequestClose={() => setCommentsPost(null)}
      />
      <ReportSheet
        visible={reportPostId != null}
        postId={reportPostId}
        onRequestClose={() => setReportPostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  list: {
    flex: 1,
  },
  loadingMoreOverlay: {
    position: 'absolute',
    bottom: 28,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
});
