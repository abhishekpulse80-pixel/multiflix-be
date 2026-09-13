import { MEDIA_PUBLIC_BASE_URL } from '../config/api';
import type { UploadedMediaDto } from '../types/uploadsApi';

/** Mirrors backend `publicUrlForKey` (encode each path segment). */
function publicUrlFromKey(key: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const path = key.split('/').map(encodeURIComponent).join('/');
  return `${base}/${path}`;
}

/**
 * Value suitable for `POST /auth/fill-profile` { avatarUrl }.
 * Prefer API `file.url`; if missing, derive from `file.key` + `MEDIA_PUBLIC_BASE_URL` (same as server S3 public base).
 */
export function resolveUploadedAvatarUrl(file: UploadedMediaDto): string | null {
  const u = file.url?.trim();
  if (u && u.length > 0) {
    return u;
  }
  const base = MEDIA_PUBLIC_BASE_URL.trim();
  const key = file.key?.trim();
  if (base.length > 0 && key && key.length > 0) {
    return publicUrlFromKey(key, base);
  }
  return null;
}
