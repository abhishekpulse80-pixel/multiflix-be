import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { OrDivider } from '../../components/auth/OrDivider';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppleIcon } from '../../components/icons/AppleIcon';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  UserIcon,
} from '../../components/icons/FormIcons';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import { useAppleSignInHandler } from '../../hooks/useAppleSignInHandler';
import { useGoogleSignInHandler } from '../../hooks/useGoogleSignInHandler';
import { getFirstIncompleteOnboardingScreen } from '../../navigation/onboardingProgress';
import type { RootStackParamList } from '../../navigation/types';
import {
  credentialsFromAuthSuccess,
  setCredentials,
  useAppDispatch,
  useRegisterMutation,
} from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { openPrivacy, openTerms } from '../../utils/legal';
import { toastError, toastInfo } from '../../utils/toast';
import { normalizeUsername, usernameShapeError } from '../../utils/usernameRules';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

const MUTED = '#8A8A8A';
const INK = '#0A0A0A';

export function SignUpScreen({ navigation }: Props) {
  const t = useTheme();
  const { signInWithGoogle, isGoogleLoading } = useGoogleSignInHandler(navigation);
  const { signInWithApple, isAppleLoading } = useAppleSignInHandler(navigation);
  const socialBusy = isGoogleLoading || isAppleLoading;
  const dispatch = useAppDispatch();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Required EULA acceptance (App Store Guideline 1.2). Sign-up is blocked
  // until the user explicitly agrees.
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [focused, setFocused] = useState<
    'username' | 'password' | 'confirm' | null
  >(null);

  const blue = t.colors.accent;
  const usernameIconColor =
    username.length > 0 ? blue : focused === 'username' ? blue : MUTED;
  const passIconColor =
    focused === 'password' ? blue : password.length > 0 ? INK : MUTED;
  const confirmIconColor =
    focused === 'confirm' ? blue : confirmPassword.length > 0 ? INK : MUTED;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
            Create your{'\n'}Account
          </Text>

          <View style={styles.fields}>
            <FormTextField
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              onFocus={() => setFocused('username')}
              onBlur={() => setFocused(null)}
              focused={focused === 'username'}
              leftIcon={<UserIcon color={usernameIconColor} />}
            />
            <FormTextField
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              focused={focused === 'password'}
              accentSurface
              leftIcon={<LockIcon color={passIconColor} />}
              rightIcon={
                showPass ? (
                  <EyeIcon color={passIconColor} />
                ) : (
                  <EyeOffIcon color={passIconColor} />
                )
              }
              onRightPress={() => setShowPass(v => !v)}
            />
            <FormTextField
              placeholder="Confirm password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              onFocus={() => setFocused('confirm')}
              onBlur={() => setFocused(null)}
              focused={focused === 'confirm'}
              accentSurface
              leftIcon={<LockIcon color={confirmIconColor} />}
              rightIcon={
                showConfirm ? (
                  <EyeIcon color={confirmIconColor} />
                ) : (
                  <EyeOffIcon color={confirmIconColor} />
                )
              }
              onRightPress={() => setShowConfirm(v => !v)}
            />
          </View>

          <Pressable
            style={styles.rememberRow}
            onPress={() => setRemember(r => !r)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: remember }}
          >
            <View
              style={[
                styles.cb,
                remember && { backgroundColor: blue, borderColor: blue },
              ]}
            >
              {remember ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text
              style={[
                styles.rememberLabel,
                { fontFamily: t.fontFamily.regular },
              ]}
            >
              Remember me
            </Text>
          </Pressable>

          {/* Required EULA agreement — blocks sign-up until checked. */}
          <Pressable
            style={styles.agreeRow}
            onPress={() => setAgreedToTerms(v => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreedToTerms }}
            accessibilityLabel="Agree to Terms of Use and Privacy Policy"
          >
            <View
              style={[styles.checkbox, agreedToTerms && styles.checkboxOn]}
            >
              {agreedToTerms ? <Text style={styles.checkboxTick}>✓</Text> : null}
            </View>
            <Text
              style={[styles.agreeText, { fontFamily: t.fontFamily.regular }]}
            >
              I agree to the{' '}
              <Text
                style={styles.agreeLink}
                onPress={openTerms}
                suppressHighlighting
              >
                Terms of Use
              </Text>{' '}
              and{' '}
              <Text
                style={styles.agreeLink}
                onPress={openPrivacy}
                suppressHighlighting
              >
                Privacy Policy
              </Text>
              , and understand Multiflix has zero tolerance for objectionable
              content or abusive users.
            </Text>
          </Pressable>

          <PrimaryButton
            elevated
            label={isLoading ? 'Creating account…' : 'Sign up'}
            disabled={isLoading || !agreedToTerms}
            onPress={async () => {
              if (!agreedToTerms) {
                toastInfo(
                  'Agree to continue',
                  'Please accept the Terms of Use and Privacy Policy.',
                );
                return;
              }
              const normalizedUsername = normalizeUsername(username);
              const usernameError = usernameShapeError(normalizedUsername);
              if (usernameError) {
                toastInfo('Invalid username', usernameError);
                return;
              }
              if (password.length < 6) {
                toastInfo(
                  'Weak password',
                  'Use at least 6 characters (server requires this).',
                );
                return;
              }
              if (password !== confirmPassword) {
                toastInfo(
                  'Passwords don’t match',
                  'Make sure both password fields are the same.',
                );
                return;
              }
              try {
                const session = await registerUser({
                  username: normalizedUsername,
                  password,
                }).unwrap();
                dispatch(setCredentials(credentialsFromAuthSuccess(session)));
                // Replace the stack instead of pushing — the account now
                // exists, so the user must not be able to go back to this form
                // and re-submit (which fails with "email already registered").
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: getFirstIncompleteOnboardingScreen(session.user) },
                  ],
                });
              } catch (e) {
                toastError('Sign up failed', getApiErrorMessage(e));
              }
            }}
            style={styles.btn}
          />

          <OrDivider label="or continue with" />

          <View style={styles.socialRow}>
            <Pressable
              style={[
                styles.socialSq,
                socialBusy ? styles.socialSqDisabled : null,
              ]}
              onPress={() => {
                signInWithGoogle().catch(() => {});
              }}
              accessibilityLabel="Continue with Google"
              accessibilityState={{ disabled: socialBusy }}
              disabled={socialBusy}
            >
              <GoogleIcon size={24} />
            </Pressable>
            {Platform.OS === 'ios' ? (
              <Pressable
                style={[
                  styles.socialSq,
                  socialBusy ? styles.socialSqDisabled : null,
                ]}
                onPress={() => {
                  signInWithApple().catch(() => {});
                }}
                accessibilityLabel="Continue with Apple"
                accessibilityState={{ disabled: socialBusy }}
                disabled={socialBusy}
              >
                <AppleIcon size={24} />
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.footer}>
            <Text
              style={[styles.footerText, { fontFamily: t.fontFamily.regular }]}
            >
              Already have an account?{' '}
            </Text>
            <Text
              style={[styles.link, { fontFamily: t.fontFamily.semibold }]}
              onPress={() => navigation.navigate('SignIn')}
            >
              Sign in
            </Text>
          </Text>
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
    color: '#0A0A0A',
    marginBottom: 28,
  },
  fields: { gap: 16 },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  cb: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3B71FE',
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
  btn: { marginTop: 20 },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 18,
    paddingHorizontal: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C4C4C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: {
    backgroundColor: '#3B71FE',
    borderColor: '#3B71FE',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  agreeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#6B6B6B',
  },
  agreeLink: {
    color: '#3B71FE',
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 8,
  },
  socialSq: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialSqDisabled: {
    opacity: 0.55,
  },
  footer: {
    textAlign: 'center',
    fontSize: 15,
    marginTop: 28,
  },
  footerText: {
    fontSize: 15,
    color: '#5C5C5C',
  },
  link: {
    fontSize: 15,
    color: '#3B71FE',
  },
});
