import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { getActiveVillaName } from '../../utils/villa';
import { PDF_MIME, runBinaryExport, runCsvExport } from '../../utils/exportActions';
import ExportButtons from '../../components/ExportButtons';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';
import { confirmAction } from '../../utils/confirm';
import { formatT } from '../../i18n/helpers';

const emptyVendor = { name: '', contactPerson: '', phoneNumber: '', email: '', address: '', serviceType: '', region: '', isActive: true };

export default function VendorsScreen() {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || null;
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const [vendors, setVendors] = useState<any[]>([]);
  const [villaRegion, setVillaRegion] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyVendor);

  const loadVillaRegion = useCallback(async () => {
    if (!villaId) {
      setVillaRegion('');
      return;
    }
    try {
      const villas = await apiService.getVillas().catch(() => []);
      const villa = (Array.isArray(villas) ? villas : []).find((item: any) => item.id === villaId);
      setVillaRegion(villa?.region || '');
    } catch {
      setVillaRegion('');
    }
  }, [villaId]);

  const fetchVendors = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.getVendors().catch(() => []);
      setVendors(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadVillaRegion();
    fetchVendors();
  }, [loadVillaRegion, fetchVendors]));

  const filtered = useMemo(() => vendors.filter((vendor) => {
    const haystack = [vendor.name, vendor.contactPerson, vendor.phoneNumber, vendor.email, vendor.address, vendor.serviceType, vendor.region].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase());
  }), [vendors, query]);

  const openAddForm = () => {
    setEditingId(null);
    setForm({
      ...emptyVendor,
      region: permissions.isVillaManager ? villaRegion : '',
    });
    setShowForm(true);
  };

  const startEdit = (vendor: any) => {
    setEditingId(vendor.id);
    setForm({
      name: vendor.name || '',
      contactPerson: vendor.contactPerson || '',
      phoneNumber: vendor.phoneNumber || '',
      email: vendor.email || '',
      address: vendor.address || '',
      serviceType: vendor.serviceType || '',
      region: vendor.region || '',
      isActive: vendor.isActive !== false,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyVendor);
    setShowForm(false);
  };

  const saveVendor = async () => {
    if (!form.name.trim()) {
      Alert.alert(t('vendorNameRequired'), t('addVendorNameBody'));
      return;
    }
    const region = permissions.isVillaManager ? villaRegion : form.region.trim();
    if (!region) {
      Alert.alert(
        t('locationRequired'),
        permissions.isVillaManager ? t('villaRegionRequiredBody') : t('addVendorRegionBody'),
      );
      return;
    }
    try {
      const payload = { ...form, region };
      if (editingId) await apiService.updateVendor(editingId, payload);
      else await apiService.createVendor(payload);
      resetForm();
      await fetchVendors();
    } catch (error: any) {
      Alert.alert(t('couldNotSave'), error?.response?.data?.error || error?.message || t('pleaseTryAgain'));
    }
  };

  const deleteVendor = (vendor: any) => {
    confirmAction({
      title: t('deleteVendorTitle'),
      message: formatT(t('willBeRemoved'), { name: vendor.name }),
      onConfirm: async () => {
        await apiService.deleteVendor(vendor.id);
        await fetchVendors();
      },
    });
  };

  const vendorExportFallback = () => ({
    filename: 'vendors.csv',
    headers: ['ID', 'Name', 'Contact Person', 'Phone', 'Email', 'Service Type', 'Location', 'Address', 'Active'],
    rows: filtered.map((vendor) => [
      vendor.id,
      vendor.name,
      vendor.contactPerson,
      vendor.phoneNumber,
      vendor.email,
      vendor.serviceType,
      vendor.region,
      vendor.address,
      vendor.isActive !== false ? t('yes') : t('no'),
    ]),
  });

  const exportVendors = async () => {
    const villaName = await getActiveVillaName(villaId);
    const fallback = vendorExportFallback();
    await runCsvExport(t, () => apiService.exportVendorsCsv(villaId), {
      ...fallback,
      options: { title: t('vendorsTitle'), villaName },
    });
  };

  const exportVendorsPdf = () =>
    runBinaryExport(t, () => apiService.exportVendorsPdf(villaId), 'vendors.pdf', PDF_MIME);

  const subtitle = permissions.isGeneralManager
    ? t('privateProviderDirectory')
    : formatT(t('providersInArea'), { area: villaRegion || t('yourArea') });

  if (!permissions.canManageVendors) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t('vendorsTitle')}</Text>
            <Text style={styles.subtitle}>{t('sectionManagersOnly')}</Text>
          </View>
        </View>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
          <Text style={styles.emptyTitle}>{t('accessRestricted')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t('vendorsTitle')}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <View style={[styles.headerActions, { flexDirection: rowDirection }]}>
          <ExportButtons onCsv={exportVendors} onPdf={exportVendorsPdf} />
          <TouchableOpacity style={[styles.button, styles.primaryButton, { flexDirection: rowDirection }]} onPress={() => (showForm ? resetForm() : openAddForm())}>
            <Ionicons name={showForm ? 'close-outline' : 'add-outline'} size={17} color={theme.onPrimary} />
            <Text style={styles.primaryButtonText}>{showForm ? t('close') : t('add')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.searchWrap, { flexDirection: rowDirection }]}>
          <Ionicons name="search-outline" size={18} color={theme.muted} />
          <TextInput
            style={[styles.search, { textAlign }]}
            value={query}
            onChangeText={setQuery}
            placeholder={t('searchVendors')}
            placeholderTextColor={theme.muted}
          />
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>{editingId ? t('editVendor') : t('addVendor')}</Text>
            <Text style={styles.label}>{t('locationRegionRequired')}</Text>
            <TextInput
              style={[styles.input, permissions.isVillaManager && styles.inputDisabled, { textAlign }]}
              value={permissions.isVillaManager ? villaRegion : form.region}
              onChangeText={(region) => setForm({ ...form, region })}
              placeholder={t('regionPlaceholder')}
              placeholderTextColor={theme.muted}
              editable={permissions.isGeneralManager}
            />
            {permissions.isVillaManager && !villaRegion ? (
              <Text style={styles.helperText}>{t('setVillaRegionFirst')}</Text>
            ) : null}
            <TextInput style={[styles.input, { textAlign }]} value={form.name} onChangeText={(name) => setForm({ ...form, name })} placeholder={t('vendorName')} placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { textAlign }]} value={form.serviceType} onChangeText={(serviceType) => setForm({ ...form, serviceType })} placeholder={t('serviceType')} placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { textAlign }]} value={form.contactPerson} onChangeText={(contactPerson) => setForm({ ...form, contactPerson })} placeholder={t('contactPerson')} placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { textAlign }]} value={form.phoneNumber} onChangeText={(phoneNumber) => setForm({ ...form, phoneNumber })} placeholder={t('phone')} placeholderTextColor={theme.muted} />
            <TextInput style={[styles.input, { textAlign }]} value={form.email} onChangeText={(email) => setForm({ ...form, email })} placeholder={t('email')} placeholderTextColor={theme.muted} autoCapitalize="none" />
            <TextInput style={[styles.input, styles.textarea, { textAlign }]} value={form.address} onChangeText={(address) => setForm({ ...form, address })} placeholder={t('addressNotesPlaceholder')} placeholderTextColor={theme.muted} multiline />
            <TouchableOpacity style={[styles.toggle, { flexDirection: rowDirection }]} onPress={() => setForm({ ...form, isActive: !form.isActive })}>
              <Ionicons name={form.isActive ? 'checkbox-outline' : 'square-outline'} size={22} color={theme.primary} />
              <Text style={styles.toggleText}>{t('activeProvider')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveVendor}>
              <Text style={styles.saveText}>{t('saveVendor')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
          <View style={styles.list}>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={42} color={theme.muted} />
                <Text style={styles.emptyTitle}>{t('noVendorsFound')}</Text>
              </View>
            ) : filtered.map((vendor) => (
              <View key={vendor.id} style={styles.card}>
                <View style={[styles.cardTop, { flexDirection: rowDirection }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { textAlign }]}>{vendor.name}</Text>
                    <Text style={[styles.muted, { textAlign }]}>
                      {vendor.serviceType || t('serviceLabel')} • {vendor.phoneNumber || t('noPhone')}
                    </Text>
                    {vendor.region ? <Text style={[styles.muted, { textAlign }]}>{t('locationLabel')}: {vendor.region}</Text> : null}
                    {vendor.contactPerson ? <Text style={[styles.muted, { textAlign }]}>{t('contactLabel')}: {vendor.contactPerson}</Text> : null}
                  </View>
                  <Text style={[styles.badge, vendor.isActive === false && styles.inactiveBadge]}>
                    {vendor.isActive === false ? t('inactive') : t('statusActive')}
                  </Text>
                </View>
                {vendor.email || vendor.address ? <Text style={[styles.notes, { textAlign }]}>{[vendor.email, vendor.address].filter(Boolean).join('\n')}</Text> : null}
                <View style={[styles.actions, { flexDirection: rowDirection }]}>
                  <TouchableOpacity style={styles.smallButton} onPress={() => startEdit(vendor)}>
                    <Text style={styles.smallText}>{t('edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVendor(vendor)}>
                    <Text style={styles.deleteText}>{t('delete')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
  button: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  primaryButton: { backgroundColor: theme.primary },
  primaryButtonText: { color: theme.onPrimary, fontWeight: '800', fontSize: 12 },
  content: { padding: 16, paddingBottom: 28 },
  searchWrap: { alignItems: 'center', gap: 8, backgroundColor: theme.card, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, marginBottom: 14 },
  search: { color: theme.text, flex: 1, paddingVertical: 11, writingDirection: direction },
  panel: { backgroundColor: theme.card, borderRadius: 12, borderColor: theme.chip, borderWidth: 1, padding: 14, gap: 10, marginBottom: 16 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 2, textAlign, writingDirection: direction },
  label: { color: theme.muted, fontSize: 12, fontWeight: '800', marginBottom: 6, textAlign, writingDirection: direction },
  helperText: { color: theme.danger, fontSize: 12, marginTop: -4, marginBottom: 4, lineHeight: 17, textAlign, writingDirection: direction },
  input: { backgroundColor: theme.background, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, writingDirection: direction },
  inputDisabled: { opacity: 0.75 },
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  toggle: { alignItems: 'center', gap: 8, paddingVertical: 2 },
  toggleText: { color: theme.subtleText, fontWeight: '700' },
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
  badge: { color: '#D1FAE5', backgroundColor: '#065F46', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  inactiveBadge: { color: theme.dangerText, backgroundColor: '#4C1D1D' },
  notes: { color: theme.subtleText, marginTop: 10, lineHeight: 18, writingDirection: direction },
  actions: { gap: 8, marginTop: 12 },
  smallButton: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallText: { color: theme.subtleText, fontWeight: '800' },
  deleteButton: { backgroundColor: '#4C1D1D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  deleteText: { color: theme.dangerText, fontWeight: '900' },
});
