/** Short relative label for blog cards (aligned with mock copy). */
export function formatBlogPublishedLabel(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfPostDay = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate(),
  ).getTime();
  const diffDays = Math.floor(
    (startOfToday - startOfPostDay) / 86_400_000,
  );
  if (diffDays <= 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 14) {
    return 'Last week';
  }
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year:
      d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
