import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';

const emptyForm = { name: '', location: '', description: '' };

export default function VillasScreen() {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const [villas, setVillas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [villaData, userData] = await Promise.all([
        apiService.getVillas().catch(() => []),
        apiService.getUsers().catch(() => []),
      ]);
      setVillas(Array.isArray(villaData) ? villaData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const managers = useMemo(() => users.filter((user) => user.role === 'VILLA_MANAGER'), [users]);

  const createVilla = async () => {
    if (!form.name.trim()) {
      Alert.alert('Villa name required', 'Enter a villa name.');
      return;
    }
    setSaving(true);
    try {
      await apiService.createVilla({
        name: form.name.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      setForm(emptyForm);
      await loadData();
    } catch (e: any) {
      Alert.alert('Could not create villa', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteVilla = (villa: any) => {
    Alert.alert('Delete villa?', villa.name + ' and its villa data will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteVilla(villa.id);
            await loadData();
          } catch (e: any) {
            Alert.alert('Could not delete villa', e?.response?.data?.message || e?.message || 'Please try again.');
          }
        },
      },
    ]);
  };

  const assignManager = async (manager: any, villaId: number) => {
    try {
      await apiService.updateUser(manager.id, { role: 'VILLA_MANAGER', villaId });
      await loadData();
    } catch (e: any) {
      Alert.alert('Could not assign manager', e?.response?.data?.message || e?.message || 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Villas</Text>
        <Text style={styles.subtitle}>Create villas and assign Villa Managers.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Ionicons name="business-outline" size={22} color={theme.primary} />
            <Text style={styles.panelTitle}>Add Villa</Text>
          </View>
          <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Villa name" placeholderTextColor={theme.muted} />
          <TextInput style={styles.input} value={form.location} onChangeText={(location) => setForm({ ...form, location })} placeholder="Location" placeholderTextColor={theme.muted} />
          <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Notes" placeholderTextColor={theme.muted} multiline />
          <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={createVilla} disabled={saving}>
            <Text style={styles.primaryText}>{saving ? 'Saving...' : 'Create Villa'}</Text>
          </TouchableOpacity>
        </View>

        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : villas.map((villa) => (
          <View key={villa.id} style={styles.panel}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.villaName}>{villa.name}</Text>
                <Text style={styles.meta}>{villa.location || 'No location'}</Text>
              </View>
              <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVilla(villa)}>
                <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionLabel}>Villa Managers</Text>
            <View style={styles.managerWrap}>
              {managers.length === 0 ? <Text style={styles.emptyText}>No Villa Managers yet. Invite one from Villa Members.</Text> : managers.map((manager) => (
                <TouchableOpacity
                  key={manager.id}
                  style={[styles.managerChip, manager.villaId === villa.id && styles.managerChipActive]}
                  onPress={() => assignManager(manager, villa.id)}
                >
                  <Text style={[styles.managerText, manager.villaId === villa.id && styles.managerTextActive]}>{manager.fullName || manager.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: theme.muted, marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: theme.onPrimary, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  villaName: { color: theme.text, fontSize: 17, fontWeight: '900' },
  meta: { color: theme.muted, marginTop: 3 },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900' },
  sectionLabel: { color: theme.label, fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  managerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  managerChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  managerChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  managerText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  managerTextActive: { color: theme.onPrimary },
  emptyText: { color: theme.muted },
});
