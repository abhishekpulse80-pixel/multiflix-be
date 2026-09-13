import type {
  MusicAlbumDetailResponse,
  MusicAlbumListItemDto,
  MusicTrackPublicDto,
} from './musicApi';

/** Client shapes for music tab UI (mapped from API DTOs). */

export type MusicTrackRow = {
  id: string;
  artUri: string;
  title: string;
  artist: string;
  /** Tappable artist target — null when payload predates the Artist refactor. */
  artistId: string | null;
  streams: number;
  audioUrl?: string;
  favouritedByViewer: boolean;
};

export type MusicAlbumDetail = {
  id: string;
  coverUri: string;
  title: string;
  featured?: boolean;
  artistName: string;
  /** Tappable artist target on the album header. */
  artistId: string | null;
  artistEmail: string;
  membership: string;
  bio: string;
  profileUri: string;
  trackIds: string[];
};

export type MusicAlbumRow = Pick<
  MusicAlbumDetail,
  'id' | 'coverUri' | 'title' | 'featured'
>;

export function mapTrackDtoToRow(d: MusicTrackPublicDto): MusicTrackRow {
  return {
    id: d.id,
    artUri: d.artUrl,
    title: d.title,
    artist: d.artist?.name ?? d.artistName,
    artistId: d.artist?.id ?? null,
    streams: d.streamsCount,
    audioUrl: d.audioUrl,
    favouritedByViewer: d.favouritedByViewer ?? false,
  };
}

export function mapAlbumListItemToRow(d: MusicAlbumListItemDto): MusicAlbumRow {
  return {
    id: d.id,
    coverUri: d.coverArtUrl,
    title: d.title,
    featured: d.featured,
  };
}

export function mapAlbumDetailResponse(d: MusicAlbumDetailResponse): {
  detail: MusicAlbumDetail;
  tracks: MusicTrackRow[];
} {
  const tracks = d.tracks.map(mapTrackDtoToRow);
  return {
    detail: {
      id: d.id,
      coverUri: d.coverArtUrl,
      title: d.title,
      featured: d.featured,
      artistName: d.artist?.name ?? d.artistName,
      artistId: d.artist?.id ?? null,
      artistEmail: d.artistEmail ?? '',
      membership: d.membership ?? '',
      bio: d.artistBio ?? '',
      profileUri: d.artist?.profileImageUrl ?? d.artistProfileImageUrl ?? '',
      trackIds: tracks.map((t) => t.id),
    },
    tracks,
  };
}

export function getMusicTrackById(
  trackId: string,
  catalog: MusicTrackRow[],
): MusicTrackRow | undefined {
  return catalog.find((t) => t.id === trackId);
}

export function getMusicTrackIndex(trackId: string, catalog: MusicTrackRow[]): number {
  return catalog.findIndex((t) => t.id === trackId);
}

export function getAdjacentTrackId(
  trackId: string,
  direction: 'prev' | 'next',
  catalog: MusicTrackRow[],
): string | undefined {
  const i = getMusicTrackIndex(trackId, catalog);
  if (i < 0 || catalog.length === 0) {
    return undefined;
  }
  if (direction === 'prev') {
    const j = i <= 0 ? catalog.length - 1 : i - 1;
    return catalog[j]?.id;
  }
  const j = i >= catalog.length - 1 ? 0 : i + 1;
  return catalog[j]?.id;
}

export function getUpcomingMusicRows(
  currentId: string,
  catalog: MusicTrackRow[],
): MusicTrackRow[] {
  return catalog.filter((t) => t.id !== currentId);
}
