import { Linking } from 'react-native';
import { toastError } from './toast';

function normalizeUrl(raw: string): string | null {
  const t = raw.trim();
  if (t.length === 0) {
    return null;
  }
  if (/^https?:\/\//i.test(t)) {
    return t;
  }
  return `https://${t}`;
}

export async function openExternalUrl(rawUrl: string): Promise<void> {
  const url = normalizeUrl(rawUrl);
  if (!url) {
    toastError('Link unavailable', 'This ad has no valid URL.');
    return;
  }
  // Note: `Linking.canOpenURL` is unreliable on Android 11+ for http/https
  // (requires `<queries>` in AndroidManifest). Just attempt to open directly.
  try {
    await Linking.openURL(url);
  } catch {
    toastError('Could not open link', 'Please try again.');
  }
}
