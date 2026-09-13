import {
  useFocusEffect,
  useIsFocused,
  useNavigation } from '@react-navigation/native';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type ViewToken,
  useWindowDimensions,
} from 'react-native';
import FastImage, { type Source } from '@d11/react-native-fast-image';
import { CommentsBottomSheet } from '../components/home/CommentsBottomSheet';
import { FeedPost, type FeedPostData } from '../components/home/FeedPost';
import { ReportSheet } from '../components/home/ReportSheet';
import { SponsoredFeedPost } from '../components/home/SponsoredFeedPost';
import { HomeFeedSkeleton } from '../components/home/HomeFeedSkeleton';
import { HomeRecommendationsFeedCard } from '../components/home/HomeRecommendationsFeedCard';
import {
  navigateToChatList,
  navigateToUserProfile,
} from '../navigation/rootNavigationRef';
import {
  loadHomeFeedCache,
  saveHomeFeedCache,
} from '../services/feedCacheStorage';
import { selectAccessToken, selectCurrentUser } from '../store/selectors';
import { useAppSelector } from '../store/hooks';
import {
  useGetHomeFeedQuery,
  useLazyGetHomeFeedQuery,
  useRecordPostViewsMutation,
} from '../store/api/feedApi';
import {
  useFollowUserMutation,
  useUnfollowUserMutation,
} from '../store/api/usersApi';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError } from '../utils/toast';
import type { HomeFeedItem } from '../types/homeFeed';
import { mapHomeFeedResponseToUiItems } from '../utils/mapHomeFeedToUi';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';
import { NativeAdFeedPost } from '../components/home/NativeAdFeedPost';
// Full-screen interstitial ads are disabled for now (product decision: keep
// only the native, post-styled ads). The hook in ../hooks/useFeedInterstitial
// is left intact — to re-enable, uncomment this import and the usage block
// below, then set "Interstitial After (posts)" > 0 in the admin panel.
// import { useFeedInterstitial } from '../hooks/useFeedInterstitial';
import { useAdsConfig } from '../hooks/useAdsConfig';

export type { HomeFeedItem };

const FEED_PAGE_0_LIMIT = 10;
const LOAD_MORE_LIMIT = 10;
/** How many upcoming items to warm in FastImage cache after each page lands. */
const PREFETCH_AHEAD_COUNT = 5;

/**
 * Warm FastImage's disk cache for the given feed items so scrolling
 * doesn't trigger a network fetch. For video posts, the `imageUri` is a
 * video URL (not preloadable via FastImage) — we prefetch the poster instead.
 */
function prefetchFeedMedia(items: HomeFeedItem[]) {
  const sources: Source[] = [];
  for (const item of items) {
    if (item.type === 'post') {
      const post = item.post;
      if (post.isVideo) {
        if (post.posterUri) {
          sources.push({
            uri: post.posterUri,
            priority: FastImage.priority.normal,
          });
        }
      } else if (post.imageUri) {
        sources.push({
          uri: post.imageUri,
          priority: FastImage.priority.normal,
        });
      }
      if (post.avatarUri) {
        sources.push({
          uri: post.avatarUri,
          priority: FastImage.priority.low,
        });
      }
    } else if (item.type === 'sponsored') {
      if (item.ad.imageUri) {
        sources.push({
          uri: item.ad.imageUri,
          priority: FastImage.priority.normal,
        });
      }
      if (item.ad.avatarUri) {
        sources.push({
          uri: item.ad.avatarUri,
          priority: FastImage.priority.low,
        });
      }
    } else if (item.type === 'recommendations') {
      for (const u of item.users) {
        if (u.avatarUri) {
          sources.push({
            uri: u.avatarUri,
            priority: FastImage.priority.low,
          });
        }
      }
    }
  }
  if (sources.length > 0) {
    FastImage.preload(sources);
  }
}

