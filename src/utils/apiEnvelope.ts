/**
 * Backend success body is `{ data: T }`. If `data` is missing, pass through
 * (older servers / tests).
 */
export function unwrapApiData<T>(response: unknown): T {
  if (
    response !== null &&
    typeof response === 'object' &&
    'data' in response &&
    (response as { data: unknown }).data !== undefined
  ) {
    return (response as { data: T }).data;
  }
  return response as T;
}
