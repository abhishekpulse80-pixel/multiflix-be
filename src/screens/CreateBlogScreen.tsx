import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../navigation/types';
import {
  useUploadLargeMediaMutation,
  useUploadSingleMediaMutation,
} from '../store';
import { useCreateBlogMutation } from '../store/api/blogsApi';
import { localImageUriToUploadPayload } from '../utils/pickProfilePhoto';
import { toCreatePostFileRef } from '../utils/toCreatePostFileRef';
import { getApiErrorMessage } from '../utils/apiError';
import { toastError, toastInfo } from '../utils/toast';
import { useTheme } from '../theme';
import {
  pickMediaFromLibrary,
} from '../utils/pickMedia';

type Props = NativeStackScreenProps<RootStackParamList, 'CreateBlog'>;

const BLUE = '#246BFD';

/** Blogs are long-form: the video must be at least this long to publish. */
const MIN_BLOG_DURATION_SECONDS = 4 * 60;

function ArrowLeftIcon({ size = 22, color = '#0D0D0D' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M5 12l7 7M5 12l7-7" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function ImageIcon({ size = 18, color = BLUE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.5 10a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM21 15l-5-5L5 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CreateBlogScreen({ navigation, route }: Props) {
  const { videoUri, fileName, mimeType } = route.params;
  const insets = useSafeAreaInsets();
  const t = useTheme();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [posterUri, setPosterUri] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Captured from the preview player's onLoad — a fallback duration check for
  // when the picker didn't report it before navigating here.
  const [videoDurationSec, setVideoDurationSec] = useState<number | null>(null);

  const [uploadMedia] = useUploadSingleMediaMutation();
  // Blog videos can be large — stream them straight to S3 (presigned PUT)
  // instead of buffering a multipart body in memory.
  const [uploadVideo] = useUploadLargeMediaMutation();
  const [createBlog] = useCreateBlogMutation();

  const pickPoster = useCallback(async () => {
    try {
      const asset = await pickMediaFromLibrary();
      if (asset?.uri) {
        setPosterUri(asset.uri);
      }
    } catch {
      toastError('Poster', 'Could not pick image.');
    }
  }, []);

  const handlePublish = useCallback(async () => {
    if (publishing) return;
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toastError('Blog', 'Title is required.');
      return;
    }
    // Long-form guard (fallback to the pick-time check): block short videos.
    if (
      videoDurationSec != null &&
      videoDurationSec < MIN_BLOG_DURATION_SECONDS
    ) {
      toastError('Blog', 'Blog videos must be at least 4 minutes long.');
      return;
    }
    setPublishing(true);
    try {
      // 1. Upload video
      const videoPayload = localImageUriToUploadPayload(videoUri, { fileName, mimeType });
      if (!videoPayload) {
        toastError('Blog', 'Could not read video file.');
        setPublishing(false);
        return;
      }
      const videoUploadRes = await uploadVideo(videoPayload).unwrap();
      const videoFileRef = toCreatePostFileRef(videoUploadRes.file);

      // 2. Upload poster if provided
      let posterFileRef = null;
      if (posterUri) {
        const posterPayload = localImageUriToUploadPayload(posterUri, {});
        if (posterPayload) {
          const posterUploadRes = await uploadMedia(posterPayload).unwrap();
          posterFileRef = toCreatePostFileRef(posterUploadRes.file);
        }
      }

      // 3. Create blog
      await createBlog({
        title: trimmedTitle,
        description: description.trim() || null,
        file: videoFileRef,
        posterFile: posterFileRef,
        durationSeconds: videoDurationSec,
      }).unwrap();

      toastInfo('Blog', 'Blog published!');
      navigation.goBack();
    } catch (e: unknown) {
      toastError('Blog', getApiErrorMessage(e));
    } finally {
      setPublishing(false);
    }
  }, [publishing, title, description, videoUri, fileName, mimeType, posterUri, videoDurationSec, uploadMedia, uploadVideo, createBlog, navigation]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
{/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <ArrowLeftIcon />
        </Pressable>
        <Text style={[styles.headerTitle, { fontFamily: t.fontFamily.bold }]}>New Blog</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Video preview */}
        <View style={styles.videoWrap}>
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPlayer}
            resizeMode="cover"
            repeat
            muted
            paused={false}
            onLoad={d => setVideoDurationSec(d.duration ?? null)}
          />
        </View>

        {/* Title */}
        <Text style={[styles.label, { fontFamily: t.fontFamily.semibold }]}>Title *</Text>
        <TextInput
          style={[styles.input, { fontFamily: t.fontFamily.regular }]}
          placeholder="Enter blog title"
          placeholderTextColor="#8E8E93"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
          returnKeyType="next"
        />

        {/* Description */}
        <Text style={[styles.label, { fontFamily: t.fontFamily.semibold }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline, { fontFamily: t.fontFamily.regular }]}
          placeholder="What's this blog about?"
          placeholderTextColor="#8E8E93"
          value={description}
          onChangeText={setDescription}
          maxLength={8000}
          multiline
          textAlignVertical="top"
        />

        {/* Poster picker */}
        <Text style={[styles.label, { fontFamily: t.fontFamily.semibold }]}>Poster (optional)</Text>
        <Pressable style={styles.posterBtn} onPress={pickPoster} accessibilityRole="button" accessibilityLabel="Pick poster image">
          <ImageIcon />
          <Text style={[styles.posterBtnText, { fontFamily: t.fontFamily.regular }]}>
            {posterUri ? 'Poster selected — tap to change' : 'Choose poster image'}
          </Text>
        </Pressable>
        {!posterUri ? (
          <Text style={[styles.posterHint, { fontFamily: t.fontFamily.regular }]}>
            If not provided, a thumbnail will be generated from the video.
          </Text>
        ) : null}
      </ScrollView>

      {/* Publish button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Pressable
          style={[styles.publishBtn, publishing && styles.publishBtnBusy]}
          onPress={() => { void handlePublish(); }}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel="Publish blog"
        >
          {publishing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={[styles.publishText, { fontFamily: t.fontFamily.bold }]}>Publish</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, color: '#0D0D0D' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  videoWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: 24,
  },
  videoPlayer: { width: '100%', height: '100%' },
  label: { fontSize: 14, color: '#0D0D0D', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 14, default: 10 }),
    fontSize: 15,
    color: '#0D0D0D',
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  inputMultiline: { minHeight: 100, maxHeight: 200 },
  posterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: BLUE,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  posterBtnText: { fontSize: 14, color: BLUE },
  posterHint: { fontSize: 12, color: '#8E8E93', marginBottom: 20 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8E8E8' },
  publishBtn: {
    height: 52,
    borderRadius: 26,
    backgroundColor: BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: BLUE, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  publishBtnBusy: { opacity: 0.7 },
  publishText: { fontSize: 16, color: '#FFFFFF' },
});
