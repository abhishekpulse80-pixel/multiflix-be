import {
  showMessage,
  type MessageType,
} from 'react-native-flash-message';

type ToastKind = 'info' | 'success' | 'error' | 'warning';

function mapKind(kind: ToastKind): MessageType {
  switch (kind) {
    case 'success':
      return 'success';
    case 'error':
      return 'danger';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

function safeText(value: unknown, fallback: string): string {
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : fallback;
  }
  if (value == null) {
    return fallback;
  }
  const s = String(value).trim();
  return s.length > 0 ? s : fallback;
}

function safeDescription(value: unknown): string | undefined {
  if (value == null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const t = value.trim();
    return t.length > 0 ? t : undefined;
  }
  const s = String(value).trim();
  return s.length > 0 ? s : undefined;
}

/**
 * Global in-app toast (replaces blocking `Alert.alert`).
 * Renders via `<FlashMessage />` in `App.tsx`. Never throws.
 */
export function toast(
  title: unknown,
  body?: unknown,
  kind: ToastKind = 'info',
): void {
  const message = safeText(title, 'Notice');
  const description = safeDescription(body);
  try {
    showMessage({
      message,
      description,
      type: mapKind(kind),
      duration: kind === 'error' ? 5500 : kind === 'success' ? 3200 : 4000,
      floating: true,
    });
  } catch {
    /* FlashMessage ref missing or RN internal — avoid crashing the press handler */
  }
}

export const toastInfo = (title: unknown, body?: unknown) =>
  toast(title, body, 'info');
export const toastSuccess = (title: unknown, body?: unknown) =>
  toast(title, body, 'success');
export const toastError = (title: unknown, body?: unknown) =>
  toast(title, body, 'error');
export const toastWarning = (title: unknown, body?: unknown) =>
  toast(title, body, 'warning');
