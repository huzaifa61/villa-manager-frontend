import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Linking, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { confirmAction } from '../../utils/confirm';

const EGYPT_REGIONS = [
  'Cairo', 'Giza', 'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef',
  'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Ismailia', 'Kafr El Sheikh',
  'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai',
  'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag', 'South Sinai', 'Suez',
];
const PROPERTY_TYPES = ['VILLA', 'BUILDING'];
const emptyForm = { name: '', propertyType: 'VILLA', propertyNumber: '', region: '', whatsappLink: '', location: '', description: '', subscriptionExpiresAt: '', maxViewers: '5' };

function ManagerSubscriptionFields({ f, setF, styles, theme }: { f: any; setF: React.Dispatch<React.SetStateAction<any>>; styles: any; theme: any }) {
  return (
    <View style={styles.subBox}>
      <View style={styles.subBoxHeader}>
        <Ionicons name="time-outline" size={16} color={theme.primary} />
        <Text style={styles.subBoxTitle}>Manager Subscription</Text>
      </View>
      <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
      <TextInput style={styles.input} value={f.subscriptionExpiresAt} onChangeText={(v) => setF((prev: any) => ({ ...prev, subscriptionExpiresAt: v }))} placeholder="e.g. 2026-12-31 (blank = no expiry)" placeholderTextColor={theme.muted} />
      <Text style={styles.label}>Max Viewers Allowed</Text>
      <TextInput style={styles.input} value={f.maxViewers} onChangeText={(v) => setF((prev: any) => ({ ...prev, maxViewers: v }))} keyboardType="number-pad" placeholder="e.g. 5" placeholderTextColor={theme.muted} />
    </View>
  );
}

