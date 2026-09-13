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
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { OrDivider } from '../../components/auth/OrDivider';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppleIcon } from '../../components/icons/AppleIcon';
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
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
  useLoginMutation,
} from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError, toastInfo } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

const MUTED = '#8A8A8A';
const LINK = '#246BFD';

const { height: SCREEN_H } = Dimensions.get('window');

export function SignInScreen({ navigation }: Props) {
  const t = useTheme();
  const { signInWithGoogle, isGoogleLoading } =
    useGoogleSignInHandler(navigation);
  const { signInWithApple, isAppleLoading } = useAppleSignInHandler(navigation);
  const socialBusy = isGoogleLoading || isAppleLoading;
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  /** Free-form identifier field — accepts an email, username, or phone. */
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState<'identifier' | 'password' | null>(
    null,
  );

  const blue = LINK;
  const identifierIconColor = focused === 'identifier' ? blue : MUTED;
  const passIconColor = focused === 'password' ? blue : MUTED;

  /**
   * Pick the right keyboard for what the user is typing — email keyboard
   * if they've already typed `@`, plain default otherwise (so usernames
   * and phone numbers stay easy to type).
   */
  const looksLikeEmail = identifier.includes('@');

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader onBack={() => navigation.goBack()} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            {
              paddingBottom: 32,
              minHeight: SCREEN_H - 120,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.column}>
            <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
              Login to your{'\n'}Account
            </Text>

            <View style={styles.fields}>
              <FormTextField
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={looksLikeEmail ? 'email-address' : 'default'}
                placeholder="Email, username, or phone"
                value={identifier}
                onChangeText={setIdentifier}
                onFocus={() => setFocused('identifier')}
                onBlur={() => setFocused(null)}
                focused={focused === 'identifier'}
                accentSurface={focused === 'identifier'}
                style={{ fontFamily: t.fontFamily.regular }}
                leftIcon={
                  looksLikeEmail ? (
                    <MailIcon color={identifierIconColor} />
                  ) : (
                    <UserIcon color={identifierIconColor} />
                  )
                }
              />
              <FormTextField
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                focused={focused === 'password'}
                accentSurface={focused === 'password'}
                style={{ fontFamily: t.fontFamily.regular }}
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
                  { fontFamily: t.fontFamily.medium },
                ]}
              >
                Remember me
              </Text>
            </Pressable>

            <PrimaryButton
              elevated
              label={isLoading ? 'Signing in…' : 'Sign in'}
              disabled={isLoading}
              onPress={async () => {
                const trimmed = identifier.trim();
                if (trimmed.length < 2) {
                  toastInfo(
                    'Missing details',
                    'Enter your email, username, or phone.',
                  );
                  return;
                }
                if (password.length < 1) {
                  toastInfo('Missing password', 'Enter your password.');
                  return;
                }
                try {
                  const session = await login({
                    identifier: trimmed,
                    password,
                  }).unwrap();
                  dispatch(setCredentials(credentialsFromAuthSuccess(session)));
                  // `replace` (not `navigate`) so the auth screens are
                  // removed from the back stack — otherwise post-flow
                  // `popToTop()` unwinds back to LetsYouIn / Onboarding.
                  if (session.user.isOnboarded) {
                    navigation.replace('Main');
                  } else {
                    navigation.replace(
                      getFirstIncompleteOnboardingScreen(session.user),
                    );
                  }
                } catch (e) {
                  toastError('Sign in failed', getApiErrorMessage(e));
                }
              }}
              labelStyle={{ fontFamily: t.fontFamily.bold }}
              style={[
                styles.btn,
                {
                  backgroundColor: LINK,
                  ...(Platform.OS === 'ios'
                    ? {
                        shadowColor: '#FFAABE',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.5,
                        shadowRadius: 20,
                      }
                    : { elevation: 10, shadowColor: '#FFAABE' }),
                },
              ]}
            />

            <Pressable
              accessibilityRole="button"
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotWrap}
            >
              <Text
                style={[styles.forgot, { fontFamily: t.fontFamily.medium }]}
              >
                Forgot the password?
              </Text>
            </Pressable>

            <View style={styles.spacer} />

            <View style={styles.lower}>
              <OrDivider label="or continue with" />
              <View style={styles.socialRow}>
                <Pressable
                  style={[
                    styles.socialSq,
                    socialBusy ? styles.socialSqDisabled : null,
                  ]}
                  accessibilityLabel="Continue with Google"
                  accessibilityState={{ disabled: socialBusy }}
                  disabled={socialBusy}
                  onPress={() => {
                    signInWithGoogle().catch(() => {});
                  }}
                >
                  <GoogleIcon size={24} />
                </Pressable>
                {Platform.OS === 'ios' ? (
                  <Pressable
                    style={[
                      styles.socialSq,
                      socialBusy ? styles.socialSqDisabled : null,
                    ]}
                    accessibilityLabel="Continue with Apple"
                    accessibilityState={{ disabled: socialBusy }}
                    disabled={socialBusy}
                    onPress={() => {
                      signInWithApple().catch(() => {});
                    }}
                  >
                    <AppleIcon size={24} />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <Text style={styles.footer}>
              <Text
                style={[
                  styles.footerText,
                  { fontFamily: t.fontFamily.regular },
                ]}
              >
                {"Don't have an account? "}
              </Text>
              <Text
                style={[styles.link, { fontFamily: t.fontFamily.semibold }]}
                onPress={() => navigation.navigate('SignUp')}
              >
                Sign up
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  column: {
    flex: 1,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    color: '#0A0A0A',
    textAlign: 'left',
    marginBottom: 36,
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
  forgotWrap: {
    alignSelf: 'center',
    marginTop: 16,
    paddingVertical: 6,
  },
  forgot: {
    fontSize: 15,
    color: LINK,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 28,
  },
  lower: {
    width: '100%',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  socialSq: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialSqDisabled: {
    opacity: 0.55,
  },
  footer: {
    textAlign: 'center',
    fontSize: 15,
    marginTop: 24,
  },
  footerText: {
    fontSize: 15,
    color: '#5C5C5C',
  },
  link: {
    fontSize: 15,
    color: LINK,
  },
});
