import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { confirmAction } from '../../utils/confirm';
import DateInput from '../../components/DateInput';
import RegionPicker from '../../components/RegionPicker';
import { formatT, translateEnum } from '../../i18n/helpers';

const PROPERTY_TYPES = ['VILLA', 'BUILDING'];
const emptyForm = { name: '', propertyType: 'VILLA', propertyNumber: '', region: '', whatsappLink: '', location: '', description: '', subscriptionExpiresAt: '', maxViewers: '5' };

function ManagerSubscriptionFields({ f, setF, styles, theme, t, rowDirection }: { f: any; setF: React.Dispatch<React.SetStateAction<any>>; styles: any; theme: any; t: (key: string) => string; rowDirection: 'row-reverse' | 'row' }) {
  return (
    <View style={styles.subBox}>
      <View style={[styles.subBoxHeader, { flexDirection: rowDirection }]}>
        <Ionicons name="time-outline" size={16} color={theme.primary} />
        <Text style={styles.subBoxTitle}>{t('managerSubscription')}</Text>
      </View>
      <Text style={styles.label}>{t('expiryDateLabel')}</Text>
      <DateInput value={f.subscriptionExpiresAt} onChange={(subscriptionExpiresAt) => setF((prev: any) => ({ ...prev, subscriptionExpiresAt }))} style={styles.input} placeholder={t('expiryPlaceholder')} clearable />
      <Text style={styles.label}>{t('maxViewersAllowed')}</Text>
      <TextInput style={styles.input} value={f.maxViewers} onChangeText={(v) => setF((prev: any) => ({ ...prev, maxViewers: v }))} keyboardType="number-pad" placeholder={t('maxViewersPlaceholder')} placeholderTextColor={theme.muted} />
    </View>
  );
}

