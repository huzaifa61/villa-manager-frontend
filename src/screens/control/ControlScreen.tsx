import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const items: { title: string; detail: string; icon: IconName; color: string; route: string }[] = [
  { title: 'Vendors', detail: 'Provider directory with CSV export.', icon: 'people-outline', color: '#F59E0B', route: 'Vendors' },
  { title: 'Documents', detail: 'Reference notes, links, renewals, and records.', icon: 'document-text-outline', color: '#60A5FA', route: 'Documents' },
  { title: 'Settings', detail: 'Villa details, WhatsApp notes, and reset tools.', icon: 'settings-outline', color: '#A78BFA', route: 'Settings' },
  { title: 'Help Guide', detail: 'Role-based workflow guide for the app.', icon: 'help-circle-outline', color: '#34D399', route: 'HelpGuide' },
];

export default function ControlScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Control</Text>
        <Text style={styles.subtitle}>Manage operational sections and support tools.</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {items.map((item) => (
          <TouchableOpacity key={item.route} style={styles.card} onPress={() => navigation.navigate(item.route)}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
            </View>
            <Ionicons name="chevron-forward-outline" size={22} color="#6B7280" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: '#9CA3AF', marginTop: 4 },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: '#1F2937', borderColor: '#374151', borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconWrap: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  cardDetail: { color: '#9CA3AF', marginTop: 4, lineHeight: 18 },
});
