import type { NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingDots } from '../LoadingDots';
import type { RootStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme';

const LINK = '#246BFD';

type Props = {
  visible: boolean;
  navigation: NavigationProp<RootStackParamList>;
  redirectMs?: number;
  /** After password reset you are not logged in — default is Sign In. */
  redirectTo?: 'SignIn' | 'Main';
};

export function PasswordResetSuccessModal({
  visible,
  navigation,
  redirectMs = 2800,
  redirectTo = 'SignIn',
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();

  const goNext = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: redirectTo }],
    });
  }, [navigation, redirectTo]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const tmr = setTimeout(goNext, redirectMs);
    return () => clearTimeout(tmr);
  }, [visible, goNext, redirectMs]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={goNext}>
      <View style={styles.scrim}>
        <View style={[styles.card, { paddingBottom: 24 + insets.bottom }]}>
          <View style={styles.glowWrap}>
            <View style={styles.glow} />
            <View style={styles.shield}>
              <Text style={styles.shieldCheck}>✓</Text>
            </View>
          </View>
          <Text style={[styles.title, { fontFamily: t.fontFamily.bold }]}>
            Congratulations!
          </Text>
          <Text style={[styles.body, { fontFamily: t.fontFamily.regular }]}>
            {redirectTo === 'Main'
              ? 'Your account is ready to use. You will be redirected to the Home page in a few seconds.'
              : 'Your password was updated. You will be redirected to sign in with your new password in a few seconds.'}
          </Text>
          <View style={styles.dots}>
            <LoadingDots accentColor={LINK} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  glowWrap: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  glow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(36, 107, 253, 0.12)',
  },
  title: {
    fontSize: 22,
    color: LINK,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#5C5C5C',
    textAlign: 'center',
    marginBottom: 24,
  },
  dots: {
    marginTop: 4,
  },
  shield: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: LINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCheck: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    marginTop: -2,
  },
});
