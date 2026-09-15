/** `POST /uploads/single` — after `{ data: ... }` unwrap. */

export type UploadedMediaDto = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  category: 'image' | 'video' | 'audio';
  url: string | null;
};

export type UploadSingleResponse = {
  file: UploadedMediaDto;
};

/** `POST /uploads/presign` — after `{ data: ... }` unwrap. */
export type PresignUploadResponse = {
  uploadUrl: string;
  key: string;
  bucket: string;
  contentType: string;
  category: 'image' | 'video' | 'audio';
  url: string | null;
  acl: string | null;
  expiresIn: number;
};

export type MediaProcessingStatus = 'processing' | 'ready' | 'failed' | 'not_required';

export type MediaStatusResponse = {
  postId: string;
  mediaKind: 'image' | 'short_video';
  status: MediaProcessingStatus;
  hlsUrl: string | null;
  variants: Array<{
    quality: string;
    width: number;
    height: number;
    bitrateKbps: number;
    playlistUrl: string;
  }>;
  error: string | null;
};

export type QualityProfileResponse = {
  networkSpeedMbps: number;
  networkProfile: string;
  recommendedQuality: string;
  maxResolution: string;
};
