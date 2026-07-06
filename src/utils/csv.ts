import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const cleanCell = (value: any) => {
  const text = value == null ? '' : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
};

export const buildCsv = (headers: string[], rows: any[][]) => {
  const content = [
    headers.map(cleanCell).join(','),
    ...rows.map((row) => row.map(cleanCell).join(',')),
  ].join('\n');
  return '\ufeff' + content;
};

export const exportCsvContent = async (filename: string, csv: string) => {
  const safeFilename = filename.endsWith('.csv') ? filename : filename + '.csv';

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
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

  const fileUri = baseDirectory + safeFilename;
  await FileSystem.writeAsStringAsync(fileUri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: safeFilename,
      UTI: 'public.comma-separated-values-text',
    });
    return;
  }

  if (Platform.OS === 'ios') {
    await Share.share({ title: safeFilename, url: fileUri }).catch(() => {
      Alert.alert('CSV saved', 'CSV file saved at ' + fileUri);
    });
    return;
  }

  Alert.alert('CSV saved', 'CSV file saved at ' + fileUri);
};

export const exportCsv = async (filename: string, headers: string[], rows: any[][]) => {
  await exportCsvContent(filename, buildCsv(headers, rows));
};
