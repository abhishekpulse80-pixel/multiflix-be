/** Withdrawals API — mirrors backend `WithdrawalRequestDto`. */

export type WithdrawalRequestStatus = 'pending' | 'approved' | 'rejected';

export interface WithdrawalBankSnapshotDto {
  holderName: string;
  accountNumber: string;
  ifscCode: string;
}

export interface WithdrawalRequestDto {
  id: string;
  amount: number;
  status: WithdrawalRequestStatus;
  bankSnapshot: WithdrawalBankSnapshotDto;
  adminNote: string | null;
  /** ISO string, or null while pending. */
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /withdrawals/settings`. */
export interface WithdrawalSettingsResponse {
  minimumAmount: number;
}

/** `POST /withdrawals` — request body. */
export interface CreateWithdrawalRequestBody {
  amount: number;
}

/** `GET /withdrawals/mine`. */
export interface ListMyWithdrawalRequestsResponse {
  items: WithdrawalRequestDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
