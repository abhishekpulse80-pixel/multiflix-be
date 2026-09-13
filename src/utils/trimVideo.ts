import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { showEditor } from 'react-native-video-trim';
import ReactNativeBlobUtil from 'react-native-blob-util';

export type TrimResult = {
  outputPath: string;
  startTime: number;
  endTime: number;
  duration: number;
};

/**
 * Normalize picker URIs to the form react-native-video-trim expects.
 *
 * iOS: the library does `URL(string: inputFile) ?? URL(fileURLWithPath: inputFile)`.
 * A bare path like "/private/var/..." passes `URL(string:)` as a *scheme-less*
 * URL and AVURLAsset then fails to load it ("Fail to load media"). So we must
 * keep the `file://` prefix on iOS. ph:// / assets-library:// URIs aren't real
 * file URLs and have to be copied into app cache first.
 *
 * Android: the native module calls `filePath.toUri()` which handles file://
 * and bare paths, but content:// URIs need to be copied to a real path.
 */
async function resolveToFilePath(uri: string): Promise<string> {
  if (Platform.OS === 'ios') {
    if (uri.startsWith('ph://') || uri.startsWith('assets-library://')) {
      const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
      const dest = `file://${cacheDir}/trim_input_${Date.now()}.mp4`;
      await ReactNativeBlobUtil.fs.cp(uri, dest.replace('file://', ''));
      return dest;
    }
    if (uri.startsWith('/')) return `file://${uri}`;
    return uri;
  }

  // Android
  if (uri.startsWith('content://')) {
    const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
    const dest = `${cacheDir}/trim_input_${Date.now()}.mp4`;
    await ReactNativeBlobUtil.fs.cp(uri, dest);
    return dest;
  }
  if (uri.startsWith('file://')) return uri.replace('file://', '');
  return uri;
}

/**
 * Try New Architecture (TurboModule) event subscription first,
 * fall back to DeviceEventEmitter for Old Architecture.
 */
function subscribeToTrimEvents(
  onFinish: (event: { outputPath?: string; startTime?: number; endTime?: number; duration?: number }) => void,
  onCancel: () => void,
  onError: (message: string) => void,
  onHide: () => void,
): { remove: () => void } {
  const nativeModule = NativeModules.VideoTrim;

  // New Architecture: TurboModule exposes direct event methods
  if (nativeModule && typeof nativeModule.onFinishTrimming === 'function') {
    const subs: Array<{ remove: () => void }> = [];
    subs.push(
      nativeModule.onFinishTrimming((e: { outputPath?: string; startTime?: number; endTime?: number; duration?: number }) => onFinish(e)),
    );
    // Both events mean "the user backed out without a trimmed result":
    // `onCancelTrimming` fires when an in-progress trim is cancelled, while
    // `onCancel` fires when the editor's Cancel/back button is tapped.
    if (typeof nativeModule.onCancelTrimming === 'function') {
      subs.push(nativeModule.onCancelTrimming(() => onCancel()));
    }
    if (typeof nativeModule.onCancel === 'function') {
      subs.push(nativeModule.onCancel(() => onCancel()));
    }
    if (typeof nativeModule.onError === 'function') {
      subs.push(
        nativeModule.onError((e: { message?: string }) => onError(e.message ?? 'Video trim failed')),
      );
    }
    // Safety net: the editor was dismissed. If no terminal event follows, treat
    // it as a cancel so the promise can never hang.
    if (typeof nativeModule.onHide === 'function') {
      subs.push(nativeModule.onHide(() => onHide()));
    }
    return {
      remove: () => subs.forEach((s) => s.remove()),
    };
  }

  // Old Architecture / fallback: DeviceEventEmitter
  const subscription = DeviceEventEmitter.addListener(
    'VideoTrim',
    (event: { name: string; outputPath?: string; startTime?: number; endTime?: number; duration?: number; message?: string }) => {
      switch (event.name) {
        case 'onFinishTrimming':
          onFinish(event);
          break;
        // `onCancelTrimming` = cancel an in-progress trim; `onCancel` = the
        // editor's Cancel/back button. Both must resolve the promise, else the
        // caller's loading overlay hangs until the app is killed.
        case 'onCancelTrimming':
        case 'onCancel':
          onCancel();
          break;
        case 'onError':
          onError(event.message ?? 'Video trim failed');
          break;
        // Editor dismissed — safety net (see onHide wiring below).
        case 'onHide':
          onHide();
          break;
        default:
          break;
      }
    },
  );
  return subscription;
}

