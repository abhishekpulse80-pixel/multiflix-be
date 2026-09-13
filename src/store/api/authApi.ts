import { baseApi } from './baseApi';
import {
  setAuthUser,
  setCredentials,
  type AuthUser,
} from '../slices/authSlice';
import { initPushNotifications } from '../../utils/pushNotifications';
import { initScreenTimeTracker } from '../../services/screenTimeTracker';
import {
  AUTH_GENDERS,
  type AuthGenderDto,
  type AuthSuccessResponse,
  type AuthUserDto,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type FillProfileRequest,
  type ForgotPasswordResponse,
  type MeResponse,
  type ResetPasswordResponse,
  type UpdatePrivacyRequest,
  type UsernameAvailableResponse,
  type VerifyForgotOtpResponse,
} from '../../types/authApi';
import { unwrapApiData } from '../../utils/apiEnvelope';

function isAuthGender(value: unknown): value is AuthGenderDto {
  return (
    typeof value === 'string' &&
    (AUTH_GENDERS as readonly string[]).includes(value)
  );
}

/** Use after `login` / `register` `unwrap()` so the token exists before navigation (avoids RTK race with `onQueryStarted`). */
export function credentialsFromAuthSuccess(data: AuthSuccessResponse): {
  accessToken: string;
  user: AuthUser;
} {
  return {
    accessToken: data.accessToken,
    user: dtoToAuthUser(data.user),
  };
}

function dtoToAuthUser(d: AuthUserDto): AuthUser {
  const interests = Array.isArray(d.interests)
    ? d.interests
        .map(x => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean)
    : [];
  const gender = isAuthGender(d.gender) ? d.gender : null;
  const dateOfBirth =
    typeof d.dateOfBirth === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d.dateOfBirth)
      ? d.dateOfBirth
      : null;
  const nullable = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  return {
    id: d.id,
    email: d.email,
    username: d.username,
    usernameUpdatedAt:
      typeof d.usernameUpdatedAt === 'string' ? d.usernameUpdatedAt : null,
    createdAt: d.createdAt,
    isOnboarded: Boolean(d.isOnboarded),
    hasPassword: Boolean(d.hasPassword),
    interests,
    gender,
    dateOfBirth,
    fullName: nullable(d.fullName),
    phone: nullable(d.phone),
    address: nullable(d.address),
    avatarUrl: nullable(d.avatarUrl),
    isFollowersListPrivate: Boolean(d.isFollowersListPrivate),
    notificationsEnabled: d.notificationsEnabled !== false,
  };
}

