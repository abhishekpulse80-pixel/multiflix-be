import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { formatRelativeTime } from '../../utils/formatRelativeTime';

const SHEET_BG = '#FFFFFF';
const OVERLAY = 'rgba(0,0,0,0.45)';
const DIVIDER = 'rgba(0,0,0,0.08)';
const DESTRUCTIVE = '#E53935';
const TITLE = '#0D0D0D';
const MUTED = '#6B6B6B';

type Props = {
  visible: boolean;
  onClose: () => void;
  onShareProfile: () => void;
  /** Report the post. */
  onReport: () => void;
  /** Block the post author (same flow as the public profile). */
  onBlock: () => void;
  /** Author handle shown in the sheet title. */
  subject?: string;
  /** ISO timestamp of when the post was uploaded — shown as small relative
   * time (e.g. "2 hours ago") in the sheet's top-right corner. */
  createdAt?: string;
};

/**
 * 3-dots actions menu for a feed post. Used project-wide by FeedPost, so
 * every screen that renders a post gets the same menu (Share profile +
 * Report) without per-screen wiring.
 */
export function PostActionsSheet({
  visible,
  onClose,
  onShareProfile,
  onReport,
  onBlock,
  subject,
  createdAt,
}: Props) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const timeText = createdAt ? formatRelativeTime(createdAt) : '';

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
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          onPress={e => e.stopPropagation()}
          accessibilityViewIsModal>
          <View style={styles.handle} />
          {timeText ? (
            <Text
              style={[styles.time, { fontFamily: t.fontFamily.regular }]}
              accessibilityLabel={`Uploaded ${timeText}`}>
              {timeText}
            </Text>
          ) : null}
          {subject ? (
            <Text
              style={[styles.subject, { fontFamily: t.fontFamily.medium }]}
              numberOfLines={1}>
              @{subject}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={onShareProfile}
            accessibilityRole="button"
            accessibilityLabel="Share profile">
            <Text
              style={[styles.rowLabel, { fontFamily: t.fontFamily.semibold }]}>
              Share profile
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={onReport}
            accessibilityRole="button"
            accessibilityLabel="Report post">
            <Text
              style={[
                styles.rowLabel,
                styles.rowLabelDestructive,
                { fontFamily: t.fontFamily.semibold },
              ]}>
              Report
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={onBlock}
            accessibilityRole="button"
            accessibilityLabel="Block user">
            <Text
              style={[
                styles.rowLabel,
                styles.rowLabelDestructive,
                { fontFamily: t.fontFamily.semibold },
              ]}>
              Block user
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel">
            <Text style={[styles.rowLabel, { fontFamily: t.fontFamily.medium }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: OVERLAY, justifyContent: 'flex-end' },
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
    marginBottom: 8,
  },
  subject: {
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  time: {
    position: 'absolute',
    top: 12,
    right: 16,
    fontSize: 11,
    color: MUTED,
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowPressed: { opacity: 0.6 },
  rowLabel: { fontSize: 16, color: TITLE },
  rowLabelDestructive: { color: DESTRUCTIVE },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 20,
  },
});
