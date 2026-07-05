import { Alert, Platform, Share } from 'react-native';

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

export const exportCsv = async (filename: string, headers: string[], rows: any[][]) => {
  const csv = buildCsv(headers, rows);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.csv') ? filename : filename + '.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: csv,
  }).catch(() => {
    Alert.alert('CSV ready', 'CSV export is ready to share from this device.');
  });
};
