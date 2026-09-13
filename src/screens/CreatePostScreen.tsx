import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import { useUploadSingleMediaMutation, useCreatePostMutation } from '../store';
import { localImageUriToUploadPayload } from '../utils/pickProfilePhoto';
import { toCreatePostFileRef } from '../utils/toCreatePostFileRef';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastInfo } from '../utils/toast';
import { useTheme } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CreatePost'>;

/* ─── Icons ──────────────────────────────────────────────────── */

function ArrowLeftIcon({
  size = 22,
  color = '#0D0D0D',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 12H5M5 12l7 7M5 12l7-7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function SendIcon({
  size = 18,
  color = '#FFFFFF',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ─── Helpers ────────────────────────────────────────────────── */

function measureImageSize(
  uri: string,
): Promise<{ width: number; height: number } | null> {
  return new Promise(resolve => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}

/* ─── Screen ─────────────────────────────────────────────────── */

export function CreatePostScreen({ navigation, route }: Props) {
  const {
    mediaUri,
    fileName,
    mimeType,
    isVideo,
    soundTitle,
    musicTrackId,
    attachedOriginalSoundId,
    musicTrimStartMs,
  } = route.params;
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [posting, setPosting] = useState(false);
  // Default-ON when the composer arrives with any audio attachment
  // (curated track OR Original Sound) — the user can still toggle this
  // manually; attaching music doesn't take away their control.
  const [originalAudioMuted, setOriginalAudioMuted] = useState<boolean>(
    musicTrackId != null || attachedOriginalSoundId != null,
  );

  const [uploadMedia] = useUploadSingleMediaMutation();
  const [createPost] = useCreatePostMutation();

  const handlePost = useCallback(async () => {
    if (posting) return;

    const payload = localImageUriToUploadPayload(mediaUri, {
      fileName: fileName ?? undefined,
      mimeType: mimeType ?? undefined,
    });
    if (!payload) {
      toastError('Post', 'Could not read this media.');
      return;
    }

    setPosting(true);
    try {
      // Step 1: Upload media
      const uploadRes = await uploadMedia(payload).unwrap();
      const file = toCreatePostFileRef(uploadRes.file);

      // Step 2: Measure dimensions (images only — Image.getSize on iOS can
      // return non-integer dims for videos and fail backend z.number().int()).
      const dims = isVideo ? null : await measureImageSize(mediaUri);

      // Step 3: Create post
      await createPost({
        mediaKind: isVideo ? 'short_video' : 'image',
        file,
        caption: caption.trim() || null,
        hashtags: hashtags.trim() || null,
        musicTitle: soundTitle,
        musicTrackId: musicTrackId ?? null,
        attachedOriginalSoundId: attachedOriginalSoundId ?? null,
        musicTrimStartMs: musicTrimStartMs ?? null,
        // Only meaningful for videos. We send false for images so the
        // backend stores a consistent value either way.
        originalAudioMuted: isVideo ? originalAudioMuted : false,
        mediaWidth: dims?.width ?? null,
        mediaHeight: dims?.height ?? null,
        durationSeconds: null,
      }).unwrap();

      toastInfo('Post', 'Your post has been published!');
      // Reset the stack to the main tabs explicitly. `popToTop()` would
      // unwind back to whatever sat at the bottom of the stack — which,
      // depending on how the user reached Main (auth flow with
      // `navigate` instead of `replace`), can be the LetsYouIn screen.
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } catch (e: unknown) {
      toastError('Post', getApiErrorMessage(e));
    } finally {
      setPosting(false);
    }
  }, [
    posting,
    mediaUri,
    fileName,
    mimeType,
    isVideo,
    caption,
    hashtags,
    soundTitle,
    musicTrackId,
    attachedOriginalSoundId,
    musicTrimStartMs,
    originalAudioMuted,
    uploadMedia,
    createPost,
    navigation,
  ]);

  return (
    <View style={styles.root}>
{/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>
          Post
        </Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Caption + thumbnail row */}
          <View style={styles.captionRow}>
            <View style={styles.captionInputWrap}>
              <TextInput
                style={[
                  styles.captionInput,
                  { fontFamily: t.fontFamily.regular },
                ]}
                placeholder="Write a caption..."
                placeholderTextColor="#8E8E93"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={4000}
                textAlignVertical="top"
                editable={!posting}
              />
            </View>
            <Image
              source={{ uri: mediaUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          </View>

          {/* Hashtags */}
          <View style={styles.hashtagsWrap}>
            <TextInput
              style={[
                styles.hashtagsInput,
                { fontFamily: t.fontFamily.regular },
              ]}
              placeholder="#viral #trending #multiflix"
              placeholderTextColor="#8E8E93"
              value={hashtags}
              onChangeText={setHashtags}
              maxLength={2000}
              editable={!posting}
            />
          </View>

          {/* Sound info */}
          {soundTitle ? (
            <View style={styles.soundRow}>
              <Text style={styles.soundLabel}>♪</Text>
              <Text
                style={[
                  styles.soundTitle,
                  { fontFamily: t.fontFamily.medium },
                ]}
                numberOfLines={1}
              >
                {soundTitle}
              </Text>
            </View>
          ) : null}

          {/* Mute original audio — video posts only. Image posts have no
              audio track, so we hide the toggle entirely for them. */}
          {isVideo ? (
            <View style={styles.muteRow}>
              <View style={styles.muteText}>
                <Text
                  style={[
                    styles.muteTitle,
                    { fontFamily: t.fontFamily.medium },
                  ]}
                >
                  Mute original audio
                </Text>
                <Text
                  style={[
                    styles.muteHint,
                    { fontFamily: t.fontFamily.regular },
                  ]}
                >
                  {musicTrackId != null && originalAudioMuted
                    ? 'Recommended while music is attached.'
                    : "Silence the video's own sound."}
                </Text>
              </View>
              <Switch
                value={originalAudioMuted}
                onValueChange={setOriginalAudioMuted}
                disabled={posting}
                trackColor={{ false: '#D1D1D6', true: '#246BFD' }}
                thumbColor="#FFFFFF"
                accessibilityLabel="Mute original audio"
              />
            </View>
          ) : null}
        </ScrollView>

        {/* Bottom bar */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.bottomRow}>
            <View style={styles.bottomSpacer} />
            <Pressable
              style={({ pressed }) => [
                styles.postBtn,
                (pressed || posting) && { opacity: 0.85 },
                posting && styles.postBtnDisabled,
              ]}
              onPress={() => { void handlePost(); }}
              disabled={posting}
              accessibilityLabel="Publish post"
            >
              {posting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <SendIcon />
                  <Text style={styles.postBtnText}>Post</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEEEEE',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0D0D0D',
  },

  /* Content */
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  captionRow: {
    flexDirection: 'row',
    gap: 14,
  },
  captionInputWrap: {
    flex: 1,
    minHeight: 100,
  },
  captionInput: {
    fontSize: 15,
    color: '#0D0D0D',
    lineHeight: 22,
    padding: 0,
  },
  thumbnail: {
    width: 90,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E8E8E8',
  },
  hashtagsWrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    paddingTop: 14,
  },
  hashtagsInput: {
    fontSize: 15,
    color: '#246BFD',
    padding: 0,
  },
  soundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    paddingTop: 14,
  },
  soundLabel: {
    fontSize: 16,
    color: '#0D0D0D',
  },
  soundTitle: {
    flex: 1,
    fontSize: 14,
    color: '#0D0D0D',
  },
  muteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
    paddingTop: 14,
  },
  muteText: {
    flex: 1,
  },
  muteTitle: {
    fontSize: 15,
    color: '#0D0D0D',
  },
  muteHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B6B6B',
  },

  /* Bottom bar */
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EEEEEE',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  bottomSpacer: {
    flex: 1,
  },
  postBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#246BFD',
    borderRadius: 26,
    paddingHorizontal: 28,
    height: 48,
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#246BFD',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.35,
          shadowRadius: 10,
        }
      : { elevation: 6 }),
  },
  postBtnDisabled: {
    opacity: 0.65,
  },
  postBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
