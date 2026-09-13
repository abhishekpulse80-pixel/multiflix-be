import type { SponsoredFeedAd } from '../types/homeFeed';
import type { SponsoredAdDto } from '../types/feedApi';

const PLACEHOLDER_MEDIA =
  'https://placehold.co/1080x1920/1a202c/a0aec0/png?text=Ad';

export function mapSponsoredAdDtoToUi(ad: SponsoredAdDto): SponsoredFeedAd {
  const imageUri = ad.imageUrl?.trim() || PLACEHOLDER_MEDIA;
  const avatarUri =
    typeof ad.avatarUrl === 'string' && ad.avatarUrl.trim().length > 0
      ? ad.avatarUrl.trim()
      : '';
  const handle = ad.handle?.trim() || 'sponsored';
  return {
    id: ad.id,
    imageUri,
    avatarUri,
    brandName: ad.brandName?.trim() || 'Sponsored',
    userName: handle,
    caption: ad.caption?.trim() ?? '',
    hashtags: ad.hashtags?.trim() ?? '',
    targetUrl: ad.targetUrl?.trim() ?? '',
    ctaLabel: ad.ctaLabel?.trim() || 'Learn more',
  };
}
