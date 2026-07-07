import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { apiService } from '../../services/api';
import { setActiveVillaId } from '../../store/slices/authSlice';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState, AppDispatch } from '../../store';

const EGYPT_REGIONS = [
  'Cairo', 'Giza', 'Alexandria', 'Aswan', 'Asyut', 'Beheira', 'Beni Suef',
  'Dakahlia', 'Damietta', 'Faiyum', 'Gharbia', 'Ismailia', 'Kafr El Sheikh',
  'Luxor', 'Matruh', 'Minya', 'Monufia', 'New Valley', 'North Sinai',
  'Port Said', 'Qalyubia', 'Qena', 'Red Sea', 'Sharqia', 'Sohag',
  'South Sinai', 'Suez',
];
const PROPERTY_TYPES = ['VILLA', 'BUILDING'];
const emptyForm = { name: '', propertyType: 'VILLA', propertyNumber: '', region: '', whatsappLink: '', location: '' };

export default function VillaSelectorScreen() {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const isGM = user?.role === 'GENERAL_MANAGER';

  const [villas, setVillas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showTypeDD, setShowTypeDD] = useState(false);
  const [showRegionDD, setShowRegionDD] = useState(false);

  const loadVillas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getVillas();
      const list = Array.isArray(data) ? data : [];
      setVillas(list);
      if (list.length === 0 && isGM) setShowCreate(true);
    } catch {
      setVillas([]);
      if (isGM) setShowCreate(true);
    } finally {
      setLoading(false);
    }
  }, [isGM]);

  useFocusEffect(useCallback(() => { loadVillas(); }, [loadVillas]));

  const selectVilla = (villa: any) => {
    dispatch(setActiveVillaId(villa.id));
  };

  const createVilla = async () => {
    if (!form.name.trim()) { Alert.alert('Name required'); return; }
    if (!form.region) { Alert.alert('Region required', 'Please select a region.'); return; }
    setSaving(true);
    try {
      const created = await apiService.createVilla({
        name: form.name.trim(),
        propertyType: form.propertyType,
        propertyNumber: form.propertyNumber.trim(),
        region: form.region,
        whatsappLink: form.whatsappLink.trim(),
        location: form.location.trim(),
      });
      setForm(emptyForm);
      setShowCreate(false);
      await loadVillas();
      // Auto-select the newly created villa
      if (created?.id) dispatch(setActiveVillaId(created.id));
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="business-outline" size={32} color={theme.primary} />
        <Text style={styles.title}>Select Property</Text>
        <Text style={styles.subtitle}>Choose which villa or building to manage</Text>
        {/* Skip button — always available */}
        <TouchableOpacity style={styles.skipBtn} onPress={() => {
          const id = villas.length > 0 ? villas[0].id : 1;
          dispatch(setActiveVillaId(id));
        }}>
          <Text style={styles.skipText}>
            {villas.length > 0 ? `Skip — use ${villas[0]?.name} →` : 'Skip for now →'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* EXISTING VILLAS */}
        {villas.length > 0 && (
          <View>
            <Text style={styles.sectionLabel}>Your Properties</Text>
            {villas.map((villa) => (
              <TouchableOpacity key={villa.id} style={styles.villaCard} onPress={() => selectVilla(villa)}>
                <View style={styles.villaCardLeft}>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>{villa.propertyType || 'VILLA'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.villaName}>{villa.name}</Text>
                    {villa.propertyNumber ? <Text style={styles.villaMeta}>#{villa.propertyNumber}</Text> : null}
                    {villa.region ? <Text style={styles.villaMeta}>{villa.region}</Text> : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.primary} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* CREATE NEW VILLA */}
        {isGM && (
          <View>
            {villas.length > 0 && (
              <TouchableOpacity style={styles.addMoreBtn} onPress={() => setShowCreate(!showCreate)}>
                <Ionicons name={showCreate ? 'remove-circle-outline' : 'add-circle-outline'} size={20} color={theme.primary} />
                <Text style={styles.addMoreText}>{showCreate ? 'Cancel' : 'Add New Property'}</Text>
              </TouchableOpacity>
            )}

            {showCreate && (
              <View style={styles.createForm}>
                <Text style={styles.formTitle}>
                  {villas.length === 0 ? '🏠 Create Your First Property' : 'New Property'}
                </Text>

                <Text style={styles.label}>Type</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowTypeDD(!showTypeDD)}>
                  <Text style={styles.dropdownText}>{form.propertyType}</Text>
                  <Ionicons name={showTypeDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
                </TouchableOpacity>
                {showTypeDD && (
                  <View style={styles.dropdownMenu}>
                    {PROPERTY_TYPES.map((t) => (
                      <TouchableOpacity key={t} style={styles.dropdownItem} onPress={() => { setForm({ ...form, propertyType: t }); setShowTypeDD(false); }}>
                        <Text style={[styles.dropdownItemText, form.propertyType === t && { color: theme.primary, fontWeight: '900' }]}>{t}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.label}>Name *</Text>
                <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder={form.propertyType === 'VILLA' ? 'Villa name' : 'Building name'} placeholderTextColor={theme.muted} />

                <Text style={styles.label}>{form.propertyType === 'VILLA' ? 'Villa Number' : 'Building Number'}</Text>
                <TextInput style={styles.input} value={form.propertyNumber} onChangeText={(v) => setForm({ ...form, propertyNumber: v })} placeholder="e.g. V-101" placeholderTextColor={theme.muted} />

                <Text style={styles.label}>Region *</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => setShowRegionDD(!showRegionDD)}>
                  <Text style={[styles.dropdownText, !form.region && { color: theme.muted }]}>{form.region || 'Select region'}</Text>
                  <Ionicons name={showRegionDD ? 'chevron-up' : 'chevron-down'} size={16} color={theme.muted} />
                </TouchableOpacity>
                {showRegionDD && (
                  <ScrollView style={styles.dropdownMenu} nestedScrollEnabled>
                    {EGYPT_REGIONS.map((r) => (
                      <TouchableOpacity key={r} style={styles.dropdownItem} onPress={() => { setForm({ ...form, region: r }); setShowRegionDD(false); }}>
                        <Text style={[styles.dropdownItemText, form.region === r && { color: theme.primary, fontWeight: '900' }]}>{r}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <Text style={styles.label}>WhatsApp Group Link</Text>
                <TextInput style={styles.input} value={form.whatsappLink} onChangeText={(v) => setForm({ ...form, whatsappLink: v })} placeholder="https://chat.whatsapp.com/..." placeholderTextColor={theme.muted} autoCapitalize="none" />

                <Text style={styles.label}>Location / Address</Text>
                <TextInput style={styles.input} value={form.location} onChangeText={(v) => setForm({ ...form, location: v })} placeholder="Address" placeholderTextColor={theme.muted} />

                <TouchableOpacity style={[styles.createBtn, saving && { opacity: 0.6 }]} onPress={createVilla} disabled={saving}>
                  {saving && <ActivityIndicator size="small" color={theme.onPrimary} />}
                  <Text style={styles.createBtnText}>{saving ? 'Creating...' : `Create ${form.propertyType === 'VILLA' ? 'Villa' : 'Building'}`}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* No villas + not GM */}
        {villas.length === 0 && !isGM && (
          <View style={styles.noAccess}>
            <Ionicons name="lock-closed-outline" size={48} color={theme.muted} />
            <Text style={styles.noAccessTitle}>No Property Assigned</Text>
            <Text style={styles.noAccessText}>Please contact your General Manager to assign you to a property.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { alignItems: 'center', padding: 24, paddingBottom: 16, backgroundColor: theme.card, borderBottomWidth: 1, borderBottomColor: theme.border },
  title: { color: theme.text, fontSize: 24, fontWeight: '900', marginTop: 8 },
  subtitle: { color: theme.muted, marginTop: 4, textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  sectionLabel: { color: theme.label, fontSize: 12, fontWeight: '900', marginBottom: 10, marginTop: 8 },
  villaCard: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 14, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  villaCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  typeBadge: { backgroundColor: theme.primary + '22', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  typeBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '900' },
  villaName: { color: theme.text, fontSize: 16, fontWeight: '900' },
  villaMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginTop: 8, marginBottom: 12 },
  addMoreText: { color: theme.primary, fontWeight: '800', fontSize: 15 },
  createForm: { backgroundColor: theme.card, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16 },
  formTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 14 },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4 },
  dropdown: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dropdownText: { color: theme.text, fontSize: 15 },
  dropdownMenu: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 10, marginBottom: 4, maxHeight: 180 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: theme.border },
  dropdownItemText: { color: theme.text, fontSize: 14 },
  createBtn: { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 16 },
  createBtnText: { color: theme.onPrimary, fontWeight: '900', fontSize: 16 },
  skipBtn: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 16 },
  skipText: { color: theme.primary, fontSize: 14, fontWeight: '700' },
  noAccessTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginTop: 16 },
  noAccessText: { color: theme.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
});
