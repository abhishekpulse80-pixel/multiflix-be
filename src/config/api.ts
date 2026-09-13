/**
 * Base URL for REST API (no trailing slash). Dev defaults target the local backend.
 * - Android emulator: 10.0.2.2 reaches the host machine.
 * - iOS simulator: 127.0.0.1 reaches the host.
 * - Physical device: replace host with your machine's LAN IP (same Wi‑Fi).
 */
// const DEV_HOST =
//   'https://atoningly-unsectionalised-millard.ngrok-free.dev/api/v1';
const DEV_HOST = 'https://backend.multiflix.in/api/v1';

export const API_BASE_URL = __DEV__
  ? `${DEV_HOST}`
  : 'https://backend.multiflix.in/api/v1';

/**
 * Must match the API’s `S3_PUBLIC_BASE_URL` (no trailing slash).
 * Used to build `avatarUrl` when `POST /uploads/single` returns `file.url: null` but includes `file.key`.
 * Leave empty if the API always returns a full `url` on upload responses.
 */
export const MEDIA_PUBLIC_BASE_URL = '' as string;
