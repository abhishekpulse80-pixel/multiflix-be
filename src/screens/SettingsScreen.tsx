import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LogoutConfirmSheet } from '../components/settings/LogoutConfirmSheet';
import { Toggle } from '../components/common/Toggle';
import type { RootStackParamList } from '../navigation/types';
import { performFullLogout } from '../services/performFullLogout';
import { useAppDispatch, useAppSelector } from '../store';
import {
  useDeleteAccountMutation,
  useUpdatePrivacyMutation,
} from '../store/api/authApi';
import { selectCurrentUser } from '../store/selectors';
import { useTheme } from '../theme';
import { getApiErrorMessage } from '../utils/apiError';
import { getAppBuildMetaLine } from '../utils/appBuildMeta';
import { openExternalUrl } from '../utils/openExternalUrl';
import { toastError, toastSuccess } from '../utils/toast';
import { navigateToBankAccount } from '../navigation/rootNavigationRef';

const BG = '#FFFFFF';
const TITLE = '#0D0D0D';
const MUTED = '#8E8E93';
const BLUE = '#246BFD';
const DANGER = '#DC2626';
const H_PAD = 20;
const ROW_PAD_V = 18;

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

function ChevronBack({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18l-6-6 6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ChevronRight({ color = MUTED, size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18l6-6-6-6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBankAccount({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 22a1 1 0 100-2 1 1 0 000 2zm7 0a1 1 0 100-2 1 1 0 000 2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconWallet({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21 12V7H5a2 2 0 010-4h14v4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M3 5v14a2 2 0 002 2h16v-5M3 10h18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18 15a1 1 0 100-2 1 1 0 000 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconDocument({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconPrivacy({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 8v4M12 16h.01"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconLock({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11h14a1 1 0 011 1v8a1 1 0 01-1 1H5a1 1 0 01-1-1v-8a1 1 0 011-1z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 11V8a4 4 0 118 0v3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBlocked({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22a10 10 0 100-20 10 10 0 000 20zM5 5l14 14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBookmark({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconEyeOff({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M17.94 17.94A10.06 10.06 0 0112 20c-7 0-11-8-11-8a19.77 19.77 0 014.22-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a19.86 19.86 0 01-3.17 4.19M14.12 14.12a3 3 0 11-4.24-4.24M1 1l22 22"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconBell({ color = TITLE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconTrash({ color = DANGER, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function IconLogout({ color = BLUE, size = 22 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type SettingsRowProps = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  /**
   * `logout` = blue label/icon, no chevron.
   * `danger` = red label/icon, no chevron — use for irreversible actions.
   */
  variant?: 'default' | 'logout' | 'danger';
};

function SettingsRow({
  icon,
  label,
  onPress,
  showChevron = true,
  variant = 'default',
}: SettingsRowProps) {
  const t = useTheme();
  const isLogout = variant === 'logout';
  const isDanger = variant === 'danger';
  const accent = isLogout || isDanger;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        accent && styles.rowAccent,
        pressed && styles.rowPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text
        style={[
          styles.rowLabel,
          isLogout && styles.rowLabelLogout,
          isDanger && styles.rowLabelDanger,
          { fontFamily: accent ? t.fontFamily.semibold : t.fontFamily.medium },
        ]}
        numberOfLines={1}>
        {label}
      </Text>
      {showChevron && !accent ? (
        <View style={styles.rowChevron}>
          <ChevronRight />
        </View>
      ) : (
        <View style={styles.rowChevron} />
      )}
    </Pressable>
  );
}

type SettingsToggleRowProps = {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
};

function SettingsToggleRow({
  icon,
  label,
  value,
  onValueChange,
  disabled = false,
}: SettingsToggleRowProps) {
  const t = useTheme();
  return (
    <View style={styles.row} accessibilityLabel={label}>
      <View style={styles.rowIcon}>{icon}</View>
      <Text
        style={[styles.rowLabel, { fontFamily: t.fontFamily.medium }]}
        numberOfLines={1}>
        {label}
      </Text>
      <Toggle value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

const TERMS_URL = 'https://multiflix.in/terms';
const PRIVACY_URL = 'https://multiflix.in/privacy';

export function SettingsScreen({ navigation }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const [logoutSheetOpen, setLogoutSheetOpen] = useState(false);
  const buildMetaLine = useMemo(() => getAppBuildMetaLine(), []);
  const [updatePrivacy, { isLoading: privacyUpdating }] =
    useUpdatePrivacyMutation();
  const [deleteAccount, { isLoading: deletingAccount }] =
    useDeleteAccountMutation();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  /** Phrase the user must type to enable the delete button. */
  const DELETE_PHRASE = 'DELETE';
  const deleteInputMatches = deleteConfirmText.trim() === DELETE_PHRASE;
  const deleteCanSubmit = deleteInputMatches && !deletingAccount;
  const followersPrivate = Boolean(currentUser?.isFollowersListPrivate);
  const notificationsEnabled = currentUser?.notificationsEnabled !== false;

  React.useEffect(() => {
    if (Platform.OS === 'android') {
    }
  }, []);

  const onBankAccount = useCallback(() => {
    navigateToBankAccount();
  }, []);

  const onEarnings = useCallback(() => {
    navigation.navigate('Earnings');
  }, [navigation]);

  const onTerms = useCallback(() => {
    void openExternalUrl(TERMS_URL);
  }, []);

  const onPrivacy = useCallback(() => {
    void openExternalUrl(PRIVACY_URL);
  }, []);

  const onChangePassword = useCallback(() => {
    navigation.navigate('ChangePassword');
  }, [navigation]);

  const onBlockedUsers = useCallback(() => {
    navigation.navigate('BlockedUsers');
  }, [navigation]);

  const onSavedPosts = useCallback(() => {
    navigation.navigate('SavedPosts');
  }, [navigation]);

  const onToggleFollowersPrivacy = useCallback(
    (next: boolean) => {
      if (privacyUpdating) return;
      updatePrivacy({ isFollowersListPrivate: next })
        .unwrap()
        .catch((e: unknown) => {
          toastError('Privacy', getApiErrorMessage(e));
        });
    },
    [privacyUpdating, updatePrivacy],
  );

  const onToggleNotifications = useCallback(
    (next: boolean) => {
      if (privacyUpdating) return;
      updatePrivacy({ notificationsEnabled: next })
        .unwrap()
        .catch((e: unknown) => {
          toastError('Notifications', getApiErrorMessage(e));
        });
    },
    [privacyUpdating, updatePrivacy],
  );

  const onLogout = useCallback(() => {
    setLogoutSheetOpen(true);
  }, []);

  const onConfirmLogout = useCallback(async () => {
    await performFullLogout(dispatch);
    navigation.reset({
      index: 0,
      routes: [{ name: 'LetsYouIn' }],
    });
  }, [dispatch, navigation]);

  const onDeleteAccount = useCallback(() => {
    setDeleteConfirmText('');
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (deletingAccount) return;
    setDeleteModalOpen(false);
    setDeleteConfirmText('');
  }, [deletingAccount]);

  const onConfirmDeleteAccount = useCallback(async () => {
    if (!deleteCanSubmit) return;
    try {
      await deleteAccount().unwrap();
      setDeleteModalOpen(false);
      setDeleteConfirmText('');
      await performFullLogout(dispatch);
      navigation.reset({
        index: 0,
        routes: [{ name: 'LetsYouIn' }],
      });
      // Show toast after navigation (so it isn't unmounted with the screen).
      setTimeout(() => {
        toastSuccess('Account deleted', 'Your account has been removed.');
      }, 200);
    } catch (e: unknown) {
      toastError('Could not delete', getApiErrorMessage(e));
    }
  }, [deleteCanSubmit, deleteAccount, dispatch, navigation]);

  return (
    <View style={styles.root}>
      <View style={[styles.topBar, { paddingTop: 12 }]}>
        <Pressable
          hitSlop={12}
          onPress={() => navigation.goBack()}
          style={styles.topIcon}
          accessibilityLabel="Back"
          accessibilityRole="button">
          <ChevronBack />
        </Pressable>
        <Text style={[styles.navTitle, { fontFamily: t.fontFamily.bold }]}>Settings</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(20, insets.bottom + 12) },
        ]}
        showsVerticalScrollIndicator={false}>
        <SettingsRow
          icon={<IconBankAccount />}
          label="Bank Account"
          onPress={onBankAccount}
        />
        <SettingsRow icon={<IconWallet />} label="My Earnings" onPress={onEarnings} />
        <SettingsRow
          icon={<IconBookmark />}
          label="Saved Posts"
          onPress={onSavedPosts}
        />
        <SettingsRow
          icon={<IconDocument />}
          label="Terms of Services"
          onPress={onTerms}
        />
        <SettingsRow
          icon={<IconPrivacy />}
          label="Privacy Policy"
          onPress={onPrivacy}
        />
        {currentUser?.hasPassword ? (
          <SettingsRow
            icon={<IconLock />}
            label="Change Password"
            onPress={onChangePassword}
          />
        ) : null}
        <SettingsRow
          icon={<IconBlocked />}
          label="Blocked Users"
          onPress={onBlockedUsers}
        />
        <SettingsToggleRow
          icon={<IconBell />}
          label="Notifications"
          value={notificationsEnabled}
          onValueChange={onToggleNotifications}
          disabled={privacyUpdating}
        />
        <SettingsToggleRow
          icon={<IconEyeOff />}
          label="Private Followers List"
          value={followersPrivate}
          onValueChange={onToggleFollowersPrivacy}
          disabled={privacyUpdating}
        />

        <SettingsRow
          icon={<IconLogout />}
          label="Logout"
          onPress={onLogout}
          showChevron={false}
          variant="logout"
        />

        <SettingsRow
          icon={<IconTrash />}
          label="Delete Account"
          onPress={onDeleteAccount}
          showChevron={false}
          variant="danger"
        />

        <View style={styles.scrollFooterSpacer} />
        <Text
          style={[styles.buildMeta, { fontFamily: t.fontFamily.regular }]}
          selectable
          accessibilityLabel={`App version ${buildMetaLine}`}>
          {buildMetaLine}
        </Text>
      </ScrollView>

      <LogoutConfirmSheet
        visible={logoutSheetOpen}
        onClose={() => setLogoutSheetOpen(false)}
        onConfirm={onConfirmLogout}
      />

      <Modal
        visible={deleteModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}>
        <View style={styles.deleteBackdrop}>
          <View style={styles.deleteCard}>
            <Text
              style={[styles.deleteTitle, { fontFamily: t.fontFamily.bold }]}>
              Delete account?
            </Text>
            <Text
              style={[styles.deleteBody, { fontFamily: t.fontFamily.regular }]}>
              This is permanent. Your posts, stories, comments, follows,
              earnings, and withdrawals will all be removed and your username
              will be released.{'\n\n'}To confirm, type{' '}
              <Text style={{ fontFamily: t.fontFamily.semibold }}>
                {DELETE_PHRASE}
              </Text>{' '}
              below.
            </Text>
            <TextInput
              style={[
                styles.deleteInput,
                { fontFamily: t.fontFamily.regular },
              ]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={DELETE_PHRASE}
              placeholderTextColor={MUTED}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deletingAccount}
            />
            <View style={styles.deleteActions}>
              <Pressable
                onPress={closeDeleteModal}
                disabled={deletingAccount}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  styles.deleteBtnCancel,
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button">
                <Text
                  style={[
                    styles.deleteBtnText,
                    styles.deleteBtnTextCancel,
                    { fontFamily: t.fontFamily.semibold },
                  ]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={() => void onConfirmDeleteAccount()}
                disabled={!deleteCanSubmit}
                style={({ pressed }) => [
                  styles.deleteBtn,
                  styles.deleteBtnDelete,
                  // Only dim while the input doesn't match. While submitting,
                  // keep full red so the white spinner stays visible.
                  !deleteInputMatches && styles.deleteBtnDeleteDisabled,
                  pressed && !deletingAccount && { opacity: 0.9 },
                ]}
                accessibilityRole="button">
                {deletingAccount ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.deleteBtnText,
                      styles.deleteBtnTextDelete,
                      { fontFamily: t.fontFamily.semibold },
                    ]}>
                    Delete
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: 10,
  },
  topIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarSpacer: {
    width: 44,
  },
  navTitle: {
    flex: 1,
    fontSize: 20,
    color: TITLE,
    marginLeft: 4,
    textAlign: 'left',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 8,
  },
  scrollFooterSpacer: {
    flexGrow: 1,
    minHeight: 32,
  },
  buildMeta: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: H_PAD,
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingVertical: ROW_PAD_V,
    minHeight: 56,
  },
  rowPressed: {
    opacity: 0.65,
  },
  rowIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    color: TITLE,
    marginLeft: 4,
  },
  rowChevron: {
    width: 28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  /** Same horizontal inset as other rows; modest gap before accent rows. */
  rowAccent: {
    marginTop: 12,
  },
  rowLabelLogout: {
    color: BLUE,
  },
  rowLabelDanger: {
    color: DANGER,
  },

  /* Delete-account modal */
  deleteBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  deleteTitle: {
    fontSize: 18,
    color: TITLE,
    marginBottom: 8,
  },
  deleteBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4B5563',
    marginBottom: 14,
  },
  deleteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: TITLE,
    marginBottom: 16,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnCancel: {
    backgroundColor: '#F3F4F6',
  },
  deleteBtnDelete: {
    backgroundColor: DANGER,
  },
  deleteBtnDeleteDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  deleteBtnTextCancel: {
    color: TITLE,
  },
  deleteBtnTextDelete: {
    color: '#FFFFFF',
  },
});
