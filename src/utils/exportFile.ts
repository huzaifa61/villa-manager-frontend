import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const parseFilename = (contentDisposition?: string, fallback: string) => {
  if (!contentDisposition) return fallback;
  const match = /filename="?([^";\n]+)"?/i.exec(contentDisposition);
  return match?.[1] || fallback;
};

export const saveExportBlob = async (
  blob: Blob,
  filename: string,
  mimeType: string,
) => {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    Alert.alert('Export failed', 'File storage is not available on this device.');
    return;
  }

  const fileUri = baseDirectory + filename;
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType,
      dialogTitle: filename,
    });
    return;
  }

  if (Platform.OS === 'ios') {
    await Share.share({ title: filename, url: fileUri }).catch(() => {
      Alert.alert('File saved', 'Saved at ' + fileUri);
    });
    return;
  }

  Alert.alert('File saved', 'Saved at ' + fileUri);
};

export const saveExportBytes = async (
  bytes: ArrayBuffer,
  filename: string,
  mimeType: string,
) => {
  const blob = new Blob([bytes], { type: mimeType });
  await saveExportBlob(blob, filename, mimeType);
};

export const saveExportFromResponse = async (
  data: ArrayBuffer,
  headers: Record<string, string>,
  fallbackFilename: string,
  mimeType: string,
) => {
  const filename = parseFilename(headers['content-disposition'], fallbackFilename);
  await saveExportBytes(data, filename, mimeType);
};
