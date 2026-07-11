import React, { useCallback, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { exportCsv } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';
import { confirmAction } from '../../utils/confirm';

const STORAGE_KEY = 'villa-documents-v1';
const emptyDocument = { title: '', type: 'Receipt', link: '', renewalDate: '', notes: '' };
const types = ['Receipt', 'Contract', 'Warranty', 'Permit', 'Insurance', 'Other'];

export default function DocumentsScreen() {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const villaId = activeVillaId || user?.villaId || null;
  const permissions = permissionsFor(user);
  const styles = makeStyles(theme);
  const [documents, setDocuments] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDocument);

  const loadDocuments = useCallback(async () => {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    setDocuments(saved ? JSON.parse(saved) : []);
  }, []);

  useFocusEffect(useCallback(() => { loadDocuments(); }, [loadDocuments]));

  const saveAll = async (next: any[]) => {
    setDocuments(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const filtered = useMemo(() => documents.filter((doc) => {
    const haystack = [doc.title, doc.type, doc.link, doc.renewalDate, doc.notes].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [documents, query]);

  const saveDocument = async () => {
    if (!form.title.trim()) {
      Alert.alert('Title required', 'Please add a document title.');
      return;
    }
    const item = {
      ...form,
      id: editingId || String(Date.now()),
      updatedAt: new Date().toISOString(),
    };
    const next = editingId ? documents.map((doc) => doc.id === editingId ? item : doc) : [item, ...documents];
    await saveAll(next);
    setForm(emptyDocument);
    setEditingId(null);
    setShowForm(false);
  };

  const editDocument = (doc: any) => {
    setEditingId(doc.id);
    setForm({ title: doc.title || '', type: doc.type || 'Receipt', link: doc.link || '', renewalDate: doc.renewalDate || '', notes: doc.notes || '' });
    setShowForm(true);
  };

  const deleteDocument = (doc: any) => {
    confirmAction({
      title: 'Delete document?',
      message: doc.title + ' will be removed.',
      onConfirm: () => saveAll(documents.filter((item) => item.id !== doc.id)),
    });
  };

  const exportDocuments = async () => {
    const villaName = await getActiveVillaName(villaId);
    await exportCsv('documents.csv',
      ['Title', 'Type', 'Link / Reference', 'Renewal Date', 'Notes', 'Updated At'],
      filtered.map((doc) => [doc.title, doc.type, doc.link, doc.renewalDate, doc.notes, doc.updatedAt]),
      { title: 'Documents', villaName });
  };

  if (!permissions.canManageVilla) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Documents</Text>
            <Text style={styles.subtitle}>This section is available to villa managers.</Text>
          </View>
        </View>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
          <Text style={styles.emptyTitle}>Access restricted</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Reference links and record notes.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.button} onPress={exportDocuments}><Ionicons name="download-outline" size={18} color={theme.text} /><Text style={styles.buttonText}>CSV</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => setShowForm(!showForm)}><Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color={theme.onPrimary} /><Text style={styles.primaryButtonText}>{showForm ? 'Close' : 'Add'}</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#60A5FA" />
          <Text style={styles.noticeText}>Use this section for references, links, expiry dates, and notes. Keep large photos or receipt files in your configured external storage.</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search documents..." placeholderTextColor={theme.muted} />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? 'Edit Document' : 'Add Document'}</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Title" placeholderTextColor={theme.muted} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {types.map((type) => (
                <TouchableOpacity key={type} style={[styles.choice, form.type === type && styles.choiceActive]} onPress={() => setForm({ ...form, type })}>
                  <Text style={[styles.choiceText, form.type === type && styles.choiceTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} value={form.link} onChangeText={(link) => setForm({ ...form, link })} placeholder="Link, reference number, or location" placeholderTextColor={theme.muted} autoCapitalize="none" />
            <TextInput style={styles.input} value={form.renewalDate} onChangeText={(renewalDate) => setForm({ ...form, renewalDate })} placeholder="Renewal / expiry date" placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, styles.textarea]} value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Notes" placeholderTextColor={theme.muted} multiline />
            <TouchableOpacity style={styles.saveButton} onPress={saveDocument}><Text style={styles.saveText}>Save Document</Text></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={42} color={theme.muted} />
              <Text style={styles.emptyTitle}>No documents found.</Text>
            </View>
          ) : filtered.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{doc.title}</Text>
                  <Text style={styles.muted}>{doc.type}{doc.renewalDate ? ' • Renewal ' + doc.renewalDate : ''}</Text>
                </View>
                <Text style={styles.badge}>{doc.type}</Text>
              </View>
              {doc.link ? <Text style={styles.notes}>{doc.link}</Text> : null}
              {doc.notes ? <Text style={styles.notes}>{doc.notes}</Text> : null}
              <View style={styles.actions}>
                <TouchableOpacity style={styles.smallButton} onPress={() => editDocument(doc)}><Text style={styles.smallText}>Edit</Text></TouchableOpacity>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteDocument(doc)}>
                  <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: theme.muted, marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: theme.chip, borderRadius: 8, minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  primaryButton: { backgroundColor: theme.primary },
  buttonText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  primaryButtonText: { color: theme.onPrimary, fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  notice: { backgroundColor: '#0F2230', borderColor: '#1F3A4D', borderWidth: 1, padding: 12, borderRadius: 10, flexDirection: 'row', gap: 8, marginBottom: 14 },
  noticeText: { color: '#93C5FD', flex: 1, lineHeight: 18 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: theme.text, flex: 1, paddingVertical: 11 },
  panel: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  input: { backgroundColor: theme.background, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  choice: { backgroundColor: theme.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  choiceActive: { backgroundColor: theme.primary },
  choiceText: { color: theme.subtleText, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: theme.onPrimary },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '900' },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 10 },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: theme.text, fontWeight: '900', fontSize: 16 },
  muted: { color: theme.muted, fontSize: 12, marginTop: 4 },
  badge: { color: '#DBEAFE', backgroundColor: '#1E3A8A', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  notes: { color: theme.subtleText, marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: theme.subtleText, fontWeight: '800' },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900' },
});
