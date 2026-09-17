/** `GET /blogs` / `GET /blogs/:blogId` — matches `multiflix-backend` blog DTOs. */

export type BlogListTab = 'blogging' | 'favorites' | 'following';

export type BlogAuthorDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type BlogListItemDto = {
  id: string;
  title: string;
  description: string | null;
  viewsCount: number;
  thumbnailUrl: string;
  videoUrl: string;
  durationSeconds: number | null;
  tags: string[];
  publishedAt: string | null;
  author: BlogAuthorDto;
  fromFollowing: boolean;
  isFavorite: boolean;
};

export type BlogListResponse = {
  items: BlogListItemDto[];
};

export type BlogDetailResponse = {
  blog: BlogListItemDto;
};

export type BlogFavoriteResponse = {
  favorited: boolean;
};

export type BlogViewResponse = {
  viewsCount: number;
};

export type UploadedFileRef = {
  key: string;
  bucket: string;
  contentType: string;
  size: number;
  originalName: string;
  url: string | null;
};

export type CreateBlogRequest = {
  title: string;
  description?: string | null;
  file: UploadedFileRef;
  posterFile?: UploadedFileRef | null;
  durationSeconds?: number | null;
};

export type CreateBlogResponse = {
  blog: { id: string };
};

export type BlogMediaStatusResponse = {
  mediaId: string;
  mediaKind: 'video';
  status: 'processing' | 'ready' | 'failed' | 'not_required';
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
