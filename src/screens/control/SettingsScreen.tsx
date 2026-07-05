import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';

const VILLA_ID = 1;
const LOCAL_KEY = 'villa-local-settings-v1';

export default function SettingsScreen() {
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
        apiService.getVilla(VILLA_ID).catch(() => null),
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
  }, []);

  useFocusEffect(useCallback(() => { loadSettings(); }, [loadSettings]));

  const saveSettings = async () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please enter the villa name.');
      return;
    }
    try {
      setSaving(true);
      await apiService.updateVilla(VILLA_ID, {
        name: form.name,
        location: form.location,
        description: form.description,
      });
      await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify({
        whatsappLink: form.whatsappLink,
        whatsappNotes: form.whatsappNotes,
        documentInstructions: form.documentInstructions,
      }));
      Alert.alert('Saved', 'Villa settings were updated.');
    } catch (error: any) {
      Alert.alert('Could not save', error?.response?.data?.error || error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetVilla = () => {
    if (confirmText !== 'RESET') {
      Alert.alert('Confirmation required', 'Type RESET before resetting villa data.');
      return;
    }
    Alert.alert('Reset villa data?', 'Expenses, payments, and service requests will be cleared. Apartments will be kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          await apiService.resetVillaData(VILLA_ID);
          setConfirmText('');
          Alert.alert('Reset complete', 'Villa data has been reset.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Villa details, instructions, and guarded actions.</Text>
      </View>
      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Ionicons name="home-outline" size={22} color="#10B981" />
              <Text style={styles.panelTitle}>Villa Settings</Text>
            </View>
            <Text style={styles.label}>Villa / Building Name</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Villa name" placeholderTextColor="#6B7280" />
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={form.location} onChangeText={(location) => setForm({ ...form, location })} placeholder="Address" placeholderTextColor="#6B7280" />
            <Text style={styles.label}>WhatsApp Group Link</Text>
            <TextInput style={styles.input} value={form.whatsappLink} onChangeText={(whatsappLink) => setForm({ ...form, whatsappLink })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor="#6B7280" autoCapitalize="none" />
            <Text style={styles.label}>WhatsApp Group Notes</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.whatsappNotes} onChangeText={(whatsappNotes) => setForm({ ...form, whatsappNotes })} placeholder="Sharing instructions" placeholderTextColor="#6B7280" multiline />
            <Text style={styles.label}>Document Instructions</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.documentInstructions} onChangeText={(documentInstructions) => setForm({ ...form, documentInstructions })} placeholder="Where large files should be stored" placeholderTextColor="#6B7280" multiline />
            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Villa notes" placeholderTextColor="#6B7280" multiline />
            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveSettings} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Villa Settings'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.danger}>
            <View style={styles.panelHeader}>
              <Ionicons name="warning-outline" size={22} color="#FBBF24" />
              <Text style={styles.dangerTitle}>Danger Zone</Text>
            </View>
            <Text style={styles.dangerText}>This clears expenses, payments, and service requests while keeping apartments. Download CSV exports first if you need a record.</Text>
            <TextInput style={styles.input} value={confirmText} onChangeText={setConfirmText} placeholder="Type RESET" placeholderTextColor="#6B7280" autoCapitalize="characters" />
            <TouchableOpacity style={styles.resetButton} onPress={resetVilla}>
              <Text style={styles.resetText}>Reset Villa Data</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 16 },
  panel: { backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  label: { color: '#A7F3D0', fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 10 },
  input: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 10, color: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 82, textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveText: { color: '#fff', fontWeight: '900' },
  disabled: { opacity: 0.6 },
  danger: { backgroundColor: '#1F171A', borderColor: '#7F1D1D', borderWidth: 1, borderRadius: 12, padding: 14 },
  dangerTitle: { color: '#FCA5A5', fontSize: 18, fontWeight: '900' },
  dangerText: { color: '#D1D5DB', lineHeight: 20, marginBottom: 10 },
  resetButton: { backgroundColor: '#7F1D1D', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  resetText: { color: '#FEE2E2', fontWeight: '900' },
});
