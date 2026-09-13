/** `GET/POST /posts/:postId/comments` — matches `multiflix-backend` `CommentDto`. */

export type CommentDto = {
  id: string;
  postId: string;
  authorId: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type PostCommentsListResponse = {
  comments: CommentDto[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type CreatePostCommentResponse = {
  comment: CommentDto;
};
