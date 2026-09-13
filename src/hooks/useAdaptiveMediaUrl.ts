import { useEffect, useState } from 'react';
import {
  getBestMediaUrl,
  subscribeToNetworkSpeed,
  type AdaptiveMediaKind,
} from '../services/adaptiveMedia';

export function useAdaptiveMediaUrl(
  mediaUrl: string,
  mediaKind: AdaptiveMediaKind,
  token: string | null | undefined,
  enabled = true,
): string {
  const [resolvedUrl, setResolvedUrl] = useState(mediaUrl);

  useEffect(() => {
    let active = true;
    setResolvedUrl(mediaUrl);

    if (!enabled || !mediaUrl) {
      return () => {
        active = false;
      };
    }

    const resolve = () => getBestMediaUrl({ mediaUrl, mediaKind, token });
    resolve().then(url => {
      if (active) setResolvedUrl(url);
    });

    const unsubscribe = subscribeToNetworkSpeed(() => {
      resolve().then(url => {
        if (active) setResolvedUrl(url);
      });
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [enabled, mediaKind, mediaUrl, token]);

  return resolvedUrl;
}