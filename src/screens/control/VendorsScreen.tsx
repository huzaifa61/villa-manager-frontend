import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { exportCsv } from '../../utils/csv';

const emptyVendor = { name: '', contactPerson: '', phoneNumber: '', email: '', address: '', serviceType: '', isActive: true };

export default function VendorsScreen() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyVendor);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getVendors().catch(() => []);
      setVendors(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchVendors(); }, [fetchVendors]));

  const filtered = useMemo(() => vendors.filter((vendor) => {
    const haystack = [vendor.name, vendor.contactPerson, vendor.phoneNumber, vendor.email, vendor.address, vendor.serviceType].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [vendors, query]);

  const startEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      phoneNumber: vendor.phoneNumber || '',
      email: vendor.email || '',
      address: vendor.address || '',
      serviceType: vendor.serviceType || '',
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
    try {
      if (editingId) await apiService.updateVendor(editingId, form);
      else await apiService.createVendor(form);
      resetForm();
      await fetchVendors();
    } catch (error: any) {
      Alert.alert('Could not save', error?.response?.data?.error || error?.message || 'Please try again.');
    }
  };

  const deleteVendor = (vendor: any) => {
    Alert.alert('Delete vendor?', vendor.name + ' will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiService.deleteVendor(vendor.id);
          await fetchVendors();
        },
      },
    ]);
  };

  const exportVendors = () => exportCsv('vendors.csv',
    ['ID', 'Name', 'Contact Person', 'Phone', 'Email', 'Service Type', 'Address', 'Active'],
    filtered.map((vendor) => [vendor.id, vendor.name, vendor.contactPerson, vendor.phoneNumber, vendor.email, vendor.serviceType, vendor.address, vendor.isActive !== false ? 'Yes' : 'No']));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vendors</Text>
          <Text style={styles.subtitle}>Private provider directory.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.button} onPress={exportVendors}><Ionicons name="download-outline" size={17} color="#fff" /><Text style={styles.buttonText}>CSV</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => setShowForm(!showForm)}><Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color="#fff" /><Text style={styles.buttonText}>{showForm ? 'Close' : 'Add'}</Text></TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search vendors..." placeholderTextColor="#6B7280" />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? 'Edit Vendor' : 'Add Vendor'}</Text>
            <TextInput style={styles.input} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder="Name" placeholderTextColor="#6B7280" />
            <TextInput style={styles.input} value={form.serviceType} onChangeText={(serviceType) => setForm({ ...form, serviceType })} placeholder="Service type" placeholderTextColor="#6B7280" />
            <TextInput style={styles.input} value={form.contactPerson} onChangeText={(contactPerson) => setForm({ ...form, contactPerson })} placeholder="Contact person" placeholderTextColor="#6B7280" />
            <TextInput style={styles.input} value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} placeholder="Phone" placeholderTextColor="#6B7280" />
            <TextInput style={styles.input} value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder="Email" placeholderTextColor="#6B7280" autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textarea]} value={form.address} onChangeText={(address) => setForm({ ...form, address })} placeholder="Address / notes" placeholderTextColor="#6B7280" multiline />
            <TouchableOpacity style={styles.toggle} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
              <Ionicons name={form.isActive ? 'checkbox-outline' : 'square-outline'} size={22} color="#10B981" />
              <Text style={styles.toggleText}>Active provider</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveVendor}><Text style={styles.saveText}>Save Vendor</Text></TouchableOpacity>
          </View>
        ) : null}

        {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> : (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={42} color="#6B7280" />
                <Text style={styles.emptyTitle}>No vendors found.</Text>
              </View>
            ) : filtered.map((vendor) => (
              <View key={vendor.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{vendor.name}</Text>
                    <Text style={styles.muted}>{vendor.serviceType || 'Service'} • {vendor.phoneNumber || 'No phone'}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  primaryButton: { backgroundColor: '#10B981' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: '#fff', flex: 1, paddingVertical: 11 },
  panel: { backgroundColor: '#1F2937', borderRadius: 12, borderColor: '#374151', borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 2 },
  input: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 10, color: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  toggleText: { color: '#D1D5DB', fontWeight: '700' },
  saveButton: { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 10 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, borderColor: '#374151', borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  muted: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  badge: { color: '#D1FAE5', backgroundColor: '#065F46', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  inactiveBadge: { color: '#FCA5A5', backgroundColor: '#4C1D1D' },
  notes: { color: '#D1D5DB', marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: '#E5E7EB', fontWeight: '800' },
  deleteButton: { backgroundColor: '#4C1D1D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: '#FCA5A5', fontWeight: '900' },
});
