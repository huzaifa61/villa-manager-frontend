import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';

const EGYPT_REGIONS = [
  'Cairo', 'Giza', 'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef',
  'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Ismailia', 'Kafr El Sheikh',
  'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai',
  'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag',
  'South Sinai', 'Suez',
];
const PROPERTY_TYPES = ['VILLA', 'BUILDING'];
const emptyForm = { name: '', propertyType: 'VILLA', propertyNumber: '', region: '', whatsappLink: '', location: '', description: '' };

export default function VillasScreen() {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const [villas, setVillas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [showRegionDD, setShowRegionDD] = useState(false);
  const [editingVilla, setEditingVilla] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditTypeDD, setShowEditTypeDD] = useState(false);
  const [showEditRegionDD, setShowEditRegionDD] = useState(false);

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

  const managers = useMemo(() => users.filter((u) => u.role === 'VILLA_MANAGER' || u.role === 'BUILDING_MANAGER'), [users]);

  const createVilla = async () => {
    if (!form.name.trim()) { Alert.alert('Name required', 'Enter a property name.'); return; }
    if (!form.region) { Alert.alert('Region required', 'Please select a region.'); return; }
    setSaving(true);
    try {
      await apiService.createVilla({
        name: form.name.trim(),
        propertyType: form.propertyType,
        propertyNumber: form.propertyNumber.trim(),
        region: form.region,
        whatsappLink: form.whatsappLink.trim(),
        location: form.location.trim(),
        description: form.description.trim(),
      });
      setForm(emptyForm);
      await loadData();
      Alert.alert('Success', 'Property created successfully!');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally { setSaving(false); }
  };

  const startEdit = (villa: any) => {
    setEditingVilla(villa);
    setEditForm({ name: villa.name || '', propertyType: villa.propertyType || 'VILLA', propertyNumber: villa.propertyNumber || '', region: villa.region || '', whatsappLink: villa.whatsappLink || '', location: villa.location || '', description: villa.description || '' });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { Alert.alert('Name required'); return; }
    setEditSaving(true);
    try {
      await apiService.updateVilla(editingVilla.id, editForm);
      setEditingVilla(null); setEditForm(null);
      await loadData();
      Alert.alert('Success', 'Property updated!');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally { setEditSaving(false); }
  };

  const deleteVilla = (villa: any) => {
    Alert.alert('Delete property?', villa.name + ' and all its data will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await apiService.deleteVilla(villa.id); await loadData(); }
        catch (e: any) { Alert.alert('Error', e?.response?.data?.message || e?.message); }
      }},
    ]);
  };

  const assignManager = async (manager: any, villaId: number) => {
    try { await apiService.updateUser(manager.id, { villaId }); await loadData(); }
    catch (e: any) { Alert.alert('Error', e?.response?.data?.message || e?.message); }
  };

  const openWhatsApp = (link: string) => {
    if (link) Linking.openURL(link).catch(() => Alert.alert('Error', 'Could not open link.'));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Properties</Text>
        <Text style={styles.subtitle}>Manage villas and buildings.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>

        {/* CREATE FORM */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Ionicons name="business-outline" size={22} color={theme.primary} />
            <Text style={styles.panelTitle}>Add Property</Text>
          </View>

          <Text style={styles.label}>Type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDD(!showTypeDD)}>
            <Text style={styles.dropdownText}>{form.propertyType}</Text>
            <Ionicons name={showTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
          </TouchableOpacity>
          {showTypeDD && <View style={styles.dropdownMenu}>
            {PROPERTY_TYPES.map((t) => <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setForm({ ...form, propertyType: t }); setShowTypeDD(false); }}>
              <Text style={[styles.dropdownItemText, form.propertyType === t && { color: theme.primary, fontWeight: '900' }]}>{t}</Text>
            </TouchableOpacity>)}
          </View>}

          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder={form.propertyType === 'VILLA' ? 'Villa name' : 'Building name'} placeholderTextColor={theme.muted} />

          <Text style={styles.label}>{form.propertyType === 'VILLA' ? 'Villa Number' : 'Building Number'}</Text>
          <TextInput style={styles.input} value={form.propertyNumber} onChangeText={(v) => setForm({ ...form, propertyNumber: v })} placeholder="e.g. V-101" placeholderTextColor={theme.muted} />

          <Text style={styles.label}>Region *</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowRegionDD(!showRegionDD)}>
            <Text style={[styles.dropdownText, !form.region && { color: theme.muted }]}>{form.region || 'Select region'}</Text>
            <Ionicons name={showRegionDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
          </TouchableOpacity>
          {showRegionDD && <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
            {EGYPT_REGIONS.map((r) => <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setForm({ ...form, region: r }); setShowRegionDD(false); }}>
              <Text style={[styles.dropdownItemText, form.region === r && { color: theme.primary, fontWeight: '900' }]}>{r}</Text>
            </TouchableOpacity>)}
          </ScrollView>}

          <Text style={styles.label}>WhatsApp Group Link</Text>
          <TextInput style={styles.input} value={form.whatsappLink} onChangeText={(v) => setForm({ ...form, whatsappLink: v })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={theme.muted} autoCapitalize="none" />

          <Text style={styles.label}>Location / Address</Text>
          <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholder="Address" placeholderTextColor={theme.muted} />

          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Additional notes..." placeholderTextColor={theme.muted} multiline />

          <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={createVilla} disabled={saving}>
            {saving && <ActivityIndicator size="small" color={theme.onPrimary} />}
            <Text style={styles.primaryText}>{saving ? 'Creating...' : `Create ${form.propertyType === 'VILLA' ? 'Villa' : 'Building'}`}</Text>
          </TouchableOpacity>
        </View>

        {/* VILLA LIST */}
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : villas.map((villa) => (
          <View key={villa.id} style={styles.panel}>
            {editingVilla?.id === villa.id ? (
              <View>
                <Text style={styles.panelTitle}>Edit Property</Text>
                <Text style={styles.label}>Type</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowEditTypeDD(!showEditTypeDD)}>
                  <Text style={styles.dropdownText}>{editForm.propertyType}</Text>
                  <Ionicons name={showEditTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
                </TouchableOpacity>
                {showEditTypeDD && <View style={styles.dropdownMenu}>
                  {PROPERTY_TYPES.map((t) => <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setEditForm({ ...editForm, propertyType: t }); setShowEditTypeDD(false); }}>
                    <Text style={[styles.dropdownItemText, editForm.propertyType === t && { color: theme.primary, fontWeight: '900' }]}>{t}</Text>
                  </TouchableOpacity>)}
                </View>}
                <Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} placeholderTextColor={theme.muted} />
                <Text style={styles.label}>Number</Text>
                <TextInput style={styles.input} value={editForm.propertyNumber} onChangeText={(v) => setEditForm({ ...editForm, propertyNumber: v })} placeholderTextColor={theme.muted} />
                <Text style={styles.label}>Region</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowEditRegionDD(!showEditRegionDD)}>
                  <Text style={[styles.dropdownText, !editForm.region && { color: theme.muted }]}>{editForm.region || 'Select region'}</Text>
                  <Ionicons name={showEditRegionDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
                </TouchableOpacity>
                {showEditRegionDD && <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
                  {EGYPT_REGIONS.map((r) => <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setEditForm({ ...editForm, region: r }); setShowEditRegionDD(false); }}>
                    <Text style={[styles.dropdownItemText, editForm.region === r && { color: theme.primary, fontWeight: '900' }]}>{r}</Text>
                  </TouchableOpacity>)}
                </ScrollView>}
                <Text style={styles.label}>WhatsApp Group Link</Text>
                <TextInput style={styles.input} value={editForm.whatsappLink} onChangeText={(v) => setEditForm({ ...editForm, whatsappLink: v })} placeholderTextColor={theme.muted} autoCapitalize="none" />
                <Text style={styles.label}>Location</Text>
                <TextInput style={styles.input} value={editForm.location} onChangeText={(v) => setEditForm({ ...editForm, location: v })} placeholderTextColor={theme.muted} />
                <Text style={styles.label}>Notes</Text>
                <TextInput style={[styles.input, styles.textarea]} value={editForm.description} onChangeText={(v) => setEditForm({ ...editForm, description: v })} placeholderTextColor={theme.muted} multiline />
                <View style={[styles.row, { gap: 8, marginTop: 4 }]}>
                  <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, editSaving && { opacity: 0.6 }]} onPress={saveEdit} disabled={editSaving}>
                    <Text style={styles.primaryText}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditingVilla(null)}>
                    <Text style={styles.secondaryText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View>
                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <View style={[styles.row, { marginBottom: 4 }]}>
                      <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{villa.propertyType || 'VILLA'}</Text></View>
                      {villa.propertyNumber ? <Text style={styles.numberText}>#{villa.propertyNumber}</Text> : null}
                    </View>
                    <Text style={styles.villaName}>{villa.name}</Text>
                    {villa.region ? <View style={styles.infoRow}><Ionicons name="location-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.region}</Text></View> : null}
                    {villa.location ? <View style={styles.infoRow}><Ionicons name="map-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.location}</Text></View> : null}
                    {villa.whatsappLink ? <TouchableOpacity style={styles.infoRow} onPress={() => openWhatsApp(villa.whatsappLink)}>
                      <Ionicons name="logo-whatsapp" size={13} color="#25D366" /><Text style={[styles.meta, { color: '#25D366' }]}>WhatsApp Group</Text>
                    </TouchableOpacity> : null}
                  </View>
                  <View style={{ gap: 8 }}>
                    <TouchableOpacity style={styles.editButton} onPress={() => startEdit(villa)}>
                      <Ionicons name="pencil-outline" size={15} color={theme.primary} /><Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVilla(villa)}>
                      <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} /><Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={styles.sectionLabel}>Assigned Managers</Text>
                <View style={styles.managerWrap}>
                  {managers.length === 0 ? <Text style={styles.emptyText}>No managers yet. Invite from Villa Members.</Text> : managers.map((manager) => (
                    <TouchableOpacity key={manager.id} style={[styles.managerChip, manager.villaId === villa.id && styles.managerChipActive]} onPress={() => assignManager(manager, villa.id)}>
                      <Text style={[styles.managerText, manager.villaId === villa.id && styles.managerTextActive]}>{manager.fullName || manager.email}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
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
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 4 },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  dropdown: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: theme.text, fontSize: 15 },
  dropdownMenu: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, marginBottom: 8, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 14 },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  primaryText: { color: theme.onPrimary, fontWeight: '900' },
  secondaryButton: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: theme.text, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: theme.primary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '900' },
  numberText: { color: theme.muted, fontSize: 13 },
  villaName: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { color: theme.muted, fontSize: 13 },
  editButton: { backgroundColor: theme.primary + '22', borderColor: theme.primary + '44', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { color: theme.primary, fontWeight: '900', fontSize: 13 },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900', fontSize: 13 },
  sectionLabel: { color: theme.label, fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  managerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  managerChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  managerChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  managerText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  managerTextActive: { color: theme.onPrimary },
  emptyText: { color: theme.muted, fontSize: 13 },
});
