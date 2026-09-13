/**
 * Screen-time tracker — accumulates seconds spent in Feed / Music / Stories
 * into an AsyncStorage-backed buffer and flushes whole minutes to the backend
 * every ~5 minutes (and on background / app-close).
 *
 * Usage (per screen):
 *   useTrackScreenTime('feed');  // see useTrackScreenTime hook
 *
 * Usage (app boot):
 *   initScreenTimeTracker();     // once after the user is signed in
 *
 * Usage (logout):
 *   await clearScreenTimeBuffer();
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import { store } from '../store';
import { injectedEarningsApi } from '../store/api/earningsApi';
import {
  EARNING_SECTIONS,
  type EarningSection,
  type RecordScreenTimeRequest,
} from '../types/earningsApi';

const BUFFER_KEY = '@multiflix/screen_time_buffer_v1';
/** How often we try to push whole minutes up to the backend. */
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
/** Min seconds before a section-switch / app-background triggers a buffer persist. */
const PERSIST_THRESHOLD_SECONDS = 1;

/** Dev-only logging — strip or flip to `false` before shipping. */
const DEBUG = __DEV__;
function dlog(...args: unknown[]): void {
  if (DEBUG) console.log('[screenTime]', ...args);
}

type SectionBuffer = Record<EarningSection, number>;

function emptyBuffer(): SectionBuffer {
  return { feed: 0, music: 0, blogging: 0 };
}

// ---- module state (singleton) ----
let buffer: SectionBuffer = emptyBuffer();
let bufferLoaded = false;

let activeSection: EarningSection | null = null;
let activeSectionStartedAt: number | null = null;

let flushTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: NativeEventSubscription | null = null;
let lastAppState: AppStateStatus = AppState.currentState;
let initialized = false;

/** Coerce a parsed AsyncStorage value into a valid buffer. */
function normalizeBuffer(value: unknown): SectionBuffer {
  const out = emptyBuffer();
  if (!value || typeof value !== 'object') return out;
  const v = value as Record<string, unknown>;
  for (const section of EARNING_SECTIONS) {
    const n = Number(v[section]);
    if (Number.isFinite(n) && n > 0) out[section] = n;
  }
  return out;
}

async function loadBuffer(): Promise<void> {
  if (bufferLoaded) return;
  try {
    const raw = await AsyncStorage.getItem(BUFFER_KEY);
    buffer = raw ? normalizeBuffer(JSON.parse(raw) as unknown) : emptyBuffer();
  } catch {
    buffer = emptyBuffer();
  }
  bufferLoaded = true;
}

async function persistBuffer(): Promise<void> {
  try {
    await AsyncStorage.setItem(BUFFER_KEY, JSON.stringify(buffer));
  } catch {
    // best-effort
  }
}

/** Drain the time since `activeSectionStartedAt` into the buffer for the active section. */
function drainActiveElapsed(nowMs: number): number {
  if (activeSection == null || activeSectionStartedAt == null) return 0;
  const elapsedSec = (nowMs - activeSectionStartedAt) / 1000;
  if (elapsedSec < PERSIST_THRESHOLD_SECONDS) {
    activeSectionStartedAt = nowMs;
    return 0;
  }
  buffer[activeSection] += elapsedSec;
  activeSectionStartedAt = nowMs;
  return elapsedSec;
}

/**
 * Start tracking time in `section`. Idempotent: if the same section is already
 * active, does nothing. If a different section was active, its elapsed time is
 * drained into the buffer before switching.
 */
export async function startTrackingSection(section: EarningSection): Promise<void> {
  await loadBuffer();
  const now = Date.now();
  if (activeSection === section) {
    // Already tracking this section — no-op.
    return;
  }
  if (activeSection != null) {
    drainActiveElapsed(now);
    await persistBuffer();
  }
  activeSection = section;
  activeSectionStartedAt = now;
  dlog('start', section, 'buffer=', { ...buffer });
}

/**
 * Stop tracking whichever section is active. Drains elapsed time into the buffer.
 * If `section` is provided, only stops if that section is currently active
 * (prevents blur handlers from clobbering a newly-focused screen's start).
 */
