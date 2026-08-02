import { Alert } from 'react-native';
import { saveExportFromResponse } from './exportFile';
import { exportCsv, exportCsvContent } from './csv';

export const PDF_MIME = 'application/pdf';

export type TableExportPayload = {
  fileName: string;
  title: string;
  sheetName?: string;
  headers: string[];
  rows: unknown[][];
};

export async function runBinaryExport(
  t: (key: string) => string,
  promise: () => Promise<{ data: ArrayBuffer; headers: Record<string, string> }>,
  fallbackFilename: string,
  mimeType: string,
) {
  try {
    const { data, headers } = await promise();
    await saveExportFromResponse(data, headers, fallbackFilename, mimeType);
  } catch (e: any) {
    Alert.alert(t('error'), e?.response?.data?.message || e?.message || t('exportFailed'));
  }
}

export async function runCsvExport(
  t: (key: string) => string,
  apiCsv: () => Promise<string>,
  fallback: {
    filename: string;
    headers: string[];
    rows: unknown[][];
    options?: { title?: string; villaName?: string };
  },
) {
  try {
    const csv = await apiCsv();
    await exportCsvContent(fallback.filename, csv);
  } catch {
    try {
      await exportCsv(
        fallback.filename,
        fallback.headers,
        fallback.rows,
        fallback.options,
      );
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || t('exportFailed'));
    }
  }
}

export function tableExportBaseName(filename: string) {
  return filename.replace(/\.csv$/i, '');
}
