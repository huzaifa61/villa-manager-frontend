import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Expense {
  id: number;
  amount: number;
  description: string;
  expenseDate: string;
  categoryId?: number;
  categoryName?: string;
  apartmentId?: number;
  apartmentNumber?: string;
}

const VILLA_ID = 1;
const CATEGORIES = ['Maintenance', 'Utilities', 'Cleaning', 'Security', 'Management', 'Other'];
const CATEGORY_COLORS: Record<string, string> = { Maintenance: '#F59E0B', Utilities: '#3B82F6', Cleaning: '#10B981', Security: '#EF4444', Management: '#8B5CF6', Other: '#6B7280' };
const emptyForm = { description: '', amount: '', category: 'Maintenance', apartmentId: '', date: new Date().toISOString().split('T')[0] };
const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

const ExpensesScreen = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [e, a] = await Promise.all([
        apiService.getExpenses(VILLA_ID).catch(() => []),
        apiService.getApartments(VILLA_ID).catch(() => []),
      ]);
      setExpenses(Array.isArray(e) ? e : []);
      setApartments(Array.isArray(a) ? a : []);
    } catch {
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter((e) => [
      e.description, e.expenseDate, e.categoryName || 'Maintenance', e.apartmentNumber || 'All apartments', e.amount,
    ].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [expenses, query]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      description: expense.description || '',
      amount: String(expense.amount || ''),
      category: expense.categoryName || 'Maintenance',
      apartmentId: expense.apartmentId ? String(expense.apartmentId) : '',
      date: expense.expenseDate || new Date().toISOString().split('T')[0],
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount) {
      Alert.alert('Error', 'Description and amount are required');
      return;
    }
    const body = {
      description: form.description.trim(),
      amount: Number(form.amount || 0),
      categoryId: Math.max(CATEGORIES.indexOf(form.category) + 1, 1),
      apartmentId: form.apartmentId ? Number(form.apartmentId) : null,
      expenseDate: form.date,
    };
    setSaving(true);
    try {
      if (editing) {
        await apiService.updateExpense(VILLA_ID, editing.id, body);
      } else {
        await apiService.createExpense(VILLA_ID, body);
      }
      setModalVisible(false);
      await fetchData();
      Alert.alert('Success', editing ? 'Expense updated' : 'Expense added');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (expense: Expense) => {
    Alert.alert('Delete Expense', 'Delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteExpense(VILLA_ID, expense.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Expense }) => {
    const category = item.categoryName || CATEGORIES[(item.categoryId || 1) - 1] || 'Maintenance';
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.meta}>{item.apartmentNumber ? 'Apartment ' + item.apartmentNumber : 'Equal - all apartments'}</Text>
            <Text style={styles.date}>{item.expenseDate}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.amount}>{money(item.amount)}</Text>
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[category] || '#6B7280' }]}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses ({filteredExpenses.length})</Text>
          <Text style={styles.total}>Total: {money(totalExpenses)}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color="#9CA3AF" />
        <TextInput style={styles.search} placeholder="Search expenses..." placeholderTextColor="#6B7280" value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        filteredExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>{query ? 'No expenses match your search' : 'No expenses yet'}</Text>
            {!query ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>Add Expense</Text></TouchableOpacity> : null}
          </View>
        ) : <FlatList data={filteredExpenses} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ padding: 16 }} />}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{editing ? 'Edit Expense' : 'Add Expense'}</Text>
              <TextInput style={styles.input} placeholder="Description *" placeholderTextColor="#9CA3AF" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
              <TextInput style={styles.input} placeholder="Amount (EGP) *" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
              <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} />

              <Text style={styles.label}>Allocation</Text>
              <View style={styles.catRow}>
                <TouchableOpacity style={[styles.catBtn, !form.apartmentId && styles.catActive]} onPress={() => setForm({ ...form, apartmentId: '' })}>
                  <Text style={[styles.catText, !form.apartmentId && { color: '#fff' }]}>All apartments</Text>
                </TouchableOpacity>
                {apartments.map((a) => (
                  <TouchableOpacity key={a.id} style={[styles.catBtn, form.apartmentId === String(a.id) && styles.catActive]} onPress={() => setForm({ ...form, apartmentId: String(a.id) })}>
                    <Text style={[styles.catText, form.apartmentId === String(a.id) && { color: '#fff' }]}>Apt {a.apartmentNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.catBtn, form.category === c && { backgroundColor: CATEGORY_COLORS[c] }]} onPress={() => setForm({ ...form, category: c })}>
                    <Text style={[styles.catText, form.category === c && { color: '#fff' }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>{editing ? 'Save' : 'Add'}</Text>}
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
  total: { color: '#EF4444', fontSize: 13, marginTop: 2, fontWeight: '700' },
  addBtn: { backgroundColor: '#10B981', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: '#1F2937', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: '#374151' },
  search: { flex: 1, color: '#fff', paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  description: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { color: '#9CA3AF', fontSize: 13, marginBottom: 2 },
  date: { color: '#6B7280', fontSize: 12 },
  amount: { color: '#EF4444', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
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
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#374151' },
  catActive: { backgroundColor: '#10B981' },
  catText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});

export default ExpensesScreen;
