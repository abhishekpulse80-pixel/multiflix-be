import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
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
import { UserAvatar } from '../../components/common/UserAvatar';
import { ProfilePhotoSourceSheet } from '../../components/profile/ProfilePhotoSourceSheet';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { ProfilePhoneField } from '../../components/auth/ProfilePhoneField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { LocationPinIcon } from '../../components/icons/LocationPinIcon';
import type { RootStackParamList } from '../../navigation/types';
import type { FillProfileRequest } from '../../types/authApi';
import {
  selectCurrentUser,
  useAppSelector,
  useFillProfileMutation,
  useUploadSingleMediaMutation,
} from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  CAMERA_PERMISSION_BLOCKED_CODE,
  openAppSettings,
} from '../../utils/cameraPermission';
import {
  assetToUploadPayload,
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
} from '../../utils/pickProfilePhoto';
import { resolveUploadedAvatarUrl } from '../../utils/resolveUploadedAvatarUrl';
import { isValidEmail } from '../../utils/isValidEmail';
import { toastError, toastSuccess } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'FillProfile'>;

const LINK = '#246BFD';
const MUTED = '#8A8A8A';
const AVATAR = 128;

type FocusKey = 'email' | 'fullName' | 'phone' | 'address' | null;

export function FillProfileScreen({ navigation }: Props) {
  const t = useTheme();
  const [fillProfile, { isLoading: savingProfile }] = useFillProfileMutation();
  const [uploadPhoto, { isLoading: uploadingPhoto }] =
    useUploadSingleMediaMutation();
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [publishedPhotoUrl, setPublishedPhotoUrl] = useState<string | null>(
    null,
  );
  const [pickBusy, setPickBusy] = useState(false);
  // Username is chosen at sign-up, so it's not collected here. Email pre-fills
  // for social logins (which already have one); email-signup users enter it.
  const currentUser = useAppSelector(selectCurrentUser);
  const [email, setEmail] = useState(() => currentUser?.email ?? '');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [focused, setFocused] = useState<FocusKey>(null);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [photoSourceSheetOpen, setPhotoSourceSheetOpen] = useState(false);

  const titleFont = useMemo(
    () => ({ fontFamily: t.fontFamily.bold }),
    [t.fontFamily.bold],
  );

  const submitOnboarding = async () => {
    // Full name is required.
    const fn = fullName.trim();
    if (!fn) {
      setFullNameError('Full name is required');
      toastError('Full name', 'Please enter your full name.');
      return;
    }
    setFullNameError(null);

    // Email is required — it's the account-recovery channel.
    const em = email.trim().toLowerCase();
    if (!isValidEmail(em)) {
      toastError('Email', 'Enter a valid email address.');
      return;
    }

    const patch: FillProfileRequest = {
      email: em,
      fullName: fn,
    };
    const ph = phone.trim();
    if (ph) {
      patch.phone = ph;
    }
    const ad = address.trim();
    if (ad) {
      patch.address = ad;
    }
    const av = publishedPhotoUrl?.trim();
    if (av) {
      patch.avatarUrl = av;
    }
    try {
      if (Object.keys(patch).length > 0) {
        await fillProfile(patch).unwrap();
      }
      // Interests is the final onboarding step (it completes onboarding).
      navigation.navigate('ChooseInterests');
    } catch (e: unknown) {
      toastError('Could not save profile', getApiErrorMessage(e));
    }
  };

  const continueBtnStyle = [
    styles.continueBtn,
    {
      backgroundColor: LINK,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#FFAABE',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 18,
          }
        : { elevation: 10 }),
    },
  ];

  const pinColor = focused === 'address' ? LINK : MUTED;

  const avatarDisplayUri = publishedPhotoUrl ?? localPreviewUri;
  const avatarBusy = pickBusy || uploadingPhoto;

  const runAvatarFlow = async (source: 'library' | 'camera' | 'camera-photo' | 'camera-video') => {
    if (avatarBusy || savingProfile) {
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
        toastSuccess('Photo updated', 'Your profile picture was uploaded.');
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

  const openAvatarPicker = () => {
    if (avatarBusy || savingProfile) {
      return;
    }
    setPhotoSourceSheetOpen(true);
  };

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader
        showBack={false}
        title="Fill Your Profile"
        titleStyle={titleFont}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarWrap}>
          <View>
            <View
              style={[
                styles.avatarPressable,
                { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
              ]}
            >
              <UserAvatar
                uri={avatarDisplayUri}
                style={[
                  styles.avatarImage,
                  { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
                ]}
                resizeMode="cover"
              />
              {avatarBusy ? (
                <View
                  style={[
                    styles.avatarLoadingOverlay,
                    { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
                  ]}
                  pointerEvents="none"
                >
                  <ActivityIndicator color="#FFFFFF" size="large" />
                </View>
              ) : null}
            </View>
            <Pressable
              onPress={openAvatarPicker}
              disabled={avatarBusy || savingProfile}
              accessibilityRole="button"
              accessibilityLabel="Edit profile photo"
              accessibilityState={{ busy: avatarBusy }}
              style={[
                styles.editFab,
                avatarBusy ? styles.editFabDimmed : null,
                (avatarBusy || savingProfile) &&
                styles.avatarDisabled,
              ]}
            >
              <Text style={styles.editIcon}>✎</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.fields}>
          <View>
            <FormTextField
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              focused={focused === 'email'}
              accentSurface={focused === 'email'}
              containerStyle={styles.pill}
              style={{ fontFamily: t.fontFamily.regular }}
            />
          </View>
          <View>
            <FormTextField
              placeholder="Full Name"
              value={fullName}
              onChangeText={(text) => {
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
              accessibilityHint={
                fullNameError != null ? fullNameError : undefined
              }
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
          <ProfilePhoneField
            value={phone}
            onChangeText={setPhone}
            onFocus={() => setFocused('phone')}
            onBlur={() => setFocused(null)}
            focused={focused === 'phone'}
            accentSurface={focused === 'phone'}
            style={{ fontFamily: t.fontFamily.regular }}
          />
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
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: 24 }]}>
        <View style={styles.half}>
          <PrimaryButton
            elevated
            label={savingProfile ? 'Saving…' : 'Continue'}
            disabled={
              savingProfile ||
              !fullName.trim().length ||
              !email.trim().length
            }
            onPress={() => {
              submitOnboarding().catch(() => {});
            }}
            labelStyle={{ fontFamily: t.fontFamily.bold }}
            style={continueBtnStyle}
          />
        </View>
      </View>

      <ProfilePhotoSourceSheet
        visible={photoSourceSheetOpen}
        onClose={() => setPhotoSourceSheetOpen(false)}
        onSelectSource={(source) => {
          void runAvatarFlow(source);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 28,
  },
  avatarPressable: {
    backgroundColor: '#E8E8E8',
    overflow: 'hidden',
    zIndex: -1,
  },
  avatarDisabled: {
    opacity: 0.92,
  },
  avatar: {
    backgroundColor: '#E8E8E8',
  },
  avatarImage: {
    backgroundColor: '#E8E8E8',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    borderRadius: 10,
  },
  editFab: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LINK,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    zIndex: 10,
  },
  editFabDimmed: {
    opacity: 0.55,
  },
  editIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: -1,
  },
  fields: {
    gap: 16,
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  half: { flex: 1 },
  continueBtn: { width: '100%' },
});
