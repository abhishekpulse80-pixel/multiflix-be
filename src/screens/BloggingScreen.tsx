import {
  type NavigationProp,
  useFocusEffect,
  useNavigation,
  } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React,
  {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  } from 'react';
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { BloggingListSkeleton } from '../components/blogging/BloggingSkeletons';
import { UserAvatar } from '../components/common/UserAvatar';
import { FeedHeartIcon } from '../components/icons/FeedActionIcons';
import {
  BLOGGING_ALL_POSTS,
  filterBloggingPostsByQuery,
  postsForSubTab,
  type BloggingPost,
  type BloggingSubTabKey,
} from '../data/bloggingFeedMock';
import { navigateToUserProfile, navigateToCreateBlog } from '../navigation/rootNavigationRef';
import { useAppSelector } from '../store/hooks';
import { useGetBlogsQuery, useSetBlogFavoriteMutation } from '../store/api/blogsApi';
import { usePullToRefresh, REFRESH_TINT } from '../hooks/usePullToRefresh';
import { useTrackScreenTime } from '../hooks/useTrackScreenTime';
import { selectAccessToken } from '../store/selectors';
import { getApiErrorMessage } from '../utils/apiError';
import { formatCount } from '../utils/formatCount';
import { formatDuration } from '../utils/formatDuration';
import { toastError } from '../utils/toast';
import { mapBlogListItemDtoToBloggingPost } from '../utils/mapBlogDtoToBloggingPost';
import { BlogNativeAdCard } from '../components/blogging/BlogNativeAdCard';
import { useAdsConfig } from '../hooks/useAdsConfig';
import type {
  BloggingStackParamList,
  MainTabParamList,
} from '../navigation/types';
import { useTheme } from '../theme';
import {
  pickMediaFromLibrary,
  assetToMediaPayload,
  isVideoMime,
} from '../utils/pickMedia';

const H_PAD = 18;
const LINK = '#246BFD';
const MUTED = '#AEAEB2';
const TITLE = '#FFFFFF';

/** A blog feed card or a client-injected Google native ad slot. */
type BloggingListItem =
  | { type: 'post'; post: BloggingPost }
  | { type: 'googleNativeAd'; id: string };

/** Blogs are long-form: the source video must be at least this long. */
const MIN_BLOG_DURATION_SECONDS = 4 * 60;

const SUB_TABS: { key: BloggingSubTabKey; label: string }[] = [
  { key: 'blogging', label: 'Blogging' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'following', label: 'Following' },
];

