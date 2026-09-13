import { baseApi } from './baseApi';
import { unwrapApiData } from '../../utils/apiEnvelope';
import {
  DEFAULT_ADS_RUNTIME_CONFIG,
  type AdsRuntimeConfig,
} from '../../config/admob';

/** Raw shape returned by `GET /ads/config` (interval stored in seconds). */
type AdsConfigResponse = {
  enabled: boolean;
  feedNativeAdInterval: number;
  interstitialAfterPosts: number;
  interstitialMinIntervalSec: number;
};

function numOr(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

const injectedAdsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    /** `POST /ads/:adId/click` — increment ad click counter. Fire-and-forget. */
    recordAdClick: build.mutation<{ ok: true }, { adId: string }>({
      query: ({ adId }) => ({
        url: `/ads/${encodeURIComponent(adId)}/click`,
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ ok: true }>(response),
    }),
    /**
     * `GET /ads/config` — admin-managed ad behaviour (master switch +
     * frequencies). Normalises the payload (seconds → ms) and clamps to safe
     * defaults so callers can trust every field. Prefer `useAdsConfig()`.
     */
    getAdsConfig: build.query<AdsRuntimeConfig, void>({
      query: () => '/ads/config',
      transformResponse: (response: unknown): AdsRuntimeConfig => {
        const d = unwrapApiData<AdsConfigResponse>(response);
        return {
          enabled:
            typeof d.enabled === 'boolean'
              ? d.enabled
              : DEFAULT_ADS_RUNTIME_CONFIG.enabled,
          feedNativeAdInterval: numOr(
            d.feedNativeAdInterval,
            DEFAULT_ADS_RUNTIME_CONFIG.feedNativeAdInterval,
          ),
          interstitialAfterPosts: numOr(
            d.interstitialAfterPosts,
            DEFAULT_ADS_RUNTIME_CONFIG.interstitialAfterPosts,
          ),
          interstitialMinIntervalMs:
            numOr(d.interstitialMinIntervalSec, 180) * 1000,
        };
      },
      providesTags: [{ type: 'AdsConfig' as const, id: 'CONFIG' }],
    }),
  }),
});

export const { useRecordAdClickMutation, useGetAdsConfigQuery } =
  injectedAdsApi;
