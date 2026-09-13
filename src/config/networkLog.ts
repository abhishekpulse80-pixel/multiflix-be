/**
 * HTTP request/response logging (see `httpRequestLog.ts` + `baseApi.ts`).
 *
 * - In **development**, logging defaults **on** (`__DEV__`).
 * - In **production** builds, it defaults **off**.
 *
 * Toggle without editing this file:
 * ```ts
 * import { setNetworkRequestLogEnabled } from './config/networkLog';
 * setNetworkRequestLogEnabled(false);
 * ```
 */

const DEFAULT_ENABLED = __DEV__;

let enabled = DEFAULT_ENABLED;

export function setNetworkRequestLogEnabled(value: boolean): void {
  enabled = value;
}

export function isNetworkRequestLogEnabled(): boolean {
  return enabled;
}

/** Read-only default used at module load (for debugging). */
export const NETWORK_LOG_DEFAULT_IN_DEV = DEFAULT_ENABLED;
