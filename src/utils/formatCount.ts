/** Compact counts for social actions (e.g. 225.9K). */
export function formatCount(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1)}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    return `${v >= 100 ? Math.round(v) : v.toFixed(1)}K`;
  }
  return String(Math.round(n));
}
