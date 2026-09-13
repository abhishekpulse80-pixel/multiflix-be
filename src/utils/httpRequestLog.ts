import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { isNetworkRequestLogEnabled } from '../config/networkLog';

const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'code',
  'resetToken',
  'accessToken',
  'refreshToken',
  'token',
  'authorization',
  'Authorization',
]);

/** Redact sensitive fields for safe console logging. */
export function redactForLog(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return '[…]';
  }
  if (value == null) {
    return value;
  }
  if (typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item, depth + 1));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k)) {
      out[k] =
        v === null || v === undefined || v === ''
          ? v
          : '***';
    } else {
      out[k] = redactForLog(v, depth + 1);
    }
  }
  return out;
}

function requestMeta(args: string | FetchArgs): { method: string; path: string } {
  if (typeof args === 'string') {
    return { method: 'GET', path: args };
  }
  const a = args as FetchArgs;
  return {
    method: String(a.method ?? 'GET').toUpperCase(),
    path: a.url ?? '',
  };
}

/**
 * Wraps RTK `fetchBaseQuery` to log outgoing requests and incoming responses.
 */
export function withHttpRequestLogging(
  rawBaseQuery: BaseQueryFn,
  baseUrl: string,
): BaseQueryFn {
  return async (args, api, extraOptions) => {
    if (!isNetworkRequestLogEnabled()) {
      return rawBaseQuery(args, api, extraOptions);
    }

    const { method, path } = requestMeta(args);
    const fullUrl = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const body =
      typeof args === 'object' && args !== null && 'body' in args
        ? (args as FetchArgs).body
        : undefined;

    const bodyForLog =
      typeof FormData !== 'undefined' && body instanceof FormData
        ? '[FormData]'
        : body;

    // eslint-disable-next-line no-console
    console.log(`[HTTP] → ${method} ${fullUrl}`, {
      body: bodyForLog !== undefined ? redactForLog(bodyForLog) : undefined,
    });

    const started = Date.now();
    const result = await rawBaseQuery(args, api, extraOptions);
    const ms = Date.now() - started;

    if (result.error) {
      const err = result.error as FetchBaseQueryError;
      // eslint-disable-next-line no-console
      console.warn(`[HTTP] ← ${method} ${fullUrl} ${ms}ms (error)`, {
        status: err.status,
        data: redactForLog(err.data),
      });
    } else {
      // eslint-disable-next-line no-console
      console.log(`[HTTP] ← ${method} ${fullUrl} ${ms}ms`, {
        data: redactForLog(result.data),
      });
    }

    return result;
  };
}
