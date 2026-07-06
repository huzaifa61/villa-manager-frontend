import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const items: { titleKey: string; detailKey: string; icon: IconName; color: string; route: string }[] = [
  { titleKey: 'villas', detailKey: 'villasDetail', icon: 'business-outline', color: '#38BDF8', route: 'Villas' },
  { titleKey: 'villaMembers', detailKey: 'villaMembersDetail', icon: 'people-circle-outline', color: '#22C55E', route: 'VillaMembers' },
  { titleKey: 'vendors', detailKey: 'providerDirectory', icon: 'people-outline', color: '#F59E0B', route: 'Vendors' },
  { titleKey: 'documents', detailKey: 'documentsDetail', icon: 'document-text-outline', color: '#60A5FA', route: 'Documents' },
  { titleKey: 'backups', detailKey: 'backupsDetail', icon: 'archive-outline', color: '#14B8A6', route: 'Backups' },
  { titleKey: 'settings', detailKey: 'settingsDetail', icon: 'settings-outline', color: '#A78BFA', route: 'Settings' },
  { titleKey: 'helpGuide', detailKey: 'helpGuideDetail', icon: 'help-circle-outline', color: '#34D399', route: 'HelpGuide' },
];

export default function ControlScreen({ navigation }: any) {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const { user } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const visibleItems = items.filter((item) => {
    if (item.route === 'Villas') return permissions.isGeneralManager;
    if (['VillaMembers', 'Vendors', 'Documents', 'Backups', 'Settings'].includes(item.route)) return permissions.canManageVilla;
    return true;
  });
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('control')}</Text>
        <Text style={styles.subtitle}>{t('controlSubtitle')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {visibleItems.map((item) => (
          <TouchableOpacity key={item.route} style={styles.card} onPress={() => navigation.navigate(item.route)}>
            <View style={[styles.iconWrap, { backgroundColor: item.color + '22' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{t(item.titleKey)}</Text>
              <Text style={styles.cardDetail}>{t(item.detailKey)}</Text>
            </View>
            <Ionicons name={direction === 'rtl' ? 'chevron-back-outline' : 'chevron-forward-outline'} size={22} color={theme.muted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold', textAlign, writingDirection: direction },
  subtitle: { color: theme.muted, marginTop: 4, textAlign, writingDirection: direction },
  content: { padding: 16, gap: 12 },
  card: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 16, flexDirection: rowDirection, alignItems: 'center', gap: 14 },
  iconWrap: { width: 54, height: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: theme.text, fontSize: 17, fontWeight: '900', textAlign, writingDirection: direction },
  cardDetail: { color: theme.muted, marginTop: 4, lineHeight: 18, textAlign, writingDirection: direction },
});
