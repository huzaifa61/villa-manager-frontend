import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppPreferences } from '../context/AppPreferences';

type ExportButtonsProps = {
  onCsv: () => void;
  onPdf: () => void;
};

export default function ExportButtons({ onCsv, onPdf }: ExportButtonsProps) {
  const { theme, t, rowDirection } = useAppPreferences();
  const buttonStyle = [styles.button, { backgroundColor: theme.chip, borderColor: theme.border, flexDirection: rowDirection }];
  const labelStyle = [styles.label, { color: theme.text }];

  return (
    <View style={[styles.row, { flexDirection: rowDirection }]}>
      <TouchableOpacity style={buttonStyle} onPress={onPdf}>
        <Ionicons name="document-text-outline" size={17} color={theme.text} />
        <Text style={labelStyle}>{t('pdf')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={buttonStyle} onPress={onCsv}>
        <Ionicons name="download-outline" size={17} color={theme.text} />
        <Text style={labelStyle}>{t('csv')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, flexWrap: 'wrap' },
  button: {
    borderRadius: 10,
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '800' },
});