function ChevronLeftIcon({
  size = 22,
  color,
}: {
  size?: number;
  color: string;
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

function SearchIcon({ size = 22, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
      <Path
        d="M20 20l-3-3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function PlusIcon({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 5v14M5 12h14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

type TabNav = NavigationProp<MainTabParamList>;

export function BloggingScreen() {
  useTrackScreenTime('blogging');
  const t = useTheme();
  const { width: screenW } = useWindowDimensions();
  const navigation =
    useNavigation<
      NativeStackNavigationProp<BloggingStackParamList, 'BloggingMain'>
    >();

  const [subTab, setSubTab] = useState<BloggingSubTabKey>('blogging');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchInputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList>(null);
  const token = useAppSelector(selectAccessToken);
  const [setBlogFavorite, { isLoading: favSaving }] =
    useSetBlogFavoriteMutation();

  const onToggleFavorite = useCallback(
    async (post: BloggingPost) => {
      if (!token) {
        return;
      }
      const next = !post.isFavorite;
      try {
        await setBlogFavorite({
          blogId: post.id,
          favorited: next,
        }).unwrap();
      } catch (e: unknown) {
        toastError('Could not update favorite', getApiErrorMessage(e));
      }
    },
    [token, setBlogFavorite],
  );

  const {
    data: tabData,
    isFetching: tabFetching,
    isError: tabError,
    refetch: refetchTab,
  } = useGetBlogsQuery({ tab: subTab }, { skip: !token });
  const { refreshing, onRefresh } = usePullToRefresh(() => refetchTab());

  const {
    data: searchCatalog,
    isFetching: searchFetching,
    isError: searchError,
  } = useGetBlogsQuery(
    { tab: 'blogging' },
    { skip: !token || !searchOpen },
  );

  const remoteForTab = useMemo(
    () =>
      (tabData?.items ?? []).map(row => mapBlogListItemDtoToBloggingPost(row)),
    [tabData],
  );

  const baseList = useMemo(() => {
    if (token) {
      return remoteForTab;
    }
    return postsForSubTab(subTab);
  }, [token, remoteForTab, subTab]);

  const filteredPosts = useMemo(
    () => filterBloggingPostsByQuery(baseList, query),
    [baseList, query],
  );

  useEffect(() => {
    if (searchOpen) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 120);
      return () => clearTimeout(id);
    }
    return undefined;
  }, [searchOpen]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      return undefined;
    }, []),
  );

  const goHomeTab = useCallback(() => {
    const parent = navigation.getParent() as TabNav | undefined;
    parent?.navigate('home');
  }, [navigation]);

  // Re-pressing the Blogging tab while it's focused scrolls to top + refreshes
  // the active sub-tab, same as the Home tab.
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

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery('');
  }, []);

  const handleFabPress = useCallback(async () => {
    try {
      const asset = await pickMediaFromLibrary();
      if (!asset) return;
      const payload = assetToMediaPayload(asset);
      if (!payload) {
        toastError('Blog', 'Could not read the selected file.');
        return;
      }
      if (!isVideoMime(payload.type)) {
        toastError('Blog', 'Only video files are allowed for blogs.');
        return;
      }
      // Blogs must be long-form. The picker reports duration in seconds; only
      // reject when it's known (some assets omit it) and clearly too short.
      const durationSeconds = asset.duration ?? null;
      if (durationSeconds != null && durationSeconds < MIN_BLOG_DURATION_SECONDS) {
        toastError('Blog', 'Blog videos must be at least 4 minutes long.');
        return;
      }
      navigateToCreateBlog({
        videoUri: payload.uri,
        fileName: payload.name,
        mimeType: payload.type,
      });
    } catch {
      toastError('Blog', 'Could not pick video.');
    }
  }, []);

  const coverHeight = useMemo(
    () => Math.round((screenW - H_PAD * 2) * 0.56),
    [screenW],
  );

  const renderPost = useCallback(
    ({ item }: { item: BloggingPost }) => (
      <View style={styles.card}>
        <Pressable
          onPress={() => navigation.navigate('BloggingWatch', { postId: item.id })}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}>
          <View style={[styles.thumbWrap, { height: coverHeight }]}>
            <Image
              source={{ uri: item.coverUri }}
              style={styles.cover}
              resizeMode="cover"
              accessibilityLabel={item.title}
            />
            {formatDuration(item.durationSeconds) ? (
              <View style={styles.durationPill} pointerEvents="none">
                <Text style={styles.durationText}>
                  {formatDuration(item.durationSeconds)}
                </Text>
              </View>
            ) : null}
            {token ? (
              <Pressable
                style={styles.favOnCover}
                onPress={() => {
                  onToggleFavorite(item).catch(() => {});
                }}
                disabled={favSaving}
                accessibilityRole="button"
                accessibilityLabel={
                  item.isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
                accessibilityState={{ selected: item.isFavorite }}
              >
                <FeedHeartIcon
                  size={22}
                  color="#FFFFFF"
                  filled={item.isFavorite}
                  variant="svg"
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
        <View style={styles.cardMeta}>
          <Pressable
            onPress={() => navigateToUserProfile(item.authorId)}
            accessibilityRole="button"
            accessibilityLabel={`View ${item.authorName} profile`}>
            <UserAvatar
              uri={item.avatarUri}
              style={styles.cardAvatar}
              accessibilityLabel={item.authorName}
            />
          </Pressable>
          <View style={styles.cardText}>
            <Pressable
              onPress={() => navigation.navigate('BloggingWatch', { postId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.title}`}>
              <Text
                style={[styles.cardTitle, { fontFamily: t.fontFamily.bold }]}
                numberOfLines={2}>
                {item.title}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => navigateToUserProfile(item.authorId)}
              accessibilityRole="button"
              accessibilityLabel={`View ${item.authorName} profile`}>
              <Text
                style={[styles.cardSub, { fontFamily: t.fontFamily.regular }]}>
                {item.authorName} • {item.dateLabel} • {formatCount(item.viewsCount)} views
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    ),
    [
      coverHeight,
      navigation,
      t.fontFamily.bold,
      t.fontFamily.regular,
      token,
      favSaving,
      onToggleFavorite,
    ],
  );

  const postKey = useCallback((item: BloggingPost) => item.id, []);

  // Ad slots that fail to fill are dropped so they never leave an empty gap.
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

  // Inject a native ad card after every Nth blog (admin-configured), mirroring
  // the home/trending feeds. Search results are intentionally left ad-free.
  const adsConfig = useAdsConfig();
  const feedData = useMemo<BloggingListItem[]>(() => {
    const out: BloggingListItem[] = [];
    filteredPosts.forEach((post, i) => {
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
  }, [
    filteredPosts,
    failedAdIds,
    adsConfig.enabled,
    adsConfig.feedNativeAdInterval,
  ]);

  const feedKey = useCallback(
    (item: BloggingListItem) =>
      item.type === 'googleNativeAd' ? item.id : item.post.id,
    [],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: BloggingListItem }) =>
      item.type === 'googleNativeAd' ? (
        <BlogNativeAdCard
          coverHeight={coverHeight}
          onFailed={() => markAdFailed(item.id)}
        />
      ) : (
        renderPost({ item: item.post })
      ),
    [coverHeight, markAdFailed, renderPost],
  );

  const searchData = useMemo(() => {
    if (token && searchOpen) {
      if (searchCatalog?.items === undefined) {
        return [];
      }
      const mapped = searchCatalog.items.map(row =>
        mapBlogListItemDtoToBloggingPost(row),
      );
      return filterBloggingPostsByQuery(mapped, query);
    }
    return filterBloggingPostsByQuery(BLOGGING_ALL_POSTS, query);
  }, [token, searchOpen, searchCatalog, query]);

  const showListSkeleton = Boolean(
    token && tabData === undefined && tabFetching && !tabError,
  );
  const showRemoteError = Boolean(token && tabError && tabData === undefined);

  const showSearchSkeleton = Boolean(
    token &&
      searchOpen &&
      searchCatalog === undefined &&
      searchFetching &&
      !searchError,
  );

  if (searchOpen) {
    return (
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.searchHeader, { paddingTop: 12 }]}>
          <Pressable
            onPress={closeSearch}
            hitSlop={12}
            accessibilityLabel="Close search"
            accessibilityRole="button"
          >
            <ChevronLeftIcon color={TITLE} />
          </Pressable>
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { fontFamily: t.fontFamily.regular }]}
            placeholder="Search...."
            placeholderTextColor="#8E8E93"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Search posts"
          />
        </View>
        <FlatList
          data={searchData}
          keyExtractor={postKey}
          renderItem={renderPost}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 },
            searchData.length === 0 ? { flexGrow: 1 } : null,
          ]}
          ListEmptyComponent={
            showSearchSkeleton ? (
              <BloggingListSkeleton coverHeight={coverHeight} />
            ) : (
              <Text style={[styles.empty, { fontFamily: t.fontFamily.medium }]}>
                {query.trim()
                  ? `No posts match "${query.trim()}".`
                  : 'Type to search posts.'}
              </Text>
            )
          }
        />
      </KeyboardAvoidingView>
    );
  }

  const listHeader = (
    <View>
      <View style={[styles.topBar, { paddingTop: 12 }]}>
        <View style={styles.topBarSide}>
          <Pressable
            onPress={goHomeTab}
            hitSlop={12}
            accessibilityLabel="Go to home"
            accessibilityRole="button"
          >
            <ChevronLeftIcon color={TITLE} />
          </Pressable>
        </View>
        <View style={styles.topBarCenter}>
          <Text style={[styles.screenTitle, { fontFamily: t.fontFamily.bold }]}>
            Blogging
          </Text>
        </View>
        <View style={[styles.topBarSide, styles.topBarSideEnd]}>
          <Pressable
            onPress={() => setSearchOpen(true)}
            hitSlop={12}
            accessibilityLabel="Search posts"
            accessibilityRole="button"
          >
            <SearchIcon color={TITLE} />
          </Pressable>
        </View>
      </View>

      <View style={styles.subTabs}>
        {SUB_TABS.map(tab => {
          const active = subTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.subTabPress}
              onPress={() => setSubTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.subTabLabel,
                  { fontFamily: t.fontFamily.semibold },
                  active && styles.subTabLabelActive,
                ]}
              >
                {tab.label}
              </Text>
              {active ? (
                <View style={styles.subTabUnderline} />
              ) : (
                <View style={styles.subTabUnderlineSpacer} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const listEmpty = showListSkeleton ? (
    <BloggingListSkeleton coverHeight={coverHeight} />
  ) : showRemoteError ? (
    <View style={styles.remoteState}>
      <Text style={[styles.remoteStateText, { fontFamily: t.fontFamily.medium }]}>
        Could not load blogs.
      </Text>
      <Pressable
        onPress={() => {
          refetchTab().catch(() => {});
        }}
        style={styles.retryBtn}
        accessibilityRole="button"
        accessibilityLabel="Retry loading blogs"
      >
        <Text style={[styles.retryBtnText, { fontFamily: t.fontFamily.semibold }]}>
          Retry
        </Text>
      </Pressable>
    </View>
  ) : (
    <Text style={[styles.empty, { fontFamily: t.fontFamily.medium }]}>
      No posts yet.
    </Text>
  );

  return (
    <View style={styles.root}>
      <FlatList
        ref={listRef}
        data={feedData}
        keyExtractor={feedKey}
        renderItem={renderFeedItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: 24 },
          filteredPosts.length === 0 ? { flexGrow: 1 } : null,
        ]}
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
      {token ? (
        <Pressable
          style={styles.fab}
          onPress={() => { void handleFabPress(); }}
          accessibilityRole="button"
          accessibilityLabel="Upload new blog"
        >
          <PlusIcon />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 10,
  },
  topBarSide: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  topBarSideEnd: {
    alignItems: 'flex-end',
  },
  topBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 18,
    color: TITLE,
    textAlign: 'center',
  },
  subTabs: {
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    marginBottom: 12,
    gap: 28,
  },
  subTabPress: {
    alignItems: 'center',
  },
  subTabLabel: {
    fontSize: 15,
    color: MUTED,
    paddingBottom: 8,
  },
  subTabLabelActive: {
    color: LINK,
  },
  subTabUnderline: {
    height: 3,
    width: '100%',
    minWidth: 56,
    borderRadius: 2,
    backgroundColor: LINK,
  },
  subTabUnderlineSpacer: {
    height: 3,
  },
  listContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
  },
  card: {
    marginBottom: 22,
  },
  thumbWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    position: 'relative',
  },
  cover: {
    ...StyleSheet.absoluteFill,
    borderRadius: 14,
  },
  favOnCover: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    padding: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  durationPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  durationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1C1E',
  },
  cardText: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    color: TITLE,
    lineHeight: 22,
  },
  cardSub: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD - 4,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.10)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: TITLE,
    paddingVertical: Platform.select({ ios: 10, default: 8 }),
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    minHeight: 44,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: MUTED,
    fontSize: 15,
  },
  remoteState: {
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  remoteStateText: {
    fontSize: 15,
    color: MUTED,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  retryBtnText: {
    color: LINK,
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: LINK,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: LINK,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
});
