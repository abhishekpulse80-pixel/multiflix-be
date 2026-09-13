import { formatCount } from './formatCount';

export function formatMusicStreamsLine(streams: number): string {
  return `${formatCount(streams)} streams`;
}
