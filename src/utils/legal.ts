import { Linking } from 'react-native';

/** Canonical legal pages hosted on the marketing site. */
export const TERMS_URL = 'https://multiflix.in/terms';
export const PRIVACY_URL = 'https://multiflix.in/privacy';

export function openTerms(): void {
  void Linking.openURL(TERMS_URL).catch(() => undefined);
}

export function openPrivacy(): void {
  void Linking.openURL(PRIVACY_URL).catch(() => undefined);
}
