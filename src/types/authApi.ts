/** Shapes returned by `multiflix-backend` auth routes (`/api/v1/auth`). */

export const AUTH_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
] as const;

export type AuthGenderDto = (typeof AUTH_GENDERS)[number];

export type AuthUserDto = {
  id: string;
  /** Null until the user provides an email during onboarding. */
  email: string | null;
  username: string;
  /** ISO time the username was last changed, or null (drives the 24h cooldown). */
  usernameUpdatedAt: string | null;
  createdAt: string;
  /** `false` until `POST /auth/complete-onboarding` succeeds. */
  isOnboarded: boolean;
  /** `true` when the user has an email/password credential set. */
  hasPassword: boolean;
  interests: string[];
  gender: AuthGenderDto | null;
  /** `YYYY-MM-DD` from `POST /auth/onboarding/dob`, or `null`. */
  dateOfBirth: string | null;
  fullName: string | null;
  phone: string | null;
  address: string | null;
  avatarUrl: string | null;
  /** When true, the user's followers list is hidden from other users. */
  isFollowersListPrivate: boolean;
  /** When false, push notifications are turned off for this user. */
  notificationsEnabled: boolean;
};

/** `PATCH /auth/me/privacy` — partial update of privacy/notification flags. */
export type UpdatePrivacyRequest = {
  isFollowersListPrivate?: boolean;
  notificationsEnabled?: boolean;
};

/** `POST /auth/fill-profile` — partial update; omit keys you do not want to change. */
export type FillProfileRequest = {
  username?: string;
  /** Collected during onboarding (not at sign-up); required to finish. */
  email?: string;
  fullName?: string | null;
  phone?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
};

/** `GET /auth/username-available` */
export type UsernameAvailableResponse = {
  available: boolean;
  reason?: 'invalid' | 'taken';
};

export type AuthSuccessResponse = {
  user: AuthUserDto;
  accessToken: string;
};

export type ForgotPasswordResponse = {
  ok: true;
  message: string;
};

export type VerifyForgotOtpResponse = {
  resetToken: string;
};

/** After reset, the server returns a session so the user is auto-signed-in. */
export type ResetPasswordResponse = AuthSuccessResponse;

/** `POST /auth/change-password` — authenticated password change. */
export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  ok: true;
};

export type MeResponse = {
  user: AuthUserDto;
};
