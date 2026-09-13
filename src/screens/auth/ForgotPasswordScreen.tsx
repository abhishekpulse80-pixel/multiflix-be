import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateAccountArt from '../../../assets/svg/createAccount.svg';
import { AuthBackHeader } from '../../components/auth/AuthBackHeader';
import { FormTextField } from '../../components/auth/FormTextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MailIcon } from '../../components/icons/FormIcons';
import type { RootStackParamList } from '../../navigation/types';
import { useForgotPasswordMutation } from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage, getApiErrorCode } from '../../utils/apiError';
import { isValidEmail } from '../../utils/isValidEmail';
import { maskEmail } from '../../utils/maskEmail';
import { toastError, toastInfo } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const LINK = '#246BFD';

export function ForgotPasswordScreen({ navigation }: Props) {
  const t = useTheme();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [email, setEmail] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);

  const { width: screenW } = Dimensions.get('window');
  const artW = Math.min(screenW - 120, 200);
  const artH = (200 / 237) * artW;
  const circleSize = artW + 48;

  return (
    <View style={[styles.root, { backgroundColor: t.colors.background }]}>
<AuthBackHeader onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
          Forgot Password
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

        <Text style={[styles.subtitle, { fontFamily: t.fontFamily.regular }]}>
          Enter your email address and we'll send you a verification code to
          reset your password.
        </Text>

        <Text style={[styles.note, { fontFamily: t.fontFamily.regular }]}>
          Note: If you signed up with Google or Apple, you cannot reset your
          password here. Please log in using your social account instead.
        </Text>

        <FormTextField
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          focused={emailFocused}
          accentSurface={emailFocused}
          style={{ fontFamily: t.fontFamily.regular }}
          containerStyle={{ marginBottom: 20 }}
          leftIcon={<MailIcon color={emailFocused ? LINK : '#8A8A8A'} />}
        />

        <PrimaryButton
          elevated
          label={isLoading ? 'Sending...' : 'Continue'}
          disabled={isLoading}
          labelStyle={{ fontFamily: t.fontFamily.bold }}
          onPress={async () => {
            if (!isValidEmail(email)) {
              toastInfo('Invalid email', 'Enter the email for your account.');
              return;
            }
            const normalized = email.trim().toLowerCase();
            try {
              await forgotPassword({ email: normalized }).unwrap();
              navigation.navigate('ForgotPasswordOtp', {
                channel: 'email',
                masked: maskEmail(normalized),
                email: normalized,
              });
            } catch (e) {
              const code = getApiErrorCode(e);
              if (code === 'SOCIAL_ACCOUNT') {
                toastError(
                  'Social Account',
                  getApiErrorMessage(e),
                );
              } else {
                toastError('Request failed', getApiErrorMessage(e));
              }
            }
          }}
          style={[
            styles.btn,
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
          ]}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  title: {
    fontSize: 32,
    lineHeight: 40,
    color: '#0A0A0A',
    marginBottom: 20,
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroCircle: {
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5C5C5C',
    marginBottom: 12,
  },
  note: {
    fontSize: 13,
    lineHeight: 19,
    color: '#8A8A8A',
    marginBottom: 24,
  },
  btn: { marginTop: 12 },
});
