import type { HomeFeedItem } from '../types/homeFeed';
import type { HomeFeedItemDto, HomeFeedResponse } from '../types/feedApi';
import { mapFeedPostDtoToFeedPostData } from './mapFeedPostToUi';
import { mapSponsoredAdDtoToUi } from './mapSponsoredAdToUi';

/** Map one API feed row into UI props for `HomeFeedScreen`. */
export function mapHomeFeedItemDtoToUiItem(row: HomeFeedItemDto): HomeFeedItem {
  if (row.type === 'recommendations') {
    return {
      type: 'recommendations',
      id: row.id,
      users: row.users.map(u => ({
        id: u.id,
        handle: u.handle,
        avatarUri:
          typeof u.avatarUrl === 'string' && u.avatarUrl.trim().length > 0
            ? u.avatarUrl.trim()
            : '',
        followsYou: u.followsYou ?? false,
      })),
    };
  }
  if (row.type === 'sponsored') {
    return {
      type: 'sponsored',
      ad: mapSponsoredAdDtoToUi(row.ad),
    };
  }
  return {
    type: 'post',
    post: mapFeedPostDtoToFeedPostData(row.post),
  };
}

export function mapHomeFeedResponseToUiItems(data: HomeFeedResponse): HomeFeedItem[] {
  return data.items.map(mapHomeFeedItemDtoToUiItem);
}
