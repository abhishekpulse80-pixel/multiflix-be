import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  startTrackingSection,
  stopTrackingSection,
} from '../services/screenTimeTracker';
import type { EarningSection } from '../types/earningsApi';

/**
 * Tracks time spent on the calling screen for the given `section`.
 *
 * Uses `useFocusEffect` so tracking starts when the screen gains focus and
 * stops (draining elapsed seconds into the buffer) on blur — which is the
 * correct behavior when the user taps a different tab or navigates away.
 *
 * Usage:
 *   export function HomeFeedScreen() {
 *     useTrackScreenTime('feed');
 *     // …
 *   }
 */
export function useTrackScreenTime(section: EarningSection): void {
  useFocusEffect(
    useCallback(() => {
      void startTrackingSection(section);
      return () => {
        void stopTrackingSection(section);
      };
    }, [section]),
  );
}
