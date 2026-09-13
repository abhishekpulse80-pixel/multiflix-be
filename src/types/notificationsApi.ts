/** Notifications API — mirrors backend `NotificationDto` / `ListNotificationsResult`. */

export type NotificationType =
  | 'new_follower'
  | 'post_like'
  | 'post_comment'
  | 'blog_like'
  | 'story_reaction'
  | 'withdrawal_approved'
  | 'withdrawal_rejected';

export type NotificationActorDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type NotificationPostDto = {
  id: string;
  mediaKind: 'image' | 'short_video';
  mediaUrl: string | null;
  thumbnailUrl: string | null;
};

export type NotificationDto = {
  id: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  /** `null` for system notifications (e.g. withdrawal decisions). */
  actor: NotificationActorDto | null;
  post: NotificationPostDto | null;
  commentId: string | null;
  /** Set for blog_like — drives "open the blog" navigation. */
  blogId: string | null;
  /** Set for story_reaction — drives "open the story" navigation. */
  storyId: string | null;
  /** Generic payload for system notifications — e.g. `{ amount, requestId }`. */
  meta: Record<string, unknown> | null;
};

/** `GET /notifications` — paginated inbox, newest first. */
export type ListNotificationsResponse = {
  items: NotificationDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

/** `GET /notifications/unread-count`. */
export type UnreadCountResponse = {
  count: number;
};

/** `PATCH /notifications/:id/read`. */
export type MarkNotificationReadResponse = {
  ok: true;
};

/** `PATCH /notifications/read-all` — returns the number of newly-read docs. */
export type MarkAllReadResponse = {
  modified: number;
};