export default function VillasScreen() {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const [villas, setVillas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [showRegionDD, setShowRegionDD] = useState(false);
  const [editingVilla, setEditingVilla] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [showEditTypeDD, setShowEditTypeDD] = useState(false);
  const [showEditRegionDD, setShowEditRegionDD] = useState(false);
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

  const createVilla = async () => {
    if (!form.name.trim()) { showStatus('error', 'Villa name is required.'); return; }
    if (!form.region) { showStatus('error', 'Please select a region.'); return; }
    setSaving(true);
    try {
      await apiService.createVilla({ name: form.name.trim(), propertyType: form.propertyType, propertyNumber: form.propertyNumber.trim(), region: form.region, whatsappLink: form.whatsappLink.trim(), location: form.location.trim(), description: form.description.trim() });
      setForm(emptyForm);
      await loadData();
      showStatus('success', "Created successfully!");
    } catch (e: any) { showStatus('error', e?.response?.data?.message || e?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const startEdit = (villa: any) => {
    setEditingVilla(villa);
    const assignedManager = managers.find((m: any) => m.villaId === villa.id);
    setEditForm({ name: villa.name || '', propertyType: villa.propertyType || 'VILLA', propertyNumber: villa.propertyNumber || '', region: villa.region || '', whatsappLink: villa.whatsappLink || '', location: villa.location || '', description: villa.description || '', subscriptionExpiresAt: assignedManager?.subscriptionExpiresAt ? new Date(assignedManager.subscriptionExpiresAt).toISOString().split('T')[0] : '', maxViewers: String(assignedManager?.maxViewers || 5), managerId: assignedManager?.id || null });
  };

  const saveEdit = async () => {
    if (!editForm.name.trim()) { showStatus('error', 'Name is required.'); return; }
    setEditSaving(true);
    try {
      await apiService.updateVilla(editingVilla.id, { name: editForm.name.trim(), propertyType: editForm.propertyType, propertyNumber: editForm.propertyNumber, region: editForm.region, whatsappLink: editForm.whatsappLink, location: editForm.location, description: editForm.description });
      if (editForm.managerId) {
        await apiService.updateUserSubscription(editForm.managerId, { subscriptionExpiresAt: editForm.subscriptionExpiresAt ? editForm.subscriptionExpiresAt + 'T23:59:59' : null, maxViewers: parseInt(editForm.maxViewers) || 5 });
      }
      setEditingVilla(null); setEditForm(null);
      await loadData();
      showStatus('success', 'Updated successfully!');
    } catch (e: any) { showStatus('error', e?.response?.data?.message || e?.message || 'Please try again.'); }
    finally { setEditSaving(false); }
  };

  const deleteVilla = (villa: any) => {
    confirmAction({
      title: 'Delete property?',
      message: `"${villa.name}" and all its data will be removed.`,
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
    if (villaManagers.length === 0) { showStatus('error', 'No managers assigned to this villa.'); return; }
    try {
      await Promise.all(villaManagers.map((m: any) => apiService.revokeUserSubscription(m.id)));
      await loadData();
      showStatus('error', "Suspended \"" + villa.name + "\" — all managers & viewers blocked.");
    } catch (e: any) { showStatus('error', e?.response?.data?.message || 'Could not suspend villa.'); }
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
        <Text style={styles.title}>Properties</Text>
        <Text style={styles.subtitle}>Manage villas and buildings.</Text>
      </View>
      {statusMsg && (<View style={[styles.statusBox, statusMsg.type === 'error' ? styles.statusError : styles.statusSuccess]}><Text style={styles.statusText}>{statusMsg.text}</Text></View>)}
      <ScrollView contentContainerStyle={styles.content}>

        {/* CREATE */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}><Ionicons name="business-outline" size={22} color={theme.primary} /><Text style={styles.panelTitle}>Add Property</Text></View>
          <Text style={styles.label}>Type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDD(!showTypeDD)}><Text style={styles.dropdownText}>{form.propertyType}</Text><Ionicons name={showTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
          {showTypeDD && <View style={styles.dropdownMenu}>{PROPERTY_TYPES.map((t) => <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setForm({ ...form, propertyType: t }); setShowTypeDD(false); }}><Text style={[styles.dropdownItemText, form.propertyType === t && { color: theme.primary, fontWeight: '900' }]}>{t}</Text></TouchableOpacity>)}</View>}
          <Text style={styles.label}>Name *</Text>
          <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="Villa name" placeholderTextColor={theme.muted} />
          <Text style={styles.label}>Number</Text>
          <TextInput style={styles.input} value={form.propertyNumber} onChangeText={(v) => setForm({ ...form, propertyNumber: v })} placeholder="e.g. V-101" placeholderTextColor={theme.muted} />
          <Text style={styles.label}>Region *</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setShowRegionDD(!showRegionDD)}><Text style={[styles.dropdownText, !form.region && { color: theme.muted }]}>{form.region || 'Select region'}</Text><Ionicons name={showRegionDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
          {showRegionDD && <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>{EGYPT_REGIONS.map((r) => <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setForm({ ...form, region: r }); setShowRegionDD(false); }}><Text style={[styles.dropdownItemText, form.region === r && { color: theme.primary, fontWeight: '900' }]}>{r}</Text></TouchableOpacity>)}</ScrollView>}
          <Text style={styles.label}>WhatsApp Group Link</Text>
          <TextInput style={styles.input} value={form.whatsappLink} onChangeText={(v) => setForm({ ...form, whatsappLink: v })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={theme.muted} autoCapitalize="none" />
          <Text style={styles.label}>Location / Address</Text>
          <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholder="Address" placeholderTextColor={theme.muted} />
          <Text style={styles.label}>Notes</Text>
          <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Additional notes..." placeholderTextColor={theme.muted} multiline />
          <ManagerSubscriptionFields f={form} setF={setForm} styles={styles} theme={theme} />
          <TouchableOpacity style={[styles.primaryButton, saving && { opacity: 0.6 }]} onPress={createVilla} disabled={saving}>
            {saving && <ActivityIndicator size="small" color={theme.onPrimary} />}
            <Text style={styles.primaryText}>{saving ? 'Creating...' : 'Create Villa'}</Text>
          </TouchableOpacity>
        </View>

        {/* LIST */}
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : villas.map((villa) => {
          const vs = getVillaStatus(villa);
          return (
            <View key={villa.id} style={styles.panel}>
              {editingVilla?.id === villa.id ? (
                <View>
                  <Text style={styles.panelTitle}>Edit Property</Text>
                  <Text style={styles.label}>Type</Text>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowEditTypeDD(!showEditTypeDD)}><Text style={styles.dropdownText}>{editForm.propertyType}</Text><Ionicons name={showEditTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
                  {showEditTypeDD && <View style={styles.dropdownMenu}>{PROPERTY_TYPES.map((t) => <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setEditForm({ ...editForm, propertyType: t }); setShowEditTypeDD(false); }}><Text style={[styles.dropdownItemText, editForm.propertyType === t && { color: theme.primary, fontWeight: '900' }]}>{t}</Text></TouchableOpacity>)}</View>}
                  <Text style={styles.label}>Name *</Text>
                  <TextInput style={styles.input} value={editForm.name} onChangeText={(v) => setEditForm({ ...editForm, name: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>Number</Text>
                  <TextInput style={styles.input} value={editForm.propertyNumber} onChangeText={(v) => setEditForm({ ...editForm, propertyNumber: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>Region</Text>
                  <TouchableOpacity style={styles.dropdown} onPress={() => setShowEditRegionDD(!showEditRegionDD)}><Text style={[styles.dropdownText, !editForm.region && { color: theme.muted }]}>{editForm.region || 'Select region'}</Text><Ionicons name={showEditRegionDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} /></TouchableOpacity>
                  {showEditRegionDD && <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>{EGYPT_REGIONS.map((r) => <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setEditForm({ ...editForm, region: r }); setShowEditRegionDD(false); }}><Text style={[styles.dropdownItemText, editForm.region === r && { color: theme.primary, fontWeight: '900' }]}>{r}</Text></TouchableOpacity>)}</ScrollView>}
                  <Text style={styles.label}>WhatsApp Group Link</Text>
                  <TextInput style={styles.input} value={editForm.whatsappLink} onChangeText={(v) => setEditForm({ ...editForm, whatsappLink: v })} placeholderTextColor={theme.muted} autoCapitalize="none" />
                  <Text style={styles.label}>Location</Text>
                  <TextInput style={styles.input} value={editForm.location} onChangeText={(v) => setEditForm({ ...editForm, location: v })} placeholderTextColor={theme.muted} />
                  <Text style={styles.label}>Notes</Text>
                  <TextInput style={[styles.input, styles.textarea]} value={editForm.description} onChangeText={(v) => setEditForm({ ...editForm, description: v })} placeholderTextColor={theme.muted} multiline />
                  {editForm.managerId
                    ? <ManagerSubscriptionFields f={editForm} setF={setEditForm} styles={styles} theme={theme} />
                    : <View style={styles.noManagerNote}><Ionicons name="information-circle-outline" size={15} color={theme.muted} /><Text style={styles.noManagerText}>Assign a Villa Manager to set subscription.</Text></View>}
                  <View style={[styles.row, { gap: 8, marginTop: 4 }]}>
                    <TouchableOpacity style={[styles.primaryButton, { flex: 1 }, editSaving && { opacity: 0.6 }]} onPress={saveEdit} disabled={editSaving}><Text style={styles.primaryText}>{editSaving ? 'Saving...' : 'Save Changes'}</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => setEditingVilla(null)}><Text style={styles.secondaryText}>Cancel</Text></TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <View style={[styles.row, { marginBottom: 4, flexWrap: 'wrap', gap: 6 }]}>
                        <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{villa.propertyType || 'VILLA'}</Text></View>
                        {villa.propertyNumber ? <Text style={styles.numberText}>#{villa.propertyNumber}</Text> : null}
                        {vs?.suspended && <View style={styles.suspendedBadge}><Text style={styles.suspendedText}>⛔ SUSPENDED</Text></View>}
                      </View>
                      <Text style={styles.villaName}>{villa.name}</Text>
                      {villa.region ? <View style={styles.infoRow}><Ionicons name="location-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.region}</Text></View> : null}
                      {villa.location ? <View style={styles.infoRow}><Ionicons name="map-outline" size={13} color={theme.muted} /><Text style={styles.meta}>{villa.location}</Text></View> : null}
                      {villa.whatsappLink ? <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(villa.whatsappLink).catch(() => {})}><Ionicons name="logo-whatsapp" size={13} color="#25D366" /><Text style={[styles.meta, { color: '#25D366' }]}>WhatsApp Group</Text></TouchableOpacity> : null}
                      {vs?.expDate && <View style={styles.infoRow}><Ionicons name="time-outline" size={13} color={vs.suspended ? '#EF4444' : theme.primary} /><Text style={[styles.meta, { color: vs.suspended ? '#EF4444' : theme.primary, fontWeight: '700' }]}>{vs.suspended ? 'Subscription expired' : "Sub expires: " + new Date(vs.expDate).toLocaleDateString()}</Text></View>}
                      {vs?.manager && <View style={styles.infoRow}><Ionicons name="people-outline" size={13} color={theme.muted} /><Text style={styles.meta}>Max viewers: {vs.manager.maxViewers || 5}</Text></View>}
                    </View>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity style={styles.editButton} onPress={() => startEdit(villa)}><Ionicons name="pencil-outline" size={15} color={theme.primary} /><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                      {vs && (vs.suspended
                        ? <TouchableOpacity style={styles.unsuspendButton} onPress={() => startEdit(villa)}><Ionicons name="checkmark-circle-outline" size={15} color="#10B981" /><Text style={styles.unsuspendText}>Restore</Text></TouchableOpacity>
                        : <TouchableOpacity style={styles.suspendButton} onPress={() => suspendVilla(villa)}><Ionicons name="ban-outline" size={15} color="#F59E0B" /><Text style={styles.suspendText}>Suspend</Text></TouchableOpacity>
                      )}
                      <TouchableOpacity style={styles.deleteButton} onPress={() => deleteVilla(villa)}><Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} /><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                    </View>
                  </View>
                  <Text style={styles.sectionLabel}>Assigned Managers</Text>
                  <View style={styles.managerWrap}>
                    {managers.length === 0
                      ? <Text style={styles.emptyText}>No managers yet. Invite from Villa Members.</Text>
                      : managers.map((manager: any) => (
                        <TouchableOpacity key={manager.id} style={[styles.managerChip, manager.villaId === villa.id && styles.managerChipActive]} onPress={() => assignManager(manager, villa.id)}>
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

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: '900' },
  subtitle: { color: theme.muted, marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 4 },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8 },
  textarea: { minHeight: 72, textAlignVertical: 'top' },
  dropdown: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: theme.text, fontSize: 15 },
  dropdownMenu: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, marginBottom: 8, maxHeight: 200 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 14 },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  primaryText: { color: theme.onPrimary, fontWeight: '900' },
  secondaryButton: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  secondaryText: { color: theme.text, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: theme.primary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  typeBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '900' },
  numberText: { color: theme.muted, fontSize: 13 },
  villaName: { color: theme.text, fontSize: 17, fontWeight: '900', marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  meta: { color: theme.muted, fontSize: 13 },
  editButton: { backgroundColor: theme.primary + '22', borderColor: theme.primary + '44', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  editText: { color: theme.primary, fontWeight: '900', fontSize: 13 },
  suspendButton: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  suspendText: { color: '#92400E', fontWeight: '900', fontSize: 13 },
  unsuspendButton: { backgroundColor: '#D1FAE5', borderColor: '#10B981', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  unsuspendText: { color: '#065F46', fontWeight: '900', fontSize: 13 },
  deleteButton: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900', fontSize: 13 },
  sectionLabel: { color: theme.label, fontSize: 12, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  managerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  managerChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  managerChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  managerText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  managerTextActive: { color: theme.onPrimary },
  emptyText: { color: theme.muted, fontSize: 13 },
  suspendedBadge: { backgroundColor: '#FEE2E2', borderColor: '#EF4444', borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  suspendedText: { color: '#B91C1C', fontSize: 11, fontWeight: '900' },
  subBox: { backgroundColor: theme.input, borderColor: theme.primary + '66', borderWidth: 1.5, borderRadius: 10, padding: 12, marginVertical: 10 },
  subBoxHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  subBoxTitle: { color: theme.primary, fontSize: 13, fontWeight: '900' },
  noManagerNote: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: theme.chip, borderRadius: 8, padding: 10, marginVertical: 8 },
  noManagerText: { color: theme.muted, fontSize: 12, flex: 1 },
  statusBox: { marginHorizontal: 16, marginTop: 8, borderRadius: 8, padding: 12, borderWidth: 1 },
  statusError: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  statusSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
});