export async function stopTrackingSection(section?: EarningSection): Promise<void> {
  if (activeSection == null) return;
  if (section != null && activeSection !== section) return;
  await loadBuffer();
  const prev = activeSection;
  drainActiveElapsed(Date.now());
  activeSection = null;
  activeSectionStartedAt = null;
  await persistBuffer();
  dlog('stop', prev, 'buffer=', { ...buffer });
}

/**
 * Flush whole-minute buffers to the backend. Partial seconds remain buffered.
 * On success, the posted seconds are subtracted; on failure, everything stays.
 */
export async function flushScreenTimeNow(): Promise<void> {
  await loadBuffer();
  // Drain any in-flight elapsed time first so the buffer is up-to-date.
  drainActiveElapsed(Date.now());

  const entries: RecordScreenTimeRequest['entries'] = [];
  const consumed: Partial<Record<EarningSection, number>> = {};

  for (const section of EARNING_SECTIONS) {
    const seconds = buffer[section];
    const minutes = Math.floor(seconds / 60);
    if (minutes >= 1) {
      entries.push({ section, minutes });
      consumed[section] = minutes * 60;
    }
  }

  if (entries.length === 0) {
    await persistBuffer();
    dlog('flush: nothing to send', 'buffer=', { ...buffer });
    return;
  }

  // Only flush if the user is signed in (RTK Query will 401 otherwise).
  const token = store.getState().auth.accessToken;
  if (!token) {
    await persistBuffer();
    dlog('flush: skipped — no access token');
    return;
  }

  dlog('flush: POST /earnings/me/screen-time', entries);
  try {
    const result = store.dispatch(
      injectedEarningsApi.endpoints.flushScreenTime.initiate({ entries }),
    );
    const response = await result.unwrap();
    // Server accepted — subtract the consumed seconds.
    for (const section of EARNING_SECTIONS) {
      const sub = consumed[section];
      if (sub) buffer[section] = Math.max(0, buffer[section] - sub);
    }
    dlog(
      'flush: ok — credited=',
      response.credited,
      'wallet=',
      response.walletBalance,
      'buffer=',
      { ...buffer },
    );
  } catch (err) {
    // Keep the buffer intact for the next flush attempt.
    dlog('flush: failed', err);
  } finally {
    await persistBuffer();
  }
}

function onAppStateChange(next: AppStateStatus): void {
  const prev = lastAppState;
  lastAppState = next;

  if (prev === 'active' && next !== 'active') {
    // Going background / inactive: drain + persist + try flushing.
    dlog('appState:', prev, '→', next, '(backgrounding, will flush)');
    void (async () => {
      await loadBuffer();
      drainActiveElapsed(Date.now());
      // Keep the section marker but stop the running clock — we'll restart on foreground.
      activeSectionStartedAt = null;
      await persistBuffer();
      await flushScreenTimeNow();
    })();
  } else if (prev !== 'active' && next === 'active') {
    // Resume the clock for the still-active section, if any.
    if (activeSection != null) {
      activeSectionStartedAt = Date.now();
      dlog('appState:', prev, '→', next, '(resumed)', activeSection);
    } else {
      dlog('appState:', prev, '→', next, '(no active section)');
    }
  }
}

/**
 * Call once after the user is authenticated (e.g. right after login or app-start
 * hydration). Safe to call multiple times — subsequent calls are no-ops.
 */
export function initScreenTimeTracker(): void {
  if (initialized) return;
  initialized = true;
  dlog('init: starting tracker, flush interval =', FLUSH_INTERVAL_MS, 'ms');

  // Fire-and-forget: load buffer + attempt an immediate flush of leftover minutes.
  void (async () => {
    await loadBuffer();
    dlog('init: loaded buffer', { ...buffer });
    await flushScreenTimeNow();
  })();

  flushTimer = setInterval(() => {
    void flushScreenTimeNow();
  }, FLUSH_INTERVAL_MS);

  appStateSub = AppState.addEventListener('change', onAppStateChange);
}

/** Tear down timers + listeners and drop in-memory state. Used on logout. */
export async function clearScreenTimeBuffer(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  if (appStateSub) {
    appStateSub.remove();
    appStateSub = null;
  }
  initialized = false;
  activeSection = null;
  activeSectionStartedAt = null;
  buffer = emptyBuffer();
  bufferLoaded = true;
  try {
    await AsyncStorage.removeItem(BUFFER_KEY);
  } catch {
    // best-effort
  }
}
