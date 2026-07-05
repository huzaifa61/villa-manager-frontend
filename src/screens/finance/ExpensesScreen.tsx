import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiService } from '../../services/api';

interface Expense { id: number; amount: number; description: string; expenseDate: string; category: string; vendorName: string; }

const CATEGORIES = ['Maintenance', 'Utilities', 'Cleaning', 'Security', 'Management', 'Other'];
const CATEGORY_COLORS: Record<string, string> = { Maintenance: '#F59E0B', Utilities: '#3B82F6', Cleaning: '#10B981', Security: '#EF4444', Management: '#8B5CF6', Other: '#6B7280' };

const ExpensesScreen = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({ description: '', amount: '', category: 'Maintenance', vendorName: '', date: new Date().toISOString().split('T')[0] });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const data = await apiService.getExpenses(1);
      setExpenses(Array.isArray(data) ? data : []);
    } catch { setExpenses([]); } finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async () => {
    if (!form.description || !form.amount) { Alert.alert('Error', 'Description and amount are required'); return; }
    try {
      await apiService.createExpense(1, { description: form.description, amount: parseFloat(form.amount), category: form.category, vendorName: form.vendorName, expenseDate: form.date });
      setModalVisible(false);
      setForm({ description: '', amount: '', category: 'Maintenance', vendorName: '', date: new Date().toISOString().split('T')[0] });
      fetchExpenses();
      Alert.alert('Success', 'Expense added!');
    } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Failed to add expense'); }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.description}>{item.description}</Text>
          <Text style={styles.vendor}>{item.vendorName || ''}</Text>
          <Text style={styles.date}>{item.expenseDate}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.amount}>EGP {item.amount?.toLocaleString()}</Text>
          <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[item.category] || '#6B7280' }]}>
            <Text style={styles.badgeText}>{item.category}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Expenses ({expenses.length})</Text>
          <Text style={styles.total}>Total: EGP {totalExpenses.toLocaleString()}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> :
        expenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>No expenses yet</Text>
            <TouchableOpacity style={styles.addFirstBtn} onPress={() => setModalVisible(true)}>
              <Text style={styles.addFirstText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        ) : <FlatList data={expenses} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ padding: 16 }} />}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TextInput style={styles.input} placeholder="Description *" placeholderTextColor="#9CA3AF" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />
            <TextInput style={styles.input} placeholder="Amount (EGP) *" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
            <TextInput style={styles.input} placeholder="Vendor Name" placeholderTextColor="#9CA3AF" value={form.vendorName} onChangeText={(v) => setForm({ ...form, vendorName: v })} />
            <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#9CA3AF" value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} />
            <Text style={styles.label}>Category</Text>
            <View style={styles.catRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.catBtn, form.category === c && { backgroundColor: CATEGORY_COLORS[c] }]} onPress={() => setForm({ ...form, category: c })}>
                  <Text style={[styles.catText, form.category === c && { color: '#fff' }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}><Text style={styles.saveText}>Add</Text></TouchableOpacity>
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
  total: { color: '#EF4444', fontSize: 13, marginTop: 2 },
  addBtn: { backgroundColor: '#10B981', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#1F2937', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  description: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  vendor: { color: '#9CA3AF', fontSize: 13, marginBottom: 2 },
  date: { color: '#6B7280', fontSize: 12 },
  amount: { color: '#EF4444', fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF', fontSize: 16, marginTop: 12, marginBottom: 20 },
  addFirstBtn: { backgroundColor: '#10B981', borderRadius: 8, paddingHorizontal: 24, paddingVertical: 12 },
  addFirstText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1F2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#9CA3AF', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#374151', borderRadius: 8, padding: 12, color: '#fff', marginBottom: 12, fontSize: 15 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#374151' },
  catText: { color: '#9CA3AF', fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '600' },
});

export default ExpensesScreen;
