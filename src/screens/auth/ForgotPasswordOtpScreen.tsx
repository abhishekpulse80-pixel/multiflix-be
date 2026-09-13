import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
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
import { OtpRow } from '../../components/auth/OtpRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { RootStackParamList } from '../../navigation/types';
import {
  useForgotPasswordMutation,
  useVerifyForgotOtpMutation,
} from '../../store';
import { useTheme } from '../../theme';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError, toastSuccess } from '../../utils/toast';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordOtp'>;

const LINK = '#246BFD';
const INITIAL_SEC = 55;

export function ForgotPasswordOtpScreen({ navigation, route }: Props) {
  const t = useTheme();
  const { masked, email } = route.params;
  const [verifyOtp, { isLoading: verifying }] = useVerifyForgotOtpMutation();
  const [forgotPassword, { isLoading: resending }] = useForgotPasswordMutation();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(INITIAL_SEC);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const restartTimer = () => {
    setSeconds(INITIAL_SEC);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const onResend = async () => {
    try {
      await forgotPassword({ email }).unwrap();
      restartTimer();
      toastSuccess('Code sent', 'Check your email for a new code.');
    } catch (e) {
      toastError('Resend failed', getApiErrorMessage(e));
    }
  };

  const canVerify = code.length === 4;

  const verifyButtonStyle = [
    styles.btn,
    {
      backgroundColor: LINK,
      opacity: canVerify ? 1 : 0.45,
      ...(Platform.OS === 'ios'
        ? {
            shadowColor: '#FFAABE',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: canVerify ? 0.45 : 0.2,
            shadowRadius: 18,
          }
        : { elevation: canVerify ? 10 : 4 }),
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
            Forgot Password
          </Text>

          <Text style={[styles.sent, { fontFamily: t.fontFamily.regular }]}>
            Code has been sent to{' '}
            <Text style={[styles.sentAccent, { fontFamily: t.fontFamily.semibold }]}>
              {masked}
            </Text>
          </Text>

          <OtpRow onCodeChange={setCode} />

          <View style={styles.resendWrap}>
            {seconds > 0 ? (
              <Text style={[styles.resend, { fontFamily: t.fontFamily.regular }]}>
                Resend code in{' '}
                <Text style={[styles.resendBlue, { fontFamily: t.fontFamily.semibold }]}>
                  {seconds}
                </Text>
                {' s'}
              </Text>
            ) : (
              <Pressable
                onPress={() => {
                  void onResend();
                }}
                disabled={resending}
                accessibilityRole="button">
                <Text style={[styles.resendLink, { fontFamily: t.fontFamily.semibold }]}>
                  {resending ? 'Sending…' : 'Resend code'}
                </Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            elevated
            label={verifying ? 'Verifying…' : 'Verify'}
            disabled={verifying}
            labelStyle={{ fontFamily: t.fontFamily.bold }}
            onPress={async () => {
              if (!canVerify) {
                return;
              }
              try {
                const { resetToken } = await verifyOtp({
                  email,
                  code,
                }).unwrap();
                navigation.navigate('ResetNewPassword', { resetToken });
              } catch (e) {
                toastError('Verification failed', getApiErrorMessage(e));
              }
            }}
            style={verifyButtonStyle}
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
    fontSize: 32,
    lineHeight: 40,
    color: '#0A0A0A',
    marginBottom: 16,
  },
  sent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#5C5C5C',
    marginBottom: 28,
  },
  sentAccent: {
    color: '#0A0A0A',
  },
  resendWrap: {
    marginTop: 24,
    alignItems: 'center',
    minHeight: 24,
  },
  resend: {
    fontSize: 15,
    color: '#8A8A8A',
  },
  resendBlue: {
    color: LINK,
  },
  resendLink: {
    fontSize: 15,
    color: LINK,
  },
  btn: { marginTop: 32 },
});
