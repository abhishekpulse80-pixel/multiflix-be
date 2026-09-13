import type { FeedPostData } from '../components/home/FeedPost';

const IMAGES = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1080&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1080&q=80',
] as const;

/** Female portraits only — matches “Jenny Wilson” demo persona across indices. */
const AVATARS = [
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
] as const;

export function createFeedPost(index: number): FeedPostData {
  return {
    id: `feed-${index}`,
    userId: 'u4',
    imageUri: IMAGES[index % IMAGES.length],
    avatarUri: AVATARS[index % AVATARS.length],
    fullName: 'Jenny Wilson',
    userName: 'jennywilson',
    caption: 'Hi everyone, in this video I will sing a song',
    hashtags: '#song #music #love #beauty',
    musicTitle: 'Favorite Girl by Justin Bieber',
    likes: 225_900 + index * 211,
    comments: 24_800 + index * 17,
    saves: 15_600 + index * 9,
    shares: 20_700 + index * 13,
  };
}

export function createInitialFeed(count: number): FeedPostData[] {
  return Array.from({ length: count }, (_, i) => createFeedPost(i));
}
