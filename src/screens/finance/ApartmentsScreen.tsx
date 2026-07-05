import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Apartment {
  id: number;
  apartmentNumber: string;
  ownerName?: string;
  tenantName?: string;
  phoneNumber?: string;
  openingBalance: number;
  currentBalance: number;
  status: string;
  apartmentType?: string;
}

interface Expense {
  id: number;
  apartmentId?: number;
  description: string;
  amount: number;
  expenseDate?: string;
}

interface Payment {
  id: number;
  apartmentId: number;
  amount: number;
  paymentDate?: string;
  paymentMethod?: string;
  status?: string;
  notes?: string;
}

const VILLA_ID = 1;
const STATUS_COLORS: Record<string, string> = {
  OCCUPIED: '#10B981', ACTIVE: '#10B981',
  VACANT: '#EF4444', INACTIVE: '#EF4444',
  MAINTENANCE: '#F59E0B', UNDER_MAINTENANCE: '#F59E0B',
};

const emptyForm = {
  apartmentNumber: '',
  ownerName: '',
  tenantName: '',
  phoneNumber: '',
  openingBalance: '0',
  status: 'ACTIVE',
  apartmentType: '',
};

const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

const ApartmentsScreen = () => {
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [statementApartment, setStatementApartment] = useState<Apartment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, e, p] = await Promise.all([
        apiService.getApartments(VILLA_ID).catch(() => []),
        apiService.getExpenses(VILLA_ID).catch(() => []),
        apiService.getPayments(VILLA_ID).catch(() => []),
      ]);
      setApartments(Array.isArray(a) ? a : []);
      setExpenses(Array.isArray(e) ? e : []);
      setPayments(Array.isArray(p) ? p : []);
    } catch {
      setApartments([]);
      setExpenses([]);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredApartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return apartments;
    return apartments.filter((a) => [
      a.apartmentNumber, a.ownerName, a.tenantName, a.phoneNumber, a.status, a.apartmentType,
    ].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [apartments, query]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (apartment: Apartment) => {
    setEditing(apartment);
    setForm({
      apartmentNumber: apartment.apartmentNumber || '',
      ownerName: apartment.ownerName || '',
      tenantName: apartment.tenantName || '',
      phoneNumber: apartment.phoneNumber || '',
      openingBalance: String(apartment.openingBalance || 0),
      status: apartment.status || 'ACTIVE',
      apartmentType: apartment.apartmentType || '',
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.apartmentNumber.trim()) {
      Alert.alert('Error', 'Apartment number is required');
      return;
    }
    setSaving(true);
    const body = {
      apartmentNumber: form.apartmentNumber.trim(),
      ownerName: form.ownerName.trim(),
      tenantName: form.tenantName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      openingBalance: Number(form.openingBalance || 0),
      status: form.status,
      apartmentType: form.apartmentType.trim(),
    };
    try {
      if (editing) {
        await apiService.updateApartment(VILLA_ID, editing.id, body);
      } else {
        await apiService.createApartment(VILLA_ID, body);
      }
      setModalVisible(false);
      await fetchData();
      Alert.alert('Success', editing ? 'Apartment updated' : 'Apartment added');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to save apartment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (apartment: Apartment) => {
    Alert.alert('Delete Apartment', 'Delete ' + apartment.apartmentNumber + '?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteApartment(VILLA_ID, apartment.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete apartment');
          }
        },
      },
    ]);
  };

  const statement = useMemo(() => {
    if (!statementApartment) return null;
    const globalShare = apartments.length ? expenses
      .filter((e) => !e.apartmentId)
      .reduce((sum, e) => sum + Number(e.amount || 0) / apartments.length, 0) : 0;
    const directExpenses = expenses
      .filter((e) => e.apartmentId === statementApartment.id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const paid = payments
      .filter((p) => p.apartmentId === statementApartment.id)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const allocated = globalShare + directExpenses;
    const balance = Number(statementApartment.openingBalance || 0) + allocated - paid;
    const rows = [
      { date: 'Opening', detail: 'Opening balance', debit: Number(statementApartment.openingBalance || 0), credit: 0 },
      ...expenses.filter((e) => !e.apartmentId || e.apartmentId === statementApartment.id).map((e) => ({
        date: e.expenseDate || '',
        detail: e.description || 'Expense',
        debit: e.apartmentId ? Number(e.amount || 0) : Number(e.amount || 0) / Math.max(apartments.length, 1),
        credit: 0,
      })),
      ...payments.filter((p) => p.apartmentId === statementApartment.id).map((p) => ({
        date: p.paymentDate || '',
        detail: p.notes || p.paymentMethod || 'Payment',
        debit: 0,
        credit: Number(p.amount || 0),
      })),
    ];
    return { allocated, paid, balance, rows };
  }, [apartments.length, expenses, payments, statementApartment]);

  const renderItem = ({ item }: { item: Apartment }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.unitNumber}>Apartment {item.apartmentNumber}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || '#6B7280' }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.line}>Owner: {item.ownerName || '-'}</Text>
      <Text style={styles.line}>Tenant: {item.tenantName || '-'}</Text>
      <Text style={styles.line}>Phone: {item.phoneNumber || '-'}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.opening}>Opening: {money(item.openingBalance)}</Text>
        <Text style={[styles.balance, Number(item.currentBalance || 0) > 0 && styles.negative]}>Balance: {money(item.currentBalance)}</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={() => setStatementApartment(item)}><Text style={styles.smallBtnText}>Statement</Text></TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Apartments ({filteredApartments.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput
          style={styles.search}
          placeholder="Search apartment, owner, tenant, phone, status..."
          placeholderTextColor="#6B7280"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        filteredApartments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={64} color="#374151" />
            <Text style={styles.emptyText}>{query ? 'No apartments match your search' : 'No apartments yet'}</Text>
            {!query ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>+ Add First Apartment</Text></TouchableOpacity> : null}
          </View>
        ) : (
          <FlatList data={filteredApartments} renderItem={renderItem} keyExtractor={(i) => String(i.id)} contentContainerStyle={{ padding: 16 }} />
        )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Apartment' : 'Add Apartment'}</Text>
              <Text style={styles.label}>Apartment Number *</Text>
              <TextInput style={styles.input} value={form.apartmentNumber} onChangeText={(v) => setForm({ ...form, apartmentNumber: v })} placeholder="Apartment 1" placeholderTextColor="#6B7280" />
              <Text style={styles.label}>Owner Name</Text>
              <TextInput style={styles.input} value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} placeholder="Owner name" placeholderTextColor="#6B7280" />
              <Text style={styles.label}>Tenant Name</Text>
              <TextInput style={styles.input} value={form.tenantName} onChangeText={(v) => setForm({ ...form, tenantName: v })} placeholder="Tenant name" placeholderTextColor="#6B7280" />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={form.phoneNumber} onChangeText={(v) => setForm({ ...form, phoneNumber: v })} placeholder="Phone" placeholderTextColor="#6B7280" keyboardType="phone-pad" />
              <Text style={styles.label}>Opening Balance (EGP)</Text>
              <TextInput style={styles.input} value={form.openingBalance} onChangeText={(v) => setForm({ ...form, openingBalance: v })} placeholder="0" placeholderTextColor="#6B7280" keyboardType="decimal-pad" />
              <Text style={styles.label}>Type</Text>
              <TextInput style={styles.input} value={form.apartmentType} onChangeText={(v) => setForm({ ...form, apartmentType: v })} placeholder="Owner / Tenant / Family" placeholderTextColor="#6B7280" />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {['ACTIVE', 'VACANT', 'MAINTENANCE'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, form.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]} onPress={() => setForm({ ...form, status: s })}>
                    <Text style={[styles.statusText, form.status === s && { color: '#fff' }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{editing ? 'Save Changes' : 'Add Apartment'}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={!!statementApartment} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.statementHeader}>
                <Text style={styles.modalTitle}>Statement</Text>
                <TouchableOpacity onPress={() => setStatementApartment(null)}><Ionicons name="close" size={26} color="#9CA3AF" /></TouchableOpacity>
              </View>
              <Text style={styles.statementTitle}>Apartment {statementApartment?.apartmentNumber}</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Allocated</Text><Text style={styles.summaryValue}>{money(statement?.allocated)}</Text></View>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Paid</Text><Text style={[styles.summaryValue, { color: '#10B981' }]}>{money(statement?.paid)}</Text></View>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Balance</Text><Text style={[styles.summaryValue, { color: Number(statement?.balance || 0) > 0 ? '#EF4444' : '#10B981' }]}>{money(statement?.balance)}</Text></View>
              </View>
              {statement?.rows.map((row, index) => (
                <View key={index} style={styles.statementRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statementDetail}>{row.detail}</Text>
                    <Text style={styles.statementDate}>{row.date}</Text>
                  </View>
                  <Text style={styles.debit}>{row.debit ? money(row.debit) : ''}</Text>
                  <Text style={styles.credit}>{row.credit ? money(row.credit) : ''}</Text>
                </View>
              ))}
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
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: '#1F2937', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#374151' },
  search: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#10B981' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unitNumber: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  line: { color: '#9CA3AF', fontSize: 13, marginBottom: 3 },
  balanceRow: { marginTop: 8, gap: 4 },
  opening: { color: '#9CA3AF', fontSize: 13 },
  balance: { color: '#10B981', fontSize: 15, fontWeight: '700' },
  negative: { color: '#EF4444' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallBtn: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: '#E5E7EB', fontSize: 12, fontWeight: '700' },
  deleteBtn: { backgroundColor: '#3B1F26', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: '#FCA5A5', fontSize: 12, fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, marginBottom: 24, textAlign: 'center' },
  addFirstBtn: { backgroundColor: '#10B981', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  addFirstText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#374151', borderRadius: 10, padding: 14, color: '#fff', marginBottom: 8, fontSize: 15, borderWidth: 1, borderColor: '#4B5563' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statusBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#374151', alignItems: 'center', borderWidth: 1, borderColor: '#4B5563' },
  statusText: { color: '#9CA3AF', fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#10B981', borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  statementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statementTitle: { color: '#9CA3AF', marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: '#111827', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#374151' },
  summaryLabel: { color: '#9CA3AF', fontSize: 11 },
  summaryValue: { color: '#fff', fontSize: 13, fontWeight: '800', marginTop: 4 },
  statementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#374151' },
  statementDetail: { color: '#fff', fontSize: 13, fontWeight: '600' },
  statementDate: { color: '#6B7280', fontSize: 11, marginTop: 2 },
  debit: { color: '#EF4444', fontSize: 12, fontWeight: '700', width: 82, textAlign: 'right' },
  credit: { color: '#10B981', fontSize: 12, fontWeight: '700', width: 82, textAlign: 'right' },
});

export default ApartmentsScreen;