/** Chrome under status bar; root navigator already applies safe area. */
const FEED_TOP_PAD = 12;
/** Space for bottom tab bar over full-height pager items. */
const TAB_BAR_RESERVE = 78;

export function HomeFeedScreen() {
  useTrackScreenTime('feed');
  const isFocused = useIsFocused();
  const navigation = useNavigation();
  const listRef = useRef<FlatList<HomeFeedItem>>(null);
  const token = useAppSelector(selectAccessToken);
  const cacheUserId = useAppSelector(selectCurrentUser)?.id;
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [viewportH, setViewportH] = useState(0);
  const [feedItems, setFeedItems] = useState<HomeFeedItem[]>([]);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [hadCachedFeed, setHadCachedFeed] = useState(false);
  const [lastLoadedPage, setLastLoadedPage] = useState(-1);
  const [remoteHasMore, setRemoteHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Quiet refresh fired by a Home-tab re-press — shows just a small spinner on
  // the first post (NOT the RefreshControl box, which leaves a white gap).
  const [tabRefreshing, setTabRefreshing] = useState(false);
  const loadLock = useRef(false);
  /** Item count of the last applied “page 0” API segment (posts + optional rec row). */
  const page0ItemCountRef = useRef(0);
  const lastLoadedPageRef = useRef(lastLoadedPage);
  lastLoadedPageRef.current = lastLoadedPage;
  const [commentsPost, setCommentsPost] = useState<FeedPostData | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  // Native-ad slots that failed to fill — dropped from the feed so they never
  // leave a black page / stuck spinner in the pager.
  const [failedAdIds, setFailedAdIds] = useState<Set<string>>(
    () => new Set<string>(),
  );
  const markAdFailed = useCallback((id: string) => {
    setFailedAdIds(prev => {
      if (prev.has(id)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  // Interstitial (full-screen) ads are disabled for now — see the commented
  // import above. To re-enable, restore this block; it counts each distinct
  // post that scrolls into view and lets the throttled hook decide when to
  // show one. (Read via a ref so a hook re-render can't double-count a post.)
  //
  // const { notePostViewed } = useFeedInterstitial();
  // const notePostViewedRef = useRef(notePostViewed);
  // notePostViewedRef.current = notePostViewed;
  // useEffect(() => {
  //   if (visiblePostId) {
  //     notePostViewedRef.current();
  //   }
  // }, [visiblePostId]);

  // Posts the viewer has landed on this session — flushed to the backend so
  // the home feed stops re-showing already-seen posts on refresh.
  const viewedSeenQueueRef = useRef<Set<string>>(new Set());

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 20 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      // Pick the LAST viewable item (the one further down the list). With
      // pagingEnabled + a low visibility threshold, this means the NEXT
      // post becomes "visible" as soon as it's 20% on screen during a
      // downward swipe — so its video starts playing earlier.
      const last = viewableItems[viewableItems.length - 1];
      if (last?.item) {
        const item = last.item as HomeFeedItem;
        if (item.type === 'post') {
          setVisiblePostId(item.post.id);
          // Record the post the viewer landed on as "seen".
          viewedSeenQueueRef.current.add(item.post.id);
        } else {
          setVisiblePostId(null);
        }
      } else {
        setVisiblePostId(null);
      }
    },
  ).current;

  const [recordPostViews] = useRecordPostViewsMutation();
  const flushSeenViews = useCallback(async (): Promise<void> => {
    if (!token) return;
    const ids = [...viewedSeenQueueRef.current];
    if (ids.length === 0) return;
    viewedSeenQueueRef.current.clear();
    try {
      await recordPostViews({ postIds: ids }).unwrap();
    } catch {
      // Best-effort: a dropped batch just means those posts may reappear.
    }
  }, [recordPostViews, token]);
  // Flush seen posts periodically (and once on unmount) so the next feed load
  // excludes them.
  useEffect(() => {
    const id = setInterval(() => {
      void flushSeenViews();
    }, 8000);
    return () => {
      clearInterval(id);
      void flushSeenViews();
    };
  }, [flushSeenViews]);

  const {
    data: page0Data,
    isLoading,
    isFetching,
    isError,
  } = useGetHomeFeedQuery(
    { page: 0, limit: FEED_PAGE_0_LIMIT },
    {
      skip: !token,
      refetchOnMountOrArgChange: true,
      refetchOnFocus: false,
    },
  );

  const [fetchFeedPage] = useLazyGetHomeFeedQuery();

  useEffect(() => {
    setHadCachedFeed(false);
    setCacheHydrated(false);
    setLastLoadedPage(-1);
    setRemoteHasMore(false);
    setFeedItems([]);
    page0ItemCountRef.current = 0;
    let cancelled = false;
    loadHomeFeedCache(cacheUserId)
      .then(cached => {
        if (cancelled) {
          return;
        }
        if (cached.length > 0) {
          setFeedItems(prev => (prev.length === 0 ? cached : prev));
          setHadCachedFeed(true);
        }
        setCacheHydrated(true);
      })
      .catch(() => {
        setCacheHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [cacheUserId]);

  useEffect(() => {
    if (!page0Data?.items) {
      return;
    }
    const mapped = mapHomeFeedResponseToUiItems(page0Data);
    const loadedBeyondPage0 = lastLoadedPageRef.current >= 1;

    if (!loadedBeyondPage0) {
      page0ItemCountRef.current = mapped.length;
      setFeedItems(mapped);
      setLastLoadedPage(p => (p < 0 ? 0 : p));
      setRemoteHasMore(page0Data.hasMore);
      saveHomeFeedCache(cacheUserId, mapped).catch(() => {});
      prefetchFeedMedia(mapped.slice(0, PREFETCH_AHEAD_COUNT));
      return;
    }

    setFeedItems(prev => {
      const prefixLen = page0ItemCountRef.current;
      const suffix = prev.slice(prefixLen);
      page0ItemCountRef.current = mapped.length;
      const next = [...mapped, ...suffix];
      saveHomeFeedCache(cacheUserId, next).catch(() => {});
      return next;
    });
    setRemoteHasMore(prev => prev || page0Data.hasMore);
    prefetchFeedMedia(mapped.slice(0, PREFETCH_AHEAD_COUNT));
  }, [page0Data, cacheUserId]);

  const awaitingFirstRemoteWithoutCache =
    cacheHydrated &&
    feedItems.length === 0 &&
    !!token &&
    (isLoading || isFetching) &&
    !hadCachedFeed;

  useFocusEffect(
    useCallback(() => {
      // Home feed uses a black backdrop (full-bleed video posts), so the
      // status bar background is black with light icons.
      if (Platform.OS === 'android') {
      }
      // No refetch on focus — returning to Home should show the cached
      // feed immediately. Pull-to-refresh is the user-driven way to
      // refresh. The initial mount still fetches via refetchOnMountOrArgChange.
      return undefined;
    }, []),
  );

  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) {
      setViewportH(h);
    }
  }, []);

  const listH = viewportH > 0 ? viewportH : windowHeight;

  // Force-fetch page 0 and HARD-REPLACE the list. We can't rely on the
  // page0Data effect for refresh: RTK Query's structural sharing returns the
  // SAME page0Data reference when a refetch comes back deeply-equal, so the
  // effect never re-fires — and any genuinely-new ordering could also be
  // skipped if the reference is reused. Pulling the fresh page via the lazy
  // trigger (preferCacheValue=false) and writing it straight into feedItems
  // guarantees the refresh always reflects the server.
  const hardRefreshPage0 = useCallback(async () => {
    // Record what the viewer just saw FIRST, so the refreshed page already
    // excludes it (the whole point: don't re-show seen posts).
    await flushSeenViews();
    const res = await fetchFeedPage(
      { page: 0, limit: FEED_PAGE_0_LIMIT },
      false,
    ).unwrap();
    const mapped = mapHomeFeedResponseToUiItems(res);
    page0ItemCountRef.current = mapped.length;
    setLastLoadedPage(0);
    setRemoteHasMore(res.hasMore);
    setFeedItems(mapped);
    saveHomeFeedCache(cacheUserId, mapped).catch(() => {});
    prefetchFeedMedia(mapped.slice(0, PREFETCH_AHEAD_COUNT));
  }, [fetchFeedPage, cacheUserId, flushSeenViews]);

  const onRefresh = useCallback(async () => {
    if (!token || refreshing) return;
    setRefreshing(true);
    try {
      await hardRefreshPage0();
    } catch {
      /* existing feed stays; error UI not needed for pull-to-refresh */
    } finally {
      setRefreshing(false);
    }
  }, [token, refreshing, hardRefreshPage0]);

  // Re-pressing the Home tab scrolls to top + refreshes, but WITHOUT the
  // RefreshControl (which renders a white box on the dark feed). Shows just a
  // small spinner on the first post while the refetch is in flight.
  const refreshFromTab = useCallback(async () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    if (!token || tabRefreshing) return;
    setTabRefreshing(true);
    try {
      await hardRefreshPage0();
    } catch {
      /* keep existing feed */
    } finally {
      setTabRefreshing(false);
    }
  }, [token, tabRefreshing, hardRefreshPage0]);

  // Instagram-style: re-pressing the Home tab (while the feed is focused)
  // scrolls to the top and refreshes the list.
  useEffect(() => {
    const tabNav = navigation.getParent();
    if (!tabNav) return undefined;
    const unsub = (
      tabNav as { addListener: (e: string, cb: () => void) => () => void }
    ).addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      void refreshFromTab();
    });
    return unsub;
  }, [navigation, refreshFromTab]);

  const loadMore = useCallback(async () => {
    if (
      loadLock.current ||
      !token ||
      !remoteHasMore ||
      lastLoadedPage < 0 ||
      isError
    ) {
      return;
    }
    loadLock.current = true;
    setLoadingMore(true);
    const nextPage = lastLoadedPage + 1;
    try {
      const res = await fetchFeedPage({
        page: nextPage,
        limit: LOAD_MORE_LIMIT,
      }).unwrap();
      const mapped = mapHomeFeedResponseToUiItems(res);
      setFeedItems(prev => {
        const merged = [...prev, ...mapped];
        saveHomeFeedCache(cacheUserId, merged).catch(() => {});
        return merged;
      });
      setLastLoadedPage(nextPage);
      setRemoteHasMore(res.hasMore);
      prefetchFeedMedia(mapped.slice(0, PREFETCH_AHEAD_COUNT));
    } catch {
      /* keep existing feed */
    } finally {
      setLoadingMore(false);
      loadLock.current = false;
    }
  }, [
    token,
    remoteHasMore,
    lastLoadedPage,
    isError,
    fetchFeedPage,
    cacheUserId,
  ]);

  // Stable handlers shared by every rendered row — keeps the React.memo on
  // FeedPost / SponsoredFeedPost / HomeRecommendationsFeedCard effective so
  // scrolling (which mutates `visiblePostId`) doesn't unmount-and-re-fetch
  // every off-screen post's image / video.
  const handlePressComments = useCallback((p: FeedPostData) => {
    setCommentsPost(p);
  }, []);
  const handlePressProfile = useCallback((uid: string) => {
    navigateToUserProfile(uid);
  }, []);
  const handlePressReport = useCallback((pid: string) => {
    setReportPostId(pid);
  }, []);
  const handlePressRecUser = useCallback((uid: string) => {
    navigateToUserProfile(uid);
  }, []);

  // Follow state for the Friend Recommendations card. Kept on the screen
  // (not the card) so it survives the card unmounting while the feed is
  // scrolled. The follow mutation invalidates the User cache tag, so the
  // followed user's profile reflects it too.
  const [followUser] = useFollowUserMutation();
  const [unfollowUser] = useUnfollowUserMutation();
  const [recFollowedIds, setRecFollowedIds] = useState<
    Record<string, boolean>
  >({});
  const [recFollowBusy, setRecFollowBusy] = useState<Set<string>>(new Set());

  const handleToggleRecFollow = useCallback(
    async (userId: string) => {
      if (recFollowBusy.has(userId)) return;
      const currentlyFollowing = recFollowedIds[userId] ?? false;
      const next = !currentlyFollowing;

      setRecFollowedIds(prev => ({ ...prev, [userId]: next }));
      setRecFollowBusy(prev => new Set(prev).add(userId));
      try {
        if (next) {
          await followUser(userId).unwrap();
        } else {
          await unfollowUser(userId).unwrap();
        }
      } catch (e: unknown) {
        setRecFollowedIds(prev => ({ ...prev, [userId]: currentlyFollowing }));
        toastError('Follow', getApiErrorMessage(e));
      } finally {
        setRecFollowBusy(prev => {
          const s = new Set(prev);
          s.delete(userId);
          return s;
        });
      }
    },
    [recFollowBusy, recFollowedIds, followUser, unfollowUser],
  );

  const renderItem = useCallback(
    ({ item }: { item: HomeFeedItem }) => {
      if (item.type === 'recommendations') {
        return (
          <HomeRecommendationsFeedCard
            width={windowWidth}
            height={listH}
            topInset={FEED_TOP_PAD}
            tabBarReserve={TAB_BAR_RESERVE}
            users={item.users}
            onPressUser={handlePressRecUser}
            followedIds={recFollowedIds}
            busyIds={recFollowBusy}
            onToggleFollow={handleToggleRecFollow}
          />
        );
      }
      if (item.type === 'sponsored') {
        return (
          <SponsoredFeedPost
            ad={item.ad}
            width={windowWidth}
            height={listH}
            topInset={FEED_TOP_PAD}
          />
        );
      }
      if (item.type === 'googleNativeAd') {
        return (
          <NativeAdFeedPost
            width={windowWidth}
            height={listH}
            topInset={FEED_TOP_PAD}
            adId={item.id}
            onFailed={markAdFailed}
          />
        );
      }
      return (
        <FeedPost
          post={item.post}
          width={windowWidth}
          height={listH}
          topInset={FEED_TOP_PAD}
          onPressComments={handlePressComments}
          onPressProfile={handlePressProfile}
          onPressReport={handlePressReport}
          isVisible={isFocused && visiblePostId === item.post.id}
        />
      );
    },
    [
      windowWidth,
      listH,
      visiblePostId,
      isFocused,
      handlePressComments,
      handlePressProfile,
      handlePressReport,
      handlePressRecUser,
      recFollowedIds,
      recFollowBusy,
      handleToggleRecFollow,
      markAdFailed,
    ],
  );

  const keyExtractor = useCallback((item: HomeFeedItem) => {
    if (item.type === 'recommendations') {
      return item.id;
    }
    if (item.type === 'sponsored') {
      return `sponsored:${item.ad.id}`;
    }
    if (item.type === 'googleNativeAd') {
      return item.id;
    }
    return item.post.id;
  }, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<HomeFeedItem> | null | undefined, index: number) => ({
      length: listH,
      offset: listH * index,
      index,
    }),
    [listH],
  );

  // Inject a full-screen Google native ad after every Nth real feed item.
  // Position-based keys stay stable as the feed paginates. All items are
  // full-screen, so getItemLayout (uniform listH) stays correct. Slots that
  // failed to fill (see markAdFailed) are dropped so they never show a black
  // page / stuck spinner.
  const adsConfig = useAdsConfig();
  const feedData = useMemo<HomeFeedItem[]>(() => {
    if (!adsConfig.enabled || adsConfig.feedNativeAdInterval <= 0) {
      return feedItems;
    }
    const out: HomeFeedItem[] = [];
    feedItems.forEach((it, i) => {
      out.push(it);
      if ((i + 1) % adsConfig.feedNativeAdInterval === 0) {
        const adId = `gad:${i + 1}`;
        if (!failedAdIds.has(adId)) {
          out.push({ type: 'googleNativeAd', id: adId });
        }
      }
    });
    return out;
  }, [feedItems, failedAdIds, adsConfig.enabled, adsConfig.feedNativeAdInterval]);

  return (
    <View style={styles.root} onLayout={onRootLayout}>
      {viewportH > 0 ? (
        <>
          <FlatList
            ref={listRef}
            style={styles.list}
            data={feedData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            extraData={`${String(isFocused)}_${visiblePostId ?? ''}`}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            decelerationRate="fast"
            snapToAlignment="start"
            snapToInterval={listH}
            getItemLayout={getItemLayout}
            // removeClippedSubviews detaches/reattaches off-screen cells and on
            // Fabric/Android races the mount layer → "addViewAt: child already
            // has a parent" crash. windowSize bounds rendering and FeedVideo
            // gates playback by isVisible, so disabling clipping is safe.
            removeClippedSubviews={false}
            windowSize={5}
            maxToRenderPerBatch={3}
            initialNumToRender={3}
            onEndReached={loadMore}
            onEndReachedThreshold={0.65}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            pointerEvents={awaitingFirstRemoteWithoutCache ? 'none' : 'auto'}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FFFFFF"
                colors={['#246BFD']}
              />
            }
          />
          {/* Chat icon – top-left */}
          <Pressable
            style={styles.chatBtn}
            onPress={navigateToChatList}
            hitSlop={8}
          >
            <Image
              source={require('../../assets/images/messenger.png')}
              style={styles.chatIcon}
              resizeMode="contain"
            />
          </Pressable>
          {loadingMore ? (
            <View
              style={[styles.loadingOverlay, { bottom: TAB_BAR_RESERVE + 20 }]}
              pointerEvents="none"
            >
              <ActivityIndicator color="#246BFD" size="small" />
            </View>
          ) : null}
          {tabRefreshing ? (
            <View
              style={[styles.loadingOverlay, { top: FEED_TOP_PAD + 12 }]}
              pointerEvents="none"
            >
              <ActivityIndicator color="#FFFFFF" size="small" />
            </View>
          ) : null}
          {awaitingFirstRemoteWithoutCache ? (
            <View style={styles.skeletonOverlay} pointerEvents="auto">
              <HomeFeedSkeleton width={windowWidth} height={listH} />
            </View>
          ) : null}
        </>
      ) : null}
      <CommentsBottomSheet
        visible={commentsPost != null}
        post={commentsPost}
        onRequestClose={() => setCommentsPost(null)}
        onCommentCreated={postId => {
          // Optimistically bump the comments count on the matching
          // feed card. Server-side count will reconcile on next refetch.
          setFeedItems(prev =>
            prev.map(it =>
              it.type === 'post' && it.post.id === postId
                ? {
                    ...it,
                    post: { ...it.post, comments: it.post.comments + 1 },
                  }
                : it,
            ),
          );
        }}
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
    // Black so the area revealed by pull-to-refresh matches the dark feed
    // (full-bleed posts) instead of flashing a light gray box.
    backgroundColor: '#000000',
  },
  list: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chatBtn: {
    position: 'absolute',
    top: FEED_TOP_PAD + 4,
    left: 16,
    zIndex: 10,
    elevation: 10,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatIcon: {
    width: 26,
    height: 26,
    tintColor: '#FFFFFF',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 8,
    elevation: 8,
  },
});
