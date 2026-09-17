import ReactNativeBlobUtil from 'react-native-blob-util';
import { API_BASE_URL } from '../../config/api';
import type {
  MediaStatusResponse,
  PresignUploadResponse,
  QualityProfileResponse,
  UploadSingleResponse,
} from '../../types/uploadsApi';
import { unwrapApiData } from '../../utils/apiEnvelope';
import { baseApi } from './baseApi';

export type UploadSingleArg = {
  uri: string;
  name: string;
  type: string;
};

type RootStateWithAuth = {
  auth: { accessToken: string | null };
};

/** Paths passed to `ReactNativeBlobUtil.wrap` must not include a `file://` prefix. */
function pathForBlobWrap(uri: string): string {
  if (uri.startsWith('content://')) {
    return uri;
  }
  return uri.replace(/^file:\/\//, '');
}

const injectedUploadsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    uploadSingleMedia: build.mutation<UploadSingleResponse, UploadSingleArg>({
      async queryFn(arg, { getState }) {
        const token = (getState() as RootStateWithAuth).auth.accessToken;
        const url = `${API_BASE_URL}/uploads/single`;

        const headers: Record<string, string> = {
          // Library builds multipart with boundary when body is an array.
          'Content-Type': 'multipart/form-data',
        };
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        if (/ngrok/i.test(API_BASE_URL)) {
          headers['ngrok-skip-browser-warning'] = 'true';
        }

        const path = pathForBlobWrap(arg.uri);
        const parts = [
          {
            name: 'file',
            filename: arg.name,
            type: arg.type,
            data: ReactNativeBlobUtil.wrap(path),
          },
        ];

        try {
          const resp = await ReactNativeBlobUtil.fetch(
            'POST',
            url,
            headers,
            parts,
          );
          const status = resp.info().status;
          const bodyText = await Promise.resolve(resp.text());
          let parsed: unknown;
          try {
            parsed = bodyText.length > 0 ? JSON.parse(bodyText) : null;
          } catch {
            parsed = bodyText;
          }
          if (status >= 200 && status < 300) {
            return { data: unwrapApiData<UploadSingleResponse>(parsed) };
          }
          return { error: { status, data: parsed } };
        } catch (e: unknown) {
          return {
            error: {
              status: 'FETCH_ERROR' as const,
              error: String(e),
            },
          };
        }
      },
    }),

    /**
     * Stream a (potentially very large) file directly to S3 via a presigned
     * PUT — no multipart body is buffered in memory on the device or the
     * server, so large blog videos no longer fail with
     * "fetchBlobForm failed to create request body". Returns the same
     * `{ file }` shape as `uploadSingleMedia` so callers are interchangeable.
     */
    uploadLargeMedia: build.mutation<UploadSingleResponse, UploadSingleArg>({
      async queryFn(arg, { getState }) {
        const token = (getState() as RootStateWithAuth).auth.accessToken;
        const jsonHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          jsonHeaders.Authorization = `Bearer ${token}`;
        }
        if (/ngrok/i.test(API_BASE_URL)) {
          jsonHeaders['ngrok-skip-browser-warning'] = 'true';
        }

        try {
          // 1. Ask the API for a presigned PUT URL.
          const presignResp = await ReactNativeBlobUtil.fetch(
            'POST',
            `${API_BASE_URL}/uploads/presign`,
            jsonHeaders,
            JSON.stringify({ contentType: arg.type, originalName: arg.name }),
          );
          const presignStatus = presignResp.info().status;
          const presignText = await Promise.resolve(presignResp.text());
          let presignParsed: unknown;
          try {
            presignParsed =
              presignText.length > 0 ? JSON.parse(presignText) : null;
          } catch {
            presignParsed = presignText;
          }
          if (presignStatus < 200 || presignStatus >= 300) {
            return { error: { status: presignStatus, data: presignParsed } };
          }
          const presign = unwrapApiData<PresignUploadResponse>(presignParsed);

          // 2. Stream the file straight to S3. Passing a single wrapped path
          //    (not an array) uploads it as a streamed request body — the
          //    file is never fully buffered in memory.
          const path = pathForBlobWrap(arg.uri);
          const putHeaders: Record<string, string> = {
            'Content-Type': presign.contentType,
          };
          if (presign.acl) {
            putHeaders['x-amz-acl'] = presign.acl;
          }
          const putResp = await ReactNativeBlobUtil.fetch(
            'PUT',
            presign.uploadUrl,
            putHeaders,
            ReactNativeBlobUtil.wrap(path),
          );
          const putStatus = putResp.info().status;
          if (putStatus < 200 || putStatus >= 300) {
            const putText = await Promise.resolve(putResp.text());
            return { error: { status: putStatus, data: putText } };
          }

          // 3. Best-effort file size for the metadata (S3 already has the bytes).
          let size = 0;
          try {
            const stat = await ReactNativeBlobUtil.fs.stat(path);
            const statSize = Number(stat.size);
            if (Number.isFinite(statSize) && statSize > 0) {
              size = statSize;
            }
          } catch {
            // Non-fatal — size is informational.
          }

          return {
            data: {
              file: {
                key: presign.key,
                bucket: presign.bucket,
                contentType: presign.contentType,
                size,
                originalName: arg.name,
                category: presign.category,
                url: presign.url,
              },
            },
          };
        } catch (e: unknown) {
          return {
            error: {
              status: 'FETCH_ERROR' as const,
              error: String(e),
            },
          };
        }
      },
    }),
    getPostMediaStatus: build.query<MediaStatusResponse, string>({
      query: postId => `/posts/${encodeURIComponent(postId)}/media-status`,
      transformResponse: (response: unknown) =>
        unwrapApiData<MediaStatusResponse>(response),
    }),
    getUploadQualityProfile: build.query<
      QualityProfileResponse,
      number | undefined
    >({
      query: networkSpeedMbps => {
        const query = networkSpeedMbps == null
          ? ''
          : `?networkSpeedMbps=${encodeURIComponent(String(networkSpeedMbps))}`;
        return `/uploads/quality-profile${query}`;
      },
      transformResponse: (response: unknown) =>
        unwrapApiData<QualityProfileResponse>(response),
    }),
  }),
});

export const {
  useUploadSingleMediaMutation,
  useUploadLargeMediaMutation,
  useGetPostMediaStatusQuery,
  useLazyGetPostMediaStatusQuery,
  useGetUploadQualityProfileQuery,
  useLazyGetUploadQualityProfileQuery,
} = injectedUploadsApi;
