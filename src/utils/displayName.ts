/**
 * System-wide user display name: fullName → username.
 * Use everywhere a person's name is shown so a user with only an
 * auto-generated username never surfaces the raw username.
 */
export function userDisplayName(u: {
  fullName?: string | null;
  username?: string | null;
  /** Some UI models call the handle `handle` instead of `username`. */
  handle?: string | null;
}): string {
  return (
    u.fullName?.trim() ||
    u.username?.trim() ||
    u.handle?.trim() ||
    'User'
  );
}
