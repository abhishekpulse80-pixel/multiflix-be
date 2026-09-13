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
