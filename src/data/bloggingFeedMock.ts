export type BloggingSubTabKey = 'blogging' | 'favorites' | 'following';

export type BloggingPost = {
  id: string;
  coverUri: string;
  avatarUri: string;
  title: string;
  authorId: string;
  authorName: string;
  dateLabel: string;
  viewsCount: number;
  isFavorite: boolean;
  fromFollowing: boolean;
  /** Set when row comes from `GET /blogs` (long-form video URL). */
  videoUrl?: string;
  description?: string;
  /** Runtime in seconds — shown as a duration pill on the cover. */
  durationSeconds?: number | null;
};

const cov = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=960&q=80`;

const av = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=120&q=80`;

export const BLOGGING_ALL_POSTS: BloggingPost[] = [
  {
    id: 'b1',
    title: 'New podcast',
    authorId: 'kunj',
    authorName: 'Kunj Apple',
    dateLabel: 'Today',
    viewsCount: 1274,
    coverUri: cov('1478730900567-78e44ad1ca69'),
    avatarUri: av('1507003211169-0a1dd7228f2d'),
    isFavorite: true,
    fromFollowing: true,
  },
  {
    id: 'b2',
    title: 'Test',
    authorId: 'kunj',
    authorName: 'Kunj Apple',
    dateLabel: 'Today',
    viewsCount: 302,
    coverUri: cov('1493225457124-a210638b260f'),
    avatarUri: av('1507003211169-0a1dd7228f2d'),
    isFavorite: false,
    fromFollowing: true,
  },
  {
    id: 'b3',
    title: 'Morning routine vlog',
    authorId: 'u1',
    authorName: 'Kristin Watson',
    dateLabel: 'Yesterday',
    viewsCount: 9870,
    coverUri: cov('1516321498327-e374a7c3d369'),
    avatarUri: av('1494790108377-be9c29b29330'),
    isFavorite: true,
    fromFollowing: false,
  },
  {
    id: 'b4',
    title: 'Studio tour behind the scenes',
    authorId: 'u2',
    authorName: 'Ralph Edwards',
    dateLabel: '2 days ago',
    viewsCount: 564,
    coverUri: cov('1511671782779-c97d3d27a1d4'),
    avatarUri: av('1500648767791-00dcc994a43e'),
    isFavorite: false,
    fromFollowing: true,
  },
  {
    id: 'b5',
    title: 'Quick tips for better audio',
    authorId: 'u3',
    authorName: 'Kathryn Murphy',
    dateLabel: '3 days ago',
    viewsCount: 45890,
    coverUri: cov('1511379936987-c60e50ab74f9'),
    avatarUri: av('1438761681033-6461ffad8d80'),
    isFavorite: true,
    fromFollowing: true,
  },
  {
    id: 'b6',
    title: 'Weekend live Q&A replay',
    authorId: 'u4',
    authorName: 'Jenny Wilson',
    dateLabel: 'Last week',
    viewsCount: 204,
    coverUri: cov('1451187580459-43490279c0fa'),
    avatarUri: av('1534528741775-53994a69daeb'),
    isFavorite: false,
    fromFollowing: false,
  },
];

export function postsForSubTab(
  tab: BloggingSubTabKey,
  all: BloggingPost[] = BLOGGING_ALL_POSTS,
): BloggingPost[] {
  switch (tab) {
    case 'favorites':
      return all.filter(p => p.isFavorite);
    case 'following':
      return all.filter(p => p.fromFollowing);
    default:
      return all;
  }
}

export function filterBloggingPostsByQuery(
  posts: BloggingPost[],
  query: string,
): BloggingPost[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return posts;
  }
  return posts.filter(
    p =>
      p.title.toLowerCase().includes(q) ||
      p.authorName.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false),
  );
}

export function getBloggingPostById(
  postId: string,
  all: BloggingPost[] = BLOGGING_ALL_POSTS,
): BloggingPost | undefined {
  return all.find(p => p.id === postId);
}

/**
 * Suggested list under the mini player: other creators you follow first,
 * then other posts (YouTube-style “up next”).
 */
export function getFollowingFeedExcept(
  currentId: string,
  all: BloggingPost[] = BLOGGING_ALL_POSTS,
): BloggingPost[] {
  const others = all.filter(p => p.id !== currentId);
  const fromFollowing = others.filter(p => p.fromFollowing);
  const rest = others.filter(p => !p.fromFollowing);
  return [...fromFollowing, ...rest];
}
