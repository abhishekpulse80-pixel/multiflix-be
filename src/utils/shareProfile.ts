import { Share } from 'react-native';

/** Public web URL for a user profile (resolves to a landing page that
 * deep-links / offers the app download). */
export function profileUrl(username: string): string {
  return `https://multiflix.in/u/${encodeURIComponent(username)}`;
}

/**
 * Open the native share sheet for a user profile (Instagram-style).
 * Best-effort — a user-cancelled share or unavailable sheet is swallowed.
 */
export async function shareProfile(params: {
  username: string;
  fullName?: string | null;
}): Promise<void> {
  const { username, fullName } = params;
  const url = profileUrl(username);
  const who = fullName?.trim() || `@${username}`;
  try {
    await Share.share(
      {
        // iOS uses `url` for the rich preview; Android folds it into message.
        message: `Check out ${who} on Multiflix: ${url}`,
        url,
        title: `${who} on Multiflix`,
      },
      { subject: `${who} on Multiflix` },
    );
  } catch {
    // user dismissed / no share targets — nothing to do
  }
}