/**
 * Opens the native video trim editor and returns a Promise that resolves
 * with the trimmed video path, or `null` if the user cancelled.
 *
 * Pass both `minDurationSec` and `maxDurationSec` to the same value to
 * force the user to pick a window of an exact length (e.g. 15s for stories).
 *
 * @param videoUri  Local file or content:// URI of the video to trim.
 * @param maxDurationSec  Max allowed trim duration in seconds (default 60).
 * @param minDurationSec  Min allowed trim duration in seconds (default 1).
 */
/**
 * Module-level guard: only one trim editor may be open at a time. A second
 * call while one is in flight resolves to `null` immediately instead of
 * stacking native editors (which, on large HD files, spawns concurrent
 * trim jobs and crashes the app).
 */
let editorOpen = false;

export function openTrimEditor(
  videoUri: string,
  maxDurationSec = 60,
  minDurationSec = 1,
): Promise<TrimResult | null> {
  if (editorOpen) {
    return Promise.resolve(null);
  }
  editorOpen = true;
  return new Promise((resolve, reject) => {
    resolveToFilePath(videoUri)
      .then((filePath) => {
        let settled = false;
        let sub: { remove: () => void } | null = null;
        let hideTimer: ReturnType<typeof setTimeout> | null = null;

        function finish(result: TrimResult | null, error?: Error) {
          if (settled) return;
          settled = true;
          if (hideTimer) {
            clearTimeout(hideTimer);
            hideTimer = null;
          }
          sub?.remove();
          editorOpen = false;
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }

        sub = subscribeToTrimEvents(
          (event) => {
            finish({
              outputPath: event.outputPath ?? filePath,
              startTime: event.startTime ?? 0,
              endTime: event.endTime ?? 0,
              duration: event.duration ?? 0,
            });
          },
          () => finish(null),
          (msg) => finish(null, new Error(msg)),
          () => {
            // The editor was dismissed. On a successful trim `onFinishTrimming`
            // fires first and settles the promise, so this no-ops. But if the
            // build emits no dedicated cancel event on editor close, resolve as
            // a cancel shortly after so the caller's promise never hangs.
            if (settled || hideTimer) return;
            hideTimer = setTimeout(() => finish(null), 600);
          },
        );

        showEditor(filePath, {
          maxDuration: maxDurationSec * 1000,
          minDuration: Math.max(1000, minDurationSec * 1000),
          saveToPhoto: false,
          enableCancelTrimming: true,
          enableCancelDialog: false,
          // Skip the "Save the trimmed video?" confirmation — tapping
          // Save in the trim UI commits directly.
          enableSaveDialog: false,
          // Auto-dismiss the editor the moment the trim finishes. Combined
          // with the module-level `editorOpen` guard this prevents the
          // double-tap-Save → concurrent-trim → crash on large HD videos.
          closeWhenFinish: true,
          // Surface a load failure (e.g. an oversized/corrupt HD file) as a
          // dialog instead of silently hanging on the editor.
          alertOnFailToLoad: true,
          alertOnFailTitle: 'Cannot open video',
          alertOnFailMessage:
            'This video could not be loaded for trimming. Please try a different or shorter clip.',
          alertOnFailCloseText: 'OK',
          trimmingText: 'Trimming video...',
        });
      })
      .catch((err: unknown) => {
        editorOpen = false;
        reject(err instanceof Error ? err : new Error(String(err)));
      });
  });
}
