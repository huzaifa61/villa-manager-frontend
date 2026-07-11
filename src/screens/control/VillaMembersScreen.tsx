import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor, roleLabel, roles as appRoles } from '../../utils/permissions';

const selectableRoles = [
  { label: 'General Manager', value: appRoles.GENERAL_MANAGER },
  { label: 'Villa Manager', value: appRoles.VILLA_MANAGER },
  { label: 'Viewer', value: appRoles.VIEWER },
];

const roleGuides = [
  {
    title: 'General Manager (Super Admin)',
    items: [
      'Manage villas.',
      'Add/Edit/Delete Villa Managers.',
      'Assign Villa Managers to villas.',
      'Full access to all villas, apartments, expenses, payments, reports, maintenance, documents, services, backups, and settings.',
    ],
  },
  {
    title: 'Villa Manager',
    items: [
      'Create and manage only their assigned villa.',
      'Manage apartments.',
      'Add/Edit expenses and payments.',
      'Manage maintenance, vendors, documents, and services.',
      'View reports.',
      'Invite Viewer users for their villa.',
    ],
  },
  {
    title: 'Viewer',
    items: [
      'Access only the assigned villa.',
      'View apartments, expenses, payments, balances, and reports.',
      'Print reports.',
      'Create service requests or report problems.',
      'Cannot edit financial data or villa information.',
    ],
  },
];

// Roles that must be assigned to a specific villa
const VILLA_SCOPED_ROLES = [appRoles.VILLA_MANAGER, appRoles.VIEWER];

