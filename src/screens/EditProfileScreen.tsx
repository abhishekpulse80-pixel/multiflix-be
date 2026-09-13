import {
  useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React,
  { useCallback,
  useEffect,
  useMemo,
  useRef,
  useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { UserAvatar } from '../components/common/UserAvatar';
import { AuthBackHeader } from '../components/auth/AuthBackHeader';
import { FormTextField } from '../components/auth/FormTextField';
import { ProfilePhoneField } from '../components/auth/ProfilePhoneField';
import { PrimaryButton } from '../components/PrimaryButton';
import { LocationPinIcon } from '../components/icons/LocationPinIcon';
import { ProfilePhotoSourceSheet } from '../components/profile/ProfilePhotoSourceSheet';
import type { RootStackParamList } from '../navigation/types';
import type { FillProfileRequest } from '../types/authApi';
import {
  useFillProfileMutation,
  useLazyCheckUsernameAvailableQuery,
  useUploadSingleMediaMutation,
} from '../store';
import { useAppSelector } from '../store/hooks';
import { selectCurrentUser } from '../store/selectors';
import { useTheme } from '../theme';
import { getApiErrorMessage } from '../utils/apiError';
import {
  normalizeUsername,
  usernameShapeError,
} from '../utils/usernameRules';
import {
  CAMERA_PERMISSION_BLOCKED_CODE,
  openAppSettings,
} from '../utils/cameraPermission';
import {
  assetToUploadPayload,
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
} from '../utils/pickProfilePhoto';
import { resolveUploadedAvatarUrl } from '../utils/resolveUploadedAvatarUrl';
import { toastError } from '../utils/toast';
import Svg, { Path } from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

const BLUE = '#246BFD';
const BG = '#FFFFFF';
const MUTED = '#8A8A8A';
const AVATAR = 112;
const H_PAD = 24;

type FocusKey =
  | 'username'
  | 'fullName'
  | 'phone'
  | 'address'
  | null;
type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';
const OK_GREEN = '#1FA855';
const USERNAME_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ─── Small inline icons ──────────────────────────────────────────────────────

function CameraEditIcon({
  size = 16,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 17a4 4 0 100-8 4 4 0 000 8z"
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function EditProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const currentUser = useAppSelector(selectCurrentUser);

  // ── API mutations
  const [fillProfile, { isLoading: savingProfile }] = useFillProfileMutation();
  const [uploadPhoto, { isLoading: uploadingPhoto }] =
    useUploadSingleMediaMutation();

  // ── Avatar state
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [publishedPhotoUrl, setPublishedPhotoUrl] = useState<string | null>(
    null,
  );
  const [pickBusy, setPickBusy] = useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);

  // ── Form fields — pre-filled from Redux
  const [fullName, setFullName] = useState(currentUser?.fullName ?? '');
  const [phone, setPhone] = useState(currentUser?.phone ?? '');
  const [address, setAddress] = useState(currentUser?.address ?? '');
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [focused, setFocused] = useState<FocusKey>(null);

  // ── Username (changeable once per 24h)
  const [checkUsername] = useLazyCheckUsernameAvailableQuery();
  const [username, setUsername] = useState(currentUser?.username ?? '');
  const [usernameStatus, setUsernameStatus] =
    useState<UsernameStatus>('available');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameSeq = useRef(0);
  // The username check is async + debounced; if the screen unmounts (Save →
  // goBack) while it's in flight, its resolution must NOT setState (crash).
  const isMountedRef = useRef(true);
  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  // Locked until 24h after the last change.
  const usernameLockedUntil = useMemo(() => {
    const ts = currentUser?.usernameUpdatedAt;
    if (!ts) {
      return null;
    }
    const until = new Date(ts).getTime() + USERNAME_COOLDOWN_MS;
    return until > Date.now() ? until : null;
  }, [currentUser?.usernameUpdatedAt]);
  const usernameLocked = usernameLockedUntil != null;
  const usernameLockHours = usernameLockedUntil
    ? Math.ceil((usernameLockedUntil - Date.now()) / (60 * 60 * 1000))
    : 0;

  useEffect(() => {
    if (usernameLocked) {
      return;
    }
    const normalized = normalizeUsername(username);
    if (currentUser?.username && normalized === currentUser.username) {
      setUsernameError(null);
      setUsernameStatus('available');
      return;
    }
    const shapeErr = usernameShapeError(normalized);
    if (shapeErr) {
      setUsernameError(shapeErr);
      setUsernameStatus('invalid');
      return;
    }
    setUsernameError(null);
    setUsernameStatus('checking');
    const seq = ++usernameSeq.current;
    const timer = setTimeout(() => {
      checkUsername(normalized)
        .unwrap()
        .then(res => {
          if (seq !== usernameSeq.current || !isMountedRef.current) return;
          if (res.available) {
            setUsernameStatus('available');
            setUsernameError(null);
          } else {
            setUsernameStatus('taken');
            setUsernameError(
              res.reason === 'taken'
                ? 'This username is already taken'
                : 'Invalid username',
            );
          }
        })
        .catch(() => {
          if (seq === usernameSeq.current && isMountedRef.current) {
            setUsernameStatus('idle');
          }
        });
    }, 450);
    return () => clearTimeout(timer);
  }, [username, currentUser?.username, usernameLocked, checkUsername]);

  // ── Status bar on focus
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
      }
      return undefined;
    }, []),
  );

  const avatarBusy = pickBusy || uploadingPhoto;
  const busy = avatarBusy || savingProfile;

  // Resolve which URI to display in the avatar
  const avatarDisplayUri = useMemo(() => {
    if (localPreviewUri) {
      return localPreviewUri;
    }
    return publishedPhotoUrl ?? currentUser?.avatarUrl?.trim() ?? null;
  }, [localPreviewUri, publishedPhotoUrl, currentUser?.avatarUrl]);

  // ── Avatar upload flow
  const runAvatarFlow = async (source: 'library' | 'camera' | 'camera-photo' | 'camera-video') => {
    if (busy) {
      return;
    }
    setPickBusy(true);
    let stagedPreview = false;
    try {
      const asset =
        source === 'library'
          ? await pickPhotoFromLibrary()
          : await pickPhotoFromCamera();
      if (!asset) {
        return;
      }
      const payload = assetToUploadPayload(asset);
      if (!payload) {
        toastError('Photo', 'Could not read this image.');
        return;
      }
      setLocalPreviewUri(asset.uri ?? null);
      setPublishedPhotoUrl(null);
      stagedPreview = true;

      const res = await uploadPhoto(payload).unwrap();
      const published = resolveUploadedAvatarUrl(res.file);
      if (published) {
        setPublishedPhotoUrl(published);
      } else {
        setLocalPreviewUri(null);
        setPublishedPhotoUrl(null);
        toastError(
          'Photo',
          'Server did not return a public image URL. Set S3_PUBLIC_BASE_URL on the API.',
        );
      }
    } catch (e: unknown) {
      if (stagedPreview) {
        setLocalPreviewUri(null);
        setPublishedPhotoUrl(null);
      }
      const blocked =
        e instanceof Error && e.message === CAMERA_PERMISSION_BLOCKED_CODE;
      if (blocked) {
        Alert.alert(
          'Camera access',
          'Camera permission is off for Multiflix. You can turn it on in Settings.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                openAppSettings().catch(() => {});
              },
            },
          ],
        );
      } else {
        toastError('Photo', getApiErrorMessage(e));
      }
    } finally {
      setPickBusy(false);
    }
  };

  // ── Save handler
  const handleSave = async () => {
    const fn = fullName.trim();
    if (!fn) {
      setFullNameError('Full name is required');
      toastError('Full name', 'Please enter your full name.');
      return;
    }
    setFullNameError(null);

    const patch: FillProfileRequest = {};

    patch.fullName = fn;

    // Username — only when changed; blocked while in cooldown / invalid / taken.
    const normalizedUsername = normalizeUsername(username);
    if (normalizedUsername !== (currentUser?.username ?? '')) {
      if (usernameLocked) {
        toastError(
          'Username',
          `You can change your username again in ${usernameLockHours} hour${
            usernameLockHours === 1 ? '' : 's'
          }.`,
        );
        return;
      }
      const uErr = usernameShapeError(normalizedUsername);
      if (uErr) {
        setUsernameStatus('invalid');
        setUsernameError(uErr);
        toastError('Username', uErr);
        return;
      }
      if (usernameStatus === 'taken') {
        toastError('Username', 'This username is already taken.');
        return;
      }
      patch.username = normalizedUsername;
    }

    const ph = phone.trim();
    if (ph !== (currentUser?.phone ?? '').trim()) {
      patch.phone = ph || null;
    }
    const ad = address.trim();
    if (ad !== (currentUser?.address ?? '').trim()) {
      patch.address = ad || null;
    }
    const av = publishedPhotoUrl?.trim();
    if (av) {
      patch.avatarUrl = av;
    }

    try {
      await fillProfile(patch).unwrap();

      // fillProfile's onQueryStarted dispatches setAuthUser (and invalidates
      // the User tag) right before this resolves. If we goBack in the same
      // tick, React commits the resulting re-render (EditProfile's username
      // lock flip, the underlying profile's @handle change + refetch) AND the
      // pop transition in a single Fabric mount pass — which races and crashes
      // with "child already has a parent". Only a *username* change makes that
      // re-render structural enough to collide, so let it settle one frame
      // first, then navigate.
      requestAnimationFrame(() => {
        navigation.goBack();
      });
    } catch (e: unknown) {
      toastError('Could not save', getApiErrorMessage(e));
    }
  };

  const pinColor = focused === 'address' ? BLUE : MUTED;

  return (
    <View style={styles.root}>
<AuthBackHeader
        onBack={() => navigation.goBack()}
        title="Edit Profile"
        titleStyle={{ fontFamily: t.fontFamily.bold }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar section */}
        <View style={styles.avatarSection}>
          {/* Wrap avatar + FAB so the FAB is positioned inside this container */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatarStack}>
              <UserAvatar
                uri={avatarDisplayUri}
                style={styles.avatar}
                resizeMode="cover"
              />
              {avatarBusy ? (
                <View style={styles.avatarOverlay} pointerEvents="none">
                  <ActivityIndicator color="#FFFFFF" size="large" />
                </View>
              ) : null}
            </View>

            <Pressable
              style={[styles.cameraFab, avatarBusy && styles.fabDimmed]}
              onPress={() => {
                if (!busy) {
                  setPhotoSheetOpen(true);
                }
              }}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              accessibilityState={{ busy: avatarBusy }}
            >
              <CameraEditIcon />
            </Pressable>
          </View>

          <Text
            style={[
              styles.changePhotoLabel,
              { fontFamily: t.fontFamily.semibold },
            ]}
          >
            {avatarBusy ? 'Uploading…' : 'Change photo'}
          </Text>
        </View>

        {/* ── Divider */}
        <View style={styles.sectionDivider} />

        {/* ── Form fields */}
        <View style={styles.fields}>
          {/* Username (changeable once per 24h) */}
          <View>
            <Text
              style={[styles.fieldLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              Username
            </Text>
            <FormTextField
              placeholder="Username"
              value={username}
              onChangeText={text => setUsername(normalizeUsername(text))}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused(null)}
              focused={focused === 'username'}
              accentSurface={focused === 'username'}
              editable={!usernameLocked}
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={[
                styles.pill,
                usernameError ? styles.fieldErrorBorder : null,
                usernameLocked ? styles.fieldLocked : null,
              ]}
              style={{ fontFamily: t.fontFamily.regular }}
            />
            {usernameLocked ? (
              <Text
                style={[styles.fieldHint, { fontFamily: t.fontFamily.regular }]}
              >
                You can change your username again in {usernameLockHours} hour
                {usernameLockHours === 1 ? '' : 's'}.
              </Text>
            ) : usernameError ? (
              <Text
                style={[
                  styles.fieldErrorText,
                  { fontFamily: t.fontFamily.regular },
                ]}
                accessibilityLiveRegion="polite"
              >
                {usernameError}
              </Text>
            ) : usernameStatus === 'checking' ? (
              <Text
                style={[styles.fieldHint, { fontFamily: t.fontFamily.regular }]}
              >
                Checking availability…
              </Text>
            ) : usernameStatus === 'available' &&
              normalizeUsername(username) !== (currentUser?.username ?? '') ? (
              <Text
                style={[
                  styles.fieldHint,
                  { color: OK_GREEN, fontFamily: t.fontFamily.regular },
                ]}
              >
                Username available
              </Text>
            ) : (
              <Text
                style={[styles.fieldHint, { fontFamily: t.fontFamily.regular }]}
              >
                You can change your username once every 24 hours.
              </Text>
            )}
          </View>

          {/* Full Name */}
          <View>
            <Text
              style={[styles.fieldLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              Full Name <Text style={styles.required}>*</Text>
            </Text>
            <FormTextField
              placeholder="Full Name"
              value={fullName}
              onChangeText={text => {
                setFullName(text);
                setFullNameError(null);
              }}
              onFocus={() => setFocused('fullName')}
              onBlur={() => setFocused(null)}
              focused={focused === 'fullName'}
              accentSurface={focused === 'fullName'}
              containerStyle={[
                styles.pill,
                fullNameError ? styles.fieldErrorBorder : null,
              ]}
              style={{ fontFamily: t.fontFamily.regular }}
              accessibilityHint={fullNameError ?? undefined}
            />
            {fullNameError ? (
              <Text
                style={[
                  styles.fieldErrorText,
                  { fontFamily: t.fontFamily.regular },
                ]}
                accessibilityLiveRegion="polite"
              >
                {fullNameError}
              </Text>
            ) : null}
          </View>

          {/* Phone */}
          <View>
            <Text
              style={[styles.fieldLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              Phone
            </Text>
            <ProfilePhoneField
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocused('phone')}
              onBlur={() => setFocused(null)}
              focused={focused === 'phone'}
              accentSurface={focused === 'phone'}
              style={{ fontFamily: t.fontFamily.regular }}
            />
          </View>

          {/* Address */}
          <View>
            <Text
              style={[styles.fieldLabel, { fontFamily: t.fontFamily.semibold }]}
            >
              Address
            </Text>
            <FormTextField
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
              onFocus={() => setFocused('address')}
              onBlur={() => setFocused(null)}
              focused={focused === 'address'}
              accentSurface={focused === 'address'}
              containerStyle={styles.pill}
              style={{ fontFamily: t.fontFamily.regular }}
              rightIcon={<LocationPinIcon color={pinColor} />}
            />
          </View>
        </View>
      </ScrollView>

      {/* ── Save action bar */}
      <View style={styles.actionBar}>
        <PrimaryButton
          elevated
          label={savingProfile ? 'Saving…' : 'Save Changes'}
          disabled={
            busy ||
            usernameStatus === 'checking' ||
            usernameStatus === 'invalid' ||
            usernameStatus === 'taken'
          }
          onPress={() => {
            handleSave().catch(() => {});
          }}
          labelStyle={{ fontFamily: t.fontFamily.bold }}
          style={[
            styles.saveBtn,
            Platform.OS === 'ios'
              ? {
                  shadowColor: '#246BFD',
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                }
              : { elevation: 8 },
          ]}
        />
      </View>

      <ProfilePhotoSourceSheet
        visible={photoSheetOpen}
        onClose={() => setPhotoSheetOpen(false)}
        onSelectSource={source => {
          void runAvatarFlow(source);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 32,
  },

  // Avatar
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  // Tight wrapper so the FAB positions relative to the circle, not the section
  avatarWrap: {
    position: 'relative',
    width: AVATAR,
    height: AVATAR,
    marginBottom: 0,
  },
  avatarStack: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    overflow: 'hidden',
    backgroundColor: '#E8E8ED',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#E8E8ED',
  },
  avatarOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: BG,
  },
  fabDimmed: {
    opacity: 0.55,
  },
  changePhotoLabel: {
    marginTop: 12,
    fontSize: 14,
    color: BLUE,
  },

  // Divider
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginBottom: 24,
  },

  // Form
  fields: {
    gap: 20,
  },
  fieldLabel: {
    fontSize: 13,
    color: '#444444',
    marginBottom: 6,
    marginLeft: 2,
  },
  required: {
    color: '#E53935',
  },
  pill: {
    borderRadius: 12,
  },
  fieldErrorBorder: {
    borderColor: '#E53935',
  },
  fieldErrorText: {
    fontSize: 12,
    color: '#E53935',
    marginTop: 6,
    marginLeft: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: MUTED,
    marginTop: 6,
    marginLeft: 4,
  },
  fieldLocked: {
    opacity: 0.6,
  },

  // Action bar
  actionBar: {
    paddingHorizontal: H_PAD,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    backgroundColor: BG,
  },
  saveBtn: {
    width: '100%',
    backgroundColor: BLUE,
  },
});
