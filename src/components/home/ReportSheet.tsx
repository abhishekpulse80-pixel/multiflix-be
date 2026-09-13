import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReportPostMutation } from '../../store/api/reportsApi';
import { getApiErrorMessage } from '../../utils/apiError';
import { toastError } from '../../utils/toast';

const SHEET_BG = '#FFFFFF';
const HANDLE = '#D8D8D8';
const TITLE = '#0D0D0D';
const DIVIDER = '#EEEEEE';
const INPUT_BG = '#F2F3F5';
const PLACEHOLDER = '#8E8E93';
const SUBMIT_RED = '#E50914';

type Props = {
  visible: boolean;
  postId: string | null;
  onRequestClose: () => void;
};

export function ReportSheet({ visible, postId, onRequestClose }: Props) {
  const { height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [reportPost, { isLoading }] = useReportPostMutation();
  const [submitted, setSubmitted] = useState(false);

  const handleClose = useCallback(() => {
    setReason('');
    setSubmitted(false);
    onRequestClose();
  }, [onRequestClose]);

  const handleSubmit = useCallback(async () => {
    if (!postId || reason.trim().length === 0) return;
    try {
      await reportPost({ postId, reason: reason.trim() }).unwrap();
      setSubmitted(true);
    } catch (err) {
      toastError(getApiErrorMessage(err) ?? 'Failed to submit report');
    }
  }, [postId, reason, reportPost]);

  const sheetH = screenH * 0.45;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.sheetWrap, { height: sheetH }]}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          {/* Handle */}
          <View style={styles.handleRow}>
            <View style={styles.handle} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Report</Text>
          <View style={styles.divider} />

          {submitted ? (
            /* Success state */
            <View style={styles.successWrap}>
              <Text style={styles.successText}>
                Thanks for reporting. We'll review this content.
              </Text>
              <Pressable style={styles.doneBtn} onPress={handleClose}>
                <Text style={styles.doneBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : (
            /* Input state */
            <View style={styles.body}>
              <Text style={styles.label}>
                Why are you reporting this post?
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Describe the issue..."
                placeholderTextColor={PLACEHOLDER}
                value={reason}
                onChangeText={setReason}
                multiline
                maxLength={1000}
                textAlignVertical="top"
                editable={!isLoading}
              />
              <Pressable
                style={[
                  styles.submitBtn,
                  (reason.trim().length === 0 || isLoading) &&
                    styles.submitBtnDisabled,
                ]}
                onPress={handleSubmit}
                disabled={reason.trim().length === 0 || isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Report</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: SHEET_BG,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: HANDLE,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: TITLE,
    textAlign: 'center',
    marginBottom: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
  },
  body: {
    flex: 1,
    padding: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: TITLE,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: TITLE,
    minHeight: 80,
  },
  submitBtn: {
    marginTop: 14,
    backgroundColor: SUBMIT_RED,
    borderRadius: 28,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.45,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  successWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successText: {
    fontSize: 16,
    color: TITLE,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  doneBtn: {
    backgroundColor: SUBMIT_RED,
    borderRadius: 28,
    paddingHorizontal: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
