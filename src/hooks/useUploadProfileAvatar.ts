import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import type { ProfilePhotoSource } from '../components/profile/ProfilePhotoSourceSheet';
import { useFillProfileMutation, useUploadSingleMediaMutation } from '../store';
import { getApiErrorMessage } from '../utils/apiError';
import {
  CAMERA_PERMISSION_BLOCKED_CODE,
  openAppSettings,
} from '../utils/cameraPermission';
import {
  assetToUploadPayload,
  pickPhotoFromCamera,
  pickPhotoFromLibrary,
} from '../utils/pickProfilePhoto';
import { resolveUploadedAvatarUrl } from '../utils/resolveUploadedAvatarUrl';
import { toastError } from '../utils/toast';

type Source = ProfilePhotoSource;

export function useUploadProfileAvatar(options?: { onSuccess?: () => void }) {
  const onSuccessRef = useRef(options?.onSuccess);
  useEffect(() => {
    onSuccessRef.current = options?.onSuccess;
  }, [options?.onSuccess]);

  const [fillProfile] = useFillProfileMutation();
  const [uploadPhoto, { isLoading: uploadingPhoto }] =
    useUploadSingleMediaMutation();
  const [fillingProfile, setFillingProfile] = useState(false);
  const [pickBusy, setPickBusy] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [photoSourceSheetOpen, setPhotoSourceSheetOpen] = useState(false);

  const busy = pickBusy || uploadingPhoto || fillingProfile;

  const runFlow = useCallback(
    async (source: Source) => {
      if (busy) {
        return;
      }
      setPickBusy(true);
      let staged = false;
      try {
        const asset =
          source === 'library'
            ? await pickPhotoFromLibrary()
            : await pickPhotoFromCamera();
        if (!asset) {
          return;
        }
        const payload = assetToUploadPayload(asset);
        if (!payload) {
          toastError('Photo', 'Could not read this image.');
          return;
        }
        setPreviewUri(asset.uri ?? null);
        staged = true;

        const res = await uploadPhoto(payload).unwrap();
        const avatarUrl = resolveUploadedAvatarUrl(res.file);
        if (!avatarUrl) {
          toastError(
            'Photo',
            'Server did not return a public image URL. Set S3_PUBLIC_BASE_URL on the API.',
          );
          setPreviewUri(null);
          return;
        }

        setFillingProfile(true);
        try {
          await fillProfile({ avatarUrl }).unwrap();
        } finally {
          setFillingProfile(false);
        }

        setPreviewUri(null);
        onSuccessRef.current?.();
      } catch (e: unknown) {
        if (staged) {
          setPreviewUri(null);
        }
        const blocked =
          e instanceof Error && e.message === CAMERA_PERMISSION_BLOCKED_CODE;
        if (blocked) {
          Alert.alert(
            'Camera access',
            'Camera permission is off for Multiflix. You can turn it on in Settings.',
            [
              { text: 'Not now', style: 'cancel' },
              {
                text: 'Open Settings',
                onPress: () => {
                  openAppSettings().catch(() => {});
                },
              },
            ],
          );
        } else {
          toastError('Photo', getApiErrorMessage(e));
        }
      } finally {
        setPickBusy(false);
      }
    },
    [busy, uploadPhoto, fillProfile],
  );

  const closePhotoSourceSheet = useCallback(() => {
    setPhotoSourceSheetOpen(false);
  }, []);

  const onSelectPhotoSource = useCallback(
    (source: Source) => {
      runFlow(source).catch(() => {});
    },
    [runFlow],
  );

  const openChangePhotoPicker = useCallback(() => {
    if (busy) {
      return;
    }
    setPhotoSourceSheetOpen(true);
  }, [busy]);

  return {
    busy,
    previewUri,
    openChangePhotoPicker,
    photoSourceSheet: {
      visible: photoSourceSheetOpen,
      onClose: closePhotoSourceSheet,
      onSelectSource: onSelectPhotoSource,
    },
  };
}
