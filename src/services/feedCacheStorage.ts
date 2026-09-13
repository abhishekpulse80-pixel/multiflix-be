import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HomeFeedItem } from '../types/homeFeed';

const KEY = '@multiflix/feed_cache_v2';
const MAX_ITEMS = 100;

type StoredV2 = {
  v: 2;
  userId: string | null;
  items: HomeFeedItem[];
};

function isHomeFeedItem(x: unknown): x is HomeFeedItem {
  if (typeof x !== 'object' || x === null || !('type' in x)) {
    return false;
  }
  const t = (x as { type: unknown }).type;
  if (t === 'post') {
    return 'post' in x && typeof (x as { post?: unknown }).post === 'object';
  }
  if (t === 'recommendations') {
    return (
      'id' in x &&
      typeof (x as { id: unknown }).id === 'string' &&
      'users' in x &&
      Array.isArray((x as { users: unknown }).users)
    );
  }
  if (t === 'sponsored') {
    const row = x as { ad?: unknown };
    if (typeof row.ad !== 'object' || row.ad === null) {
      return false;
    }
    const ad = row.ad as Record<string, unknown>;
    return (
      typeof ad.id === 'string' &&
      typeof ad.imageUri === 'string' &&
      typeof ad.targetUrl === 'string' &&
      typeof ad.ctaLabel === 'string'
    );
  }
  return false;
}

export async function loadHomeFeedCache(
  currentUserId: string | undefined,
): Promise<HomeFeedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredV2;
    const expected = currentUserId ?? null;
    if (parsed?.userId !== expected) {
      return [];
    }
    if (parsed.v === 2 && Array.isArray(parsed.items)) {
      const items = parsed.items.filter(isHomeFeedItem);
      return items;
    }
    return [];
  } catch {
    return [];
  }
}

export async function saveHomeFeedCache(
  currentUserId: string | undefined,
  items: HomeFeedItem[],
): Promise<void> {
  try {
    const payload: StoredV2 = {
      v: 2,
      userId: currentUserId ?? null,
      items: items.slice(0, MAX_ITEMS),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore disk errors */
  }
}

export async function clearHomeFeedCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
