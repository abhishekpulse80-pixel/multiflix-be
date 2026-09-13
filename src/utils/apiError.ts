import type { SerializedError } from '@reduxjs/toolkit';

type ApiErrorBody = {
  error?: unknown;
  message?: unknown;
  code?: unknown;
  details?: unknown;
};

/**
 * Pull the first field-level message out of a zod `flatten()` payload so the
 * user sees *which* field failed instead of a generic "Invalid request body".
 */
function firstFieldErrorFromDetails(details: unknown): string | undefined {
  if (!isRecord(details)) {
    return undefined;
  }
  const fieldErrors = (details as { fieldErrors?: unknown }).fieldErrors;
  if (isRecord(fieldErrors)) {
    for (const [field, msgs] of Object.entries(fieldErrors)) {
      if (Array.isArray(msgs) && msgs.length > 0) {
        const first = asNonEmptyString(msgs[0]);
        if (first) return `${field}: ${first}`;
      }
    }
  }
  const formErrors = (details as { formErrors?: unknown }).formErrors;
  if (Array.isArray(formErrors) && formErrors.length > 0) {
    return asNonEmptyString(formErrors[0]);
  }
  return undefined;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== 'string') {
    return undefined;
  }
  const t = v.trim();
  return t.length > 0 ? t : undefined;
}

function messageFromResponseBody(data: unknown): string | undefined {
  if (data == null) {
    return undefined;
  }
  if (typeof data === 'string') {
    return asNonEmptyString(data);
  }
  if (!isRecord(data)) {
    return undefined;
  }
  const body = data as ApiErrorBody;
  const fromError = asNonEmptyString(body.error);
  const fromMessage = asNonEmptyString(body.message);
  const base = fromError ?? fromMessage;
  // For zod validation errors, append the offending field so the user / dev
  // can fix the request instead of staring at "Invalid request body".
  if (body.code === 'VALIDATION_ERROR') {
    const field = firstFieldErrorFromDetails(body.details);
    if (field) {
      return base ? `${base} — ${field}` : field;
    }
  }
  return base;
}

/**
 * Human-readable message from RTK Query / fetch errors. Never throws.
 */
export function getApiErrorMessage(error: unknown): string {
  try {
    if (typeof error === 'string') {
      return asNonEmptyString(error) ?? 'Something went wrong';
    }
    if (error instanceof Error) {
      return asNonEmptyString(error?.message) ?? 'Something went wrong';
    }

    if (isRecord(error) && 'status' in error) {
      const status = (error as { status: unknown }).status;
      const data = (error as { data?: unknown }).data;
      const fromBody = messageFromResponseBody(data);
      if (fromBody) {
        return fromBody;
      }
      const transport = (error as { error?: unknown }).error;
      if (
        (status === 'FETCH_ERROR' || status === 'TIMEOUT_ERROR') &&
        typeof transport === 'string' &&
        transport.trim()
      ) {
        return status === 'TIMEOUT_ERROR'
          ? `Request timed out. ${transport.trim()}`
          : `Network request failed. ${transport.trim()}`;
      }
      if (status === 401) {
        return 'Invalid email or password.';
      }
      return `Request failed (${String(status)})`;
    }

    const se = error as SerializedError | undefined;
    if (se && typeof se.message === 'string' && se.message.trim()) {
      return se.message.trim();
    }

    return 'Something went wrong';
  } catch {
    return 'Something went wrong';
  }
}

/**
 * Extract the backend `code` string from an RTK Query error, if present.
 */
export function getApiErrorCode(error: unknown): string | undefined {
  try {
    if (isRecord(error) && 'data' in error && isRecord(error.data)) {
      return asNonEmptyString((error.data as { code?: unknown }).code);
    }
    return undefined;
  } catch {
    return undefined;
  }
}
