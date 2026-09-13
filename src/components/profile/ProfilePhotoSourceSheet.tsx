import React, { useCallback, useState } from 'react';
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
const SHEET_BG = '#FFFFFF';
const OVERLAY = 'rgba(0,0,0,0.45)';
const TITLE_MUTED = '#3D3D45';
const DIVIDER = 'rgba(0,0,0,0.08)';
const CANCEL_BG = '#FFF5F6';

const OPEN_PICKER_DELAY_MS = 320;

export type ProfilePhotoSource =
  | 'library'
  | 'camera'
  | 'camera-photo'
  | 'camera-video';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelectSource: (source: ProfilePhotoSource) => void;
  /** Override sheet title. Default: "Profile photo" */
  title?: string;
  /** Override library button label. Default: "Photo library" */
  libraryLabel?: string;
  /** Override camera button label. Default: "Take photo" */
  cameraLabel?: string;
  /**
   * When true, tapping the camera button shows a sub-choice
   * (Photo / Record video) instead of launching camera directly.
   */
  showCameraModePicker?: boolean;
};

export function ProfilePhotoSourceSheet({
  visible,
  onClose,
  onSelectSource,
  title = 'Profile photo',
  libraryLabel = 'Photo library',
  cameraLabel = 'Take photo',
  showCameraModePicker = false,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const pad = 20;
  const gap = 12;
  const btnW = (screenW - pad * 2 - gap) / 2;

  const [showCameraModes, setShowCameraModes] = useState(false);

  const schedulePick = useCallback(
    (source: ProfilePhotoSource) => {
      setShowCameraModes(false);
      onClose();
      setTimeout(() => onSelectSource(source), OPEN_PICKER_DELAY_MS);
    },
    [onClose, onSelectSource],
  );

  const handleCameraPress = useCallback(() => {
    if (showCameraModePicker) {
      setShowCameraModes(true);
    } else {
      schedulePick('camera');
    }
  }, [showCameraModePicker, schedulePick]);

  const handleClose = useCallback(() => {
    setShowCameraModes(false);
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose} accessibilityLabel="Dismiss">
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          onPress={(e) => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={styles.handle} accessibilityLabel="Sheet handle" />
          <Text style={[styles.sheetTitle, { fontFamily: t.fontFamily.bold }]}>
            {title}
          </Text>
          <View style={styles.divider} />
          <Text style={[styles.subtitle, { fontFamily: t.fontFamily.medium }]}>
            {showCameraModes ? 'What do you want to capture?' : 'Choose a source'}
          </Text>

          {showCameraModes ? (
            /* ── Camera mode sub-choice: Photo / Record video ── */
            <View style={[styles.btnRow, { paddingHorizontal: pad, gap }]}>
              <Pressable
                onPress={() => schedulePick('camera-photo')}
                style={({ pressed }) => [
                  styles.btnOutline,
                  { width: btnW, opacity: pressed ? 0.88 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Take photo">
                <Text style={[styles.btnOutlineLabel, { fontFamily: t.fontFamily.semibold }]}>
                  Take photo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => schedulePick('camera-video')}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { width: btnW, opacity: pressed ? 0.92 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Record video">
                <Text style={[styles.btnPrimaryLabel, { fontFamily: t.fontFamily.semibold }]}>
                  Record video
                </Text>
              </Pressable>
            </View>
          ) : (
            /* ── Main choice: Gallery / Camera ── */
            <View style={[styles.btnRow, { paddingHorizontal: pad, gap }]}>
              <Pressable
                onPress={() => schedulePick('library')}
                style={({ pressed }) => [
                  styles.btnOutline,
                  { width: btnW, opacity: pressed ? 0.88 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={libraryLabel}>
                <Text style={[styles.btnOutlineLabel, { fontFamily: t.fontFamily.semibold }]}>
                  {libraryLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCameraPress}
                style={({ pressed }) => [
                  styles.btnPrimary,
                  { width: btnW, opacity: pressed ? 0.92 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={cameraLabel}>
                <Text style={[styles.btnPrimaryLabel, { fontFamily: t.fontFamily.semibold }]}>
                  {cameraLabel}
                </Text>
              </Pressable>
            </View>
          )}

          <View style={{ paddingHorizontal: pad, marginTop: 12 }}>
            <Pressable
              onPress={showCameraModes ? () => setShowCameraModes(false) : handleClose}
              style={({ pressed }) => [
                styles.btnCancelFull,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={showCameraModes ? 'Back' : 'Cancel'}>
              <Text style={[styles.btnCancelLabel, { fontFamily: t.fontFamily.semibold }]}>
                {showCameraModes ? 'Back' : 'Cancel'}
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
    color: BLUE,
    textAlign: 'center',
    marginBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 20,
    marginBottom: 18,
  },
  subtitle: {
    fontSize: 16,
    color: TITLE_MUTED,
    textAlign: 'center',
    paddingHorizontal: 28,
    marginBottom: 22,
    lineHeight: 22,
  },
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnOutline: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: SHEET_BG,
    borderWidth: 1.5,
    borderColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineLabel: {
    fontSize: 15,
    color: BLUE,
  },
  btnPrimary: {
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
  btnPrimaryLabel: {
    fontSize: 15,
    color: '#FFFFFF',
  },
  btnCancelFull: {
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
});
