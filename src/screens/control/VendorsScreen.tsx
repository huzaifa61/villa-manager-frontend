import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { exportCsv } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';
import { confirmAction } from '../../utils/confirm';

const emptyVendor = { name: '', contactPerson: '', phoneNumber: '', email: '', address: '', serviceType: '', region: '', isActive: true };

export default function VendorsScreen() {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || null;
  const styles = makeStyles(theme);
  const [vendors, setVendors] = useState<any[]>([]);
  const [villaRegion, setVillaRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyVendor);

  const loadVillaRegion = useCallback(async () => {
    if (!villaId) {
      setVillaRegion('');
      return;
    }
    try {
      const villas = await apiService.getVillas().catch(() => []);
      const villa = (Array.isArray(villas) ? villas : []).find((item: any) => item.id === villaId);
      setVillaRegion(villa?.region || '');
    } catch {
      setVillaRegion('');
    }
  }, [villaId]);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getVendors().catch(() => []);
      setVendors(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadVillaRegion();
    fetchVendors();
  }, [loadVillaRegion, fetchVendors]));

  const filtered = useMemo(() => vendors.filter((vendor) => {
    const haystack = [vendor.name, vendor.contactPerson, vendor.phoneNumber, vendor.email, vendor.address, vendor.serviceType, vendor.region].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [vendors, query]);

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...emptyVendor,
      region: permissions.isVillaManager ? villaRegion : '',
    });
    setShowForm(true);
  };

  const startEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      phoneNumber: vendor.phoneNumber || '',
      email: vendor.email || '',
      address: vendor.address || '',
      serviceType: vendor.serviceType || '',
      region: vendor.region || '',
      isActive: vendor.isActive !== false,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyVendor);
    setShowForm(false);
  };

  const saveVendor = async () => {
    if (!form.name.trim()) {
      Alert.alert('Name required', 'Please add the vendor name.');
      return;
    }
    const region = permissions.isVillaManager ? villaRegion : form.region.trim();
    if (!region) {
      Alert.alert('Location required', permissions.isVillaManager
        ? 'Your villa must have a location/region set before adding vendors.'
        : 'Please add the vendor location/region.');
      return;
    }
    try {
      const payload = { ...form, region };
      if (editingId) await apiService.updateVendor(editingId, payload);
      else await apiService.createVendor(payload);
      resetForm();
      await fetchVendors();
    } catch (error: any) {
      Alert.alert('Could not save', error?.response?.data?.error || error?.message || 'Please try again.');
    }
  };

  const deleteVendor = (vendor: any) => {
    confirmAction({
      title: 'Delete vendor?',
      message: vendor.name + ' will be removed.',
      onConfirm: async () => {
        await apiService.deleteVendor(vendor.id);
        await fetchVendors();
      },
    });
  };

  const exportVendors = async () => {
    const villaName = await getActiveVillaName(villaId);
    await exportCsv('vendors.csv',
      ['ID', 'Name', 'Contact Person', 'Phone', 'Email', 'Service Type', 'Location', 'Address', 'Active'],
      filtered.map((vendor) => [vendor.id, vendor.name, vendor.contactPerson, vendor.phoneNumber, vendor.email, vendor.serviceType, vendor.region, vendor.address, vendor.isActive !== false ? 'Yes' : 'No']),
      { title: 'Vendors', villaName });
  };

  if (!permissions.canManageVendors) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Vendors</Text>
            <Text style={styles.subtitle}>This section is available to villa managers.</Text>
          </View>
        </View>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
          <Text style={styles.emptyTitle}>Access restricted</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vendors</Text>
          <Text style={styles.subtitle}>{permissions.isGeneralManager ? 'Private provider directory.' : `Providers in ${villaRegion || 'your area'}.`}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.button} onPress={exportVendors}><Ionicons name="download-outline" size={17} color={theme.text} /><Text style={styles.buttonText}>CSV</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => (showForm ? resetForm() : openAddForm())}><Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color={theme.onPrimary} /><Text style={styles.primaryButtonText}>{showForm ? 'Close' : 'Add'}</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search vendors..." placeholderTextColor={theme.muted} />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? 'Edit Vendor' : 'Add Vendor'}</Text>
            <Text style={styles.label}>Location / Region *</Text>
            <TextInput
              style={[styles.input, permissions.isVillaManager && styles.inputDisabled]}
              value={permissions.isVillaManager ? villaRegion : form.region}
              onChangeText={(region) => setForm({ ...form, region })}
              placeholder="e.g. Marina, New Cairo"
              placeholderTextColor={theme.muted}
              editable={permissions.isGeneralManager}
            />
            {permissions.isVillaManager && !villaRegion ? (
              <Text style={styles.helperText}>Set your villa location/region first so vendors can be added to your area.</Text>
            ) : null}
            <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Name" placeholderTextColor={theme.muted} />
            <TextInput style={styles.input} value={form.serviceType} onChangeText={(serviceType) => setForm({ ...form, serviceType })} placeholder="Service type" placeholderTextColor={theme.muted} />
            <TextInput style={styles.input} value={form.contactPerson} onChangeText={(contactPerson) => setForm({ ...form, contactPerson })} placeholder="Contact person" placeholderTextColor={theme.muted} />
            <TextInput style={styles.input} value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} placeholder="Phone" placeholderTextColor={theme.muted} />
            <TextInput style={styles.input} value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder="Email" placeholderTextColor={theme.muted} autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textarea]} value={form.address} onChangeText={(address) => setForm({ ...form, address })} placeholder="Address / notes" placeholderTextColor={theme.muted} multiline />
            <TouchableOpacity style={styles.toggle} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
              <Ionicons name={form.isActive ? 'checkbox-outline' : 'square-outline'} size={22} color={theme.primary} />
              <Text style={styles.toggleText}>Active provider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveVendor}><Text style={styles.saveText}>Save Vendor</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={42} color={theme.muted} />
                <Text style={styles.emptyTitle}>No vendors found.</Text>
              </View>
            ) : filtered.map((vendor) => (
              <View key={vendor.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{vendor.name}</Text>
                    <Text style={styles.muted}>{vendor.serviceType || 'Service'} • {vendor.phoneNumber || 'No phone'}</Text>
                    {vendor.region ? <Text style={styles.muted}>Location: {vendor.region}</Text> : null}
                    {vendor.contactPerson ? <Text style={styles.muted}>Contact: {vendor.contactPerson}</Text> : null}
                  </View>
                  <Text style={[styles.badge, vendor.isActive === false && styles.inactiveBadge]}>{vendor.isActive === false ? 'Inactive' : 'Active'}</Text>
                </View>
                {vendor.email || vendor.address ? <Text style={styles.notes}>{[vendor.email, vendor.address].filter(Boolean).join('\n')}</Text> : null}
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => startEdit(vendor)}><Text style={styles.smallText}>Edit</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVendor(vendor)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: theme.muted, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  primaryButton: { backgroundColor: theme.primary },
  buttonText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  primaryButtonText: { color: theme.onPrimary, fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: theme.text, flex: 1, paddingVertical: 11 },
  panel: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 2 },
  label: { color: theme.muted, fontSize: 12, fontWeight: '800', marginBottom: 6 },
  helperText: { color: theme.danger, fontSize: 12, marginTop: -4, marginBottom: 4, lineHeight: 17 },
  input: { backgroundColor: theme.background, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10 },
  inputDisabled: { opacity: 0.75 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  toggleText: { color: theme.subtleText, fontWeight: '700' },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '900' },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 10 },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: theme.text, fontWeight: '900', fontSize: 16 },
  muted: { color: theme.muted, fontSize: 12, marginTop: 4 },
  badge: { color: '#D1FAE5', backgroundColor: '#065F46', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  inactiveBadge: { color: theme.dangerText, backgroundColor: '#4C1D1D' },
  notes: { color: theme.subtleText, marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: theme.subtleText, fontWeight: '800' },
  deleteButton: { backgroundColor: '#4C1D1D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: theme.dangerText, fontWeight: '900' },
});
