import type { CreatePostFileRef } from '../types/feedApi';
import type { UploadedMediaDto } from '../types/uploadsApi';

/** Strip `category` — `POST /posts` uses the strict file schema. */
export function toCreatePostFileRef(file: UploadedMediaDto): CreatePostFileRef {
  return {
    key: file.key,
    bucket: file.bucket,
    contentType: file.contentType,
    size: file.size,
    originalName: file.originalName,
    url: file.url,
  };
}
