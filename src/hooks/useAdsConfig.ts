import {
  DEFAULT_ADS_RUNTIME_CONFIG,
  type AdsRuntimeConfig,
} from '../config/admob';
import { useGetAdsConfigQuery } from '../store/api/adsApi';

/**
 * Admin-managed ad behaviour (master switch + frequencies), fetched once from
 * `GET /ads/config` and shared via the RTK Query cache (so the many feed cells
 * that call this hook trigger a single request). Falls back to
 * DEFAULT_ADS_RUNTIME_CONFIG until the request resolves — or if it fails — so
 * callers always receive a usable config.
 */
export function useAdsConfig(): AdsRuntimeConfig {
  const { data } = useGetAdsConfigQuery();
  return data ?? DEFAULT_ADS_RUNTIME_CONFIG;
}
