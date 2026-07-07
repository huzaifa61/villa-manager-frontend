import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor, roleLabel, roles as appRoles } from '../../utils/permissions';

const VILLA_ID = 1;
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

export default function VillaMembersScreen() {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [members, setMembers] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<string>(appRoles.VIEWER);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getUsers();
      setMembers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      Alert.alert('Users unavailable', e?.response?.data?.message || 'Could not load villa users.');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadMembers(); }, [loadMembers]));

  const sortedMembers = useMemo(() => [...members].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))), [members]);

  const inviteMember = async () => {
    if (inviting) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Email required', 'Please enter a valid member email.');
      return;
    }
    if (members.some((member) => String(member.email).toLowerCase() === cleanEmail)) {
      Alert.alert('Already added', 'This member is already in the villa list.');
      return;
    }
    if (!permissions.canInviteRole(role)) {
      Alert.alert('Role not allowed', 'Your account cannot invite that role.');
      return;
    }
    setInviting(true);
    try {
      await apiService.inviteUser({
        email: cleanEmail,
        fullName: fullName.trim() || cleanEmail,
        role,
        villaId: villaId,
      });
      setEmail('');
      setFullName('');
      setRole(appRoles.VIEWER);
      await loadMembers();
      Alert.alert('Invitation sent', 'The invite email was sent or logged by the backend mail service.');
    } catch (e: any) {
      Alert.alert('Invite failed', e?.response?.data?.message || e?.message || 'Could not send invitation.');
    } finally {
      setInviting(false);
    }
  };

  const deleteMember = (member: any) => {
    Alert.alert('Remove member?', member.email + ' will be removed from this villa.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await apiService.deleteUser(member.id);
          await loadMembers();
        } catch (e: any) {
          Alert.alert('Delete failed', e?.response?.data?.message || 'Could not delete this user.');
        }
      } },
    ]);
  };

  const updateRole = async (member: any, nextRole: string) => {
    try {
      await apiService.updateUser(member.id, { role: nextRole, villaId: member.villaId || villaId });
      await loadMembers();
    } catch (e: any) {
      Alert.alert('Update failed', e?.response?.data?.message || 'Could not update this user.');
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
          <Text style={styles.label}>Full Name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Member name" placeholderTextColor={theme.muted} />
          <Text style={styles.label}>Member Email *</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="member@example.com" placeholderTextColor={theme.muted} keyboardType="email-address" autoCapitalize="none" />
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {availableRoles.map((item) => (
              <TouchableOpacity key={item.value} style={[styles.roleChip, role === item.value && styles.roleChipActive]} onPress={() => setRole(item.value)}>
                <Text style={[styles.roleText, role === item.value && styles.roleTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
              <Text style={styles.emptyText}>No villa members added yet.</Text>
            </View>
          ) : sortedMembers.map((member) => (
            <View key={member.id} style={styles.memberCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberEmail}>{member.email}</Text>
                <Text style={styles.memberMeta}>{roleLabel(member.role)} • {member.invitationStatus || (member.isActive ? 'ACTIVE' : 'INVITED')}</Text>
              </View>
              {permissions.isGeneralManager ? <View style={styles.memberActions}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectableRoles.map((item) => (
                    <TouchableOpacity key={item.value} style={[styles.roleChipSmall, member.role === item.value && styles.roleChipActive]} onPress={() => updateRole(member, item.value)}>
                      <Text style={[styles.roleTextSmall, member.role === item.value && styles.roleTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.deleteButton} onPress={() => deleteMember(member)}>
                  <Ionicons name="trash-outline" size={15} color={theme.mode === 'light' ? '#B91C1C' : theme.dangerText} />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
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
  input: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, color: theme.text, paddingHorizontal: 12, paddingVertical: 10 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  roleChip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  roleChipSmall: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7, marginRight: 8 },
  roleChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  roleText: { color: theme.subtleText, fontSize: 12, fontWeight: '800' },
  roleTextSmall: { color: theme.subtleText, fontSize: 11, fontWeight: '800' },
  roleTextActive: { color: theme.onPrimary },
  inviteButton: { backgroundColor: theme.primary, borderRadius: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 4 },
  inviteButtonDisabled: { opacity: 0.6 },
  inviteText: { color: theme.onPrimary, fontWeight: '900' },
  empty: { alignItems: 'center', padding: 22, backgroundColor: theme.background, borderRadius: 10, borderWidth: 1, borderColor: theme.border },
  emptyText: { color: theme.muted, marginTop: 8, fontWeight: '700' },
  memberCard: { borderTopColor: theme.border, borderTopWidth: 1, paddingVertical: 12, gap: 10 },
  memberEmail: { color: theme.text, fontSize: 15, fontWeight: '900' },
  memberMeta: { color: theme.muted, fontSize: 12, marginTop: 4 },
  memberActions: { gap: 9 },
  deleteButton: { alignSelf: 'flex-start', backgroundColor: theme.mode === 'light' ? '#FEE2E2' : '#3B1F26', borderColor: theme.mode === 'light' ? '#FCA5A5' : '#7F1D1D', borderWidth: 1, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  deleteText: { color: theme.mode === 'light' ? '#B91C1C' : theme.dangerText, fontWeight: '900' },
  guideCard: { backgroundColor: theme.input, borderColor: theme.border, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  guideTitle: { color: theme.text, fontSize: 15, fontWeight: '900', marginBottom: 8 },
  guideItem: { color: theme.subtleText, lineHeight: 20, marginBottom: 3 },
});
