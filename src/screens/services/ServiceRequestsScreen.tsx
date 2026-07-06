import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { apiService } from '../../services/api';
import { exportCsv } from '../../utils/csv';
import { useAppPreferences } from '../../context/AppPreferences';
import { permissionsFor } from '../../utils/permissions';

const VILLA_ID = 1;
const categories = ['Electrician', 'Plumber', 'Carpenter', 'Painter', 'Pest Control', 'CCTV', 'Internet', 'Elevator', 'Pump', 'Generator', 'Cleaning', 'Gardener', 'Security', 'Porter', 'Legal / Admin', 'General Maintenance', 'Emergency', 'Other'];
const urgencies = ['Low', 'Medium', 'High', 'Urgent'];
const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const initialForm = {
  category: 'Electrician',
  urgency: 'Medium',
  apartmentId: '',
  preferredContact: '',
  description: '',
  notes: '',
};

export default function ServiceRequestsScreen() {
  const { theme } = useAppPreferences();
  const styles = makeStyles(theme);
  const { user } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = user?.villaId || VILLA_ID;
  const [requests, setRequests] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...initialForm, preferredContact: user?.email || '' });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [serviceData, apartmentData, vendorData] = await Promise.all([
        apiService.getServiceRequests(villaId).catch(() => []),
        apiService.getApartments(villaId).catch(() => []),
        apiService.getVendors().catch(() => []),
      ]);
      setRequests(Array.isArray(serviceData) ? serviceData : []);
      setApartments(Array.isArray(apartmentData) ? apartmentData : []);
      setVendors(Array.isArray(vendorData) ? vendorData : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const vendorById = useMemo(() => {
    const map: Record<string, any> = {};
    vendors.forEach((vendor) => { map[String(vendor.id)] = vendor; });
    return map;
  }, [vendors]);

  const apartmentById = useMemo(() => {
    const map: Record<string, any> = {};
    apartments.forEach((apartment) => { map[String(apartment.id)] = apartment; });
    return map;
  }, [apartments]);

  const saveRequest = async () => {
    if (!form.description.trim()) {
      Alert.alert('Description required', 'Please describe the service request.');
      return;
    }
    try {
      setSaving(true);
      await apiService.createServiceRequest(villaId, {
        ...form,
        apartmentId: form.apartmentId || undefined,
      });
      setForm({ ...initialForm, preferredContact: user?.email || '' });
      setShowForm(false);
      await fetchData();
    } catch (error: any) {
      Alert.alert('Could not save', error?.response?.data?.error || error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (request: any, status: string) => {
    try {
      await apiService.updateServiceRequest(villaId, request.id, {
        description: request.description,
        apartmentId: request.apartmentId,
        vendorId: request.vendorId,
        status,
        notes: request.notes,
      });
      await fetchData();
    } catch (error: any) {
      Alert.alert('Could not update', error?.response?.data?.error || error?.message || 'Please try again.');
    }
  };

  const removeRequest = (request: any) => {
    Alert.alert('Delete request?', 'This service request will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await apiService.deleteServiceRequest(villaId, request.id);
          await fetchData();
        },
      },
    ]);
  };

  const exportRequests = () => exportCsv('service-requests.csv',
    ['ID', 'Apartment', 'Description', 'Status', 'Vendor', 'Notes', 'Created At'],
    requests.map((request) => [
      request.id,
      apartmentById[String(request.apartmentId)]?.apartmentNumber || request.apartmentId || '',
      request.description,
      request.status,
      vendorById[String(request.vendorId)]?.name || '',
      request.notes,
      request.createdAt,
    ]));

  const actionButton = (label: string, icon: IconName, onPress: () => void, primary = false) => (
    <TouchableOpacity style={[styles.button, primary && styles.primaryButton]} onPress={onPress}>
      <Ionicons name={icon} size={17} color={primary ? theme.onPrimary : theme.text} />
      <Text style={[styles.buttonText, primary && styles.primaryButtonText]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Service Requests</Text>
          <Text style={styles.subtitle}>Submit requests and track admin dispatch.</Text>
        </View>
        <View style={styles.headerActions}>
          {actionButton('CSV', 'download-outline', exportRequests)}
          {actionButton(showForm ? 'Close' : 'New', showForm ? 'close-outline' : 'add-outline', () => setShowForm(!showForm), true)}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={18} color="#60A5FA" />
          <Text style={styles.noticeText}>After submitting, the admin can review your request, assign a provider, and update the status here.</Text>
        </View>

        {showForm ? (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>New Request</Text>
            <Text style={styles.label}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceRow}>
              {categories.map((category) => (
                <TouchableOpacity key={category} style={[styles.choice, form.category === category && styles.choiceActive]} onPress={() => setForm({ ...form, category })}>
                  <Text style={[styles.choiceText, form.category === category && styles.choiceTextActive]}>{category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Urgency</Text>
            <View style={styles.inlineChoices}>
              {urgencies.map((urgency) => (
                <TouchableOpacity key={urgency} style={[styles.choice, form.urgency === urgency && styles.choiceActive]} onPress={() => setForm({ ...form, urgency })}>
                  <Text style={[styles.choiceText, form.urgency === urgency && styles.choiceTextActive]}>{urgency}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Apartment</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.choiceRow}>
              <TouchableOpacity style={[styles.choice, !form.apartmentId && styles.choiceActive]} onPress={() => setForm({ ...form, apartmentId: '' })}>
                <Text style={[styles.choiceText, !form.apartmentId && styles.choiceTextActive]}>Not specific</Text>
              </TouchableOpacity>
              {apartments.map((apartment) => (
                <TouchableOpacity key={apartment.id} style={[styles.choice, form.apartmentId === String(apartment.id) && styles.choiceActive]} onPress={() => setForm({ ...form, apartmentId: String(apartment.id) })}>
                  <Text style={[styles.choiceText, form.apartmentId === String(apartment.id) && styles.choiceTextActive]}>Apt {apartment.apartmentNumber}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textarea]} value={form.description} onChangeText={(description) => setForm({ ...form, description })} placeholder="Describe the issue" placeholderTextColor={theme.muted} multiline />

            <Text style={styles.label}>Preferred Contact</Text>
            <TextInput style={styles.input} value={form.preferredContact} onChangeText={(preferredContact) => setForm({ ...form, preferredContact })} placeholder="Phone, WhatsApp, or email" placeholderTextColor={theme.muted} />

            <Text style={styles.label}>Notes</Text>
            <TextInput style={[styles.input, styles.textareaSmall]} value={form.notes} onChangeText={(notes) => setForm({ ...form, notes })} placeholder="Optional access notes" placeholderTextColor={theme.muted} multiline />

            <TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={saveRequest} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Request'}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
          <View style={styles.list}>
            {requests.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="construct-outline" size={42} color={theme.muted} />
                <Text style={styles.emptyTitle}>No service requests yet.</Text>
                <Text style={styles.emptyText}>Create a request for maintenance, cleaning, security, internet, or other villa support.</Text>
              </View>
            ) : requests.map((request) => {
              const apartment = apartmentById[String(request.apartmentId)];
              const vendor = vendorById[String(request.vendorId)];
              return (
                <View key={request.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{request.description}</Text>
                      <Text style={styles.muted}>Apt {apartment?.apartmentNumber || request.apartmentId} • {vendor?.name || 'Provider not assigned'}</Text>
                    </View>
                    <Text style={[styles.badge, request.status === 'COMPLETED' && styles.doneBadge]}>{String(request.status || 'OPEN').replace('_', ' ')}</Text>
                  </View>
                  {request.notes ? <Text style={styles.notes}>{request.notes}</Text> : null}
                  {permissions.canManageServiceRequests ? <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusRow}>
                    {statuses.map((status) => (
                      <TouchableOpacity key={status} style={[styles.smallChoice, request.status === status && styles.choiceActive]} onPress={() => updateStatus(request, status)}>
                        <Text style={[styles.choiceText, request.status === status && styles.choiceTextActive]}>{status.replace('_', ' ')}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity style={styles.deleteChip} onPress={() => removeRequest(request)}>
                      <Ionicons name="trash-outline" size={14} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                      <Text style={styles.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </ScrollView> : null}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: theme.muted, marginTop: 3, fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 8 },
  button: { backgroundColor: theme.chip, borderRadius: 8, minHeight: 40, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center' },
  primaryButton: { backgroundColor: theme.primary },
  buttonText: { color: theme.text, fontWeight: '800', fontSize: 12 },
  primaryButtonText: { color: theme.onPrimary },
  content: { padding: 16, paddingBottom: 28 },
  notice: { backgroundColor: '#0F2230', borderColor: '#1F3A4D', borderWidth: 1, padding: 12, borderRadius: 10, flexDirection: 'row', gap: 8, marginBottom: 14 },
  noticeText: { color: '#93C5FD', flex: 1, lineHeight: 18 },
  panel: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip, padding: 14, marginBottom: 16 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 12 },
  label: { color: '#A7F3D0', fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 8 },
  choiceRow: { marginBottom: 8 },
  inlineChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  choice: { backgroundColor: theme.chip, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  smallChoice: { backgroundColor: theme.chip, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8 },
  choiceActive: { backgroundColor: theme.primary },
  choiceText: { color: theme.subtleText, fontSize: 12, fontWeight: '700' },
  choiceTextActive: { color: theme.onPrimary },
  input: { backgroundColor: theme.background, borderColor: theme.chip, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textarea: { minHeight: 92, textAlignVertical: 'top' },
  textareaSmall: { minHeight: 70, textAlignVertical: 'top' },
  saveButton: { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  saveText: { color: theme.onPrimary, fontWeight: '900' },
  disabled: { opacity: 0.6 },
  list: { gap: 12 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip },
  emptyTitle: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 10 },
  emptyText: { color: theme.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
  card: { backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.chip, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  cardTitle: { color: theme.text, fontWeight: '900', fontSize: 15, lineHeight: 20 },
  muted: { color: theme.muted, fontSize: 12, marginTop: 4 },
  badge: { color: '#93C5FD', backgroundColor: '#1E3A5F', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: '900' },
  doneBadge: { color: '#D1FAE5', backgroundColor: '#065F46' },
  notes: { color: theme.subtleText, marginTop: 10, lineHeight: 18 },
  statusRow: { marginTop: 12 },
  deleteChip: { backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontSize: 12, fontWeight: '900' },
});
