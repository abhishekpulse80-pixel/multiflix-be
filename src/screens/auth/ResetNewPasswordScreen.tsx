import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateAccountArt from '../../../assets/svg/createAccount.svg';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { PasswordResetSuccessModal } from '../../components/auth/PasswordResetSuccessModal';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
} from '../../components/icons/FormIcons';
import type { RootStackParamList } from '../../navigation/types';
import { useResetPasswordMutation } from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetNewPassword'>;

const LINK = '#246BFD';
const MUTED = '#8A8A8A';

export function ResetNewPasswordScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { resetToken } = route.params;
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [focused, setFocused] = useState<'p' | 'c' | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const { width: screenW } = Dimensions.get('window');
  const artW = Math.min(screenW - 140, 180);
  const artH = (200 / 237) * artW;
  const circleSize = artW + 40;

  const passColor = focused === 'p' ? LINK : MUTED;
  const confirmColor = focused === 'c' ? LINK : MUTED;
  const canContinue =
    password.length >= 6 && password === confirm && confirm.length > 0;

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
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
            Create New Password
          </Text>

          <View style={styles.heroWrap}>
            <View
              style={[
                styles.heroCircle,
                {
                  width: circleSize,
                  height: circleSize,
                  borderRadius: circleSize / 2,
                },
              ]}>
              <CreateAccountArt width={artW} height={artH} />
            </View>
          </View>

          <Text style={[styles.subtitle, { fontFamily: t.fontFamily.bold }]}>
            Create Your New Password
          </Text>

          <View style={styles.fields}>
            <FormTextField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              onFocus={() => setFocused('p')}
              onBlur={() => setFocused(null)}
              focused={focused === 'p'}
              accentSurface={focused === 'p'}
              style={{ fontFamily: t.fontFamily.regular }}
              leftIcon={<LockIcon color={passColor} />}
              rightIcon={
                showPass ? (
                  <EyeIcon color={passColor} />
                ) : (
                  <EyeOffIcon color={passColor} />
                )
              }
              onRightPress={() => setShowPass(v => !v)}
            />
            <FormTextField
              placeholder="Confirm Password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              onFocus={() => setFocused('c')}
              onBlur={() => setFocused(null)}
              focused={focused === 'c'}
              accentSurface={focused === 'c'}
              style={{ fontFamily: t.fontFamily.regular }}
              leftIcon={<LockIcon color={confirmColor} />}
              rightIcon={
                showConfirm ? (
                  <EyeIcon color={confirmColor} />
                ) : (
                  <EyeOffIcon color={confirmColor} />
                )
              }
              onRightPress={() => setShowConfirm(v => !v)}
            />
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRemember(r => !r)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}>
            <View
              style={[
                styles.cb,
                remember && { backgroundColor: LINK, borderColor: LINK },
              ]}>
              {remember ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={[styles.rememberLabel, { fontFamily: t.fontFamily.medium }]}>
              Remember me
            </Text>
          </Pressable>

          <PrimaryButton
            elevated
            label={isLoading ? 'Updating…' : 'Continue'}
            disabled={isLoading}
            labelStyle={{ fontFamily: t.fontFamily.bold }}
            onPress={async () => {
              if (!canContinue) {
                return;
              }
              try {
                await resetPassword({
                  resetToken,
                  newPassword: password,
                }).unwrap();
                setSuccessOpen(true);
              } catch (e) {
                toastError('Reset failed', getApiErrorMessage(e));
              }
            }}
            style={continueButtonStyle}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <PasswordResetSuccessModal
        visible={successOpen}
        navigation={navigation}
        redirectTo="Main"
      />
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
    marginBottom: 16,
  },
  heroWrap: { alignItems: 'center', marginBottom: 16 },
  heroCircle: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#0A0A0A',
    marginBottom: 20,
    textAlign: 'center',
  },
  fields: { gap: 16 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 20,
  },
  cb: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: LINK,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: -1,
  },
  rememberLabel: {
    fontSize: 15,
    color: '#0A0A0A',
  },
  btn: { marginTop: 24 },
});
