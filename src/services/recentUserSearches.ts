import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TrendingSearchUser } from '../data/trendingSearchUsersMock';

const KEY = '@multiflix/recent_user_searches_v1';
const MAX_ITEMS = 10;

type StoredV1 = {
  v: 1;
  items: TrendingSearchUser[];
};

function isTrendingSearchUser(x: unknown): x is TrendingSearchUser {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    typeof r.id === 'string' &&
    typeof r.name === 'string' &&
    typeof r.handle === 'string' &&
    typeof r.avatarUri === 'string'
  );
}

/** Load the recent-search list (newest first). Returns [] on miss or bad data. */
export async function loadRecentUserSearches(): Promise<TrendingSearchUser[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { v?: unknown }).v === 1 &&
      Array.isArray((parsed as { items?: unknown }).items)
    ) {
      return ((parsed as StoredV1).items ?? [])
        .filter(isTrendingSearchUser)
        .slice(0, MAX_ITEMS);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Add (or move to the top) a user the viewer tapped on. Dedupes by `id`,
 * caps the list at `MAX_ITEMS`, newest first.
 */
export async function addRecentUserSearch(
  user: TrendingSearchUser,
): Promise<TrendingSearchUser[]> {
  const current = await loadRecentUserSearches();
  const next = [
    user,
    ...current.filter((u) => u.id !== user.id),
  ].slice(0, MAX_ITEMS);
  try {
    const payload: StoredV1 = { v: 1, items: next };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // non-fatal — recent list is a nicety, not load-bearing
  }
  return next;
}

/** Remove a single recent-search entry by user id. Returns the new list. */
export async function removeRecentUserSearch(
  userId: string,
): Promise<TrendingSearchUser[]> {
  const current = await loadRecentUserSearches();
  const next = current.filter((u) => u.id !== userId);
  if (next.length === current.length) return current;
  try {
    const payload: StoredV1 = { v: 1, items: next };
    await AsyncStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // non-fatal
  }
  return next;
}

/** Wipe the entire recent-search list. */
export async function clearRecentUserSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // non-fatal
  }
}
