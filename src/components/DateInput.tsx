import React, { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAppPreferences } from '../context/AppPreferences';

export function parseDateValue(value: string): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatDateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type DateInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: StyleProp<TextStyle>;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
};

function flattenInputStyle(style?: StyleProp<TextStyle>): TextStyle {
  return StyleSheet.flatten(style) || {};
}

export default function DateInput({
  value,
  onChange,
  placeholder = 'YYYY-MM-DD',
  style,
  minimumDate,
  maximumDate,
  clearable = false,
}: DateInputProps) {
  const { theme } = useAppPreferences();
  const [showPicker, setShowPicker] = useState(false);
  const pickerDate = parseDateValue(value);

  const handleNativeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) onChange(formatDateValue(selectedDate));
  };

  if (Platform.OS === 'web') {
    const flatStyle = flattenInputStyle(style);
    const webStyle = {
      width: '100%',
      backgroundColor: String(flatStyle.backgroundColor || theme.input),
      borderRadius: Number(flatStyle.borderRadius || 8),
      padding: Number(flatStyle.padding || 12),
      color: String(flatStyle.color || theme.text),
      fontSize: Number(flatStyle.fontSize || 15),
      border: `1px solid ${String(flatStyle.borderColor || theme.border)}`,
      boxSizing: 'border-box' as const,
      marginBottom: flatStyle.marginBottom,
      colorScheme: theme.mode,
    };

    return React.createElement('input', {
      type: 'date',
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      style: webStyle,
    });
  }

  const flatStyle = flattenInputStyle(style);

  return (
    <View>
      <TouchableOpacity
        style={[
          styles.field,
          {
            backgroundColor: flatStyle.backgroundColor || theme.input,
            borderColor: flatStyle.borderColor || theme.border,
            borderWidth: flatStyle.borderWidth ?? 1,
            borderRadius: flatStyle.borderRadius ?? 8,
            padding: flatStyle.padding,
            paddingHorizontal: flatStyle.paddingHorizontal,
            paddingVertical: flatStyle.paddingVertical,
            marginBottom: flatStyle.marginBottom,
          },
        ]}
        onPress={() => setShowPicker(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.fieldText, { color: value ? theme.text : theme.muted, fontSize: flatStyle.fontSize || 15 }]}>
          {value || placeholder}
        </Text>
        <View style={styles.icons}>
          {clearable && value ? (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onChange('');
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={theme.muted} />
            </TouchableOpacity>
          ) : null}
          <Ionicons name="calendar-outline" size={20} color={theme.muted} />
        </View>
      </TouchableOpacity>

      {Platform.OS === 'ios' ? (
        <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
          <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
            <Pressable style={[styles.modalCard, { backgroundColor: theme.card }]} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={{ color: theme.muted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={{ color: theme.primary, fontWeight: '600' }}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickerDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) onChange(formatDateValue(date));
                }}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                themeVariant={theme.mode}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pickerDate}
          mode="date"
          display="default"
          onChange={handleNativeChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fieldText: { flex: 1 },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
});
