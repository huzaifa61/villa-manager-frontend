import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { AppLanguage, AppThemeMode, useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';

const VILLA_ID = 1;
const LOCAL_KEY = 'villa-local-settings-v1';

export default function SettingsScreen() {
  const { language, themeMode, theme, textAlign, rowDirection, direction, setLanguage, setThemeMode, t } = useAppPreferences();
  const { user } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = user?.villaId || VILLA_ID;
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [form, setForm] = useState({
    name: '',
    location: '',
    description: '',
    whatsappLink: '',
    whatsappNotes: '',
    documentInstructions: '',
  });

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const [villa, local] = await Promise.all([
        apiService.getVilla(villaId).catch(() => null),
        AsyncStorage.getItem(LOCAL_KEY),
      ]);
      const localData = local ? JSON.parse(local) : {};
      setForm({
        name: villa?.name || 'Villa',
        location: villa?.location || '',
        description: villa?.description || '',
        whatsappLink: localData.whatsappLink || '',
        whatsappNotes: localData.whatsappNotes || '',
        documentInstructions: localData.documentInstructions || '',
      });
    } finally {
      setLoading(false);
    }
  }, [villaId]);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const saveSettings = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('nameRequired'), t('nameRequiredBody'));
      return;
    }
    try {
      setSaving(true);
      await apiService.updateVilla(villaId, {
        name: form.name,
        location: form.location,
        description: form.description,
      });
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify({
        whatsappLink: form.whatsappLink,
        whatsappNotes: form.whatsappNotes,
        documentInstructions: form.documentInstructions,
      }));
      Alert.alert(t('saved'), t('savedBody'));
    } catch (error: any) {
      Alert.alert(t('couldNotSave'), error?.response?.data?.error || error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetVilla = () => {
    if (confirmText !== 'RESET') {
      Alert.alert(t('confirmationRequired'), t('confirmationBody'));
      return;
    }
    Alert.alert(t('resetQuestion'), t('resetBody'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('reset'),
        style: 'destructive',
        onPress: async () => {
          await apiService.resetVillaData(villaId);
          setConfirmText('');
          Alert.alert(t('resetComplete'), t('resetCompleteBody'));
        },
      },
    ]);
  };

  const preferenceButton = <T extends AppLanguage | AppThemeMode>(
    value: T,
    activeValue: T,
    label: string,
    onPress: (value: T) => void,
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.preferenceButton, value === activeValue && styles.preferenceButtonActive]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.preferenceText, value === activeValue && styles.preferenceTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('settings')}</Text>
        <Text style={styles.subtitle}>{t('settingsSubtitle')}</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="color-palette-outline" size={22} color={theme.primary} />
              <Text style={styles.panelTitle}>{t('appearance')}</Text>
            </View>
            <Text style={styles.label}>{t('language')}</Text>
            <View style={styles.preferenceRow}>
              {preferenceButton('en', language, t('english'), (value) => setLanguage(value))}
              {preferenceButton('ar', language, t('arabic'), (value) => setLanguage(value))}
            </View>
            <Text style={styles.label}>{t('theme')}</Text>
            <View style={styles.preferenceRow}>
              {preferenceButton('dark', themeMode, t('dark'), (value) => setThemeMode(value))}
              {preferenceButton('light', themeMode, t('light'), (value) => setThemeMode(value))}
            </View>
          </View>

          {permissions.canManageVilla ? <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="home-outline" size={22} color={theme.primary} />
              <Text style={styles.panelTitle}>{t('villaSettings')}</Text>
            </View>
            <Text style={styles.label}>{t('villaName')}</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={t('villaNamePlaceholder')} placeholderTextColor={theme.muted} />
            <Text style={styles.label}>{t('address')}</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(location) => setForm({ ...form, location })} placeholder={t('address')} placeholderTextColor={theme.muted} />
            <Text style={styles.label}>{t('whatsappLink')}</Text>
            <TextInput style={styles.input} value={form.whatsappLink} onChangeText={(whatsappLink) => setForm({ ...form, whatsappLink })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={theme.muted} autoCapitalize="none" />
            <Text style={styles.label}>{t('whatsappNotes')}</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.whatsappNotes} onChangeText={(whatsappNotes) => setForm({ ...form, whatsappNotes })} placeholder={t('sharingInstructions')} placeholderTextColor={theme.muted} multiline />
            <Text style={styles.label}>{t('documentInstructions')}</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.documentInstructions} onChangeText={(documentInstructions) => setForm({ ...form, documentInstructions })} placeholder={t('documentStoragePlaceholder')} placeholderTextColor={theme.muted} multiline />
            <Text style={styles.label}>{t('notes')}</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder={t('villaNotesPlaceholder')} placeholderTextColor={theme.muted} multiline />
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveSettings} disabled={saving}>
              <Text style={styles.saveText}>{saving ? t('saving') : t('saveVillaSettings')}</Text>
            </TouchableOpacity>
          </View> : null}

          {permissions.canManageVilla ? <View style={styles.danger}>
            <View style={styles.panelHeader}>
              <Ionicons name="warning-outline" size={22} color={theme.warning} />
              <Text style={styles.dangerTitle}>{t('dangerZone')}</Text>
            </View>
            <Text style={styles.dangerText}>{t('dangerText')}</Text>
            <TextInput style={styles.input} value={confirmText} onChangeText={setConfirmText} placeholder={t('typeReset')} placeholderTextColor={theme.muted} autoCapitalize="characters" />
            <TouchableOpacity style={styles.resetButton} onPress={resetVilla}>
              <Text style={styles.resetText}>{t('resetVillaData')}</Text>
            </TouchableOpacity>
          </View> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold', textAlign, writingDirection: direction },
  subtitle: { color: theme.muted, marginTop: 4, textAlign, writingDirection: direction },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { flexDirection: rowDirection, gap: 8, alignItems: 'center', marginBottom: 12 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', textAlign, writingDirection: direction },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 10, textAlign, writingDirection: direction },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, textAlign, writingDirection: direction },
  textarea: { minHeight: 82, textAlignVertical: 'top' },
  preferenceRow: { flexDirection: rowDirection, gap: 10 },
  preferenceButton: { flex: 1, backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  preferenceButtonActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  preferenceText: { color: theme.text, fontWeight: '800' },
  preferenceTextActive: { color: theme.onPrimary },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveText: { color: theme.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  danger: { backgroundColor: theme.dangerPanel, borderColor: theme.dangerBorder, borderWidth: 1, borderRadius: 12, padding: 14 },
  dangerTitle: { color: theme.dangerText, fontSize: 18, fontWeight: '900', textAlign, writingDirection: direction },
  dangerText: { color: theme.subtleText, lineHeight: 20, marginBottom: 10, textAlign, writingDirection: direction },
  resetButton: { backgroundColor: theme.dangerBorder, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  resetText: { color: '#FEE2E2', fontWeight: '900' },
});
