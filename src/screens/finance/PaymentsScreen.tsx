import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Payment {
  id: number;
  apartmentId: number;
  apartmentNumber?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  status: string;
  notes?: string;
}

const VILLA_ID = 1;
const STATUS_COLORS: Record<string, string> = { COMPLETED: '#10B981', PAID: '#10B981', PENDING: '#F59E0B', OVERDUE: '#EF4444', PARTIAL: '#3B82F6' };
const emptyForm = { apartmentId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'CASH', referenceNumber: '', notes: '', status: 'COMPLETED' };
const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

const PaymentsScreen = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [p, a] = await Promise.all([apiService.getPayments(VILLA_ID), apiService.getApartments(VILLA_ID)]);
      setPayments(Array.isArray(p) ? p : []);
      setApartments(Array.isArray(a) ? a : []);
    } catch {
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredPayments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) => [
      p.apartmentNumber, p.amount, p.paymentDate, p.paymentMethod, p.referenceNumber, p.status, p.notes,
    ].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [payments, query]);

  const totalPayments = filteredPayments
    .filter((p) => p.status === 'COMPLETED' || p.status === 'PAID')
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (payment: Payment) => {
    setEditing(payment);
    setForm({
      apartmentId: String(payment.apartmentId || ''),
      amount: String(payment.amount || ''),
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      paymentMethod: payment.paymentMethod || 'CASH',
      referenceNumber: payment.referenceNumber || '',
      notes: payment.notes || '',
      status: payment.status || 'COMPLETED',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.apartmentId || !form.amount) {
      Alert.alert('Error', 'Apartment and amount are required');
      return;
    }
    const body = {
      amount: Number(form.amount || 0),
      paymentDate: form.paymentDate,
      paymentMethod: form.paymentMethod,
      referenceNumber: form.referenceNumber,
      notes: form.notes,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiService.updatePayment(VILLA_ID, editing.id, body);
      } else {
        await apiService.createPayment(VILLA_ID, Number(form.apartmentId), body);
      }
      setModalVisible(false);
      await fetchData();
      Alert.alert('Success', editing ? 'Payment updated' : 'Payment recorded');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (payment: Payment) => {
    Alert.alert('Delete Payment', 'Delete this payment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deletePayment(VILLA_ID, payment.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete payment');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Payment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.unit}>Apartment {item.apartmentNumber || item.apartmentId}</Text>
          <Text style={styles.date}>{item.paymentDate || ''} • {item.paymentMethod || 'CASH'}</Text>
          {item.referenceNumber ? <Text style={styles.notes}>Ref: {item.referenceNumber}</Text> : null}
          {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}
        </View>
        <View>
          <Text style={styles.amount}>{money(item.amount)}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payments ({filteredPayments.length})</Text>
          <Text style={styles.total}>Collected: {money(totalPayments)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput style={styles.search} placeholder="Search payments..." placeholderTextColor="#6B7280" value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        filteredPayments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>{query ? 'No payments match your search' : 'No payments yet'}</Text>
            {!query ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>Record Payment</Text></TouchableOpacity> : null}
          </View>
        ) : <FlatList data={filteredPayments} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ padding: 16 }} />}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Payment' : 'Record Payment'}</Text>

              <Text style={styles.label}>Apartment</Text>
              <View style={styles.pickerRow}>
                {apartments.map((a) => (
                  <TouchableOpacity key={a.id} disabled={!!editing} style={[styles.pickerBtn, form.apartmentId === String(a.id) && styles.pickerBtnActive, editing && { opacity: form.apartmentId === String(a.id) ? 1 : 0.35 }]} onPress={() => setForm({ ...form, apartmentId: String(a.id) })}>
                    <Text style={[styles.pickerText, form.apartmentId === String(a.id) && { color: '#fff' }]}>Apt {a.apartmentNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput style={styles.input} placeholder="Amount (EGP) *" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
              <TextInput style={styles.input} placeholder="Payment date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={form.paymentDate} onChangeText={(v) => setForm({ ...form, paymentDate: v })} />
              <TextInput style={styles.input} placeholder="Method" placeholderTextColor="#9CA3AF" value={form.paymentMethod} onChangeText={(v) => setForm({ ...form, paymentMethod: v })} />
              <TextInput style={styles.input} placeholder="Reference number" placeholderTextColor="#9CA3AF" value={form.referenceNumber} onChangeText={(v) => setForm({ ...form, referenceNumber: v })} />
              <TextInput style={styles.input} placeholder="Notes" placeholderTextColor="#9CA3AF" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} />

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {['COMPLETED', 'PENDING', 'OVERDUE', 'PARTIAL'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, form.status === s && { backgroundColor: STATUS_COLORS[s] }]} onPress={() => setForm({ ...form, status: s })}>
                    <Text style={[styles.statusBtnText, form.status === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Record'}</Text>}
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
  total: { color: '#10B981', fontSize: 13, marginTop: 2, fontWeight: '700' },
  addBtn: { backgroundColor: '#10B981', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: '#1F2937', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#374151' },
  search: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unit: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  amount: { color: '#10B981', fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginTop: 4 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  date: { color: '#9CA3AF', fontSize: 13, marginTop: 3 },
  notes: { color: '#9CA3AF', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#3B1F26', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, marginBottom: 20, textAlign: 'center' },
  addFirstBtn: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 8, marginTop: 4, fontWeight: '700' },
  input: { backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12, fontSize: 15 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pickerBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#374151' },
  pickerBtnActive: { backgroundColor: '#10B981' },
  pickerText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: '#374151', alignItems: 'center' },
  statusBtnText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});

export default PaymentsScreen;
