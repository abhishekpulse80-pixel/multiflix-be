/** Matches `multiflix-backend` `EarningSection` enum. Stories don't earn. */
export type EarningSection = 'feed' | 'music' | 'blogging';

export const EARNING_SECTIONS: readonly EarningSection[] = [
  'feed',
  'music',
  'blogging',
] as const;

export type TransactionType = 'earning' | 'payout' | 'adjustment';

/** POST /earnings/me/screen-time — request body. */
export interface RecordScreenTimeRequest {
  entries: Array<{
    section: EarningSection;
    /** Whole minutes buffered since last successful flush. */
    minutes: number;
  }>;
}

/** POST /earnings/me/screen-time — success body (unwrapped). */
export interface RecordScreenTimeResponse {
  /** Total credited across all sections in this flush. */
  credited: number;
  /** New cached wallet balance after this flush. */
  walletBalance: number;
  breakdown: Array<{
    section: EarningSection;
    minutes: number;
    ratePerMinute: number;
    amount: number;
  }>;
}

/** GET /earnings/me/wallet — success body (unwrapped). */
export interface WalletResponse {
  walletBalance: number;
}

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: number;
  section: EarningSection | null;
  minutes: number | null;
  note: string | null;
  /** ISO string. */
  createdAt: string;
}

/** GET /earnings/me/transactions — success body (unwrapped). */
export interface TransactionsResponse {
  items: TransactionDto[];
  total: number;
  page: number;
  limit: number;
}

/** Single day row in the screen-time breakdown. */
export interface ScreenTimeDayDto {
  /** UTC calendar date, ISO `YYYY-MM-DD`. */
  date: string;
  /** Single-letter weekday label (S/M/T/W/T/F/S). */
  label: string;
  minutes: number;
}

/** GET /earnings/me/screen-time?days= — success body (unwrapped). */
export interface ScreenTimeResponse {
  days: ScreenTimeDayDto[];
  totalMinutes: number;
  dailyAverageMinutes: number;
}
