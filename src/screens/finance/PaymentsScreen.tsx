import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { exportCsv, exportCsvContent } from '../../utils/csv';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';

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
  const { theme } = useAppPreferences();
  const { user } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = user?.villaId || VILLA_ID;
  const styles = makeStyles(theme);
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
      const [p, a] = await Promise.all([apiService.getPayments(villaId), apiService.getApartments(villaId)]);
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
        await apiService.updatePayment(villaId, editing.id, body);
      } else {
        await apiService.createPayment(villaId, Number(form.apartmentId), body);
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
            await apiService.deletePayment(villaId, payment.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete payment');
          }
        },
      },
    ]);
  };

  const exportPayments = async () => {
    try {
      const csv = await apiService.exportPaymentsCsv(villaId);
      await exportCsvContent('payments.csv', csv);
    } catch {
      await exportCsv('payments.csv',
        ['ID', 'Apartment ID', 'Apartment', 'Amount', 'Payment Date', 'Method', 'Reference', 'Status', 'Notes'],
        filteredPayments.map((p) => [
          p.id,
          p.apartmentId,
          p.apartmentNumber,
          p.amount,
          p.paymentDate,
          p.paymentMethod,
          p.referenceNumber,
          p.status,
          p.notes,
        ]));
    }
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
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || theme.muted }]}>
            <Text style={styles.badgeText}>{item.status}</Text>
          </View>
        </View>
      </View>
      {permissions.canManageFinancials ? <View style={styles.actions}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
      </View> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payments ({filteredPayments.length})</Text>
          <Text style={styles.total}>Collected: {money(totalPayments)}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportBtn} onPress={exportPayments}>
            <Ionicons name="download-outline" size={17} color={theme.text} />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
          {permissions.canManageFinancials ? <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={24} color={theme.onPrimary} />
          </TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.muted} />
        <TextInput style={styles.search} placeholder="Search payments..." placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> :
        filteredPayments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="card-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>{query ? 'No payments match your search' : 'No payments yet'}</Text>
            {!query && permissions.canManageFinancials ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>Record Payment</Text></TouchableOpacity> : null}
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
                    <Text style={[styles.pickerText, form.apartmentId === String(a.id) && { color: theme.onPrimary }]}>Apt {a.apartmentNumber}</Text>
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
                    <Text style={[styles.statusBtnText, form.status === s && { color: theme.onPrimary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Record'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  total: { color: theme.primary, fontSize: 13, marginTop: 2, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { backgroundColor: theme.chip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border },
  exportText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  addBtn: { backgroundColor: theme.primary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: theme.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.chip },
  search: { flex: 1, color: theme.text, paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unit: { color: theme.text, fontSize: 16, fontWeight: 'bold' },
  amount: { color: theme.primary, fontSize: 18, fontWeight: 'bold', textAlign: 'right' },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-end', marginTop: 4 },
  badgeText: { color: theme.onPrimary, fontSize: 10, fontWeight: '600' },
  date: { color: theme.muted, fontSize: 13, marginTop: 3 },
  notes: { color: theme.muted, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  smallBtn: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: theme.subtleText, fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { color: theme.muted, fontSize: 16, marginTop: 12, marginBottom: 20, textAlign: 'center' },
  addFirstBtn: { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstText: { color: theme.text, fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: theme.muted, fontSize: 13, marginBottom: 8, marginTop: 4, fontWeight: '700' },
  input: { backgroundColor: theme.chip, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 12, fontSize: 15 },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pickerBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.chip },
  pickerBtnActive: { backgroundColor: theme.primary },
  pickerText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.chip, alignItems: 'center' },
  statusBtnText: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: theme.chip, borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: theme.muted, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '600' },
});

export default PaymentsScreen;
