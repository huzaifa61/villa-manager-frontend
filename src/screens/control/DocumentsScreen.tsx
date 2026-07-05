import React, { useCallback, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { exportCsv } from '../../utils/csv';

const STORAGE_KEY = 'villa-documents-v1';
const emptyDocument = { title: '', type: 'Receipt', link: '', renewalDate: '', notes: '' };
const types = ['Receipt', 'Contract', 'Warranty', 'Permit', 'Insurance', 'Other'];

export default function DocumentsScreen() {
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
    Alert.alert('Delete document?', doc.title + ' will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveAll(documents.filter((item) => item.id !== doc.id)) },
    ]);
  };

  const exportDocuments = () => exportCsv('documents.csv',
    ['Title', 'Type', 'Link / Reference', 'Renewal Date', 'Notes', 'Updated At'],
    filtered.map((doc) => [doc.title, doc.type, doc.link, doc.renewalDate, doc.notes, doc.updatedAt]));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Documents</Text>
          <Text style={styles.subtitle}>Reference links and record notes.</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.button} onPress={exportDocuments}><Ionicons name="download-outline" size={17} color="#fff" /><Text style={styles.buttonText}>CSV</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={() => setShowForm(!showForm)}><Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color="#fff" /><Text style={styles.buttonText}>{showForm ? 'Close' : 'Add'}</Text></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#60A5FA" />
          <Text style={styles.noticeText}>Use this section for references, links, expiry dates, and notes. Keep large photos or receipt files in your configured external storage.</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search documents..." placeholderTextColor="#6B7280" />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? 'Edit Document' : 'Add Document'}</Text>
            <TextInput style={styles.input} value={form.title} onChangeText={(title) => setForm({ ...form, title })} placeholder="Title" placeholderTextColor="#6B7280" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {types.map((type) => (
                <TouchableOpacity key={type} style={[styles.choice, form.type === type && styles.choiceActive]} onPress={() => setForm({ ...form, type })}>
                  <Text style={[styles.choiceText, form.type === type && styles.choiceTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput style={styles.input} value={form.link} onChangeText={(link) => setForm({ ...form, link })} placeholder="Link, reference number, or location" placeholderTextColor="#6B7280" autoCapitalize="none" />
            <TextInput style={styles.input} value={form.renewalDate} onChangeText={(renewalDate) => setForm({ ...form, renewalDate })} placeholder="Renewal / expiry date" placeholderTextColor="#6B7280" />
            <TextInput style={[styles.input, styles.textarea]} value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Notes" placeholderTextColor="#6B7280" multiline />
            <TouchableOpacity style={styles.saveButton} onPress={saveDocument}><Text style={styles.saveText}>Save Document</Text></TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={42} color="#6B7280" />
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
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteDocument(doc)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', marginTop: 3 },
  headerActions: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  primaryButton: { backgroundColor: '#10B981' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  notice: { backgroundColor: '#0F2230', borderColor: '#1F3A4D', borderWidth: 1, padding: 12, borderRadius: 10, flexDirection: 'row', gap: 8, marginBottom: 14 },
  noticeText: { color: '#93C5FD', flex: 1, lineHeight: 18 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: '#fff', flex: 1, paddingVertical: 11 },
  panel: { backgroundColor: '#1F2937', borderRadius: 12, borderColor: '#374151', borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  input: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, borderRadius: 10, color: '#fff', paddingHorizontal: 12, paddingVertical: 10 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  choice: { backgroundColor: '#374151', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  choiceActive: { backgroundColor: '#10B981' },
  choiceText: { color: '#D1D5DB', fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: '#fff' },
  saveButton: { backgroundColor: '#10B981', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '900' },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 10 },
  card: { backgroundColor: '#1F2937', borderRadius: 12, borderColor: '#374151', borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: '#fff', fontWeight: '900', fontSize: 16 },
  muted: { color: '#9CA3AF', fontSize: 12, marginTop: 4 },
  badge: { color: '#DBEAFE', backgroundColor: '#1E3A8A', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  notes: { color: '#D1D5DB', marginTop: 10, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: '#E5E7EB', fontWeight: '800' },
  deleteButton: { backgroundColor: '#4C1D1D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: '#FCA5A5', fontWeight: '900' },
});
