declare module 'expo-image-picker' {
  export const MediaTypeOptions: {
    Images: string;
    Videos: string;
    All: string;
  };

  export interface ImagePickerResult {
    canceled: boolean;
    assets: Array<{ uri: string; width: number; height: number; fileSize?: number }>;
  }

  export function launchImageLibraryAsync(options?: {
    mediaTypes?: string;
    allowsEditing?: boolean;
    quality?: number;
  }): Promise<ImagePickerResult>;
}
