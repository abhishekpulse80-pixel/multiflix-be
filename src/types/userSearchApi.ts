/** `GET /users/search` — matches `multiflix-backend` `UserSearchResponse`. */

export type UserSearchItemDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type UserSearchResponseDto = {
  items: UserSearchItemDto[];
};

/** `GET /users/connections/search` — search within follow network. */
export type ConnectionSearchItemDto = {
  id: string;
  username: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type ConnectionSearchResponseDto = {
  items: ConnectionSearchItemDto[];
};
