import { resolveMediaPlaybackUrl } from '../src/utils/mediaPlayback';

describe('media playback helpers', () => {
  it('waits for backend media status to become ready and returns the HLS URL', async () => {
    const statuses: Array<{ status: 'processing' | 'ready'; hlsUrl: string | null }> = [
      { status: 'processing', hlsUrl: null },
      { status: 'ready', hlsUrl: 'https://cdn.example.com/master.m3u8' },
    ];

    const url = await resolveMediaPlaybackUrl({
      getStatus: async () => {
        const next = statuses.shift();
        return next ?? { status: 'ready', hlsUrl: 'https://cdn.example.com/master.m3u8' };
      },
      fallbackUrl: 'https://cdn.example.com/original.mp4',
      intervalMs: 0,
      maxAttempts: 5,
    });

    expect(url).toBe('https://cdn.example.com/master.m3u8');
  });

  it('falls back to the original URL when media is not required or failed', async () => {
    const url = await resolveMediaPlaybackUrl({
      getStatus: async () => ({ status: 'failed', hlsUrl: null, error: 'bad' }),
      fallbackUrl: 'https://cdn.example.com/original.mp4',
      intervalMs: 0,
      maxAttempts: 2,
    });

    expect(url).toBe('https://cdn.example.com/original.mp4');
  });
});
