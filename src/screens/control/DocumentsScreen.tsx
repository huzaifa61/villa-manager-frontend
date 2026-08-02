import React, { useCallback, useMemo, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { exportCsv } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import {
  PDF_MIME,
  runBinaryExport,
  runCsvExport,
  type TableExportPayload,
} from '../../utils/exportActions';
import ExportButtons from '../../components/ExportButtons';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';
import { confirmAction } from '../../utils/confirm';
import DateInput from '../../components/DateInput';
import { formatT, translateEnum } from '../../i18n/helpers';

const STORAGE_KEY = 'villa-documents-v1';
const DOCUMENT_TYPES = ['Receipt', 'Contract', 'Warranty', 'Permit', 'Insurance', 'Other'];
const emptyDocument = { title: '', type: 'Receipt', link: '', renewalDate: '', notes: '' };

export default function DocumentsScreen() {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const villaId = activeVillaId || user?.villaId || null;
  const permissions = permissionsFor(user);
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const [documents, setDocuments] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyDocument);

  const translateDocType = (type: string) => translateEnum(t, 'doc_type', type, type);

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
      Alert.alert(t('documentTitleRequired'), t('addDocumentTitleBody'));
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
      title: t('deleteDocumentTitle'),
      message: formatT(t('willBeRemoved'), { name: doc.title }),
      onConfirm: () => saveAll(documents.filter((item) => item.id !== doc.id)),
    });
  };

  const documentsExportBody = (): TableExportPayload => ({
    fileName: 'documents',
    title: t('documentsTitle'),
    sheetName: 'Documents',
    headers: ['Title', 'Type', 'Link / Reference', 'Renewal Date', 'Notes', 'Updated At'],
    rows: filtered.map((doc) => [doc.title, doc.type, doc.link, doc.renewalDate, doc.notes, doc.updatedAt]),
  });

  const exportDocuments = async () => {
    if (!villaId) {
      const body = documentsExportBody();
      const villaName = await getActiveVillaName(villaId);
      await exportCsv('documents.csv', body.headers, body.rows, { title: t('documentsTitle'), villaName });
      return;
    }
    const body = documentsExportBody();
    const villaName = await getActiveVillaName(villaId);
    await runCsvExport(t, () => apiService.exportTableCsv(villaId, body).then((r) => {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(r.data);
    }), {
      filename: 'documents.csv',
      headers: body.headers,
      rows: body.rows,
      options: { title: t('documentsTitle'), villaName },
    });
  };

  const exportDocumentsPdf = () => {
    if (!villaId) return;
    const body = documentsExportBody();
    return runBinaryExport(
      t,
      () => apiService.exportTablePdf(villaId, body),
      'documents.pdf',
      PDF_MIME,
    );
  };

  const restrictedView = (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('documentsTitle')}</Text>
          <Text style={styles.subtitle}>{t('sectionManagersOnly')}</Text>
        </View>
      </View>
      <View style={styles.restricted}>
        <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
        <Text style={styles.emptyTitle}>{t('accessRestricted')}</Text>
      </View>
    </SafeAreaView>
  );

  if (!permissions.canManageVilla) {
    return restrictedView;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('documentsTitle')}</Text>
          <Text style={styles.subtitle}>{t('documentsSubtitle')}</Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
          <ExportButtons onCsv={exportDocuments} onPdf={exportDocumentsPdf} />
          <TouchableOpacity style={[styles.button, styles.primaryButton, { flexDirection: rowDirection }]} onPress={() => setShowForm(!showForm)}>
            <Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color={theme.onPrimary} />
            <Text style={styles.primaryButtonText}>{showForm ? t('close') : t('add')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.notice, { flexDirection: rowDirection }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#60A5FA" />
          <Text style={styles.noticeText}>{t('documentsNotice')}</Text>
        </View>

        <View style={[styles.searchWrap, { flexDirection: rowDirection }]}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput
            style={[styles.search, { textAlign }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchDocuments')}
            placeholderTextColor={theme.muted}
          />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? t('editDocument') : t('addDocument')}</Text>
            <TextInput
              style={[styles.input, { textAlign }]}
              value={form.title}
              onChangeText={(title) => setForm({ ...form, title })}
              placeholder={t('documentTitle')}
              placeholderTextColor={theme.muted}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity key={type} style={[styles.choice, form.type === type && styles.choiceActive]} onPress={() => setForm({ ...form, type })}>
                  <Text style={[styles.choiceText, form.type === type && styles.choiceTextActive]}>{translateDocType(type)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[styles.input, { textAlign }]}
              value={form.link}
              onChangeText={(link) => setForm({ ...form, link })}
              placeholder={t('linkReferencePlaceholder')}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
            />
            <DateInput
              value={form.renewalDate}
              onChange={(renewalDate) => setForm({ ...form, renewalDate })}
              style={[styles.input, { textAlign }]}
              placeholder={t('renewalExpiryPlaceholder')}
              clearable
            />
            <TextInput
              style={[styles.input, styles.textarea, { textAlign }]}
              value={form.notes}
              onChangeText={(notes) => setForm({ ...form, notes })}
              placeholder={t('notes')}
              placeholderTextColor={theme.muted}
              multiline
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveDocument}>
              <Text style={styles.saveText}>{t('saveDocument')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.list}>
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={42} color={theme.muted} />
              <Text style={styles.emptyTitle}>{t('noDocumentsFound')}</Text>
            </View>
          ) : filtered.map((doc) => (
            <View key={doc.id} style={styles.card}>
              <View style={[styles.cardTop, { flexDirection: rowDirection }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { textAlign }]}>{doc.title}</Text>
                  <Text style={[styles.muted, { textAlign }]}>
                    {translateDocType(doc.type)}{doc.renewalDate ? ` • ${t('renewalLabel')} ${doc.renewalDate}` : ''}
                  </Text>
                </View>
                <Text style={styles.badge}>{translateDocType(doc.type)}</Text>
              </View>
              {doc.link ? <Text style={[styles.notes, { textAlign }]}>{doc.link}</Text> : null}
              {doc.notes ? <Text style={[styles.notes, { textAlign }]}>{doc.notes}</Text> : null}
              <View style={[styles.actions, { flexDirection: rowDirection }]}>
                <TouchableOpacity style={styles.smallButton} onPress={() => editDocument(doc)}>
                  <Text style={styles.smallText}>{t('edit')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.deleteButton, { flexDirection: rowDirection }]} onPress={() => deleteDocument(doc)}>
                  <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                  <Text style={styles.deleteText}>{t('delete')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (
  theme: any,
  textAlign: 'right' | 'left',
  rowDirection: 'row-reverse' | 'row',
  direction: 'rtl' | 'ltr',
) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold', textAlign, writingDirection: direction },
  subtitle: { color: theme.muted, marginTop: 3, textAlign, writingDirection: direction },
  headerActions: { alignItems: 'center', gap: 8 },
  button: { backgroundColor: theme.chip, borderRadius: 8, minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  primaryButton: { backgroundColor: theme.primary },
  primaryButtonText: { color: theme.onPrimary, fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  notice: { backgroundColor: '#0F2230', borderColor: '#1F3A4D', borderWidth: 1, padding: 12, borderRadius: 10, gap: 8, marginBottom: 14, alignItems: 'flex-start' },
  noticeText: { color: '#93C5FD', flex: 1, lineHeight: 18, textAlign, writingDirection: direction },
  searchWrap: { alignItems: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: theme.text, flex: 1, paddingVertical: 11, writingDirection: direction },
  panel: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', textAlign, writingDirection: direction },
  input: { backgroundColor: theme.background, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, writingDirection: direction },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  choice: { backgroundColor: theme.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: direction === 'rtl' ? 0 : 8, marginLeft: direction === 'rtl' ? 8 : 0 },
  choiceActive: { backgroundColor: theme.primary },
  choiceText: { color: theme.subtleText, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: theme.onPrimary },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  saveText: { color: theme.onPrimary, fontWeight: '900' },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 10, textAlign, writingDirection: direction },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14 },
  cardTop: { gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: theme.text, fontWeight: '900', fontSize: 16, writingDirection: direction },
  muted: { color: theme.muted, fontSize: 12, marginTop: 4, writingDirection: direction },
  badge: { color: '#DBEAFE', backgroundColor: '#1E3A8A', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  notes: { color: theme.subtleText, marginTop: 10, lineHeight: 18, writingDirection: direction },
  actions: { gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: theme.subtleText, fontWeight: '800' },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900' },
});
