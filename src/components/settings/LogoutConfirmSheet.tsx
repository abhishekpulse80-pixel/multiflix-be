import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';

const BLUE = '#246BFD';
const SHEET_BG = '#FFFFFF';
const OVERLAY = 'rgba(0,0,0,0.45)';
const TITLE_MUTED = '#3D3D45';
const DIVIDER = 'rgba(0,0,0,0.08)';
const CANCEL_BG = '#FFF5F6';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export function LogoutConfirmSheet({ visible, onClose, onConfirm }: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const pad = 20;
  const gap = 12;
  const btnW = (screenW - pad * 2 - gap) / 2;

  /**
   * Tracks the in-flight logout. While true:
   *  - the confirm button shows a spinner instead of "Yes, Logout"
   *  - both buttons are disabled
   *  - tapping the backdrop / Android back is ignored
   * This is needed because logout (server call + clearing local stores)
   * can take a second or two and the sheet otherwise looks frozen.
   */
  const [loggingOut, setLoggingOut] = useState(false);

  // Reset the loading flag whenever the sheet is hidden, so a future open
  // doesn't reuse a stale "true" if the previous attempt errored mid-flight.
  useEffect(() => {
    if (!visible) {
      setLoggingOut(false);
    }
  }, [visible]);

  const handleConfirm = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await Promise.resolve(onConfirm());
      onClose();
    } catch {
      setLoggingOut(false);
    }
  };

  const handleDismiss = () => {
    if (loggingOut) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleDismiss}>
      <Pressable
        style={styles.overlay}
        onPress={handleDismiss}
        accessibilityLabel="Dismiss">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={styles.handle} accessibilityLabel="Sheet handle" />
          <Text style={[styles.sheetTitle, { fontFamily: t.fontFamily.bold }]}>Logout</Text>
          <View style={styles.divider} />
          <Text style={[styles.message, { fontFamily: t.fontFamily.medium }]}>
            Are you sure you want to log out?
          </Text>
          <View style={[styles.btnRow, { paddingHorizontal: pad, gap }]}>
            <Pressable
              onPress={handleDismiss}
              disabled={loggingOut}
              style={({ pressed }) => [
                styles.btnCancel,
                {
                  width: btnW,
                  opacity: loggingOut ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Text style={[styles.btnCancelLabel, { fontFamily: t.fontFamily.semibold }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              disabled={loggingOut}
              style={({ pressed }) => [
                styles.btnConfirm,
                { width: btnW, opacity: pressed ? 0.92 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityState={{ busy: loggingOut, disabled: loggingOut }}
              accessibilityLabel="Yes, log out">
              {loggingOut ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.btnConfirmLabel, { fontFamily: t.fontFamily.semibold }]}>
                  Yes, Logout
                </Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: OVERLAY,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    color: BLUE,
    textAlign: 'center',
    marginBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  message: {
    fontSize: 16,
    color: TITLE_MUTED,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 28,
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnCancel: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: CANCEL_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelLabel: {
    fontSize: 15,
    color: BLUE,
  },
  btnConfirm: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  btnConfirmLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
});
