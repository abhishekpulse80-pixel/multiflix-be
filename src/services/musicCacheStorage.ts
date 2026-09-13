import AsyncStorage from '@react-native-async-storage/async-storage';
import RNBlobUtil from 'react-native-blob-util';

/**
 * Disk cache for music audio files. Keyed by trackId so the same track keeps
 * its cached copy across signed-URL rotations, with an LRU policy capped by
 * `MAX_BYTES`.
 *
 * Stored in DocumentDir (NOT CacheDir): CacheDir is OS-evictable under
 * storage pressure, which made a cached track silently re-download after an
 * app kill. DocumentDir persists until we evict it ourselves, so "played
 * once → stays local" actually holds. Our own LRU keeps it bounded.
 *
 * Used by MusicPlayerContext to swap remote `audioUrl`s for local `file://`
 * paths before pushing them to react-native-track-player, and to prefetch
 * upcoming tracks in the queue so skip-to-next is instant on slow networks.
 */

const META_KEY = '@multiflix/music_cache_v1';
const CACHE_DIR = `${RNBlobUtil.fs.dirs.DocumentDir}/music`;
const MAX_BYTES = 150 * 1024 * 1024;

type Entry = { path: string; size: number; lastUsed: number };
type Meta = { entries: Record<string, Entry> };

let metaCache: Meta | null = null;
let metaLoadPromise: Promise<Meta> | null = null;
const inflight = new Map<string, Promise<string>>();

async function loadMeta(): Promise<Meta> {
  if (metaCache) return metaCache;
  if (metaLoadPromise) return metaLoadPromise;
  metaLoadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(META_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Meta;
        if (parsed && typeof parsed === 'object' && parsed.entries) {
          metaCache = parsed;
          return parsed;
        }
      }
    } catch {
      // corrupt — fall through to fresh meta
    }
    metaCache = { entries: {} };
    return metaCache;
  })();
  return metaLoadPromise;
}

let metaSaveTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleMetaSave(meta: Meta): void {
  metaCache = meta;
  if (metaSaveTimer) return;
  metaSaveTimer = setTimeout(() => {
    metaSaveTimer = null;
    void AsyncStorage.setItem(META_KEY, JSON.stringify(meta)).catch(
      () => undefined,
    );
  }, 250);
}

function inferExt(url: string): string {
  const clean = url.split('?')[0].split('#')[0];
  const m = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : 'mp3';
}

function safeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

async function ensureDir(): Promise<void> {
  const exists = await RNBlobUtil.fs.isDir(CACHE_DIR).catch(() => false);
  if (!exists) {
    await RNBlobUtil.fs.mkdir(CACHE_DIR).catch(() => undefined);
  }
}

export async function getCachedAudioUrl(
  trackId: string,
): Promise<string | null> {
  const meta = await loadMeta();
  const entry = meta.entries[trackId];
  if (!entry) return null;
  const exists = await RNBlobUtil.fs.exists(entry.path).catch(() => false);
  if (!exists) {
    delete meta.entries[trackId];
    scheduleMetaSave(meta);
    return null;
  }
  entry.lastUsed = Date.now();
  scheduleMetaSave(meta);
  return `file://${entry.path}`;
}

async function evictIfNeeded(meta: Meta): Promise<void> {
  let total = 0;
  for (const e of Object.values(meta.entries)) total += e.size;
  if (total <= MAX_BYTES) return;
  const sorted = Object.entries(meta.entries).sort(
    (a, b) => a[1].lastUsed - b[1].lastUsed,
  );
  for (const [id, entry] of sorted) {
    if (total <= MAX_BYTES) break;
    await RNBlobUtil.fs.unlink(entry.path).catch(() => undefined);
    delete meta.entries[id];
    total -= entry.size;
  }
}

function downloadTrackToCache(
  trackId: string,
  remoteUrl: string,
): Promise<string> {
  const existing = inflight.get(trackId);
  if (existing) return existing;

  const p = (async () => {
    const cached = await getCachedAudioUrl(trackId);
    if (cached) return cached;

    await ensureDir();
    const ext = inferExt(remoteUrl);
    const finalPath = `${CACHE_DIR}/${safeId(trackId)}.${ext}`;
    const tmpPath = `${finalPath}.part`;

    const partExists = await RNBlobUtil.fs.exists(tmpPath).catch(() => false);
    if (partExists) {
      await RNBlobUtil.fs.unlink(tmpPath).catch(() => undefined);
    }

    const res = await RNBlobUtil.config({ path: tmpPath }).fetch(
      'GET',
      remoteUrl,
    );
    const status = res.info().status;
    if (status < 200 || status >= 300) {
      await RNBlobUtil.fs.unlink(tmpPath).catch(() => undefined);
      throw new Error(`music cache download ${status}`);
    }

    const destExists = await RNBlobUtil.fs.exists(finalPath).catch(() => false);
    if (destExists) {
      await RNBlobUtil.fs.unlink(finalPath).catch(() => undefined);
    }
    await RNBlobUtil.fs.mv(tmpPath, finalPath);

    const stat = await RNBlobUtil.fs.stat(finalPath);
    const size =
      typeof stat.size === 'string'
        ? parseInt(stat.size, 10)
        : Number(stat.size);

    const meta = await loadMeta();
    meta.entries[trackId] = {
      path: finalPath,
      size: Number.isFinite(size) ? size : 0,
      lastUsed: Date.now(),
    };
    await evictIfNeeded(meta);
    scheduleMetaSave(meta);
    return `file://${finalPath}`;
  })();

  inflight.set(trackId, p);
  p.catch(() => undefined).finally(() => {
    inflight.delete(trackId);
  });
  return p;
}

/**
 * Fire-and-forget cache download. Best-effort — errors are swallowed so a
 * failed prefetch never breaks playback.
 */
export function prefetchTrackAudio(trackId: string, remoteUrl: string): void {
  void downloadTrackToCache(trackId, remoteUrl).catch(() => undefined);
}

export async function clearMusicCache(): Promise<void> {
  await RNBlobUtil.fs.unlink(CACHE_DIR).catch(() => undefined);
  metaCache = { entries: {} };
  await AsyncStorage.removeItem(META_KEY).catch(() => undefined);
}
