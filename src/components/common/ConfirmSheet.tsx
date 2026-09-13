import React from 'react';
import {
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
const DESTRUCTIVE = '#E53935';
const SHEET_BG = '#FFFFFF';
const OVERLAY = 'rgba(0,0,0,0.45)';
const TITLE_MUTED = '#3D3D45';
const DIVIDER = 'rgba(0,0,0,0.08)';
const CANCEL_BG = '#F2F3F5';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button (for destructive actions like Block). */
  destructive?: boolean;
};

/**
 * Generic bottom-sheet confirmation modal — used in place of RN `Alert`
 * so the app has a consistent, branded confirmation UI.
 */
export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  destructive = false,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const pad = 20;
  const gap = 12;
  const btnW = (screenW - pad * 2 - gap) / 2;
  const accent = destructive ? DESTRUCTIVE : BLUE;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Dismiss">
        <Pressable
          style={[
            styles.sheet,
            { paddingBottom: Math.max(20, insets.bottom + 16) },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={styles.handle} accessibilityLabel="Sheet handle" />
          <Text
            style={[
              styles.sheetTitle,
              { color: accent, fontFamily: t.fontFamily.bold },
            ]}
            numberOfLines={2}>
            {title}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.message, { fontFamily: t.fontFamily.medium }]}>
            {message}
          </Text>
          <View style={[styles.btnRow, { paddingHorizontal: pad, gap }]}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.btnCancel,
                { width: btnW, opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Cancel">
              <Text
                style={[
                  styles.btnCancelLabel,
                  { fontFamily: t.fontFamily.semibold },
                ]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={async () => {
                await Promise.resolve(onConfirm());
                onClose();
              }}
              style={({ pressed }) => [
                styles.btnConfirm,
                {
                  width: btnW,
                  backgroundColor: accent,
                  shadowColor: accent,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={confirmLabel}>
              <Text
                style={[
                  styles.btnConfirmLabel,
                  { fontFamily: t.fontFamily.semibold },
                ]}>
                {confirmLabel}
              </Text>
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
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 24,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  message: {
    fontSize: 15,
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
    color: TITLE_MUTED,
  },
  btnConfirm: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
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
