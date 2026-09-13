import type {
  ProfileGridItem,
  PublicUserProfile,
} from '../data/publicUserProfileMock';
import type { UserPublicProfileDto } from '../types/profileApi';

function handleFromDto(d: UserPublicProfileDto): string {
  const u = d.username?.trim();
  if (u) {
    return u;
  }
  return `user_${d.id.slice(-6)}`;
}

export function mapUserPublicProfileDtoToPublicUserProfile(
  d: UserPublicProfileDto,
): PublicUserProfile {
  const displayName = d.fullName?.trim() || 'User';
  const handle = handleFromDto(d);
  const bio = d.interests.length > 0 ? d.interests.slice(0, 4).join(' · ') : '';
  const avatarUri = d.avatarUrl?.trim() || '';
  const grid: ProfileGridItem[] = [];
  const likedGrid: ProfileGridItem[] = [];
  return {
    userId: d.id,
    displayName,
    handle,
    bio,
    avatarUri,
    posts: d.postsCount,
    followers: d.followersCount,
    likes: d.likesCount ?? 0,
    isFollowing: d.isFollowing,
    followsYou: d.followsYou,
    isFollowersListPrivate: Boolean(d.isFollowersListPrivate),
    grid,
    likedGrid,
  };
}
