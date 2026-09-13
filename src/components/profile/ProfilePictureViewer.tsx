import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-screen viewer for a single profile picture. Tap anywhere or the
 * close button to dismiss. Used for the "View Profile Picture" option
 * exposed via the long-press menu on a profile avatar.
 */
export type ProfilePictureViewerProps = {
  visible: boolean;
  uri: string | null | undefined;
  onClose: () => void;
};

function CloseIcon({ size = 22, color = '#FFFFFF' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ProfilePictureViewer({
  visible,
  uri,
  onClose,
}: ProfilePictureViewerProps) {
  const insets = useSafeAreaInsets();
  const trimmed = uri?.trim() ?? '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close profile picture"
      >
        {trimmed.length > 0 ? (
          <Image
            source={{ uri: trimmed }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : null}
      </Pressable>

      <Pressable
        style={[styles.closeBtn, { top: insets.top + 8 }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
        hitSlop={10}
      >
        <CloseIcon />
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
