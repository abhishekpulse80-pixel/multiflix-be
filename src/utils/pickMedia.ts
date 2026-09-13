import {
  launchCamera,
  launchImageLibrary,
  type Asset,
  type CameraOptions,
  type ImageLibraryOptions,
} from 'react-native-image-picker';
import {
  CAMERA_PERMISSION_BLOCKED_CODE,
  ensureCameraPermission,
} from './cameraPermission';

// Feed/post media is shown on phone screens, so cap picked IMAGES to a
// sensible size + compression. Camera originals are often 4–8 MB / 4000px,
// which is the main reason posts load slowly on mobile networks; this brings a
// typical photo down to ~300–600 KB with no visible loss. Only affects images
// — react-native-image-picker ignores maxWidth/maxHeight/quality for videos
// (those are handled separately, see Phase 3 transcoding).
const IMAGE_MAX_WIDTH = 1080;
const IMAGE_MAX_HEIGHT = 1920;
const IMAGE_QUALITY = 0.8 as const;

/** Accept both images and videos. */
const mixedLibraryOptions: ImageLibraryOptions = {
  mediaType: 'mixed',
  quality: IMAGE_QUALITY,
  maxWidth: IMAGE_MAX_WIDTH,
  maxHeight: IMAGE_MAX_HEIGHT,
  selectionLimit: 1,
  includeBase64: false,
  // iOS: transcode HEVC / slow-mo / Cinematic clips to H.264 and force iCloud
  // assets to download locally before returning a URI. Without this the native
  // trim editor (AVAssetExportSession) fails with "Fail to load media".
  assetRepresentationMode: 'compatible',
  formatAsMp4: true,
};

/**
 * `launchCamera` only supports 'photo' or 'video' — NOT 'mixed'.
 * We expose a `mode` param so the caller can pick which one.
 */
const photoCameraOptions: CameraOptions = {
  mediaType: 'photo',
  quality: IMAGE_QUALITY,
  maxWidth: IMAGE_MAX_WIDTH,
  maxHeight: IMAGE_MAX_HEIGHT,
  cameraType: 'back',
  saveToPhotos: false,
  includeBase64: false,
};

const videoCameraOptions: CameraOptions = {
  mediaType: 'video',
  quality: 1,
  cameraType: 'back',
  saveToPhotos: false,
  includeBase64: false,
  durationLimit: 60,
  // iOS records HEVC .mov by default; force mp4 so the native trim editor
  // (AVAssetExportSession) can open it reliably.
  formatAsMp4: true,
};

const GENERIC_MIME = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-www-form-urlencoded',
]);

function inferMimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    case 'avi':
      return 'video/x-msvideo';
    case 'mkv':
      return 'video/x-matroska';
    case 'webm':
      return 'video/webm';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

export function assetToMediaPayload(
  asset: Asset,
): { uri: string; name: string; type: string } | null {
  if (!asset.uri) {
    return null;
  }
  const name =
    asset.fileName?.replace(/[^\w.-]+/g, '_') || `media-${Date.now()}.jpg`;
  const raw = (asset.type ?? '').trim().toLowerCase().split(';')[0] ?? '';
  const normalized =
    raw === 'image/jpg'
      ? 'image/jpeg'
      : GENERIC_MIME.has(raw)
        ? inferMimeFromFilename(name)
        : raw || inferMimeFromFilename(name);
  return { uri: asset.uri, name, type: normalized };
}

/** True when the MIME starts with `video/`. */
export function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

export async function pickMediaFromLibrary(): Promise<Asset | null> {
  const res = await launchImageLibrary(mixedLibraryOptions);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || res.errorCode);
  }
  return res.assets?.[0] ?? null;
}

export type CameraMode = 'photo' | 'video';

export async function pickMediaFromCamera(
  mode: CameraMode = 'video',
): Promise<Asset | null> {
  const permission = await ensureCameraPermission();
  if (permission === 'denied') {
    return null;
  }
  if (permission === 'blocked') {
    throw new Error(CAMERA_PERMISSION_BLOCKED_CODE);
  }
  const opts = mode === 'photo' ? photoCameraOptions : videoCameraOptions;
  const res = await launchCamera(opts);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || res.errorCode);
  }
  return res.assets?.[0] ?? null;
}
