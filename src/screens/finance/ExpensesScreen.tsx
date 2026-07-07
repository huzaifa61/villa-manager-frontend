import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, SafeAreaView, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { incrementVillaNotification } from '../../store/slices/notificationsSlice';
import { apiService } from '../../services/api';
import { exportCsv, exportCsvContent } from '../../utils/csv';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';

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

interface ExpenseTemplate {
  id: number;
  templateName: string;
  description: string;
  amount: number;
  categoryId?: number;
  apartmentId?: number;
  dayOfMonth: number;
  isActive?: boolean;
  lastGeneratedForMonth?: string;
}

const CATEGORIES = [
  'Porter Salary', 'Electricity', 'Water', 'Gas', 'Maintenance',
  'Cleaning', 'Security', 'Management Fee', 'Insurance', 'Other',
];
const CATEGORY_COLORS: Record<string, string> = {
  'Porter Salary': '#8B5CF6', 'Electricity': '#F59E0B', 'Water': '#3B82F6',
  'Gas': '#F97316', 'Maintenance': '#EF4444', 'Cleaning': '#10B981',
  'Security': '#DC2626', 'Management Fee': '#6366F1', 'Insurance': '#0EA5E9', 'Other': '#6B7280',
};
const SPLIT_TYPES = [
  { key: 'ALL_EQUAL', label: 'All apartments — equal split' },
  { key: 'SINGLE', label: 'Single apartment' },
  { key: 'SELECTED_EQUAL', label: 'Selected apartments — equal split' },
  { key: 'SELECTED_CUSTOM', label: 'Selected apartments — custom amounts' },
];
const emptyForm = { description: '', amount: '', category: 'Porter Salary', splitType: 'ALL_EQUAL', apartmentId: '', date: new Date().toISOString().split('T')[0] };
const emptyTemplateForm = { templateName: '', description: '', amount: '', category: 'Maintenance', apartmentId: '', dayOfMonth: '1', isActive: true };
const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

