export type TrendingStory = {
  id: string;
  avatarUri: string;
};

export type TrendingTile = {
  id: string;
  imageUri: string;
  views: number;
};

const PORTRAIT = [
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?auto=format&fit=crop&w=600&q=80',
] as const;

const FOOD = [
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80',
] as const;

const STORY_POOL = [
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
] as const;

export const TRENDING_STORIES: TrendingStory[] = Array.from(
  { length: 12 },
  (_, i) => ({
    id: `story-${i}`,
    avatarUri: STORY_POOL[i % STORY_POOL.length],
  }),
);

/** Two rows × three columns (mock). */
export const TRENDING_GRID_TOP: TrendingTile[] = PORTRAIT.map((uri, i) => ({
  id: `t-top-${i}`,
  imageUri: uri,
  views: 520_000 + i * 41_200,
}));

/** Two rows × two columns (wider tiles). */
export const TRENDING_GRID_BOTTOM: TrendingTile[] = FOOD.map((uri, i) => ({
  id: `t-bot-${i}`,
  imageUri: uri,
  views: 180_000 + i * 55_000,
}));
