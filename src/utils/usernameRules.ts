/**
 * Username rules — mirror of the backend `usernameRules.ts`:
 * lowercase letters, numbers, periods and underscores; 3–30 chars; no spaces;
 * cannot start or end with `.`/`_`.
 */
export const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])$/;

/** Lowercase + strip spaces so typed input matches what the server stores. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

export function isValidUsernameShape(name: string): boolean {
  return name.length >= 3 && name.length <= 30 && USERNAME_REGEX.test(name);
}

/** Human-readable reason a username is invalid, or null when it's well-formed. */
export function usernameShapeError(name: string): string | null {
  if (name.length === 0) {
    return 'Username is required';
  }
  if (/\s/.test(name)) {
    return 'No spaces allowed';
  }
  if (name.length < 3) {
    return 'At least 3 characters';
  }
  if (name.length > 30) {
    return 'At most 30 characters';
  }
  if (!/^[a-z0-9._]+$/.test(name)) {
    return 'Only letters, numbers, . and _';
  }
  if (!USERNAME_REGEX.test(name)) {
    return "Can't start or end with . or _";
  }
  return null;
}
