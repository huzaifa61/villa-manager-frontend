import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Payment {
  id: number;
  amount: number;
  paymentDate: string;
  month: string;
  year: number;
  status: string;
  apartmentUnitNumber: string;
  tenantName: string;
  notes: string;
}

const STATUS_COLORS: Record<string, string> = { PAID: '#10B981', PENDING: '#F59E0B', OVERDUE: '#EF4444' };

const PaymentsScreen = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ apartmentId: '', amount: '', month: '', year: new Date().getFullYear().toString(), notes: '', status: 'PAID' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, a] = await Promise.all([apiService.getPayments(1), apiService.getApartments(1)]);
      setPayments(Array.isArray(p) ? p : []);
      setApartments(Array.isArray(a) ? a : []);
    } catch { setPayments([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async () => {
    if (!form.apartmentId || !form.amount || !form.month) { Alert.alert('Error', 'Apartment, amount and month are required'); return; }
    try {
      await apiService.createPayment(1, parseInt(form.apartmentId), { amount: parseFloat(form.amount), month: form.month, year: parseInt(form.year), notes: form.notes, status: form.status });
      setModalVisible(false);
      setForm({ apartmentId: '', amount: '', month: '', year: new Date().getFullYear().toString(), notes: '', status: 'PAID' });
      fetchData();
      Alert.alert('Success', 'Payment recorded!');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to record payment'); }
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const renderItem = ({ item }: { item: Payment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.unit}>Unit {item.apartmentUnitNumber}</Text>
          <Text style={styles.tenant}>{item.tenantName || ''}</Text>
        </View>
        <View>
          <Text style={styles.amount}>EGP {item.amount?.toLocaleString()}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.date}>{item.month} {item.year}</Text>
      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Payments ({payments.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        payments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>No payments yet</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addFirstText}>Record Payment</Text>
            </TouchableOpacity>
          </View>
        ) : <FlatList data={payments} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ padding: 16 }} />}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Record Payment</Text>

            <Text style={styles.label}>Apartment</Text>
            <View style={styles.pickerRow}>
              {apartments.map((a) => (
                <TouchableOpacity key={a.id} style={[styles.pickerBtn, form.apartmentId === String(a.id) && styles.pickerBtnActive]} onPress={() => setForm({ ...form, apartmentId: String(a.id), amount: String(a.monthlyRent || '') })}>
                  <Text style={[styles.pickerText, form.apartmentId === String(a.id) && { color: '#fff' }]}>Unit {a.unitNumber}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Amount (EGP) *" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />

            <Text style={styles.label}>Month</Text>
            <View style={styles.pickerRow}>
              {months.map((m) => (
                <TouchableOpacity key={m} style={[styles.pickerBtn, form.month === m && styles.pickerBtnActive]} onPress={() => setForm({ ...form, month: m })}>
                  <Text style={[styles.pickerText, form.month === m && { color: '#fff' }]}>{m.slice(0, 3)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Year" placeholderTextColor="#9CA3AF" value={form.year} onChangeText={(v) => setForm({ ...form, year: v })} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder="Notes (optional)" placeholderTextColor="#9CA3AF" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />

            <Text style={styles.label}>Status</Text>
            <View style={styles.statusRow}>
              {['PAID', 'PENDING', 'OVERDUE'].map((s) => (
                <TouchableOpacity key={s} style={[styles.statusBtn, form.status === s && { backgroundColor: STATUS_COLORS[s] }]} onPress={() => setForm({ ...form, status: s })}>
                  <Text style={[styles.statusBtnText, form.status === s && { color: '#fff' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}><Text style={styles.saveText}>Record</Text></TouchableOpacity>
            </View>
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
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unit: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  tenant: { color: '#9CA3AF', fontSize: 13 },
  amount: { color: '#10B981', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  date: { color: '#9CA3AF', fontSize: 13 },
  notes: { color: '#9CA3AF', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, marginBottom: 20 },
  addFirstBtn: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12, fontSize: 15 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pickerBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#374151' },
  pickerBtnActive: { backgroundColor: '#10B981' },
  pickerText: { color: '#9CA3AF', fontSize: 13 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statusBtn: { flex: 1, borderRadius: 8, padding: 8, backgroundColor: '#374151', alignItems: 'center' },
  statusBtnText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});

export default PaymentsScreen;
