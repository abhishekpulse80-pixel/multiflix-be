import { formatRelativeTime } from '../src/utils/formatRelativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-04-13T12:00:00.000Z').getTime();

  it('returns just now for very recent timestamps', () => {
    const iso = new Date(now - 20_000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe('just now');
  });

  it('formats minutes and hours', () => {
    expect(
      formatRelativeTime(new Date(now - 90_000).toISOString(), now),
    ).toBe('1 min ago');
    expect(
      formatRelativeTime(new Date(now - 5 * 60_000).toISOString(), now),
    ).toBe('5 min ago');
    expect(
      formatRelativeTime(new Date(now - 2 * 60 * 60_000).toISOString(), now),
    ).toBe('2 hours ago');
  });

  it('returns empty string for invalid iso', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('');
  });
});
