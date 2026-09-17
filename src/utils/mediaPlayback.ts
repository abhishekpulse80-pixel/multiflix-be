export type MediaPlaybackStatus = 'processing' | 'ready' | 'failed' | 'not_required';

export type MediaStatusLike = {
  status: MediaPlaybackStatus;
  hlsUrl?: string | null;
  error?: string | null;
};

export type ResolveMediaPlaybackUrlArgs = {
  getStatus: () => Promise<MediaStatusLike>;
  fallbackUrl: string;
  intervalMs?: number;
  maxAttempts?: number;
};

export async function resolveMediaPlaybackUrl({
  getStatus,
  fallbackUrl,
  intervalMs = 3000,
  maxAttempts = 60,
}: ResolveMediaPlaybackUrlArgs): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const status = await getStatus();

    if (status.status === 'ready' && status.hlsUrl) {
      return status.hlsUrl;
    }

    if (status.status === 'failed' || status.status === 'not_required') {
      return fallbackUrl;
    }

    if (attempt < maxAttempts - 1) {
      await new Promise<void>(resolve => setTimeout(resolve, intervalMs));
    }
  }

  return fallbackUrl;
}
