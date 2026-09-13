import { baseApi } from './baseApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

export type ReportPostResponse = {
  report: {
    id: string;
    targetKind: string;
    targetId: string;
    reason: string;
    createdAt: string;
  };
};

const injectedReportsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    reportPost: build.mutation<
      ReportPostResponse,
      { postId: string; reason: string }
    >({
      query: ({ postId, reason }) => ({
        url: `/posts/${encodeURIComponent(postId)}/report`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<ReportPostResponse>(response),
    }),
  }),
});

export const { useReportPostMutation } = injectedReportsApi;
