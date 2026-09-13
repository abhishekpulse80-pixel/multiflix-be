import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from '../../components/icons/FormIcons';
import type { RootStackParamList } from '../../navigation/types';
import { useChangePasswordMutation } from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError, toastSuccess } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

const LINK = '#246BFD';
const MUTED = '#8A8A8A';

type FieldKey = 'current' | 'next' | 'confirm';

export function ChangePasswordScreen({ navigation }: Props) {
  const t = useTheme();
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<FieldKey | null>(null);

  const canContinue =
    current.length > 0 && next.length >= 6 && next === confirm;

  const disabledReason =
    current.length === 0
      ? 'Enter your current password.'
      : next.length === 0
        ? 'Enter a new password.'
        : next.length < 6
          ? 'New password must be at least 6 characters.'
          : confirm.length === 0
            ? 'Confirm your new password.'
            : next !== confirm
              ? 'New password and confirmation do not match.'
              : null;

  const iconColor = (key: FieldKey) => (focused === key ? LINK : MUTED);

  const continueButtonStyle = [
    styles.btn,
    {
      backgroundColor: LINK,
      opacity: canContinue ? 1 : 0.45,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#FFAABE',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: canContinue ? 0.5 : 0.2,
            shadowRadius: 20,
          }
        : { elevation: canContinue ? 10 : 4 }),
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
            Change Password
          </Text>
          <Text style={[styles.subtitle, { fontFamily: t.fontFamily.regular }]}>
            Enter your current password and choose a new one.
          </Text>

          <View style={styles.fields}>
            <FormTextField
              placeholder="Current Password"
              value={current}
              onChangeText={setCurrent}
              secureTextEntry={!showCurrent}
              onFocus={() => setFocused('current')}
              onBlur={() => setFocused(null)}
              focused={focused === 'current'}
              accentSurface={focused === 'current'}
              style={{ fontFamily: t.fontFamily.regular }}
              leftIcon={<LockIcon color={iconColor('current')} />}
              rightIcon={
                showCurrent ? (
                  <EyeIcon color={iconColor('current')} />
                ) : (
                  <EyeOffIcon color={iconColor('current')} />
                )
              }
              onRightPress={() => setShowCurrent(v => !v)}
            />
            <FormTextField
              placeholder="New Password"
              value={next}
              onChangeText={setNext}
              secureTextEntry={!showNext}
              onFocus={() => setFocused('next')}
              onBlur={() => setFocused(null)}
              focused={focused === 'next'}
              accentSurface={focused === 'next'}
              style={{ fontFamily: t.fontFamily.regular }}
              leftIcon={<LockIcon color={iconColor('next')} />}
              rightIcon={
                showNext ? (
                  <EyeIcon color={iconColor('next')} />
                ) : (
                  <EyeOffIcon color={iconColor('next')} />
                )
              }
              onRightPress={() => setShowNext(v => !v)}
            />
            <FormTextField
              placeholder="Confirm New Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              focused={focused === 'confirm'}
              accentSurface={focused === 'confirm'}
              style={{ fontFamily: t.fontFamily.regular }}
              leftIcon={<LockIcon color={iconColor('confirm')} />}
              rightIcon={
                showConfirm ? (
                  <EyeIcon color={iconColor('confirm')} />
                ) : (
                  <EyeOffIcon color={iconColor('confirm')} />
                )
              }
              onRightPress={() => setShowConfirm(v => !v)}
            />
          </View>

          {disabledReason ? (
            <Text
              style={[styles.hint, { fontFamily: t.fontFamily.regular }]}
              accessibilityLiveRegion="polite">
              {disabledReason}
            </Text>
          ) : null}

          <PrimaryButton
            elevated
            label={isLoading ? 'Updating…' : 'Update Password'}
            disabled={!canContinue || isLoading}
            labelStyle={{ fontFamily: t.fontFamily.bold }}
            onPress={async () => {
              if (!canContinue || isLoading) {
                return;
              }
              try {
                await changePassword({
                  currentPassword: current,
                  newPassword: next,
                }).unwrap();
                toastSuccess('Password updated', 'Your password has been changed.');
                navigation.goBack();
              } catch (e) {
                toastError('Change failed', getApiErrorMessage(e));
              }
            }}
            style={continueButtonStyle}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    color: '#0A0A0A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: MUTED,
    marginBottom: 24,
  },
  fields: { gap: 16 },
  hint: {
    fontSize: 13,
    color: '#E53935',
    marginTop: 12,
    marginLeft: 4,
  },
  btn: { marginTop: 24 },
});
