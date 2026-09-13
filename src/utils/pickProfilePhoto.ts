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

const pickerOptions: ImageLibraryOptions = {
  mediaType: 'photo',
  quality: 1,
  maxWidth: 2048,
  maxHeight: 2048,
  includeBase64: false,
  selectionLimit: 1,
};

const GENERIC_MIME = new Set([
  '',
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-www-form-urlencoded',
]);

function inferImageMimeFromFilename(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
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
    case 'bmp':
      return 'image/bmp';
    case 'svg':
      return 'image/svg+xml';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

/**
 * Multipart `Content-Type` for the file part must match what multer sees; Android
 * often sends `application/octet-stream` or omits type — infer from extension.
 */
/**
 * Build multipart fields for a local `file://` or `content://` URI when the
 * picker `Asset` is not available (e.g. only the URI was passed through navigation).
 */
export function localImageUriToUploadPayload(
  uri: string,
  hints?: { fileName?: string; mimeType?: string },
): { uri: string; name: string; type: string } | null {
  const trimmed = uri.trim();
  if (!trimmed) {
    return null;
  }
  const name =
    hints?.fileName?.replace(/[^\w.-]+/g, '_') ||
    trimmed.split('/').pop()?.replace(/[^\w.-]+/g, '_') ||
    `story-${Date.now()}.jpg`;
  const raw =
    (hints?.mimeType ?? '').trim().toLowerCase().split(';')[0] ?? '';
  const normalized =
    raw === 'image/jpg'
      ? 'image/jpeg'
      : GENERIC_MIME.has(raw)
        ? inferImageMimeFromFilename(name)
        : raw || inferImageMimeFromFilename(name);
  return { uri: trimmed, name, type: normalized };
}

export function assetToUploadPayload(
  asset: Asset,
): { uri: string; name: string; type: string } | null {
  if (!asset.uri) {
    return null;
  }
  const name =
    asset.fileName?.replace(/[^\w.-]+/g, '_') || `profile-${Date.now()}.jpg`;
  const raw = (asset.type ?? '').trim().toLowerCase().split(';')[0] ?? '';
  const normalized =
    raw === 'image/jpg'
      ? 'image/jpeg'
      : GENERIC_MIME.has(raw)
        ? inferImageMimeFromFilename(name)
        : raw || inferImageMimeFromFilename(name);
  return { uri: asset.uri, name, type: normalized };
}

export async function pickPhotoFromLibrary(): Promise<Asset | null> {
  const res = await launchImageLibrary(pickerOptions);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || res.errorCode);
  }
  const asset = res.assets?.[0];
  return asset ?? null;
}

export async function pickPhotoFromCamera(): Promise<Asset | null> {
  const permission = await ensureCameraPermission();
  if (permission === 'denied') {
    return null;
  }
  if (permission === 'blocked') {
    throw new Error(CAMERA_PERMISSION_BLOCKED_CODE);
  }
  const cameraOptions: CameraOptions = {
    ...pickerOptions,
    cameraType: 'back',
    saveToPhotos: false,
  };
  const res = await launchCamera(cameraOptions);
  if (res.didCancel) {
    return null;
  }
  if (res.errorCode) {
    throw new Error(res.errorMessage || res.errorCode);
  }
  const asset = res.assets?.[0];
  return asset ?? null;
}
