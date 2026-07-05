import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Apartment {
  id: number;
  apartmentNumber: string;
  tenantName: string;
  phoneNumber: string;
  openingBalance: number;
  currentBalance: number;
  status: string;
}

const STATUS_COLORS: Record<string, string> = {
  OCCUPIED: '#10B981', ACTIVE: '#10B981',
  VACANT: '#EF4444', INACTIVE: '#EF4444',
  MAINTENANCE: '#F59E0B', UNDER_MAINTENANCE: '#F59E0B',
};

const ApartmentsScreen = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    unitNumber: '', floor: '1', tenantName: '',
    tenantPhone: '', monthlyRent: '', status: 'OCCUPIED',
  });

  const fetchApartments = async () => {
    try {
      setLoading(true);
      const data = await apiService.getApartments(1);
      setApartments(Array.isArray(data) ? data : []);
    } catch (e) { setApartments([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchApartments(); }, []);

  const handleAdd = async () => {
    if (!form.unitNumber || !form.monthlyRent) {
      Alert.alert('Error', 'Unit number and monthly rent are required');
      return;
    }
    setSaving(true);
    try {
      await apiService.createApartment(1, {
        unitNumber: form.unitNumber,
        floor: parseInt(form.floor) || 1,
        tenantName: form.tenantName,
        tenantPhone: form.tenantPhone,
        monthlyRent: parseFloat(form.monthlyRent),
        status: form.status,
      });
      setModalVisible(false);
      setForm({ unitNumber: '', floor: '1', tenantName: '', tenantPhone: '', monthlyRent: '', status: 'OCCUPIED' });
      await fetchApartments();
      Alert.alert('✅ Success', 'Apartment added!');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to add apartment');
    } finally { setSaving(false); }
  };

  const renderItem = ({ item }: { item: Apartment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.unitNumber}>Unit {item.apartmentNumber}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      {item.tenantName ? <Text style={styles.tenant}>👤 {item.tenantName}</Text> : <Text style={styles.noTenant}>No Tenant</Text>}
      {item.phoneNumber ? <Text style={styles.phone}>📞 {item.phoneNumber}</Text> : null}
      <View style={styles.balanceRow}>
        <Text style={styles.rent}>EGP {Number(item.openingBalance || 0).toLocaleString()}/mo</Text>
        <Text style={styles.balance}>Balance: EGP {Number(item.currentBalance || 0).toLocaleString()}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Apartments ({apartments.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        apartments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={64} color="#374151" />
            <Text style={styles.emptyText}>No apartments yet</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addFirstText}>+ Add First Apartment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList data={apartments} renderItem={renderItem} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16 }} />
        )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Add Apartment</Text>
              <Text style={styles.label}>Unit Number *</Text>
              <TextInput style={styles.input} placeholder="e.g. 101, A1, B2" placeholderTextColor="#6B7280" value={form.unitNumber} onChangeText={(v) => setForm({ ...form, unitNumber: v })} />
              <Text style={styles.label}>Floor</Text>
              <TextInput style={styles.input} placeholder="1" placeholderTextColor="#6B7280" value={form.floor} onChangeText={(v) => setForm({ ...form, floor: v })} keyboardType="numeric" />
              <Text style={styles.label}>Tenant Name</Text>
              <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#6B7280" value={form.tenantName} onChangeText={(v) => setForm({ ...form, tenantName: v })} />
              <Text style={styles.label}>Tenant Phone</Text>
              <TextInput style={styles.input} placeholder="050 123 4567" placeholderTextColor="#6B7280" value={form.tenantPhone} onChangeText={(v) => setForm({ ...form, tenantPhone: v })} keyboardType="phone-pad" />
              <Text style={styles.label}>Monthly Rent (EGP) *</Text>
              <TextInput style={styles.input} placeholder="5000" placeholderTextColor="#6B7280" value={form.monthlyRent} onChangeText={(v) => setForm({ ...form, monthlyRent: v })} keyboardType="decimal-pad" />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {[['OCCUPIED', '#10B981'], ['VACANT', '#EF4444'], ['MAINTENANCE', '#F59E0B']].map(([s, c]) => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, form.status === s && { backgroundColor: c, borderColor: c }]} onPress={() => setForm({ ...form, status: s })}>
                    <Text style={[styles.statusText, form.status === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleAdd} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Add Apartment</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#10B981', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unitNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  tenant: { color: '#E5E7EB', fontSize: 14, marginBottom: 4 },
  noTenant: { color: '#6B7280', fontSize: 13, marginBottom: 4 },
  phone: { color: '#9CA3AF', fontSize: 13, marginBottom: 6 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  rent: { color: '#10B981', fontSize: 14, fontWeight: '600' },
  balance: { color: '#9CA3AF', fontSize: 13 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, marginBottom: 24 },
  addFirstBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  addFirstText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  label: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#374151', borderRadius: 10, padding: 14, color: '#fff', marginBottom: 4, fontSize: 15, borderWidth: 1, borderColor: '#4B5563' },
  statusRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statusBtn: { flex: 1, borderRadius: 10, padding: 10, backgroundColor: '#374151', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' },
  statusText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#10B981', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default ApartmentsScreen;
