import { Platform } from 'react-native';

/**
 * Base URL for REST API (no trailing slash). Dev targets the local backend.
 * Android emulator uses 10.0.2.2; iOS simulator uses 127.0.0.1.
 * If you run on a physical device, replace this with your Mac's LAN IP.
 */
const DEV_HOST = Platform.select({
  android: 'https://backend.multiflix.in/api/v1',
  ios: 'https://backend.multiflix.in/api/v1',
  default: 'https://backend.multiflix.in/api/v1',
});

export const API_BASE_URL = __DEV__
  ? `${DEV_HOST}`
  : 'https://backend.multiflix.in/api/v1';

/**
 * Must match the API’s `S3_PUBLIC_BASE_URL` (no trailing slash).
 * Used to build `avatarUrl` when `POST /uploads/single` returns `file.url: null` but includes `file.key`.
 * Leave empty if the API always returns a full `url` on upload responses.
 */
export const MEDIA_PUBLIC_BASE_URL = '' as string;
