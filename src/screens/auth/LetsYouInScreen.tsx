import {
  CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateAccountArt from '../../../assets/svg/createAccount.svg';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { OrDivider } from '../../components/auth/OrDivider';
import { OutlineSocialButton } from '../../components/auth/OutlineSocialButton';
import { PrimaryButton } from '../../components/PrimaryButton';
import { AppleIcon } from '../../components/icons/AppleIcon';
import { GoogleIcon } from '../../components/icons/GoogleIcon';
import type { RootStackParamList } from '../../navigation/types';
import { useAppleSignInHandler } from '../../hooks/useAppleSignInHandler';
import { useGoogleSignInHandler } from '../../hooks/useGoogleSignInHandler';
import { useTheme } from '../../theme';
import { openPrivacy, openTerms } from '../../utils/legal';

type Props = NativeStackScreenProps<RootStackParamList, 'LetsYouIn'>;

const { width: SCREEN_W } = Dimensions.get('window');
/** Art inside circular frame — keep modest height so nothing clips below status bar */
const ART_W = Math.min(SCREEN_W - 80, 240);
const ART_H = (200 / 237) * ART_W;
const CIRCLE_PAD = 22;
const CIRCLE_SIZE = ART_W + CIRCLE_PAD * 2;

export function LetsYouInScreen({ navigation }: Props) {
  const t = useTheme();
  const { signInWithGoogle, isGoogleLoading } =
    useGoogleSignInHandler(navigation);
  const { signInWithApple, isAppleLoading } =
    useAppleSignInHandler(navigation);
  const socialBusy = isGoogleLoading || isAppleLoading;
  const canBack = navigation.canGoBack();

  const onBack = () => {
    if (canBack) {
      navigation.goBack();
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        }),
      );
    }
  };

  /** Reference: modest gap after header row before illustration (header already applies safe area). */
  const mainPaddingTop = 16;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader onBack={onBack} visible={canBack} />
      <View
        style={[
          styles.main,
          {
            paddingTop: mainPaddingTop,
            paddingBottom: 32,
          },
        ]}
      >
        <View style={styles.column}>
          {/* Top: hero + title (reference: gap below status/back, then art in light circle) */}
          <View style={styles.topGroup}>
            <View
              style={[
                styles.artCircle,
                {
                  width: CIRCLE_SIZE,
                  height: CIRCLE_SIZE,
                  borderRadius: CIRCLE_SIZE / 2,
                },
              ]}
            >
              <CreateAccountArt width={ART_W} height={ART_H} />
            </View>
            <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
              {"Let's you in"}
            </Text>
          </View>

          {/* Middle: social + divider + primary */}
          <View style={styles.midGroup}>
            <View style={styles.socialStack}>
              <OutlineSocialButton
                label="Continue with Google"
                icon={<GoogleIcon />}
                disabled={socialBusy}
                onPress={() => {
                  signInWithGoogle().catch(() => {});
                }}
              />
              {Platform.OS === 'ios' ? (
                <OutlineSocialButton
                  label="Continue with Apple"
                  icon={<AppleIcon />}
                  disabled={socialBusy}
                  onPress={() => {
                    signInWithApple().catch(() => {});
                  }}
                />
              ) : null}
            </View>
            <View style={styles.dividerWrap}>
              <OrDivider label="or" />
            </View>
            <PrimaryButton
              elevated
              label="Sign in with password"
              onPress={() => navigation.navigate('SignIn')}
            />
          </View>

          {/* EULA agreement — shown before any registration / login path
              (social sign-in above, or Sign in / Sign up below). Required
              by App Store Guideline 1.2 for user-generated content. */}
          <Text
            style={[styles.agreement, { fontFamily: t.fontFamily.regular }]}
          >
            By continuing, you agree to our{' '}
            <Text
              style={[styles.link, { fontFamily: t.fontFamily.semibold }]}
              onPress={openTerms}
            >
              Terms of Use
            </Text>{' '}
            and{' '}
            <Text
              style={[styles.link, { fontFamily: t.fontFamily.semibold }]}
              onPress={openPrivacy}
            >
              Privacy Policy
            </Text>
            . Multiflix has zero tolerance for objectionable content or abusive
            behavior.
          </Text>

          {/* Bottom: footer sits above home indicator with comfortable margin */}
          <Text style={styles.footer}>
            <Text
              style={[styles.footerText, { fontFamily: t.fontFamily.regular }]}
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  main: {
    flex: 1,
    paddingHorizontal: 24,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    justifyContent: 'space-between',
  },
  topGroup: {
    alignItems: 'center',
  },
  artCircle: {
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    lineHeight: 36,
    textAlign: 'center',
    color: '#0A0A0A',
  },
  midGroup: {
    width: '100%',
  },
  socialStack: {
    gap: 14,
    marginBottom: 4,
  },
  dividerWrap: {
    marginVertical: 20,
  },
  agreement: {
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#8A8A8A',
    marginBottom: 14,
  },
  footer: {
    textAlign: 'center',
    fontSize: 15,
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
