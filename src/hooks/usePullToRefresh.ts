import { useCallback, useState } from 'react';

/** Brand blue — shared spinner tint for every pull-to-refresh control. */
export const REFRESH_TINT = '#246BFD';

/**
 * Pull-to-refresh state for a screen. Pass a function that re-fetches the
 * screen's data (it may return a promise or do Promise.all internally); the
 * hook tracks the spinner and never throws if a refetch rejects.
 *
 * Usage:
 *   const { refreshing, onRefresh } = usePullToRefresh(() => refetch());
 *   <FlatList refreshControl={<RefreshControl refreshing={refreshing}
 *     onRefresh={onRefresh} tintColor={REFRESH_TINT} colors={[REFRESH_TINT]} />} />
 */
export function usePullToRefresh(
  refetch: () => unknown | Promise<unknown>,
): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.resolve()
      .then(() => refetch())
      .catch(() => {
        // Best-effort — a failed refetch shouldn't leave the spinner stuck.
      })
      .finally(() => setRefreshing(false));
  }, [refetch]);
  return { refreshing, onRefresh };
}
