import { API_BASE_URL } from '../config/api';

export type AdaptiveMediaKind = 'video' | 'image' | 'audio';

type AdaptiveMediaResponse = {
  data?: {
    recommendedUrl?: string;
  };
};

const REQUEST_TIMEOUT_MS = 8_000;
const MEDIA_CACHE_TTL_MS = 5 * 60_000;
const MAX_MEDIA_CACHE_ENTRIES = 500;
const mediaUrlCache = new Map<
  string,
  { url: string; expiresAt: number }
>();
const pendingRequests = new Map<string, Promise<string>>();
const speedListeners = new Set<(speedMbps: number) => void>();
let speedMonitor: ReturnType<typeof setInterval> | null = null;
let lastObservedSpeed: number | null = null;

function getConnectionSpeed(): number | null {
  const connection = (
    globalThis as typeof globalThis & {
      navigator?: { connection?: { downlink?: number } };
    }
  ).navigator?.connection;
  const downlink = connection?.downlink;
  return typeof downlink === 'number' && downlink > 0 ? downlink : null;
}

/** React Native has no connection-speed API on every platform. */
export async function getNetworkSpeedMbps(): Promise<number> {
  return getConnectionSpeed() ?? 5;
}

function normalizeSpeed(speed: number): number {
  // Avoid creating a new API/cache key for insignificant speed jitter.
  return Math.max(0.1, Math.round(speed * 2) / 2);
}

export function subscribeToNetworkSpeed(
  listener: (speedMbps: number) => void,
): () => void {
  speedListeners.add(listener);
  if (!speedMonitor) {
    speedMonitor = setInterval(() => {
      const speed = normalizeSpeed(getConnectionSpeed() ?? 5);
      if (speed === lastObservedSpeed) return;
      lastObservedSpeed = speed;
      speedListeners.forEach(callback => callback(speed));
    }, 30_000);
  }

  return () => {
    speedListeners.delete(listener);
    if (speedListeners.size === 0 && speedMonitor) {
      clearInterval(speedMonitor);
      speedMonitor = null;
      lastObservedSpeed = null;
    }
  };
}

function rememberMediaUrl(key: string, url: string): void {
  if (mediaUrlCache.size >= MAX_MEDIA_CACHE_ENTRIES) {
    const oldestKey = mediaUrlCache.keys().next().value;
    if (oldestKey) mediaUrlCache.delete(oldestKey);
  }
  mediaUrlCache.set(key, {
    url,
    expiresAt: Date.now() + MEDIA_CACHE_TTL_MS,
  });
}

export async function getBestMediaUrl({
  mediaUrl,
  mediaKind,
  token,
}: {
  mediaUrl: string;
  mediaKind: AdaptiveMediaKind;
  token: string | null | undefined;
}): Promise<string> {
  if (!mediaUrl || !token || !/^https?:\/\//i.test(mediaUrl)) return mediaUrl;

  // HLS URLs are already adaptive manifests. Do not send them through the
  // upload-adaptive endpoint, which can return a stale/nonexistent variant.
  if (/\.m3u8(?:\?|$)/i.test(mediaUrl)) return mediaUrl;

  const networkSpeedMbps = normalizeSpeed(await getNetworkSpeedMbps());
  const cacheKey = `${mediaKind}:${networkSpeedMbps}:${mediaUrl}`;
  const cached = mediaUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  if (cached) mediaUrlCache.delete(cacheKey);

  const pending = pendingRequests.get(cacheKey);
  if (pending) return pending;

  const request = resolveAdaptiveMediaUrl(
    mediaUrl,
    mediaKind,
    token,
    networkSpeedMbps,
    cacheKey,
  );
  pendingRequests.set(cacheKey, request);
  return request;
}

async function resolveAdaptiveMediaUrl(
  mediaUrl: string,
  mediaKind: AdaptiveMediaKind,
  token: string,
  networkSpeedMbps: number,
  cacheKey: string,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/uploads/adaptive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ mediaUrl, mediaKind, networkSpeedMbps }),
      signal: controller.signal,
    });

    if (!response.ok) {
      rememberMediaUrl(cacheKey, mediaUrl);
      return mediaUrl;
    }
    const json = (await response.json()) as AdaptiveMediaResponse;
    const resolvedUrl = json.data?.recommendedUrl || mediaUrl;
    rememberMediaUrl(cacheKey, resolvedUrl);
    return resolvedUrl;
  } catch {
    rememberMediaUrl(cacheKey, mediaUrl);
    return mediaUrl;
  } finally {
    clearTimeout(timeout);
    pendingRequests.delete(cacheKey);
  }
}

/** Clear results after logout or when the app receives an explicit network reset. */
export function clearAdaptiveMediaCache(): void {
  mediaUrlCache.clear();
  pendingRequests.clear();
}