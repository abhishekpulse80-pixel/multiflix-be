/**
 * Compact media runtime. Shows h:mm:ss once past an hour (e.g. 1:45:20),
 * otherwise m:ss (e.g. 12:40) — the familiar video-player convention.
 * Returns '' when unknown.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) {
    return '';
  }
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = s.toString().padStart(2, '0');
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${ss}`;
  }
  return `${m}:${ss}`;
}
