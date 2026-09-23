import {
  useFocusEffect,
  useIsFocused } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useMemo,
  useRef,
  useState } from 'react';
import {
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
import { NativeAdFeedPost } from '../components/home/NativeAdFeedPost';
import { ReportSheet } from '../components/home/ReportSheet';
import { useAdsConfig } from '../hooks/useAdsConfig';
import type { RootStackParamList } from '../navigation/types';
import { navigateToUserProfile } from '../navigation/rootNavigationRef';

type Props = NativeStackScreenProps<RootStackParamList, 'TrendingPostsViewer'>;
type ViewerPost = Props['route']['params']['posts'][number];

/** A trending reel or a client-injected Google native ad slot. */
type TrendingViewerItem =
  | { type: 'post'; post: FeedPostData }
  | { type: 'googleNativeAd'; id: string };

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

function toFeedPost(row: ViewerPost): FeedPostData {
  const handle = row.authorUsername.trim() || 'user';
  return {
    id: row.id,
    userId: row.authorId,
    imageUri: row.uri,
    avatarUri: row.authorAvatarUri ?? '',
    userName: handle,
    fullName: row.authorDisplayName?.trim() || handle,
    caption: row.caption,
    hashtags: row.hashtags,
    musicTitle: row.musicTitle,
    music: row.music ?? null,
    originalSound: row.originalSound ?? null,
    posterUri: row.posterUri ?? undefined,
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

export function TrendingPostsViewerScreen({ navigation, route }: Props) {
  const isFocused = useIsFocused();
  const { posts: seedPosts, initialPostId } = route.params;
  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const [viewportH, setViewportH] = useState(0);
  const [commentsPost, setCommentsPost] = useState<FeedPostData | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(
    initialPostId,
  );
  // Ad slots that failed to fill are dropped so they never show a black page.
  const [failedAdIds, setFailedAdIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const markAdFailed = useCallback((id: string) => {
    setFailedAdIds((prev) => {
      if (prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      const item = first?.item as TrendingViewerItem | undefined;
      // Only posts drive video playback; an ad page pauses every FeedPost.
      setVisiblePostId(item?.type === 'post' ? item.post.id : null);
    },
  ).current;
  const listRef = useRef<FlatList<TrendingViewerItem>>(null);

  const feedItems = useMemo(
    () => seedPosts.map((p) => toFeedPost(p)),
    [seedPosts],
  );

  // Inject a full-screen native ad after every Nth reel (admin-configured),
  // mirroring the home feed. All items are full-screen, so getItemLayout's
  // uniform listH stays correct.
  const adsConfig = useAdsConfig();
  const feedData = useMemo<TrendingViewerItem[]>(() => {
    const out: TrendingViewerItem[] = [];
    feedItems.forEach((post, i) => {
      out.push({ type: 'post', post });
      if (
        adsConfig.enabled &&
        adsConfig.feedNativeAdInterval > 0 &&
        (i + 1) % adsConfig.feedNativeAdInterval === 0
      ) {
        const adId = `gad:${i + 1}`;
        if (!failedAdIds.has(adId)) {
          out.push({ type: 'googleNativeAd', id: adId });
        }
      }
    });
    return out;
  }, [feedItems, failedAdIds, adsConfig.enabled, adsConfig.feedNativeAdInterval]);

  // Mount the pager directly at the tapped post. The list only renders once
  // the viewport height is measured, so getItemLayout offsets are exact and
  // initialScrollIndex lands on the right page with no post-mount scroll
  // (which used to flash post #0 for a frame before jumping).
  const initialIndex = useMemo(() => {
    const idx = feedData.findIndex(
      (it) => it.type === 'post' && it.post.id === initialPostId,
    );
    return idx < 0 ? 0 : idx;
  }, [feedData, initialPostId]);

  const listH = viewportH > 0 ? viewportH : windowHeight;

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      return undefined;
    }, []),
  );

  const getItemLayout = useCallback(
    (_: ArrayLike<TrendingViewerItem> | null | undefined, index: number) => ({
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
          data={feedData}
          initialScrollIndex={initialIndex}
          keyExtractor={(item) =>
            item.type === 'googleNativeAd' ? item.id : item.post.id
          }
          renderItem={({ item }) =>
            item.type === 'googleNativeAd' ? (
              <NativeAdFeedPost
                width={screenWidth}
                height={listH}
                topInset={10}
                adId={item.id}
                onFailed={markAdFailed}
              />
            ) : (
              <FeedPost
                post={item.post}
                width={screenWidth}
                height={listH}
                topInset={10}
                onPressComments={() => setCommentsPost(item.post)}
                onPressProfile={(userId) => navigateToUserProfile(userId)}
                onPressReport={(pid) => setReportPostId(pid)}
                isVisible={isFocused && visiblePostId === item.post.id}
              />
            )
          }
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
          onScrollToIndexFailed={({ index }) => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToIndex({
                index,
                animated: false,
                viewPosition: 0.5,
              });
            });
          }}
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
