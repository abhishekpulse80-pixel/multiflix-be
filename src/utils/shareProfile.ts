import { Share } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

export type ShareKind = 'video' | 'blog' | 'music' | 'profile';
const PUBLIC_SITE_URL = 'https://multiflix.in';

export function profileUrl(username: string): string {
  return `${PUBLIC_SITE_URL}/u/${encodeURIComponent(username)}`;
}

export function contentUrl(kind: Exclude<ShareKind, 'profile'>, id: string): string {
  const prefixMap = {
    video: 'v',
    blog: 'b',
    music: 'm',
  } as const;
  return `${PUBLIC_SITE_URL}/${prefixMap[kind]}/${encodeURIComponent(id)}`;
}

export async function shareNativeSheet(params: {
  title: string;
  message: string;
  url: string;
  subject?: string;
}): Promise<void> {
  const { title, message, url, subject } = params;
  try {
    await Share.share(
      {
        message,
        url,
        title,
      },
      { subject: subject ?? title },
    );
  } catch {
    // user dismissed / no share targets — nothing to do
  }
}

export async function shareProfile(params: {
  username: string;
  fullName?: string | null;
  followersCount?: number | null;
  followingCount?: number | null;
  avatarUrl?: string | null;
}): Promise<void> {
  const { username, fullName, followersCount, followingCount, avatarUrl } = params;
  const url = profileUrl(username);
  const who = fullName?.trim() || `@${username}`;
  const hasStats =
    typeof followersCount === 'number' && typeof followingCount === 'number';
  const stats = hasStats
    ? `\n${formatShareCount(followersCount)} Followers, ${formatShareCount(followingCount)} Following`
    : '';

  void avatarUrl;

  await shareNativeSheet({
    title: `${who} on Multiflix`,
    message: `${who}\n@${username}${stats}\n${url}`,
    url,
    subject: `${who} on Multiflix`,
  });
}

async function resolveAvatarShareUri(avatarUrl: string): Promise<string> {
  try {
    const cacheRoot = `${RNBlobUtil.fs.dirs.CacheDir}/multiflix-share`;
    await RNBlobUtil.fs.mkdir(cacheRoot).catch(() => undefined);

    const fileName = `profile-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 10)}.jpg`;
    const filePath = `${cacheRoot}/${fileName}`;
    const response = await RNBlobUtil.config({
      fileCache: true,
      path: filePath,
    }).fetch('GET', avatarUrl);

    const localPath = response.path();
    return localPath.startsWith('file://') ? localPath : `file://${localPath}`;
  } catch {
    return '';
  }
}

function formatShareCount(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`;
  }
  return String(value);
}

export async function shareMultiflixContent(params: {
  kind: Exclude<ShareKind, 'profile'>;
  id: string;
  title: string;
  author?: string | null;
  username?: string | null;
}): Promise<void> {
  const { kind, id, title, author, username } = params;
  const label = author?.trim() || username?.trim() || 'Multiflix creator';
  const url = contentUrl(kind, id);
  const shareTitle = `${title} on Multiflix`;
  const shareMessage = `${label} shared “${title}” on Multiflix: ${url}`;

  await shareNativeSheet({
    title: shareTitle,
    message: shareMessage,
    url,
    subject: shareTitle,
  });
}
