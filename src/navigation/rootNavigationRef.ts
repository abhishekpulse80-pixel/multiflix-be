import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';
import { store } from '../store';
import { selectCurrentUser } from '../store/selectors';

export const rootNavigationRef =
  createNavigationContainerRef<RootStackParamList>();

export function navigateToUserProfile(userId: string) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('UserProfile', { userId });
  }
}

export function navigateToMyProfile() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('Main', {
      screen: 'profile',
      params: { screen: 'MyProfile' },
    } as never);
  }
}

export function navigateToTrendingPostsViewer(
  params: RootStackParamList['TrendingPostsViewer'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('TrendingPostsViewer', params);
  }
}

export function navigateToSettings() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('Settings');
  }
}

export function navigateToEditProfile() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('EditProfile');
  }
}

export function navigateToMediaPreview(
  params: RootStackParamList['MediaPreview'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('MediaPreview', params);
  }
}

export function navigateToStoryViewer(
  params: RootStackParamList['StoryViewer'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('StoryViewer', params);
  }
}

export function navigateToStoryPreview(
  params: RootStackParamList['StoryPreview'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('StoryPreview', params);
  }
}

export function navigateToUserProfilePostsViewer(
  params: RootStackParamList['UserProfilePostsViewer'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('UserProfilePostsViewer', params);
  }
}

export function navigateToCreateBlog(
  params: RootStackParamList['CreateBlog'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('CreateBlog', params);
  }
}

export function navigateToFollowersList(
  userId: string,
  initialTab?: 'followers' | 'following',
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('FollowersList', { userId, initialTab });
  }
}

export function navigateToBankAccount() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('BankAccount');
  }
}

export function navigateToChatList() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('ChatList');
  }
}

export function navigateToNotifications() {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('Notifications');
  }
}

export function navigateToHashtagFeed(tag: string) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('HashtagFeed', { tag });
  }
}

export function navigateToMusicFeed(
  params: RootStackParamList['MusicFeed'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('MusicFeed', params);
  }
}

export function navigateToSoundDetail(
  params: RootStackParamList['SoundDetail'],
) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('SoundDetail', params);
  }
}

export function navigateToBloggingWatch(postId: string) {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate('Main', {
      screen: 'blogging',
      params: { screen: 'BloggingWatch', params: { postId } },
    } as never);
  }
}

/**
 * Typed data payload attached to every FCM push (mirrors the backend push
 * `data` blobs). FCM data values are always strings.
 */
export type PushData = {
  type: string;
  conversationId?: string;
  senderId?: string;
  followerId?: string;
  postId?: string;
  blogId?: string;
  storyId?: string;
  [key: string]: string | undefined;
};

/** Open one of the recipient's OWN posts (post_like / post_comment target the
 *  post owner = the current user) at the given post, optionally with comments. */
function openOwnPost(postId: string | undefined, openComments: boolean): void {
  const me = selectCurrentUser(store.getState());
  if (!postId || !me) {
    rootNavigationRef.navigate('Notifications');
    return;
  }
  rootNavigationRef.navigate('UserProfilePostsViewer', {
    userId: me.id,
    userDisplayName: me.fullName || me.username || 'You',
    userHandle: me.username || '',
    userAvatarUri: me.avatarUrl ?? '',
    posts: [],
    initialPostId: postId,
    initialPage: 0,
    hasMore: false,
    initialCommentsPostId: openComments ? postId : undefined,
  });
}

function routeFromPush(data: PushData): void {
  switch (data.type) {
    case 'chat_message':
      if (data.senderId) {
        rootNavigationRef.navigate('Chat', {
          userId: data.senderId,
          username: '',
          fullName: '',
          avatarUrl: null,
          conversationId: data.conversationId,
        });
      } else {
        rootNavigationRef.navigate('ChatList');
      }
      return;
    case 'new_follower':
      if (data.followerId) {
        rootNavigationRef.navigate('UserProfile', { userId: data.followerId });
      } else {
        rootNavigationRef.navigate('Notifications');
      }
      return;
    case 'post_like':
      openOwnPost(data.postId, false);
      return;
    case 'post_comment':
      openOwnPost(data.postId, true);
      return;
    case 'blog_like':
      if (data.blogId) {
        navigateToBloggingWatch(data.blogId);
      } else {
        rootNavigationRef.navigate('Notifications');
      }
      return;
    case 'withdrawal_approved':
    case 'withdrawal_rejected':
      rootNavigationRef.navigate('Earnings');
      return;
    // story_reaction, broadcast and anything else → the in-app inbox, where the
    // exact item deep-links precisely (it has the full notification object).
    default:
      rootNavigationRef.navigate('Notifications');
  }
}

/**
 * Route the user to the right screen after they tap a push notification.
 * Retries until the (authenticated) navigator is mounted — on a cold start the
 * app boots through splash/auth before these routes exist.
 */
export function navigateFromPush(data: PushData, attempt = 0): void {
  if (!rootNavigationRef.isReady()) {
    if (attempt < 20) {
      setTimeout(() => navigateFromPush(data, attempt + 1), 300);
    }
    return;
  }
  try {
    routeFromPush(data);
  } catch {
    // Target route not mounted yet (still on splash/auth) — retry briefly.
    if (attempt < 20) {
      setTimeout(() => navigateFromPush(data, attempt + 1), 300);
    }
  }
}
