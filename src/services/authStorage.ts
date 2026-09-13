import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '../store/slices/authSlice';
import { AUTH_GENDERS, type AuthGenderDto } from '../types/authApi';

function isAuthGender(value: unknown): value is AuthGenderDto {
  return (
    typeof value === 'string' &&
    (AUTH_GENDERS as readonly string[]).includes(value)
  );
}

/** Same JSON shape as `POST /auth/login` and `POST /auth/register` success bodies. */
export type PersistedAuthSession = {
  accessToken: string;
  user: AuthUser;
};

const STORAGE_KEY = '@multiflix/auth_session';

function normalizeUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const u = value as Record<string, unknown>;
  if (typeof u.id !== 'string' || typeof u.email !== 'string') {
    return null;
  }
  const createdAt =
    typeof u.createdAt === 'string' ? u.createdAt : new Date(0).toISOString();
  const isOnboarded =
    typeof u.isOnboarded === 'boolean' ? u.isOnboarded : false;
  const interests = Array.isArray(u.interests)
    ? u.interests
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean)
    : [];
  const gender = isAuthGender(u.gender) ? u.gender : null;
  const dateOfBirth =
    typeof u.dateOfBirth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(u.dateOfBirth)
      ? u.dateOfBirth
      : null;
  const nullableStr = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  return {
    id: u.id,
    email: u.email,
    username: typeof u.username === 'string' ? u.username : '',
    usernameUpdatedAt:
      typeof u.usernameUpdatedAt === 'string' ? u.usernameUpdatedAt : null,
    createdAt,
    isOnboarded,
    hasPassword: typeof u.hasPassword === 'boolean' ? u.hasPassword : false,
    interests,
    gender,
    dateOfBirth,
    fullName: nullableStr(u.fullName),
    phone: nullableStr(u.phone),
    address: nullableStr(u.address),
    avatarUrl: nullableStr(u.avatarUrl),
    isFollowersListPrivate:
      typeof u.isFollowersListPrivate === 'boolean'
        ? u.isFollowersListPrivate
        : false,
    notificationsEnabled:
      typeof u.notificationsEnabled === 'boolean'
        ? u.notificationsEnabled
        : true,
  };
}

export async function loadPersistedAuth(): Promise<PersistedAuthSession | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) {
      return null;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const o = parsed as Record<string, unknown>;
    if (typeof o.accessToken !== 'string' || !o.accessToken.trim()) {
      return null;
    }
    const user = normalizeUser(o.user);
    if (!user) {
      return null;
    }
    return { accessToken: o.accessToken.trim(), user };
  } catch {
    return null;
  }
}

export async function savePersistedAuth(session: PersistedAuthSession): Promise<void> {
  const payload: PersistedAuthSession = {
    accessToken: session.accessToken,
    user: { ...session.user },
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export async function clearPersistedAuth(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
