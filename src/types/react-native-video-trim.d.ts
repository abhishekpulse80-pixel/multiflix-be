declare module 'react-native-video-trim' {
  export interface ShowEditorOptions {
    type?: 'video' | 'audio';
    outputExt?: string;
    maxDuration?: number;
    minDuration?: number;
    autoplay?: boolean;
    jumpToPositionOnLoad?: number;
    saveToPhoto?: boolean;
    openDocumentsOnFinish?: boolean;
    openShareSheetOnFinish?: boolean;
    removeAfterSavedToPhoto?: boolean;
    removeAfterFailedToSavePhoto?: boolean;
    removeAfterSavedToDocuments?: boolean;
    removeAfterFailedToSaveDocuments?: boolean;
    removeAfterShared?: boolean;
    removeAfterFailedToShare?: boolean;
    cancelButtonText?: string;
    saveButtonText?: string;
    trimmingText?: string;
    headerText?: string;
    headerTextSize?: number;
    headerTextColor?: string;
    trimmerColor?: string;
    handleIconColor?: string;
    fullScreenModalIOS?: boolean;
    enableCancelDialog?: boolean;
    cancelDialogTitle?: string;
    cancelDialogMessage?: string;
    cancelDialogCancelText?: string;
    cancelDialogConfirmText?: string;
    enableSaveDialog?: boolean;
    saveDialogTitle?: string;
    saveDialogMessage?: string;
    saveDialogCancelText?: string;
    saveDialogConfirmText?: string;
    enableCancelTrimming?: boolean;
    cancelTrimmingButtonText?: string;
    enableCancelTrimmingDialog?: boolean;
    enableHapticFeedback?: boolean;
    closeWhenFinish?: boolean;
    enablePreciseTrimming?: boolean;
    alertOnFailToLoad?: boolean;
    alertOnFailTitle?: string;
    alertOnFailMessage?: string;
    alertOnFailCloseText?: string;
  }

  export interface TrimOptions {
    startTime: number;
    endTime: number;
    enablePreciseTrimming?: boolean;
  }

  export function showEditor(
    videoPath: string,
    options?: ShowEditorOptions,
  ): void;

  export function trim(
    url: string,
    options: TrimOptions,
  ): Promise<string>;

  export function isValidFile(path: string): Promise<boolean>;
  export function listFiles(): Promise<string[]>;
  export function cleanFiles(): Promise<number>;
  export function deleteFile(filePath: string): Promise<boolean>;
  export function closeEditor(): void;
}