const ExpensesScreen = () => {
  const { theme } = useAppPreferences();
  const dispatch = useDispatch();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [templateForm, setTemplateForm] = useState(emptyTemplateForm);
  const [selectedAptIds, setSelectedAptIds] = useState<number[]>([]);
  const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
  const [showCategoryDD, setShowCategoryDD] = useState(false);
  const [showSplitDD, setShowSplitDD] = useState(false);
  const [showAptDD, setShowAptDD] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [e, a, t] = await Promise.all([
        apiService.getExpenses(villaId).catch(() => []),
        apiService.getApartments(villaId).catch(() => []),
        apiService.getExpenseTemplates(villaId).catch(() => []),
      ]);
      setExpenses(Array.isArray(e) ? e : []);
      setApartments(Array.isArray(a) ? a : []);
      setTemplates(Array.isArray(t) ? t : []);
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
    setSelectedAptIds([]);
    setCustomAmounts({});
    setModalVisible(true);
  };

  const openEdit = (expense: Expense) => {
    setEditing(expense);
    setForm({
      description: expense.description || '',
      amount: String(expense.amount || ''),
      category: expense.categoryName || 'Porter Salary',
      splitType: expense.apartmentId ? 'SINGLE' : 'ALL_EQUAL',
      apartmentId: expense.apartmentId ? String(expense.apartmentId) : '',
      date: expense.expenseDate || new Date().toISOString().split('T')[0],
    });
    setSelectedAptIds([]);
    setCustomAmounts({});
    setModalVisible(true);
  };

  const openAddTemplate = () => {
    setEditingTemplate(null);
    setTemplateForm(emptyTemplateForm);
    setTemplateModalVisible(true);
  };

  const openEditTemplate = (template: ExpenseTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      templateName: template.templateName || '',
      description: template.description || '',
      amount: String(template.amount || ''),
      category: CATEGORIES[(template.categoryId || 1) - 1] || 'Maintenance',
      apartmentId: template.apartmentId ? String(template.apartmentId) : '',
      dayOfMonth: String(template.dayOfMonth || 1),
      isActive: template.isActive !== false,
    });
    setTemplateModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.amount) { Alert.alert('Error', 'Amount is required'); return; }
    if (form.splitType === 'SINGLE' && !form.apartmentId) { Alert.alert('Error', 'Please select an apartment'); return; }
    if ((form.splitType === 'SELECTED_EQUAL' || form.splitType === 'SELECTED_CUSTOM') && selectedAptIds.length === 0) { Alert.alert('Error', 'Please select at least one apartment'); return; }

    const customAmountsObj: Record<string, number> = {};
    if (form.splitType === 'SELECTED_CUSTOM') {
      for (const id of selectedAptIds) {
        customAmountsObj[String(id)] = Number(customAmounts[id] || 0);
      }
    }

    const body: any = {
      description: form.description.trim(),
      amount: Number(form.amount || 0),
      categoryId: Math.max(CATEGORIES.indexOf(form.category) + 1, 1),
      expenseDate: form.date,
      splitType: form.splitType,
      apartmentId: form.splitType === 'SINGLE' && form.apartmentId ? Number(form.apartmentId) : null,
      selectedApartmentIds: (form.splitType === 'SELECTED_EQUAL' || form.splitType === 'SELECTED_CUSTOM') ? selectedAptIds : null,
      customAmounts: form.splitType === 'SELECTED_CUSTOM' ? customAmountsObj : null,
    };

    setSaving(true);
    try {
      if (editing) {
        await apiService.updateExpense(villaId, editing.id, body);
      } else {
        await apiService.createExpense(villaId, body);
        // Dispatch notification for new expense
        dispatch(incrementVillaNotification(String(villaId)));
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
            await apiService.deleteExpense(villaId, expense.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  const handleSaveTemplate = async () => {
    if (!templateForm.templateName.trim() || !templateForm.description.trim() || !templateForm.amount) {
      Alert.alert('Error', 'Template name, description, and amount are required');
      return;
    }
    const dayOfMonth = Math.max(1, Math.min(31, Number(templateForm.dayOfMonth || 1)));
    const body = {
      templateName: templateForm.templateName.trim(),
      description: templateForm.description.trim(),
      amount: Number(templateForm.amount || 0),
      categoryId: Math.max(CATEGORIES.indexOf(templateForm.category) + 1, 1),
      apartmentId: templateForm.apartmentId ? Number(templateForm.apartmentId) : null,
      dayOfMonth,
      isActive: templateForm.isActive,
    };
    setSaving(true);
    try {
      if (editingTemplate) {
        await apiService.updateExpenseTemplate(villaId, editingTemplate.id, body);
      } else {
        await apiService.createExpenseTemplate(villaId, body);
      }
      setTemplateModalVisible(false);
      await fetchData();
      Alert.alert('Success', editingTemplate ? 'Template updated' : 'Template added');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = (template: ExpenseTemplate) => {
    Alert.alert('Delete Template', 'Delete ' + template.templateName + '?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiService.deleteExpenseTemplate(villaId, template.id);
            await fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete template');
          }
        },
      },
    ]);
  };

  const runDueTemplates = async () => {
    try {
      const generated = await apiService.runDueExpenseTemplates(villaId);
      await fetchData();
      Alert.alert('Recurring Expenses', String(generated || 0) + ' due expense(s) generated');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to run templates');
    }
  };

  const exportExpenses = async () => {
    try {
      const csv = await apiService.exportExpensesCsv(villaId);
      await exportCsvContent('expenses.csv', csv);
    } catch {
      await exportCsv('expenses.csv',
        ['ID', 'Apartment ID', 'Apartment', 'Category', 'Description', 'Amount', 'Expense Date'],
        filteredExpenses.map((e) => [
          e.id,
          e.apartmentId,
          e.apartmentNumber || 'All apartments',
          e.categoryName || CATEGORIES[(e.categoryId || 1) - 1] || 'Maintenance',
          e.description,
          e.amount,
          e.expenseDate,
        ]));
    }
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
            <View style={[styles.badge, { backgroundColor: CATEGORY_COLORS[category] || theme.muted }]}>
              <Text style={styles.badgeText}>{category}</Text>
            </View>
          </View>
        </View>
        {permissions.canManageFinancials ? <View style={styles.actions}>
          <TouchableOpacity style={styles.smallBtn} onPress={() => openEdit(item)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </View> : null}
      </View>
    );
  };

  const renderTemplate = (template: ExpenseTemplate) => {
    const category = CATEGORIES[(template.categoryId || 1) - 1] || 'Maintenance';
    const apartment = apartments.find((a) => a.id === template.apartmentId);
    return (
      <View key={template.id} style={styles.templateCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.templateTitle}>{template.templateName}</Text>
          <Text style={styles.templateMeta}>{category} - {apartment ? 'Apt ' + apartment.apartmentNumber : 'All apartments'}</Text>
          <Text style={styles.templateMeta}>Day {template.dayOfMonth} monthly{template.lastGeneratedForMonth ? ' - last ' + template.lastGeneratedForMonth : ''}</Text>
        </View>
        <Text style={styles.templateAmount}>{money(template.amount)}</Text>
        {permissions.canManageFinancials ? <>
          <TouchableOpacity style={styles.smallBtn} onPress={() => openEditTemplate(template)}><Text style={styles.smallBtnText}>Edit</Text></TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteTemplate(template)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
        </> : null}
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
        <View style={styles.headerActions}>
          {permissions.canManageFinancials ? <TouchableOpacity style={styles.templateBtn} onPress={openAddTemplate}>
            <Ionicons name="repeat-outline" size={17} color="#D1FAE5" />
            <Text style={styles.exportText}>Templates</Text>
          </TouchableOpacity> : null}
          <TouchableOpacity style={styles.exportBtn} onPress={exportExpenses}>
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
        <TextInput style={styles.search} placeholder="Search expenses..." placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} />
      </View>

      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> :
        filteredExpenses.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="receipt-outline" size={60} color="#4B5563" />
            <Text style={styles.emptyText}>{query ? 'No expenses match your search' : 'No expenses yet'}</Text>
            {!query && permissions.canManageFinancials ? <TouchableOpacity style={styles.addFirstBtn} onPress={openAdd}><Text style={styles.addFirstText}>Add Expense</Text></TouchableOpacity> : null}
          </View>
        ) : <FlatList data={filteredExpenses} renderItem={renderItem} keyExtractor={(i) => i.id.toString()} contentContainerStyle={{ padding: 16 }} />}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editing ? 'Edit Expense' : 'Add Expense'}</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={28} color={theme.muted} /></TouchableOpacity>
              </View>

              {/* Date + Category */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>Date *</Text>
                  <TextInput style={styles.input} value={form.date} onChangeText={(v) => setForm({ ...form, date: v })} placeholderTextColor="#9CA3AF" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Category *</Text>
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowCategoryDD(!showCategoryDD)}>
                    <Text style={styles.dropdownBtnText} numberOfLines={1}>{form.category}</Text>
                    <Ionicons name={showCategoryDD ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />
                  </TouchableOpacity>
                  {showCategoryDD && <View style={styles.dropdownMenu}>
                    {CATEGORIES.map((c) => <TouchableOpacity key={c} style={styles.dropdownItem} onPress={() => { setForm({ ...form, category: c }); setShowCategoryDD(false); }}>
                      <Text style={[styles.dropdownItemText, form.category === c && { color: theme.primary, fontWeight: '900' }]}>{c}</Text>
                    </TouchableOpacity>)}
                  </View>}
                </View>
              </View>

              {/* Description */}
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} placeholder="Description" placeholderTextColor="#9CA3AF" value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} />

              {/* Amount + Split Type */}
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>Amount (EGP) *</Text>
                  <TextInput style={styles.input} placeholder="0" placeholderTextColor="#9CA3AF" value={form.amount} onChangeText={(v) => setForm({ ...form, amount: v })} keyboardType="decimal-pad" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Split Type *</Text>
                  <TouchableOpacity style={[styles.dropdownBtn, { borderColor: theme.primary }]} onPress={() => setShowSplitDD(!showSplitDD)}>
                    <Text style={styles.dropdownBtnText} numberOfLines={1}>{SPLIT_TYPES.find(s => s.key === form.splitType)?.label || 'Select'}</Text>
                    <Ionicons name={showSplitDD ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />
                  </TouchableOpacity>
                  {showSplitDD && <View style={styles.dropdownMenu}>
                    {SPLIT_TYPES.map((s) => <TouchableOpacity key={s.key} style={styles.dropdownItem} onPress={() => { setForm({ ...form, splitType: s.key, apartmentId: '' }); setSelectedAptIds([]); setShowSplitDD(false); }}>
                      <Text style={[styles.dropdownItemText, form.splitType === s.key && { color: theme.primary, fontWeight: '900' }]}>{s.label}</Text>
                    </TouchableOpacity>)}
                  </View>}
                </View>
              </View>

              {/* SINGLE: Apartment dropdown */}
              {form.splitType === 'SINGLE' && (
                <View>
                  <Text style={styles.label}>Apartment *</Text>
                  <TouchableOpacity style={styles.dropdownBtn} onPress={() => setShowAptDD(!showAptDD)}>
                    <Text style={styles.dropdownBtnText}>{apartments.find(a => String(a.id) === form.apartmentId)?.apartmentNumber ? 'Apartment ' + apartments.find(a => String(a.id) === form.apartmentId)?.apartmentNumber : 'Select apartment'}</Text>
                    <Ionicons name={showAptDD ? 'chevron-up' : 'chevron-down'} size={14} color={theme.muted} />
                  </TouchableOpacity>
                  {showAptDD && <View style={styles.dropdownMenu}>
                    {apartments.map((a) => <TouchableOpacity key={a.id} style={styles.dropdownItem} onPress={() => { setForm({ ...form, apartmentId: String(a.id) }); setShowAptDD(false); }}>
                      <Text style={[styles.dropdownItemText, form.apartmentId === String(a.id) && { color: theme.primary, fontWeight: '900' }]}>Apartment {a.apartmentNumber}</Text>
                    </TouchableOpacity>)}
                  </View>}
                </View>
              )}

              {/* SELECTED_EQUAL or SELECTED_CUSTOM: checkboxes */}
              {(form.splitType === 'SELECTED_EQUAL' || form.splitType === 'SELECTED_CUSTOM') && (
                <View style={styles.aptSelectBox}>
                  <Text style={styles.aptSelectTitle}>Selected apartments</Text>
                  {apartments.map((a) => {
                    const checked = selectedAptIds.includes(a.id);
                    return (
                      <View key={a.id} style={styles.aptRow}>
                        <TouchableOpacity style={styles.aptRowLeft} onPress={() => {
                          setSelectedAptIds(checked ? selectedAptIds.filter(id => id !== a.id) : [...selectedAptIds, a.id]);
                        }}>
                          <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                            {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
                          </View>
                          <Text style={styles.aptLabel}>Apartment {a.apartmentNumber}</Text>
                        </TouchableOpacity>
                        {form.splitType === 'SELECTED_CUSTOM' && (
                          <TextInput
                            style={styles.customAmtInput}
                            placeholder="Custom amount"
                            placeholderTextColor="#9CA3AF"
                            value={customAmounts[a.id] || ''}
                            onChangeText={(v) => setCustomAmounts({ ...customAmounts, [a.id]: v })}
                            keyboardType="decimal-pad"
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={styles.saveText}>Save</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={templateModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingTemplate ? 'Edit Template' : 'Recurring Templates'}</Text>
                <TouchableOpacity onPress={() => setTemplateModalVisible(false)}><Ionicons name="close" size={26} color={theme.muted} /></TouchableOpacity>
              </View>

              {templates.length ? (
                <View style={styles.templateList}>
                  {templates.map(renderTemplate)}
                </View>
              ) : (
                <Text style={styles.emptyTemplateText}>No recurring templates yet.</Text>
              )}

              <Text style={styles.sectionTitle}>{editingTemplate ? 'Template Details' : 'Add Template'}</Text>
              <Text style={styles.label}>Template Name</Text>
              <TextInput style={styles.input} value={templateForm.templateName} onChangeText={(v) => setTemplateForm({ ...templateForm, templateName: v })} placeholder="Porter salary" placeholderTextColor="#9CA3AF" />
              <View style={styles.twoCol}>
                <View style={styles.col}>
                  <Text style={styles.label}>Amount</Text>
                  <TextInput style={styles.input} value={templateForm.amount} onChangeText={(v) => setTemplateForm({ ...templateForm, amount: v })} placeholder="0" placeholderTextColor="#9CA3AF" keyboardType="decimal-pad" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Day of Month</Text>
                  <TextInput style={styles.input} value={templateForm.dayOfMonth} onChangeText={(v) => setTemplateForm({ ...templateForm, dayOfMonth: v })} placeholder="1" placeholderTextColor="#9CA3AF" keyboardType="number-pad" />
                </View>
              </View>
              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={templateForm.description} onChangeText={(v) => setTemplateForm({ ...templateForm, description: v })} placeholder="Monthly recurring expense" placeholderTextColor="#9CA3AF" />

              <Text style={styles.label}>Allocation</Text>
              <View style={styles.catRow}>
                <TouchableOpacity style={[styles.catBtn, !templateForm.apartmentId && styles.catActive]} onPress={() => setTemplateForm({ ...templateForm, apartmentId: '' })}>
                  <Text style={[styles.catText, !templateForm.apartmentId && { color: theme.onPrimary }]}>All apartments</Text>
                </TouchableOpacity>
                {apartments.map((a) => (
                  <TouchableOpacity key={a.id} style={[styles.catBtn, templateForm.apartmentId === String(a.id) && styles.catActive]} onPress={() => setTemplateForm({ ...templateForm, apartmentId: String(a.id) })}>
                    <Text style={[styles.catText, templateForm.apartmentId === String(a.id) && { color: theme.onPrimary }]}>Apt {a.apartmentNumber}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity key={c} style={[styles.catBtn, templateForm.category === c && { backgroundColor: CATEGORY_COLORS[c] }]} onPress={() => setTemplateForm({ ...templateForm, category: c })}>
                    <Text style={[styles.catText, templateForm.category === c && { color: theme.onPrimary }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.statusRow}>
                <TouchableOpacity style={[styles.catBtn, templateForm.isActive && styles.catActive]} onPress={() => setTemplateForm({ ...templateForm, isActive: !templateForm.isActive })}>
                  <Text style={[styles.catText, templateForm.isActive && { color: theme.onPrimary }]}>{templateForm.isActive ? 'Active' : 'Paused'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.smallBtn} onPress={runDueTemplates}><Text style={styles.smallBtnText}>Run due now</Text></TouchableOpacity>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setTemplateModalVisible(false)} disabled={saving}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSaveTemplate} disabled={saving}>
                  {saving ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={styles.saveText}>Save Template</Text>}
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
  total: { color: theme.danger, fontSize: 13, marginTop: 2, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  exportBtn: { backgroundColor: theme.chip, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.border },
  templateBtn: { backgroundColor: '#064E3B', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  exportText: { color: theme.text, fontSize: 12, fontWeight: '800' },
  addBtn: { backgroundColor: theme.primary, borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 0, backgroundColor: theme.card, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: theme.chip },
  search: { flex: 1, color: theme.text, paddingVertical: 12, fontSize: 14 },
  card: { backgroundColor: theme.card, borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  description: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
  meta: { color: theme.muted, fontSize: 13, marginBottom: 2 },
  date: { color: theme.muted, fontSize: 12 },
  amount: { color: theme.danger, fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: theme.onPrimary, fontSize: 10, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
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
  dropdownBtn: { backgroundColor: theme.chip, borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, borderWidth: 1, borderColor: theme.border },
  dropdownBtnText: { color: theme.text, fontSize: 13, flex: 1, fontWeight: '600' },
  dropdownMenu: { backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 8, maxHeight: 180 },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 13 },
  aptSelectBox: { backgroundColor: theme.chip, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 12, marginBottom: 12 },
  aptSelectTitle: { color: theme.muted, fontSize: 12, fontWeight: '800', marginBottom: 10 },
  aptRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  aptRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  aptLabel: { color: theme.text, fontSize: 14, fontWeight: '600' },
  customAmtInput: { backgroundColor: theme.card, borderRadius: 8, borderWidth: 1, borderColor: theme.border, paddingHorizontal: 10, paddingVertical: 6, color: theme.text, fontSize: 13, width: 130 },
  sectionTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginBottom: 10, marginTop: 6 },
  label: { color: theme.muted, fontSize: 13, marginBottom: 8, marginTop: 4, fontWeight: '700' },
  input: { backgroundColor: theme.chip, borderRadius: 8, padding: 12, color: theme.text, marginBottom: 12, fontSize: 15 },
  twoCol: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16, alignItems: 'center' },
  catBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.chip },
  catActive: { backgroundColor: theme.primary },
  catText: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  templateList: { gap: 8, marginBottom: 16 },
  templateCard: { backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.chip, padding: 12, gap: 8 },
  templateTitle: { color: theme.text, fontWeight: '900', fontSize: 14 },
  templateMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  templateAmount: { color: theme.danger, fontSize: 15, fontWeight: '900' },
  emptyTemplateText: { color: theme.muted, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, backgroundColor: theme.chip, borderRadius: 8, padding: 14, alignItems: 'center' },
  cancelText: { color: theme.muted, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: theme.primary, borderRadius: 8, padding: 14, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '600' },
});

export default ExpensesScreen;