const injectedAuthApi = baseApi.injectEndpoints({
  endpoints: build => ({
    login: build.mutation<
      AuthSuccessResponse,
      { identifier: string; password: string }
    >({
      query: body => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<AuthSuccessResponse>(response),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: dtoToAuthUser(data.user),
            }),
          );
          // Register FCM token now that the session is active. Fire-and-forget.
          void initPushNotifications();
          // Start the screen-time tracker (flush interval + AppState listener).
          initScreenTimeTracker();
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    register: build.mutation<
      AuthSuccessResponse,
      { username: string; password: string }
    >({
      query: body => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<AuthSuccessResponse>(response),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: dtoToAuthUser(data.user),
            }),
          );
          // Register FCM token now that the session is active. Fire-and-forget.
          void initPushNotifications();
          // Start the screen-time tracker (flush interval + AppState listener).
          initScreenTimeTracker();
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    googleLogin: build.mutation<AuthSuccessResponse, { idToken: string }>({
      query: body => ({
        url: '/auth/google',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<AuthSuccessResponse>(response),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: dtoToAuthUser(data.user),
            }),
          );
          // Register FCM token now that the session is active. Fire-and-forget.
          void initPushNotifications();
          // Start the screen-time tracker (flush interval + AppState listener).
          initScreenTimeTracker();
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    appleLogin: build.mutation<AuthSuccessResponse, { identityToken: string }>({
      query: body => ({
        url: '/auth/apple',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<AuthSuccessResponse>(response),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: dtoToAuthUser(data.user),
            }),
          );
          // Register FCM token now that the session is active. Fire-and-forget.
          void initPushNotifications();
          // Start the screen-time tracker (flush interval + AppState listener).
          initScreenTimeTracker();
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    forgotPassword: build.mutation<ForgotPasswordResponse, { email: string }>({
      query: body => ({
        url: '/auth/forgot-password',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<ForgotPasswordResponse>(response),
    }),
    verifyForgotOtp: build.mutation<
      VerifyForgotOtpResponse,
      { email: string; code: string }
    >({
      query: body => ({
        url: '/auth/verify-forgot-otp',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<VerifyForgotOtpResponse>(response),
    }),
    resetPassword: build.mutation<
      ResetPasswordResponse,
      { resetToken: string; newPassword: string }
    >({
      query: body => ({
        url: '/auth/reset-password',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<ResetPasswordResponse>(response),
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            setCredentials({
              accessToken: data.accessToken,
              user: dtoToAuthUser(data.user),
            }),
          );
          void initPushNotifications();
          initScreenTimeTracker();
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    changePassword: build.mutation<
      ChangePasswordResponse,
      ChangePasswordRequest
    >({
      query: body => ({
        url: '/auth/change-password',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<ChangePasswordResponse>(response),
    }),
    getMe: build.query<MeResponse, void>({
      query: () => '/auth/me',
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      providesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* caller handles auth errors */
        }
      },
    }),
    checkUsernameAvailable: build.query<UsernameAvailableResponse, string>({
      query: username =>
        `/auth/username-available?username=${encodeURIComponent(username)}`,
      transformResponse: (response: unknown) =>
        unwrapApiData<UsernameAvailableResponse>(response),
    }),
    fillProfile: build.mutation<MeResponse, FillProfileRequest>({
      query: body => ({
        url: '/auth/fill-profile',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    completeOnboarding: build.mutation<MeResponse, void>({
      query: () => ({
        url: '/auth/complete-onboarding',
        method: 'POST',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    updateOnboardingInterests: build.mutation<
      MeResponse,
      { interests: string[] }
    >({
      query: body => ({
        url: '/auth/onboarding/interests',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    updateOnboardingGender: build.mutation<
      MeResponse,
      { gender: AuthGenderDto }
    >({
      query: body => ({
        url: '/auth/onboarding/gender',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    updateOnboardingDob: build.mutation<MeResponse, { dateOfBirth: string }>({
      query: body => ({
        url: '/auth/onboarding/dob',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    getBankAccount: build.query<
      {
        bankAccount: {
          holderName: string;
          accountNumber: string;
          ifscCode: string;
          bankName: string;
          upiId: string | null;
        } | null;
      },
      void
    >({
      query: () => '/auth/me/bank-account',
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          bankAccount: {
            holderName: string;
            accountNumber: string;
            ifscCode: string;
            bankName: string;
            upiId: string | null;
          } | null;
        }>(response),
      providesTags: [{ type: 'User' as const, id: 'BANK' }],
    }),
    updatePrivacy: build.mutation<MeResponse, UpdatePrivacyRequest>({
      query: body => ({
        url: '/auth/me/privacy',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<MeResponse>(response),
      invalidatesTags: res =>
        res?.user?.id ? [{ type: 'User' as const, id: res.user.id }] : [],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(setAuthUser(dtoToAuthUser(data.user)));
        } catch {
          /* handled via mutation result */
        }
      },
    }),
    saveBankAccount: build.mutation<
      {
        bankAccount: {
          holderName: string;
          accountNumber: string;
          ifscCode: string;
          bankName: string;
          upiId: string | null;
        };
      },
      {
        holderName: string;
        accountNumber: string;
        ifscCode: string;
        bankName: string;
        /** Optional VPA. Send null/omit to clear. */
        upiId?: string | null;
      }
    >({
      query: body => ({
        url: '/auth/me/bank-account',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{
          bankAccount: {
            holderName: string;
            accountNumber: string;
            ifscCode: string;
            bankName: string;
            upiId: string | null;
          };
        }>(response),
      invalidatesTags: [{ type: 'User' as const, id: 'BANK' }],
    }),
    registerPushToken: build.mutation<{ success: true }, { token: string }>({
      query: body => ({
        url: '/auth/me/push-token',
        method: 'POST',
        body,
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ success: true }>(response),
    }),
    clearPushToken: build.mutation<{ success: true }, void>({
      query: () => ({
        url: '/auth/me/push-token',
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ success: true }>(response),
    }),
    /** `DELETE /auth/me` — hard-delete the authenticated user's account. */
    deleteAccount: build.mutation<{ ok: true }, void>({
      query: () => ({
        url: '/auth/me',
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) =>
        unwrapApiData<{ ok: true }>(response),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useGoogleLoginMutation,
  useAppleLoginMutation,
  useForgotPasswordMutation,
  useVerifyForgotOtpMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useFillProfileMutation,
  useLazyCheckUsernameAvailableQuery,
  useCompleteOnboardingMutation,
  useUpdateOnboardingInterestsMutation,
  useUpdateOnboardingGenderMutation,
  useUpdateOnboardingDobMutation,
  useGetBankAccountQuery,
  useSaveBankAccountMutation,
  useUpdatePrivacyMutation,
  useRegisterPushTokenMutation,
  useClearPushTokenMutation,
  useDeleteAccountMutation,
} = injectedAuthApi;

export { injectedAuthApi };
