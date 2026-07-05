import React, { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const sections = [
  {
    title: 'Quick Start',
    body: [
      'Villa Manager Pro manages villas, apartments, shared expenses, payments, maintenance, service requests, reports, backups, users, and the provider directory.',
      'Master Admin approves paying Villa Admins, manages users, manages global service providers, and dispatches service requests.',
      'Villa Admin creates and manages one villa, apartments, expenses, payments, vendors, maintenance, documents, and viewers.',
      'Viewer can read villa information, balances, reports, and service status, but cannot edit data.',
    ],
  },
  {
    title: 'Roles & Permissions',
    body: [
      'Master Admin can activate, deactivate, and delete users, manage provider contacts, and review admin-only service workflows.',
      'Villa Admin can manage only their own villa and invite or manage viewers for that villa.',
      'Viewer can view linked villa data and cannot add, edit, delete, reset, restore, or manage members.',
    ],
  },
  {
    title: 'Login & Accounts',
    body: [
      'Create an account with full name, email, and a password of at least 6 characters.',
      'Villa Admins are activated by the Master Admin after payment confirmation.',
      'Viewers must register with exactly the same email added by the Villa Admin.',
    ],
  },
  {
    title: 'Dashboard',
    body: [
      'Use Dashboard for total expenses, total collected, cash balance, unpaid balances, and recent activity.',
      'Check it before sharing balances with residents.',
    ],
  },
  {
    title: 'Apartments',
    body: [
      'Maintain apartment owner, tenant, phone, status, share percentage, and opening balance.',
      'Do not delete apartments with financial records unless you are sure.',
    ],
  },
  {
    title: 'Expenses',
    body: [
      'Expenses can be shared equally, assigned to one apartment, or allocated to selected apartments.',
      'Always check allocations before saving large expenses.',
    ],
  },
  {
    title: 'Payments',
    body: [
      'Payments record money collected from apartments or groups.',
      'Payment records feed balances, ledgers, statements, and reports.',
    ],
  },
  {
    title: 'Documents',
    body: [
      'Use Documents for references, notes, links, renewal dates, or record locations.',
      'For heavy receipts or photos, use the configured external storage or villa group to keep hosting light.',
    ],
  },
  {
    title: 'Service Requests',
    body: [
      'A user or Villa Admin submits a request with category, urgency, apartment, description, and preferred contact.',
      'The Master Admin reviews the request, checks the provider directory, dispatches a provider, and updates status.',
    ],
  },
  {
    title: 'Provider Directory',
    body: [
      'The Vendors section is the private provider directory.',
      'Search by provider name, phone, category, email, address, or notes.',
      'Export CSV before large edits.',
    ],
  },
  {
    title: 'Reports & Statements',
    body: [
      'Reports convert raw entries into balance sheets, ledgers, monthly summaries, category views, and statements.',
      'Use CSV export or browser print where available for sharing.',
    ],
  },
  {
    title: 'Settings & Danger Zone',
    body: [
      'Settings controls villa name, address, notes, WhatsApp instructions, and document instructions.',
      'Danger actions require typed confirmation. Export records before resets.',
    ],
  },
  {
    title: 'Search, Export & Printing',
    body: [
      'Search boxes filter visible records quickly.',
      'CSV exports include UTF-8 formatting for spreadsheet compatibility.',
      'For PDF, use browser or device print and choose Save as PDF where available.',
    ],
  },
  {
    title: 'Troubleshooting',
    body: [
      'If you cannot see a villa, refresh, log out and back in, and confirm the account email matches the invited email.',
      'If reports look wrong, check expenses, payments, split allocations, and date filters.',
      'If a user is pending, the correct admin must activate the user.',
    ],
  },
  {
    title: 'Recommended Workflow',
    body: [
      'Master Admin approves the paying Villa Admin.',
      'Villa Admin creates the villa and apartments, enters opening balances, and records expenses and payments regularly.',
      'Villa Admin adds viewer emails and activates viewers after they register.',
      'Service requests go to the Master Admin workflow, then the Master Admin dispatches using the private provider directory.',
      'Download CSV exports or backups before major changes.',
    ],
  },
];

export default function HelpGuideScreen() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => sections.filter((section) => {
    const text = [section.title, ...section.body].join(' ').toLowerCase();
    return text.includes(query.toLowerCase());
  }), [query]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Help Guide</Text>
        <Text style={styles.subtitle}>Role-based workflows and app usage.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9CA3AF" />
          <TextInput style={styles.search} value={query} onChangeText={setQuery} placeholder="Search in the help guide..." placeholderTextColor="#6B7280" />
          {query ? <TouchableOpacity onPress={() => setQuery('')}><Ionicons name="close-circle-outline" size={19} color="#9CA3AF" /></TouchableOpacity> : null}
        </View>

        {filtered.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.cardTitle}>{section.title}</Text>
            {section.body.map((line) => (
              <View key={line} style={styles.line}>
                <View style={styles.dot} />
                <Text style={styles.body}>{line}</Text>
              </View>
            ))}
          </View>
        ))}

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="help-circle-outline" size={42} color="#6B7280" />
            <Text style={styles.emptyTitle}>No guide results.</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  content: { padding: 16, paddingBottom: 28, gap: 12 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 10, paddingHorizontal: 12 },
  search: { color: '#fff', flex: 1, paddingVertical: 11 },
  card: { backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 12, padding: 14 },
  cardTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  line: { flexDirection: 'row', gap: 9, marginTop: 7, alignItems: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginTop: 7 },
  body: { color: '#D1D5DB', flex: 1, lineHeight: 20 },
  empty: { alignItems: 'center', padding: 26, backgroundColor: '#1F2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151' },
  emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginTop: 10 },
});
