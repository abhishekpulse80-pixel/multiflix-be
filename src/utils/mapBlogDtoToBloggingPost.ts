import type { BloggingPost } from '../data/bloggingFeedMock';
import type { BlogListItemDto } from '../types/blogApi';
import { formatBlogPublishedLabel } from './formatBlogPublishedLabel';

export function blogAuthorDisplayName(author: BlogListItemDto['author']): string {
  const fn = author.fullName?.trim();
  if (fn) {
    return fn;
  }
  return author.username;
}

export function mapBlogListItemDtoToBloggingPost(
  dto: BlogListItemDto,
): BloggingPost {
  return {
    id: dto.id,
    coverUri: dto.thumbnailUrl,
    avatarUri: dto.author.avatarUrl ?? '',
    title: dto.title,
    authorId: dto.author.id,
    authorName: blogAuthorDisplayName(dto.author),
    dateLabel: formatBlogPublishedLabel(dto.publishedAt),
    viewsCount: dto.viewsCount,
    isFavorite: dto.isFavorite,
    fromFollowing: dto.fromFollowing,
    videoUrl: dto.videoUrl,
    description: dto.description ?? undefined,
    durationSeconds: dto.durationSeconds,
  };
}
