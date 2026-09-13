/** Compact counts for profile stat rows (e.g. 368K, 3.7M). */
export function formatProfileStat(n: number): string {
  if (n >= 1_000_000) {
    const v = n / 1_000_000;
    const s = v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
    return `${s}M`;
  }
  if (n >= 1_000) {
    const v = n / 1_000;
    const s = v >= 100 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, '');
    return `${s}K`;
  }
  return String(n);
}
