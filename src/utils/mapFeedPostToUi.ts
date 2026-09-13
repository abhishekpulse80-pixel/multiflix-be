import type { FeedPostData } from '../components/home/FeedPost';
import type { FeedPostDto } from '../types/feedApi';

const PLACEHOLDER_MEDIA =
  'https://placehold.co/1080x1920/1a202c/a0aec0/png?text=Multiflix';

/** Map API post to home `FeedPost` props. */
export function mapFeedPostDtoToFeedPostData(p: FeedPostDto): FeedPostData {
  const imageUri = p.media.url?.trim() || PLACEHOLDER_MEDIA;
  const avatarUri =
    typeof p.authorAvatarUrl === 'string' && p.authorAvatarUrl.trim().length > 0
      ? p.authorAvatarUrl.trim()
      : '';
  return {
    id: p.id,
    userId: p.authorId,
    imageUri,
    /** Falls back to the placeholder svg in `UserAvatar` when empty. */
    avatarUri,
    userName: p.authorUsername,
    fullName: p.authorFullName ?? p.authorUsername,
    caption: p.caption ?? '',
    hashtags: p.hashtags ?? '',
    musicTitle: p.musicTitle ?? '',
    music: p.music ?? null,
    originalAudioMuted: p.originalAudioMuted ?? false,
    originalSound: p.originalSound ?? null,
    likes: p.likesCount,
    comments: p.commentsCount,
    saves: p.savesCount ?? 0,
    shares: 0,
    likedByViewer: p.likedByViewer ?? false,
    savedByViewer: p.savedByViewer ?? false,
    isVideo: p.mediaKind === 'short_video',
    videoDurationSec: p.durationSeconds,
    posterUri: p.thumbnailUrl ?? undefined,
    createdAt: p.createdAt,
  };
}
