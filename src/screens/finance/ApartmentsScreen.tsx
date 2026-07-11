import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { exportCsv, exportCsvContent } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';
import { confirmAction } from '../../utils/confirm';
import { money, PAID_COLOR, UNPAID_COLOR } from '../../utils/money';

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
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
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

const ApartmentsScreen = () => {
  const { theme } = useAppPreferences();
  const navigation = useNavigation();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Apartment | null>(null);
  const [statementApartment, setStatementApartment] = useState<Apartment | null>(null);
  const [timelineApartment, setTimelineApartment] = useState<Apartment | null>(null);
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, e, p] = await Promise.all([
        apiService.getApartments(villaId).catch(() => []),
        apiService.getExpenses(villaId).catch(() => []),
        apiService.getPayments(villaId).catch(() => []),
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

  const handleAddVilla = () => {
    (navigation as any).navigate('Villas');
  };

  // Get notification count for this villa
  const notificationCount = useSelector((state: RootState) =>
    state.notifications.villaNotifications[String(villaId)] || 0
  );

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
        await apiService.updateApartment(villaId, editing.id, body);
      } else {
        await apiService.createApartment(villaId, body);
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
    confirmAction({
      title: 'Delete Apartment',
      message: 'Delete ' + apartment.apartmentNumber + '?',
      onConfirm: async () => {
        try {
          await apiService.deleteApartment(villaId, apartment.id);
          await fetchData();
        } catch (e: any) {
          Alert.alert('Error', e?.response?.data?.message || 'Failed to delete apartment');
        }
      },
    });
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

  const timeline = useMemo(() => {
    if (!timelineApartment) return [];
    const affectedExpenses = expenses
      .filter((e) => !e.apartmentId || e.apartmentId === timelineApartment.id)
      .map((e) => ({
        id: 'expense-' + e.id,
        date: e.expenseDate || '',
        title: 'Expense allocation',
        detail: (e.description || 'Expense') + ' - ' + money(e.apartmentId ? e.amount : Number(e.amount || 0) / Math.max(apartments.length, 1)),
        tone: 'expense',
      }));
    const apartmentPayments = payments
      .filter((p) => p.apartmentId === timelineApartment.id)
      .map((p) => ({
        id: 'payment-' + p.id,
        date: p.paymentDate || '',
        title: 'Payment recorded',
        detail: money(p.amount) + ' - ' + (p.paymentMethod || 'Payment') + (p.notes ? ' - ' + p.notes : ''),
        tone: 'payment',
      }));
    const created = [{
      id: 'created',
      date: timelineApartment.createdAt || timelineApartment.updatedAt || '',
      title: 'Apartment created',
      detail: 'Apartment ' + timelineApartment.apartmentNumber,
      tone: 'created',
    }];
    return [...affectedExpenses, ...apartmentPayments, ...created]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }, [apartments.length, expenses, payments, timelineApartment]);

  const exportApartments = async () => {
    const villaName = await getActiveVillaName(villaId);
    try {
      const csv = await apiService.exportApartmentsCsv(villaId);
      await exportCsvContent('apartments.csv', csv);
    } catch {
      await exportCsv('apartments.csv',
        ['ID', 'Apartment', 'Owner', 'Tenant', 'Phone', 'Status', 'Opening Balance', 'Current Balance', 'Type', 'Created At'],
        filteredApartments.map((a) => [
          a.id,
          a.apartmentNumber,
          a.ownerName,
          a.tenantName,
          a.phoneNumber,
          a.status,
          a.openingBalance,
          a.currentBalance,
          a.apartmentType,
          a.createdAt,
        ]),
        { title: 'Apartments Report', villaName });
    }
  };

  const renderItem = ({ item }: { item: Apartment }) => {
    const balanceDue = Math.max(Number(item.currentBalance || 0), 0);
    const isPaidUp = balanceDue === 0;
    return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.unitNumber}>Apartment {item.apartmentNumber}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] || theme.muted }]}>
          <Text style={styles.badgeText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.line}>Owner: {item.ownerName || '-'}</Text>
      <Text style={styles.line}>Tenant: {item.tenantName || '-'}</Text>
      <Text style={styles.line}>Phone: {item.phoneNumber || '-'}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.opening}>Opening: {money(item.openingBalance)}</Text>
        <Text style={[styles.balance, { color: isPaidUp ? PAID_COLOR : UNPAID_COLOR }]}>Balance: {money(balanceDue)}</Text>
      </View>
      <View style={styles.actions}>
        {permissions.canManageVilla ? <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity> : null}
        <TouchableOpacity style={styles.smallBtn} onPress={() => setStatementApartment(item)}><Text style={styles.smallBtnText}>Statement</Text></TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setTimelineApartment(item)}><Ionicons name="time-outline" size={17} color="#D1FAE5" /></TouchableOpacity>
        {permissions.canManageVilla ? <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity> : null}
      </View>
    </View>
  );};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Apartments ({filteredApartments.length})</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.exportBtn} onPress={exportApartments}>
            <Ionicons name="download-outline" size={18} color={theme.text} />
            <Text style={styles.exportText}>CSV</Text>
          </TouchableOpacity>
          {permissions.canManageVilla ? <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Ionicons name="add" size={24} color={theme.onPrimary} />
          </TouchableOpacity> : null}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={theme.muted} />
        <TextInput
          style={styles.search}
          placeholder="Search apartment, owner, tenant, phone, status..."
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> :
        filteredApartments.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="home-outline" size={64} color="#374151" />
            <Text style={styles.emptyText}>{query ? 'No apartments match your search' : 'No apartments yet'}</Text>
            {!query && permissions.canManageVilla ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>+ Add First Apartment</Text></TouchableOpacity> : null}
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
              <TextInput style={styles.input} value={form.apartmentNumber} onChangeText={(v) => setForm({ ...form, apartmentNumber: v })} placeholder="Apartment 1" placeholderTextColor={theme.muted} />
              <Text style={styles.label}>Owner Name</Text>
              <TextInput style={styles.input} value={form.ownerName} onChangeText={(v) => setForm({ ...form, ownerName: v })} placeholder="Owner name" placeholderTextColor={theme.muted} />
              <Text style={styles.label}>Tenant Name</Text>
              <TextInput style={styles.input} value={form.tenantName} onChangeText={(v) => setForm({ ...form, tenantName: v })} placeholder="Tenant name" placeholderTextColor={theme.muted} />
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.input} value={form.phoneNumber} onChangeText={(v) => setForm({ ...form, phoneNumber: v })} placeholder="Phone" placeholderTextColor={theme.muted} keyboardType="phone-pad" />
              <Text style={styles.label}>Opening Balance (EGP)</Text>
              <TextInput style={styles.input} value={form.openingBalance} onChangeText={(v) => setForm({ ...form, openingBalance: v })} placeholder="0" placeholderTextColor={theme.muted} keyboardType="decimal-pad" />
              <Text style={styles.label}>Type</Text>
              <TextInput style={styles.input} value={form.apartmentType} onChangeText={(v) => setForm({ ...form, apartmentType: v })} placeholder="Owner / Tenant / Family" placeholderTextColor={theme.muted} />
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {['ACTIVE', 'VACANT', 'MAINTENANCE'].map((s) => (
                  <TouchableOpacity key={s} style={[styles.statusBtn, form.status === s && { backgroundColor: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] }]} onPress={() => setForm({ ...form, status: s })}>
                    <Text style={[styles.statusText, form.status === s && { color: theme.onPrimary }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={styles.saveText}>{editing ? 'Save Changes' : 'Add Apartment'}</Text>}
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
                <TouchableOpacity onPress={() => setStatementApartment(null)}><Ionicons name="close" size={26} color={theme.muted} /></TouchableOpacity>
              </View>
              <Text style={styles.statementTitle}>Apartment {statementApartment?.apartmentNumber}</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Allocated</Text><Text style={styles.summaryValue}>{money(statement?.allocated)}</Text></View>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Paid</Text><Text style={[styles.summaryValue, { color: PAID_COLOR }]}>{money(statement?.paid)}</Text></View>
                <View style={styles.summaryBox}><Text style={styles.summaryLabel}>Balance</Text><Text style={[styles.summaryValue, { color: Math.max(Number(statement?.balance || 0), 0) > 0 ? UNPAID_COLOR : PAID_COLOR }]}>{money(Math.max(Number(statement?.balance || 0), 0))}</Text></View>
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

      <Modal visible={!!timelineApartment} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.statementHeader}>
                <Text style={styles.modalTitle}>Apartment Timeline</Text>
                <TouchableOpacity onPress={() => setTimelineApartment(null)}><Ionicons name="close" size={26} color={theme.muted} /></TouchableOpacity>
              </View>
              <Text style={styles.statementTitle}>Apartment {timelineApartment?.apartmentNumber}</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Internal notes:</Text>
                <Text style={styles.notesText}>{timelineApartment?.notes || 'No notes saved for this apartment.'}</Text>
              </View>
              <View style={styles.timelineWrap}>
                {timeline.map((event) => (
                  <View key={event.id} style={styles.timelineRow}>
                    <View style={styles.timelineRail}>
                      <View style={[styles.timelineDot, event.tone === 'payment' && styles.paymentDot, event.tone === 'created' && styles.createdDot]} />
                    </View>
                    <View style={styles.timelineCard}>
                      <Text style={styles.timelineDate}>{event.date || 'No date'}</Text>
                      <Text style={styles.timelineTitle}>{event.title}</Text>
                      <Text style={styles.timelineDetail}>{event.detail}</Text>
                    </View>
                  </View>
                ))}
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { backgroundColor: theme.chip, borderRadius: 10, minHeight: 40, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border },
  exportText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  addBtn: { backgroundColor: theme.primary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: theme.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.chip },
  search: { flex: 1, color: theme.text, paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: theme.primary },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unitNumber: { color: theme.text, fontSize: 18, fontWeight: 'bold', flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: theme.onPrimary, fontSize: 11, fontWeight: '700' },
  line: { color: theme.muted, fontSize: 13, marginBottom: 3 },
  balanceRow: { marginTop: 8, gap: 4 },
  opening: { color: theme.muted, fontSize: 13 },
  balance: { fontSize: 15, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  smallBtn: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: theme.subtleText, fontSize: 12, fontWeight: '700' },
  iconBtn: { backgroundColor: '#064E3B', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteBtn: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontSize: 12, fontWeight: '800' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: theme.muted, fontSize: 16, marginTop: 12, marginBottom: 24, textAlign: 'center' },
  addFirstBtn: { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14 },
  addFirstText: { color: theme.text, fontSize: 15, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modal: { backgroundColor: theme.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '90%' },
  modalTitle: { color: theme.text, fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  label: { color: theme.muted, fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: theme.chip, borderRadius: 10, padding: 14, color: theme.text, marginBottom: 8, fontSize: 15, borderWidth: 1, borderColor: theme.border },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statusBtn: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.chip, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
  statusText: { color: theme.muted, fontSize: 12, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, backgroundColor: theme.chip, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelText: { color: theme.muted, fontSize: 15, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: theme.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontSize: 15, fontWeight: '700' },
  statementHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statementTitle: { color: theme.muted, marginBottom: 14 },
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  summaryBox: { flex: 1, backgroundColor: theme.background, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: theme.chip },
  summaryLabel: { color: theme.muted, fontSize: 11 },
  summaryValue: { color: theme.text, fontSize: 13, fontWeight: '800', marginTop: 4 },
  statementRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.chip },
  statementDetail: { color: theme.text, fontSize: 13, fontWeight: '600' },
  statementDate: { color: theme.muted, fontSize: 11, marginTop: 2 },
  debit: { color: theme.danger, fontSize: 12, fontWeight: '700', width: 82, textAlign: 'right' },
  credit: { color: PAID_COLOR, fontSize: 12, fontWeight: '700', width: 82, textAlign: 'right' },
  notesBox: { borderWidth: 1, borderColor: '#065F46', borderStyle: 'dashed', borderRadius: 12, padding: 12, marginBottom: 16, backgroundColor: '#12342F' },
  notesLabel: { color: '#D1FAE5', fontWeight: '900', marginBottom: 4 },
  notesText: { color: theme.subtleText, lineHeight: 19 },
  timelineWrap: { borderLeftWidth: 2, borderLeftColor: '#166534', marginLeft: 10, paddingLeft: 18 },
  timelineRow: { flexDirection: 'row', marginBottom: 14, marginLeft: -29 },
  timelineRail: { width: 22, alignItems: 'center', paddingTop: 18 },
  timelineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: theme.dangerText, borderWidth: 2, borderColor: theme.card },
  paymentDot: { backgroundColor: '#86EFAC' },
  createdDot: { backgroundColor: '#93C5FD' },
  timelineCard: { flex: 1, backgroundColor: '#15363D', borderWidth: 1, borderColor: '#27515A', borderRadius: 12, padding: 12 },
  timelineDate: { color: '#A7F3D0', fontSize: 12, marginBottom: 4 },
  timelineTitle: { color: theme.text, fontSize: 14, fontWeight: '900', marginBottom: 4 },
  timelineDetail: { color: theme.subtleText, fontSize: 13, lineHeight: 18 },
});

export default ApartmentsScreen;
