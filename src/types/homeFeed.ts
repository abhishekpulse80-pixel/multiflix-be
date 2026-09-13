import type { FeedPostData } from '../components/home/FeedPost';

/** User row in the feed “Friend Recommendations” card (`GET /posts/feed`). */
export type RecommendationUser = {
  id: string;
  /** Shown as @handle */
  handle: string;
  avatarUri: string;
  /** Whether this user already follows you → "Follow Back". */
  followsYou: boolean;
};

/** Sponsored full-screen card (`GET /posts/feed` `type: "sponsored"`). */
export type SponsoredFeedAd = {
  id: string;
  imageUri: string;
  avatarUri: string;
  brandName: string;
  userName: string;
  caption: string;
  hashtags: string;
  targetUrl: string;
  ctaLabel: string;
};

/** Home vertical feed row — shape is driven by the API `items` union, plus a
 * client-injected Google native ad slot (`googleNativeAd`, see admob config). */
export type HomeFeedItem =
  | { type: 'post'; post: FeedPostData }
  | { type: 'recommendations'; id: string; users: RecommendationUser[] }
  | { type: 'sponsored'; ad: SponsoredFeedAd }
  | { type: 'googleNativeAd'; id: string };
