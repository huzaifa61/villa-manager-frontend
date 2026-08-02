import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { exportCsvContent } from '../../utils/csv';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { permissionsFor } from '../../utils/permissions';

export default function BackupsScreen() {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const { user } = useSelector((s: RootState) => s.auth);
  const permissions = permissionsFor(user);
  const styles = makeStyles(theme, textAlign, rowDirection, direction);
  const [villas, setVillas] = useState<any[]>([]);
  const [selectedVillaId, setSelectedVillaId] = useState<number>(user?.villaId || 1);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadVillas = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiService.getVillas().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setVillas(list);
      if (!user?.villaId && list[0]?.id) setSelectedVillaId(list[0].id);
    } finally {
      setLoading(false);
    }
  }, [user?.villaId]);

  useFocusEffect(useCallback(() => { loadVillas(); }, [loadVillas]));

  const selectedVilla = useMemo(() => villas.find((villa) => villa.id === selectedVillaId), [selectedVillaId, villas]);

  const exportBackup = async () => {
    setExporting(true);
    try {
      const [villa, apartments, expenses, payments, serviceRequests] = await Promise.all([
        apiService.getVilla(selectedVillaId).catch(() => selectedVilla || null),
        apiService.getApartments(selectedVillaId).catch(() => []),
        apiService.getExpenses(selectedVillaId).catch(() => []),
        apiService.getPayments(selectedVillaId).catch(() => []),
        apiService.getServiceRequests(selectedVillaId).catch(() => []),
      ]);
      const backup = {
        exportedAt: new Date().toISOString(),
        villa,
        apartments,
        expenses,
        payments,
        serviceRequests,
      };
      await exportCsvContent('villa-backup-' + selectedVillaId + '.json', JSON.stringify(backup, null, 2));
    } catch (e: any) {
      Alert.alert(t('backupFailed'), e?.response?.data?.message || e?.message || t('couldNotExportBackup'));
    } finally {
      setExporting(false);
    }
  };

  if (!permissions.canManageVilla) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('backupsTitle')}</Text>
          <Text style={styles.subtitle}>{t('sectionManagersOnly')}</Text>
        </View>
        <View style={styles.restricted}>
          <Ionicons name="lock-closed-outline" size={42} color={theme.muted} />
          <Text style={styles.emptyText}>{t('accessRestricted')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('backupsTitle')}</Text>
        <Text style={styles.subtitle}>{t('backupsDetail')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} /> : (
          <>
            {permissions.isGeneralManager ? (
              <View style={styles.panel}>
                <Text style={styles.panelTitle}>{t('selectVilla')}</Text>
                <View style={[styles.chips, { flexDirection: rowDirection }]}>
                  {villas.map((villa) => (
                    <TouchableOpacity key={villa.id} style={[styles.chip, selectedVillaId === villa.id && styles.chipActive]} onPress={() => setSelectedVillaId(villa.id)}>
                      <Text style={[styles.chipText, selectedVillaId === villa.id && styles.chipTextActive]}>{villa.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.panel}>
              <View style={[styles.panelHeader, { flexDirection: rowDirection }]}>
                <Ionicons name="archive-outline" size={22} color={theme.primary} />
                <Text style={styles.panelTitle}>{selectedVilla?.name || t('assignedVilla')}</Text>
              </View>
              <Text style={styles.meta}>{t('backupIncludes')}</Text>
              <TouchableOpacity style={[styles.primaryButton, { flexDirection: rowDirection }, exporting && { opacity: 0.6 }]} onPress={exportBackup} disabled={exporting}>
                <Ionicons name="download-outline" size={18} color={theme.onPrimary} />
                <Text style={styles.primaryText}>{exporting ? t('exporting') : t('backupExport')}</Text>
              </TouchableOpacity>
            </View>
          </>
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
  header: { padding: 16, backgroundColor: theme.header },
  title: { color: theme.text, fontSize: 22, fontWeight: '900', textAlign, writingDirection: direction },
  subtitle: { color: theme.muted, marginTop: 4, textAlign, writingDirection: direction },
  content: { padding: 16, paddingBottom: 28, gap: 14 },
  panel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14 },
  panelHeader: { alignItems: 'center', gap: 8, marginBottom: 10 },
  panelTitle: { color: theme.text, fontSize: 17, fontWeight: '900', textAlign, writingDirection: direction },
  meta: { color: theme.muted, lineHeight: 20, marginBottom: 14, textAlign, writingDirection: direction },
  chips: { flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { backgroundColor: theme.chip, borderColor: theme.border, borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  chipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  chipText: { color: theme.subtleText, fontWeight: '800' },
  chipTextActive: { color: theme.onPrimary },
  primaryButton: { backgroundColor: theme.primary, borderRadius: 10, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 7 },
  primaryText: { color: theme.onPrimary, fontWeight: '900' },
  restricted: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyText: { color: theme.text, fontSize: 16, fontWeight: '900', marginTop: 10, textAlign, writingDirection: direction },
});
