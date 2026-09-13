/**
 * Human-readable relative time from an ISO-8601 timestamp (e.g. comment `createdAt`).
 * `nowMs` is optional for tests.
 */
export function formatRelativeTime(iso: string, nowMs: number = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) {
    return '';
  }
  const diffSec = Math.floor((nowMs - t) / 1000);
  if (diffSec < 0) {
    return 'just now';
  }
  if (diffSec < 45) {
    return 'just now';
  }
  if (diffSec < 60) {
    return `${diffSec}s ago`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return diffMin === 1 ? '1 min ago' : `${diffMin} min ago`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return diffHr === 1 ? '1 hour ago' : `${diffHr} hours ago`;
  }
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  }
  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;
  }
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return diffMonth <= 1 ? '1 month ago' : `${diffMonth} months ago`;
  }
  const diffYear = Math.floor(diffDay / 365);
  return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
}
