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
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Instapay', 'Vodafone Cash', 'Other'];
const STATUS_COLORS: Record<string, string> = { COMPLETED: '#10B981', PAID: '#10B981', PENDING: '#F59E0B', OVERDUE: '#EF4444', PARTIAL: '#3B82F6' };
const emptyForm = { apartmentId: '', amount: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', referenceNumber: '', notes: '', status: 'COMPLETED' };
const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

const PaymentsScreen = () => {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Payment | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showMethodDD, setShowMethodDD] = useState(false);
  const [showAptDD, setShowAptDD] = useState(false);

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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Edit Payment' : 'Add Payment'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color={theme.muted} /></TouchableOpacity>
              </View>

              {!editing && <View style={styles.infoBanner}>
                <Text style={styles.infoText}>Choose how this collected payment should be credited across apartments.</Text>
              </View>}

              {/* Date + Amount */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>Date *</Text>
                  <TextInput style={styles.input} value={form.paymentDate} onChangeText={(v) => setForm({ ...form, paymentDate: v })} placeholderTextColor="#9CA3AF" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Amount (EGP) *</Text>
                  <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
                </View>
              </View>

              {/* Split Type + Apartment */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>Split Type *</Text>
                  <View style={styles.dropdownBtn}>
                    <Text style={styles.dropdownBtnText}>Single apartment</Text>
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Apartment *</Text>
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => !editing && setShowAptDD(!showAptDD)}>
                    <Text style={styles.dropdownBtnText} numberOfLines={1}>
                      {apartments.find(a => String(a.id) === form.apartmentId) ? 'Apartment ' + apartments.find(a => String(a.id) === form.apartmentId)?.apartmentNumber : 'Select'}
                    </Text>
                    {!editing && <Ionicons name={showAptDD ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />}
                  </TouchableOpacity>
                  {showAptDD && !editing && <View style={styles.dropdownMenu}>
                    {apartments.map((a) => <TouchableOpacity key={a.id} style={styles.dropdownItem} onPress={() => { setForm({ ...form, apartmentId: String(a.id) }); setShowAptDD(false); }}>
                      <Text style={[styles.dropdownItemText, form.apartmentId === String(a.id) && { color: theme.primary, fontWeight: '900' }]}>Apartment {a.apartmentNumber}</Text>
                    </TouchableOpacity>)}
                  </View>}
                </View>
              </View>

              {/* Method */}
              <Text style={styles.label}>Method</Text>
              <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowMethodDD(!showMethodDD)}>
                <Text style={styles.dropdownBtnText}>{form.paymentMethod}</Text>
                <Ionicons name={showMethodDD ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />
              </TouchableOpacity>
              {showMethodDD && <View style={styles.dropdownMenu}>
                {PAYMENT_METHODS.map((m) => <TouchableOpacity key={m} style={styles.dropdownItem} onPress={() => { setForm({ ...form, paymentMethod: m }); setShowMethodDD(false); }}>
                  <Text style={[styles.dropdownItemText, form.paymentMethod === m && { color: theme.primary, fontWeight: '900' }]}>{m}</Text>
                </TouchableOpacity>)}
              </View>}

              {/* Notes */}
              <Text style={styles.label}>Notes</Text>
              <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Optional notes..." placeholderTextColor="#9CA3AF" value={form.notes} onChangeText={(v) => setForm({ ...form, notes: v })} multiline />

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
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
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
  infoBanner: { backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 16 },
  infoText: { color: '#3B82F6', fontSize: 13 },
  label: { color: theme.muted, fontSize: 13, marginBottom: 6, marginTop: 4, fontWeight: '700' },
  input: { backgroundColor: theme.chip, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 12, fontSize: 15 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  dropdownBtn: { backgroundColor: theme.chip, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: theme.border },
  dropdownBtnText: { color: theme.text, fontSize: 13, flex: 1, fontWeight: '600' },
  dropdownMenu: { backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 8, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 13 },
  saveBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '600' },
});

export default PaymentsScreen;