export default function VillasScreen() {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const [villas, setVillas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [editingVilla, setEditingVilla] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditTypeDD, setShowEditTypeDD] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [villaData, userData] = await Promise.all([
        apiService.getVillas().catch(() => []),
        apiService.getUsers().catch(() => []),
      ]);
      setVillas(Array.isArray(villaData) ? villaData : []);
      setUsers(Array.isArray(userData) ? userData : []);
    } finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const managers = useMemo(() => users.filter((u) => u.role === 'VILLA_MANAGER' || u.role === 'BUILDING_MANAGER'), [users]);

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const translatePropertyType = (type: string) => translateEnum(t, 'property', type, type);

  const createVilla = async () => {
    if (!form.name.trim()) { showStatus('error', t('villaNameRequired')); return; }
    if (!form.region) { showStatus('error', t('selectRegionRequired')); return; }
    setSaving(true);
    try {
      await apiService.createVilla({ name: form.name.trim(), propertyType: form.propertyType, propertyNumber: form.propertyNumber.trim(), region: form.region, whatsappLink: form.whatsappLink.trim(), location: form.location.trim(), description: form.description.trim() });
      setForm(emptyForm);
      await loadData();
      showStatus('success', t('createdSuccessfully'));
    } catch (e: any) { showStatus('error', e?.response?.data?.message || e?.message || t('pleaseTryAgain')); }
    finally { setSaving(false); }
  };

  const startEdit = (villa: any) => {
    setEditingVilla(villa);
    const assignedManager = managers.find((m: any) => m.villaId === villa.id);
    setEditForm({ name: villa.name || '', propertyType: villa.propertyType || 'VILLA', propertyNumber: villa.propertyNumber || '', region: villa.region || '', whatsappLink: villa.whatsappLink || '', location: villa.location || '', description: villa.description || '', subscriptionExpiresAt: assignedManager?.subscriptionExpiresAt ? new Date(assignedManager.subscriptionExpiresAt).toISOString().split('T')[0] : '', maxViewers: String(assignedManager?.maxViewers || 5), managerId: assignedManager?.id || null });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { showStatus('error', t('nameRequiredShort')); return; }
    setEditSaving(true);
    try {
      await apiService.updateVilla(editingVilla.id, { name: editForm.name.trim(), propertyType: editForm.propertyType, propertyNumber: editForm.propertyNumber, region: editForm.region, whatsappLink: editForm.whatsappLink, location: editForm.location, description: editForm.description });
      if (editForm.managerId) {
        await apiService.updateUserSubscription(editForm.managerId, { subscriptionExpiresAt: editForm.subscriptionExpiresAt ? editForm.subscriptionExpiresAt + 'T23:59:59' : null, maxViewers: parseInt(editForm.maxViewers) || 5 });
      }
      setEditingVilla(null); setEditForm(null);
      await loadData();
      showStatus('success', t('updatedSuccessfully'));
    } catch (e: any) { showStatus('error', e?.response?.data?.message || e?.message || t('pleaseTryAgain')); }
    finally { setEditSaving(false); }
  };

  const deleteVilla = (villa: any) => {
    confirmAction({
      title: t('deletePropertyTitle'),
      message: formatT(t('deletePropertyMessage'), { name: villa.name }),
      onConfirm: async () => {
        try {
          await apiService.deleteVilla(villa.id);
          await loadData();
        } catch (e: any) {
          showStatus('error', e?.response?.data?.message || e?.message);
        }
      },
    });
  };

  const suspendVilla = async (villa: any) => {
    const villaManagers = managers.filter((m: any) => m.villaId === villa.id);
    if (villaManagers.length === 0) { showStatus('error', t('noManagersAssigned')); return; }
    try {
      await Promise.all(villaManagers.map((m: any) => apiService.revokeUserSubscription(m.id)));
      await loadData();
      showStatus('error', formatT(t('suspendedVillaMessage'), { name: villa.name }));
    } catch (e: any) { showStatus('error', e?.response?.data?.message || t('couldNotSuspend')); }
  };

  const assignManager = async (manager: any, villaId: number) => {
    try { await apiService.updateUser(manager.id, { villaId }); await loadData(); }
    catch (e: any) { showStatus('error', e?.response?.data?.message || e?.message); }
  };

  const getVillaStatus = (villa: any) => {
    const vm = managers.filter((m: any) => m.villaId === villa.id);
    if (vm.length === 0) return null;
    const suspended = vm.some((m: any) => m.subscriptionExpired);
    return { suspended, expDate: vm[0]?.subscriptionExpiresAt, manager: vm[0] };
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
      <View style={styles.header}>
        <Text style={styles.title}>{t('properties')}</Text>
        <Text style={styles.subtitle}>{t('propertiesSubtitle')}</Text>
      </View>
      {statusMsg && (<View style={[styles.statusBox, statusMsg.type === 'error' ? styles.statusError : styles.statusSuccess]}><Text style={styles.statusText}>{statusMsg.text}</Text></View>)}
      <ScrollView contentContainerStyle={styles.content}>

        {/* CREATE */}
        <View style={styles.panel}>
          <View style={[styles.panelHeader, { flexDirection: rowDirection }]}><Ionicons name="business-outline" size={22} color={theme.primary} /><Text style={styles.panelTitleInline}>{t('addNewProperty')}</Text></View>
          <Text style={styles.label}>{t('typeLabel')}</Text>
          <TouchableOpacity style={[styles.dropdown, { flexDirection: rowDirection }]} onPress={() => setShowTypeDD(!showTypeDD)}><Text style={styles.dropdownText}>{translatePropertyType(form.propertyType)}</Text><Ionicons name={showTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
          {showTypeDD && <View style={styles.dropdownMenu}>{PROPERTY_TYPES.map((type) => <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setForm({ ...form, propertyType: type }); setShowTypeDD(false); }}><Text style={[styles.dropdownItemText, form.propertyType === type && { color: theme.primary, fontWeight: '900' }]}>{translatePropertyType(type)}</Text></TouchableOpacity>)}</View>}
          <Text style={styles.label}>{t('nameLabel')}</Text>
          <TextInput style={[styles.input, { textAlign }]} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder={t('villaNamePlaceholder')} placeholderTextColor={theme.muted} />
          <Text style={styles.label}>{t('numberLabel')}</Text>
          <TextInput style={[styles.input, { textAlign }]} value={form.propertyNumber} onChangeText={(v) => setForm({ ...form, propertyNumber: v })} placeholder={t('propertyNumberPlaceholder')} placeholderTextColor={theme.muted} />
          <Text style={styles.label}>{t('regionLabel')}</Text>
          <RegionPicker value={form.region} onChange={(region) => setForm({ ...form, region })} />
          <Text style={styles.label}>{t('whatsappGroupLink')}</Text>
          <TextInput style={[styles.input, { textAlign }]} value={form.whatsappLink} onChangeText={(v) => setForm({ ...form, whatsappLink: v })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={theme.muted} autoCapitalize="none" />
          <Text style={styles.label}>{t('locationAddress')}</Text>
          <TextInput style={[styles.input, { textAlign }]} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholder={t('address')} placeholderTextColor={theme.muted} />
          <Text style={styles.label}>{t('notes')}</Text>
          <TextInput style={[styles.input, styles.textarea, { textAlign }]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder={t('additionalNotesPlaceholder')} placeholderTextColor={theme.muted} multiline />
          <ManagerSubscriptionFields f={form} setF={setForm} styles={styles} theme={theme} t={t} rowDirection={rowDirection} />
          <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }, { flexDirection: rowDirection }]} onPress={createVilla} disabled={saving}>
            {saving && <ActivityIndicator size="small" color={theme.onPrimary} />}
            <Text style={styles.primaryText}>{saving ? t('creating') : t('createVilla')}</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : villas.map((villa) => {
          const vs = getVillaStatus(villa);
          return (
            <View key={villa.id} style={styles.panel}>
              {editingVilla?.id === villa.id ? (
                <View>
                  <Text style={styles.panelTitle}>{t('editProperty')}</Text>
                  <Text style={styles.label}>{t('typeLabel')}</Text>
                  <TouchableOpacity style={[styles.dropdown, { flexDirection: rowDirection }]} onPress={() => setShowEditTypeDD(!showEditTypeDD)}><Text style={styles.dropdownText}>{translatePropertyType(editForm.propertyType)}</Text><Ionicons name={showEditTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
                  {showEditTypeDD && <View style={styles.dropdownMenu}>{PROPERTY_TYPES.map((type) => <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setEditForm({ ...editForm, propertyType: type }); setShowEditTypeDD(false); }}><Text style={[styles.dropdownItemText, editForm.propertyType === type && { color: theme.primary, fontWeight: '900' }]}>{translatePropertyType(type)}</Text></TouchableOpacity>)}</View>}
                  <Text style={styles.label}>{t('nameLabel')}</Text>
                  <TextInput style={[styles.input, { textAlign }]} value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>{t('numberLabel')}</Text>
                  <TextInput style={[styles.input, { textAlign }]} value={editForm.propertyNumber} onChangeText={(v) => setEditForm({ ...editForm, propertyNumber: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>{t('regionLabelPlain')}</Text>
                  <RegionPicker value={editForm.region} onChange={(region) => setEditForm({ ...editForm, region })} />
                  <Text style={styles.label}>{t('whatsappGroupLink')}</Text>
                  <TextInput style={[styles.input, { textAlign }]} value={editForm.whatsappLink} onChangeText={(v) => setEditForm({ ...editForm, whatsappLink: v })} placeholderTextColor={theme.muted} autoCapitalize="none" />
                  <Text style={styles.label}>{t('location')}</Text>
                  <TextInput style={[styles.input, { textAlign }]} value={editForm.location} onChangeText={(v) => setEditForm({ ...editForm, location: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>{t('notes')}</Text>
                  <TextInput style={[styles.input, styles.textarea, { textAlign }]} value={editForm.description} onChangeText={(v) => setEditForm({ ...editForm, description: v })} placeholderTextColor={theme.muted} multiline />
                  {editForm.managerId
                    ? <ManagerSubscriptionFields f={editForm} setF={setEditForm} styles={styles} theme={theme} t={t} rowDirection={rowDirection} />
                    : <View style={[styles.noManagerNote, { flexDirection: rowDirection }]}><Ionicons name="information-circle-outline" size={15} color={theme.muted} /><Text style={styles.noManagerText}>{t('assignManagerForSubscription')}</Text></View>}
                  <View style={[styles.row, { gap: 8, marginTop: 4, flexDirection: rowDirection }]}>
                    <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, editSaving && { opacity: 0.6 }]} onPress={saveEdit} disabled={editSaving}><Text style={styles.primaryText}>{editSaving ? t('saving') : t('saveChanges')}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditingVilla(null)}><Text style={styles.secondaryText}>{t('cancel')}</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={[styles.row, { flexDirection: rowDirection }]}>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.row, { marginBottom: 4, flexWrap: 'wrap', gap: 6, flexDirection: rowDirection }]}>
                        <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{translatePropertyType(villa.propertyType || 'VILLA')}</Text></View>
                        {villa.propertyNumber ? <Text style={styles.numberText}>#{villa.propertyNumber}</Text> : null}
                        {vs?.suspended && <View style={styles.suspendedBadge}><Text style={styles.suspendedText}>⛔ {t('suspendedBadge')}</Text></View>}
                      </View>
                      <Text style={[styles.villaName, { textAlign }]}>{villa.name}</Text>
                      {villa.region ? <View style={[styles.infoRow, { flexDirection: rowDirection }]}><Ionicons name="location-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.region}</Text></View> : null}
                      {villa.location ? <View style={[styles.infoRow, { flexDirection: rowDirection }]}><Ionicons name="map-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.location}</Text></View> : null}
                      {villa.whatsappLink ? <TouchableOpacity style={[styles.infoRow, { flexDirection: rowDirection }]} onPress={() => Linking.openURL(villa.whatsappLink).catch(() => {})}><Ionicons name="logo-whatsapp" size={13} color="#25D366" /><Text style={[styles.meta, { color: '#25D366' }]}>{t('whatsappGroup')}</Text></TouchableOpacity> : null}
                      {vs?.expDate && <View style={[styles.infoRow, { flexDirection: rowDirection }]}><Ionicons name="time-outline" size={13} color={vs.suspended ? '#EF4444' : theme.primary} /><Text style={[styles.meta, { color: vs.suspended ? '#EF4444' : theme.primary, fontWeight: '700' }]}>{vs.suspended ? t('subscriptionExpiredLabel') : formatT(t('subExpiresLabel'), { date: new Date(vs.expDate).toLocaleDateString() })}</Text></View>}
                      {vs?.manager && <View style={[styles.infoRow, { flexDirection: rowDirection }]}><Ionicons name="people-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{formatT(t('maxViewersLabel'), { count: vs.manager.maxViewers || 5 })}</Text></View>}
                    </View>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity style={[styles.editButton, { flexDirection: rowDirection }]} onPress={() => startEdit(villa)}><Ionicons name="pencil-outline" size={15} color={theme.primary} /><Text style={styles.editText}>{t('edit')}</Text></TouchableOpacity>
                      {vs && (vs.suspended
                        ? <TouchableOpacity style={[styles.unsuspendButton, { flexDirection: rowDirection }]} onPress={() => startEdit(villa)}><Ionicons name="checkmark-circle-outline" size={15} color="#10B981" /><Text style={styles.unsuspendText}>{t('restore')}</Text></TouchableOpacity>
                        : <TouchableOpacity style={[styles.suspendButton, { flexDirection: rowDirection }]} onPress={() => suspendVilla(villa)}><Ionicons name="ban-outline" size={15} color="#F59E0B" /><Text style={styles.suspendText}>{t('suspend')}</Text></TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.deleteButton, { flexDirection: rowDirection }]} onPress={() => deleteVilla(villa)}><Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} /><Text style={styles.deleteText}>{t('delete')}</Text></TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.sectionLabel}>{t('assignedManagers')}</Text>
                  <View style={[styles.managerWrap, { flexDirection: rowDirection }]}>
                    {managers.length === 0
                      ? <Text style={styles.emptyText}>{t('noManagersInvite')}</Text>
                      : managers.map((manager: any) => (
                        <TouchableOpacity key={manager.id} style={[styles.managerChip, manager.villaId === villa.id && styles.managerChipActive, { flexDirection: rowDirection }]} onPress={() => assignManager(manager, villa.id)}>
                          <Text style={[styles.managerText, manager.villaId === villa.id && styles.managerTextActive]}>{manager.fullName || manager.email}</Text>
                          {manager.villaId === villa.id && manager.subscriptionExpired && <Text style={{ fontSize: 11 }}>⛔</Text>}
                        </TouchableOpacity>
                      ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: '900', textAlign, writingDirection: direction },
  subtitle: { color: theme.muted, marginTop: 4, textAlign, writingDirection: direction },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 12, textAlign, writingDirection: direction },
  panelTitleInline: { color: theme.text, fontSize: 18, fontWeight: '900', textAlign, writingDirection: direction },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 4, textAlign, writingDirection: direction },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, writingDirection: direction },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  dropdown: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: theme.text, fontSize: 15, textAlign, writingDirection: direction },
  dropdownMenu: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, marginBottom: 8, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 14, textAlign, writingDirection: direction },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryText: { color: theme.onPrimary, fontWeight: '900' },
  secondaryButton: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: theme.text, fontWeight: '800' },
  row: { alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: theme.primary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '900' },
  numberText: { color: theme.muted, fontSize: 13 },
  villaName: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 4, writingDirection: direction },
  infoRow: { alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { color: theme.muted, fontSize: 13, writingDirection: direction },
  editButton: { backgroundColor: theme.primary + '22', borderColor: theme.primary + '44', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  editText: { color: theme.primary, fontWeight: '900', fontSize: 13 },
  suspendButton: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  suspendText: { color: '#92400E', fontWeight: '900', fontSize: 13 },
  unsuspendButton: { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  unsuspendText: { color: '#065F46', fontWeight: '900', fontSize: 13 },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900', fontSize: 13 },
  sectionLabel: { color: theme.label, fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 8, textAlign, writingDirection: direction },
  managerWrap: { flexWrap: 'wrap', gap: 8 },
  managerChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center', gap: 4 },
  managerChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  managerText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  managerTextActive: { color: theme.onPrimary },
  emptyText: { color: theme.muted, fontSize: 13, textAlign, writingDirection: direction },
  suspendedBadge: { backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  suspendedText: { color: '#B91C1C', fontSize: 11, fontWeight: '900' },
  subBox: { backgroundColor: theme.input, borderColor: theme.primary + '66', borderWidth: 1.5, borderRadius: 10, padding: 12, marginVertical: 10 },
  subBoxHeader: { alignItems: 'center', gap: 7, marginBottom: 10 },
  subBoxTitle: { color: theme.primary, fontSize: 13, fontWeight: '900' },
  noManagerNote: { alignItems: 'center', gap: 7, backgroundColor: theme.chip, borderRadius: 8, padding: 10, marginVertical: 8 },
  noManagerText: { color: theme.muted, fontSize: 12, flex: 1, textAlign, writingDirection: direction },
  statusBox: { marginHorizontal: 16, marginTop: 8, borderRadius: 8, padding: 12, borderWidth: 1 },
  statusError: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  statusSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#1F2937', textAlign, writingDirection: direction },
});