export default function VillaMembersScreen() {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [members, setMembers] = useState<any[]>([]);
  const [villas, setVillas] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>(appRoles.VIEWER);
  const [selectedVillaId, setSelectedVillaId] = useState<number>(villaId);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  // Inline validation errors
  const [errors, setErrors] = useState<{ email?: string; villa?: string }>({});
  // Status banner for success/failure
  const [inviteStatus, setInviteStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  // Subscription modal state
  const [subModal, setSubModal] = useState<{ member: any; expiresAt: string; maxViewers: string } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersData, villasData] = await Promise.all([
        apiService.getUsers(),
        apiService.getVillas().catch(() => []),
      ]);
      setMembers(Array.isArray(membersData) ? membersData : []);
      const villaList = Array.isArray(villasData) ? villasData : [];
      setVillas(villaList);
      if (villaList.length > 0 && !selectedVillaId) {
        setSelectedVillaId(villaList[0].id);
      }
    } catch (e: any) {
      setInviteStatus({ type: 'error', text: 'Could not load villa users.' });
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const sortedMembers = useMemo(() => {
    const list = permissions.isVillaManager
      ? members.filter((member) => member.role === appRoles.VIEWER && member.villaId === villaId)
      : members;
    return [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [members, permissions.isVillaManager, villaId]);

  const needsVilla = VILLA_SCOPED_ROLES.includes(role);

  const inviteMember = async () => {
    if (inviting) return;
    setInviteStatus(null);

    // Inline validation
    const newErrors: typeof errors = {};
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      newErrors.email = 'Please enter a valid email address';
    } else if (members.some((m) => String(m.email).toLowerCase() === cleanEmail)) {
      newErrors.email = 'This email is already a member of this villa';
    }
    if (needsVilla && !selectedVillaId) {
      newErrors.villa = 'Please select a villa to assign this member to';
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    if (!permissions.canInviteRole(role)) {
      setInviteStatus({ type: 'error', text: 'Your account cannot invite that role.' });
      return;
    }

    setInviting(true);
    try {
      await apiService.inviteUser({
        email: cleanEmail,
        fullName: fullName.trim() || cleanEmail,
        role,
        villaId: needsVilla ? selectedVillaId : null,
      });
      setEmail('');
      setFullName('');
      setRole(appRoles.VIEWER);
      setInviteStatus({ type: 'success', text: '✅ Invitation sent successfully! The invite email has been dispatched.' });
      await loadData();
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Could not send invitation.';
      setInviteStatus({ type: 'error', text: msg });
    } finally {
      setInviting(false);
    }
  };

  const deleteMember = (member: any) => {
    if (typeof window !== 'undefined') {
      if (window.confirm(`Remove ${member.email} from this villa?`)) {
        apiService.deleteUser(member.id).then(loadData).catch((e: any) => {
          setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not delete user.' });
        });
      }
    } else {
      Alert.alert('Remove member?', member.email + ' will be removed.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          apiService.deleteUser(member.id).then(loadData).catch((e: any) => {
            setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not delete user.' });
          });
        }},
      ]);
    }
  };

  const updateRole = async (member: any, nextRole: string) => {
    try {
      await apiService.updateUser(member.id, { role: nextRole, villaId: member.villaId || villaId });
      await loadData();
    } catch (e: any) {
      setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not update role.' });
    }
  };

  const updateMemberVilla = async (member: any, newVillaId: number) => {
    try {
      await apiService.updateUser(member.id, { role: member.role, villaId: newVillaId });
      await loadData();
    } catch (e: any) {
      setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not update villa assignment.' });
    }
  };

  const updateSubscription = async (member: any, subscriptionExpiresAt: string, maxViewers: number) => {
    try {
      await apiService.updateUserSubscription(member.id, { subscriptionExpiresAt, maxViewers });
      setInviteStatus({ type: 'success', text: '✅ Subscription updated successfully.' });
      await loadData();
    } catch (e: any) {
      setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not update subscription.' });
    }
  };

  const revokeSubscription = async (member: any) => {
    try {
      await apiService.revokeUserSubscription(member.id);
      setInviteStatus({ type: 'error', text: `⛔ Subscription revoked for ${member.email}.` });
      await loadData();
    } catch (e: any) {
      setInviteStatus({ type: 'error', text: e?.response?.data?.message || 'Could not revoke subscription.' });
    }
  };

  const availableRoles = selectableRoles.filter((item) => permissions.canInviteRole(item.value));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Villa Members</Text>
        <Text style={styles.subtitle}>Invite people and choose what they can access.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Ionicons name="person-add-outline" size={22} color={theme.primary} />
            <Text style={styles.panelTitle}>Invite Member</Text>
          </View>

          {/* Status banner */}
          {inviteStatus && (
            <View style={[styles.statusBox, inviteStatus.type === 'error' ? styles.statusError : styles.statusSuccess]}>
              <Text style={styles.statusText}>{inviteStatus.text}</Text>
            </View>
          )}

          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Member name" placeholderTextColor={theme.muted} />
          <Text style={styles.label}>Member Email *</Text>
          <TextInput
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
            onChangeText={(v) => { setEmail(v); setErrors(p => ({ ...p, email: undefined })); setInviteStatus(null); }}
            placeholder="member@example.com"
            placeholderTextColor={theme.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {availableRoles.map((item) => (
              <TouchableOpacity key={item.value} style={[styles.roleChip, role === item.value && styles.roleChipActive]} onPress={() => setRole(item.value)}>
                <Text style={[styles.roleText, role === item.value && styles.roleTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Villa selector — shown for Villa Manager and Viewer roles */}
          {needsVilla && (
            <View>
              <Text style={styles.label}>
                Assign to Villa *
                <Text style={styles.labelHint}> (required for {role === appRoles.VILLA_MANAGER ? 'Villa Manager' : 'Viewer'})</Text>
              </Text>
              {villas.length === 0 ? (
                <View style={styles.noVillaBox}>
                  <Ionicons name="warning-outline" size={16} color={theme.danger} />
                  <Text style={styles.noVillaText}>No villas found. Please create a villa first.</Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                  <View style={styles.villaRow}>
                    {villas.map((villa) => (
                      <TouchableOpacity
                        key={villa.id}
                        style={[styles.villaChip, selectedVillaId === villa.id && styles.villaChipActive]}
                        onPress={() => { setSelectedVillaId(villa.id); setErrors(p => ({ ...p, villa: undefined })); }}
                      >
                        <Ionicons name="business-outline" size={14} color={selectedVillaId === villa.id ? theme.onPrimary : theme.primary} />
                        <Text style={[styles.villaChipText, selectedVillaId === villa.id && styles.villaChipTextActive]}>{villa.name}</Text>
                        {selectedVillaId === villa.id && <Ionicons name="checkmark-circle" size={14} color={theme.onPrimary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              )}
              {errors.villa ? <Text style={styles.errorText}>{errors.villa}</Text> : null}
            </View>
          )}

          <TouchableOpacity style={[styles.inviteButton, (inviting || !permissions.canManageUsers) && styles.inviteButtonDisabled]} onPress={inviteMember} disabled={inviting || !permissions.canManageUsers}>
            {inviting ? (
              <ActivityIndicator size="small" color={theme.onPrimary} />
            ) : (
              <Ionicons name="send-outline" size={17} color={theme.onPrimary} />
            )}
            <Text style={styles.inviteText}>{inviting ? 'Sending...' : 'Send Invitation'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Ionicons name="people-outline" size={22} color={theme.primary} />
            <Text style={styles.panelTitle}>Members</Text>
          </View>
          {loading ? <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} /> : sortedMembers.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="people-circle-outline" size={42} color={theme.muted} />
              <Text style={styles.emptyText}>{permissions.isVillaManager ? 'No viewers added yet.' : 'No villa members added yet.'}</Text>
            </View>
          ) : sortedMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <View style={styles.memberMetaRow}>
                  <Text style={styles.memberMeta}>{roleLabel(member.role)}</Text>
                  {member.villaId && (
                    <View style={styles.villaBadge}>
                      <Ionicons name="business-outline" size={11} color={theme.primary} />
                      <Text style={styles.villaBadgeText}>
                        {villas.find(v => v.id === member.villaId)?.name || `Villa #${member.villaId}`}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.memberStatus}>{member.invitationStatus || (member.isActive ? 'ACTIVE' : 'INVITED')}</Text>
                </View>
              </View>
              {permissions.isGeneralManager ? <View style={styles.memberActions}>
                {/* Role chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectableRoles.map((item) => (
                    <TouchableOpacity key={item.value} style={[styles.roleChipSmall, member.role === item.value && styles.roleChipActive]} onPress={() => updateRole(member, item.value)}>
                      <Text style={[styles.roleTextSmall, member.role === item.value && styles.roleTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {/* Villa reassignment — shown for Villa Manager and Viewer */}
                {VILLA_SCOPED_ROLES.includes(member.role) && villas.length > 0 && (
                  <View>
                    <Text style={styles.reassignLabel}>Assigned Villa:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={styles.villaRow}>
                        {villas.map((villa) => (
                          <TouchableOpacity
                            key={villa.id}
                            style={[styles.villaChipSmall, member.villaId === villa.id && styles.villaChipActive]}
                            onPress={() => updateMemberVilla(member, villa.id)}
                          >
                            <Text style={[styles.villaChipTextSmall, member.villaId === villa.id && styles.villaChipTextActive]}>
                              {villa.name}
                            </Text>
                            {member.villaId === villa.id && (
                              <Ionicons name="checkmark" size={12} color={theme.onPrimary} />
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMember(member)}>
                  <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>

                {/* Subscription controls — only for Villa Managers, editable by GM only */}
                {member.role === appRoles.VILLA_MANAGER && (
                  <View style={styles.subSection}>
                    <View style={styles.subHeader}>
                      <Ionicons name="time-outline" size={15} color={member.subscriptionExpired ? '#EF4444' : theme.primary} />
                      <Text style={[styles.subLabel, member.subscriptionExpired && styles.subExpired]}>
                        {member.subscriptionExpired
                          ? '⛔ Subscription Expired'
                          : member.subscriptionExpiresAt
                          ? `✅ Expires: ${new Date(member.subscriptionExpiresAt).toLocaleDateString()}`
                          : '♾️ No expiry set'}
                      </Text>
                      <Text style={styles.subViewers}>👥 Max viewers: {member.maxViewers || 5}</Text>
                    </View>
                    {/* Edit/Revoke — General Manager only */}
                    {permissions.isGeneralManager && (
                      <View style={styles.subActions}>
                        <TouchableOpacity
                          style={styles.subBtn}
                          onPress={() => setSubModal({
                            member,
                            expiresAt: member.subscriptionExpiresAt
                              ? new Date(member.subscriptionExpiresAt).toISOString().split('T')[0]
                              : '',
                            maxViewers: String(member.maxViewers || 5),
                          })}
                        >
                          <Ionicons name="create-outline" size={14} color={theme.primary} />
                          <Text style={styles.subBtnText}>Set Subscription</Text>
                        </TouchableOpacity>
                        {member.subscriptionExpiresAt && !member.subscriptionExpired && (
                          <TouchableOpacity style={[styles.subBtn, styles.subBtnRevoke]} onPress={() => revokeSubscription(member)}>
                            <Ionicons name="ban-outline" size={14} color="#EF4444" />
                            <Text style={[styles.subBtnText, { color: '#EF4444' }]}>Revoke</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View> : null}
            </View>
          ))}
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Ionicons name="key-outline" size={22} color={theme.primary} />
            <Text style={styles.panelTitle}>Login Types</Text>
          </View>
          {roleGuides.map((guide) => (
            <View key={guide.title} style={styles.guideCard}>
              <Text style={styles.guideTitle}>{guide.title}</Text>
              {guide.items.map((item) => <Text key={item} style={styles.guideItem}>- {item}</Text>)}
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Subscription Modal */}
      {subModal && (
        <Modal visible transparent animationType="fade">
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setSubModal(null)}>
            <TouchableOpacity activeOpacity={1} style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Set Subscription</Text>
              <Text style={styles.modalEmail}>{subModal.member.email}</Text>

              <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={subModal.expiresAt}
                onChangeText={(v) => setSubModal(p => p ? { ...p, expiresAt: v } : null)}
                placeholder="e.g. 2026-12-31"
                placeholderTextColor={theme.muted}
              />

              <Text style={styles.label}>Max Viewers Allowed</Text>
              <TextInput
                style={styles.input}
                value={subModal.maxViewers}
                onChangeText={(v) => setSubModal(p => p ? { ...p, maxViewers: v } : null)}
                keyboardType="number-pad"
                placeholder="e.g. 5"
                placeholderTextColor={theme.muted}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={() => setSubModal(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.saveBtn]}
                  onPress={async () => {
                    const maxV = parseInt(subModal.maxViewers);
                    if (isNaN(maxV) || maxV < 0) {
                      setInviteStatus({ type: 'error', text: 'Max viewers must be a valid number (0 or more).' });
                      return;
                    }
                    await updateSubscription(
                      subModal.member,
                      subModal.expiresAt ? subModal.expiresAt + 'T23:59:59' : '',
                      maxV
                    );
                    setSubModal(null);
                  }}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: theme.muted, marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
  panelTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  label: { color: theme.label, fontSize: 12, fontWeight: '800', marginBottom: 7, marginTop: 8 },
  labelHint: { color: theme.muted, fontSize: 11, fontWeight: '600' },
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10 },
  inputError: { borderColor: '#EF4444', borderWidth: 1.5 },
  errorText: { color: '#EF4444', fontSize: 12, fontWeight: '600', marginTop: 4, marginLeft: 2, marginBottom: 4 },
  statusBox: { borderRadius: 8, padding: 12, borderWidth: 1, marginBottom: 4 },
  statusError: { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
  statusSuccess: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
  statusText: { fontSize: 13, fontWeight: '700', color: '#1F2937', lineHeight: 20 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  roleChipSmall: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8 },
  roleChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  roleText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  roleTextSmall: { color: theme.subtleText, fontSize: 11, fontWeight: '800' },
  roleTextActive: { color: theme.onPrimary },
  // Villa selector
  villaRow: { flexDirection: 'row', gap: 8 },
  villaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.chip, borderColor: theme.primary, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 },
  villaChipSmall: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6 },
  villaChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  villaChipText: { color: theme.primary, fontSize: 13, fontWeight: '800' },
  villaChipTextSmall: { color: theme.subtleText, fontSize: 11, fontWeight: '700' },
  villaChipTextActive: { color: theme.onPrimary },
  noVillaBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.danger + '18', borderColor: theme.danger, borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12 },
  noVillaText: { color: theme.danger, fontSize: 12, fontWeight: '700', flex: 1 },
  reassignLabel: { color: theme.muted, fontSize: 11, fontWeight: '700', marginBottom: 6, marginTop: 8 },
  inviteButton: { backgroundColor: theme.primary, borderRadius: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  inviteButtonDisabled: { opacity: 0.6 },
  inviteText: { color: theme.onPrimary, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 22, backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  emptyText: { color: theme.muted, marginTop: 8, fontWeight: '700' },
  memberCard: { borderTopColor: theme.border, borderTopWidth: 1, paddingVertical: 12, gap: 10 },
  memberEmail: { color: theme.text, fontSize: 15, fontWeight: '900' },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  memberMeta: { color: theme.muted, fontSize: 12 },
  memberStatus: { color: theme.muted, fontSize: 12 },
  villaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.primary + '18', borderColor: theme.primary, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  villaBadgeText: { color: theme.primary, fontSize: 11, fontWeight: '700' },
  memberActions: { gap: 9 },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900' },
  // Subscription
  subSection: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, gap: 8 },
  subHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  subLabel: { color: theme.primary, fontSize: 12, fontWeight: '700' },
  subExpired: { color: '#EF4444' },
  subViewers: { color: theme.muted, fontSize: 12 },
  subActions: { flexDirection: 'row', gap: 8 },
  subBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.chip, borderColor: theme.primary, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  subBtnRevoke: { borderColor: '#EF4444' },
  subBtnText: { color: theme.primary, fontSize: 12, fontWeight: '800' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end', padding: 0 },
  modalCard: { backgroundColor: theme.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20, gap: 10, paddingBottom: 34 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '900' },
  modalEmail: { color: theme.muted, fontSize: 13 },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  button: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1 },
  cancelBtnText: { color: theme.text, fontWeight: '700' },
  saveBtn: { backgroundColor: theme.primary },
  saveBtnText: { color: theme.onPrimary, fontWeight: '900' },
  guideCard: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  guideTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  guideItem: { color: theme.subtleText, lineHeight: 20, marginBottom: 3 },
});
