import type { CreateStoryFileRef } from '../types/storiesApi';
import type { UploadedMediaDto } from '../types/uploadsApi';

/** Strip `category` etc. — `POST /stories` uses a strict file schema. */
export function toCreateStoryFileRef(file: UploadedMediaDto): CreateStoryFileRef {
  return {
    key: file.key,
    bucket: file.bucket,
    contentType: file.contentType,
    size: file.size,
    originalName: file.originalName,
    url: file.url,
  };
}
