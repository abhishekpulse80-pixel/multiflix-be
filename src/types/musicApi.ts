/** Matches `multiflix-backend` `music.service` JSON payloads. */

export type MusicArtistInfoDto = {
  id: string;
  name: string;
  profileImageUrl: string | null;
};

export type MusicAlbumListItemDto = {
  id: string;
  title: string;
  coverArtUrl: string;
  featured: boolean;
};

export type MusicAlbumListResponse = {
  items: MusicAlbumListItemDto[];
};

export type MusicTrackPublicDto = {
  id: string;
  albumId: string;
  title: string;
  artUrl: string;
  audioUrl: string;
  streamsCount: number;
  /** Denormalised artist name (kept for older payloads). */
  artistName: string;
  /** Full artist block — present after Subtask 2. */
  artist?: MusicArtistInfoDto | null;
  durationSeconds: number | null;
  /** Whether the viewer has favourited this track. Absent in legacy payloads. */
  favouritedByViewer?: boolean;
};

export type MusicTrackFavouriteResponse = {
  favourited: boolean;
};

export type MusicTrackPlayResponse = {
  streamsCount: number;
};

export type MusicTrackListResponse = {
  items: MusicTrackPublicDto[];
};

/** `GET /music/tracks/:trackId` — single track + viewer favourite flag. */
export type MusicTrackDetailResponse = {
  track: MusicTrackPublicDto;
};

/** `GET /music/search?q=&limit=` — combined tracks + albums results. */
export type MusicSearchResponse = {
  tracks: MusicTrackPublicDto[];
  albums: MusicAlbumListItemDto[];
};

export type MusicAlbumDetailResponse = {
  id: string;
  title: string;
  coverArtUrl: string;
  featured: boolean;
  artistName: string;
  artistBio: string | null;
  artistProfileImageUrl: string | null;
  artistEmail: string | null;
  membership: string | null;
  /** Full artist block — present after Subtask 2. */
  artist?: MusicArtistInfoDto | null;
  publishedAt: string | null;
  tracks: MusicTrackPublicDto[];
};

/** Lightweight artist card for the Music tab horizontal scroll. */
export type MusicArtistListItemDto = {
  id: string;
  name: string;
  profileImageUrl: string | null;
};

/** `GET /music/artists?page=&limit=` */
export type MusicArtistListResponse = {
  items: MusicArtistListItemDto[];
};

/** `GET /music/artists/:artistId` — artist profile + their work. */
export type MusicArtistDetailResponse = {
  id: string;
  name: string;
  bio: string | null;
  profileImageUrl: string | null;
  albums: MusicAlbumListItemDto[];
  tracks: MusicTrackPublicDto[];
};
