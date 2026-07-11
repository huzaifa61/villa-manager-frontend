import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logoutUser, setActiveVillaId } from '../../store/slices/authSlice';
import { fetchUnreadCount } from '../../store/slices/notificationsSlice';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function DashboardScreen({ navigation }: any) {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const s = makeStyles(theme, textAlign, rowDirection, direction);
  const dispatch = useDispatch<AppDispatch>();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const unreadCount = useSelector((s: RootState) => s.notifications.unreadCount);
  const villaId = activeVillaId || user?.villaId || 1;
  const [stats, setStats] = useState({ apts: 0, occupied: 0, collected: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);
  const [villas, setVillas] = useState<any[]>([]);
  const [activeVilla, setActiveVilla] = useState<any>(null);
  const [showVillaPicker, setShowVillaPicker] = useState(false);
  const [villaManagers, setVillaManagers] = useState<any[]>([]); // GM only: subscription overview

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [a, p, e, v] = await Promise.all([
        apiService.getApartments(villaId).catch(() => []),
        apiService.getPayments(villaId).catch(() => []),
        apiService.getExpenses(villaId).catch(() => []),
        apiService.getVillas().catch(() => []),
      ]);
      const apts = Array.isArray(a) ? a : [];
      const pays = Array.isArray(p) ? p : [];
      const exps = Array.isArray(e) ? e : [];
      const villaList = Array.isArray(v) ? v : [];
      setVillas(villaList);
      setActiveVilla(villaList.find((x: any) => x.id === villaId) || villaList[0] || null);
      setStats({
        apts: apts.length,
        occupied: apts.filter((x: any) => x.status === 'OCCUPIED' || x.status === 'ACTIVE').length,
        collected: pays.filter((x: any) => x.status === 'COMPLETED' || x.status === 'PAID').reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
        expenses: exps.reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
      });

      // GM: load villa managers for subscription overview
      if (user?.role === 'GENERAL_MANAGER') {
        const users = await apiService.getUsers().catch(() => []);
        setVillaManagers(Array.isArray(users) ? users.filter((u: any) => u.role === 'VILLA_MANAGER') : []);
      }
    } finally { setLoading(false); }
  }, [villaId]);

  useFocusEffect(useCallback(() => {
    loadStats();
    dispatch(fetchUnreadCount());
  }, [loadStats]));

  const switchVilla = (villa: any) => {
    dispatch(setActiveVillaId(villa.id));
    setShowVillaPicker(false);
  };

  const cards = [
    { label: 'Total Units', value: String(stats.apts), icon: 'home-outline' as IconName, color: theme.secondary, nav: 'Apartments' },
    { label: 'Occupied', value: String(stats.occupied), icon: 'people-outline' as IconName, color: theme.primary, nav: 'Apartments' },
    { label: 'Collected', value: 'EGP ' + stats.collected.toLocaleString(), icon: 'cash-outline' as IconName, color: theme.primary, nav: 'Payments' },
    { label: t('expenses'), value: 'EGP ' + stats.expenses.toLocaleString(), icon: 'receipt-outline' as IconName, color: theme.danger, nav: 'Expenses' },
  ];

  return (
    <SafeAreaView style={s.container}>
      {/* HEADER */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.welcome}>Welcome back</Text>
          <Text style={s.name}>{user?.fullName || user?.email || 'Manager'}</Text>
          <Text style={s.role}>{user?.role || 'GENERAL_MANAGER'}</Text>
        </View>
        {/* Villa switcher */}
        <TouchableOpacity style={s.villaSwitcher} onPress={() => setShowVillaPicker(true)}>
          <View style={s.villaSwitcherInner}>
            <Ionicons name="business-outline" size={14} color={theme.primary} />
            <Text style={s.villaSwitcherText} numberOfLines={1}>
              {activeVilla ? activeVilla.name : 'Select Villa'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={theme.muted} />
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => dispatch(logoutUser())} style={s.logout}>
          <Ionicons name="log-out-outline" size={26} color={theme.danger} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications' as never)} style={s.bellBtn}>
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
          {unreadCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* VILLA PICKER MODAL */}
      <Modal visible={showVillaPicker} transparent animationType="slide">
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setShowVillaPicker(false)}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Switch Property</Text>
            {villas.map((villa) => (
              <TouchableOpacity key={villa.id} style={[s.villaPickerItem, villa.id === villaId && s.villaPickerItemActive]} onPress={() => switchVilla(villa)}>
                <View style={s.villaPickerLeft}>
                  <View style={s.typeBadge}><Text style={s.typeBadgeText}>{villa.propertyType || 'VILLA'}</Text></View>
                  <View>
                    <Text style={s.villaPickerName}>{villa.name}</Text>
                    {villa.region ? <Text style={s.villaPickerMeta}>{villa.region}</Text> : null}
                  </View>
                </View>
                {villa.id === villaId && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
              </TouchableOpacity>
            ))}
            {user?.role === 'GENERAL_MANAGER' && (
              <TouchableOpacity style={s.addVillaBtn} onPress={() => {
                setShowVillaPicker(false);
                navigation.navigate('Villas' as never);
              }}>
                <Ionicons name="add-circle-outline" size={18} color={theme.primary} />
                <Text style={s.addVillaBtnText}>Add New Property</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
          <>
            <Text style={s.section}>Overview</Text>
            <View style={s.grid}>
              {cards.map((c) => (
                <TouchableOpacity key={c.label} style={s.card} onPress={() => navigation.navigate(c.nav)}>
                  <Ionicons name={c.icon} size={28} color={c.color} />
                  <Text style={s.cardVal}>{c.value}</Text>
                  <Text style={s.cardLbl}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.section}>Quick Actions</Text>
            <View style={s.actions}>
              {[
                { label: t('apartments'), icon: 'home' as IconName, color: theme.secondary, nav: 'Apartments' },
                { label: t('payments'), icon: 'card' as IconName, color: theme.primary, nav: 'Payments' },
                { label: t('expenses'), icon: 'receipt' as IconName, color: theme.danger, nav: 'Expenses' },
                ...(user?.role === 'GENERAL_MANAGER' ? [{ label: 'Properties', icon: 'business' as IconName, color: '#8B5CF6', nav: 'Villas' }] : []),
              ].map((a) => (
                <TouchableOpacity key={a.label} style={s.actionBtn} onPress={() => {
                  navigation.navigate(a.nav as never);
                }}>
                  <View style={[s.actionIcon, { backgroundColor: a.color + '22' }]}>
                    <Ionicons name={a.icon} size={28} color={a.color} />
                  </View>
                  <Text style={s.actionLbl}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ALL VILLAS LIST */}
            {villas.length > 0 && (
              <View>
                <Text style={s.section}>All Properties ({villas.length})</Text>
                {villas.map((villa) => (
                  <TouchableOpacity key={villa.id} style={[s.villaRow, villa.id === villaId && s.villaRowActive]} onPress={() => switchVilla(villa)}>
                    <View style={s.typeBadge}><Text style={s.typeBadgeText}>{villa.propertyType || 'VILLA'}</Text></View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={s.villaRowName}>{villa.name}</Text>
                      {villa.region ? <Text style={s.villaRowMeta}>{villa.propertyNumber ? `#${villa.propertyNumber} · ` : ''}{villa.region}</Text> : null}
                    </View>
                    {villa.id === villaId
                      ? <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                      : <Ionicons name="chevron-forward" size={18} color={theme.muted} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={s.summary}>
              <Text style={s.summaryTitle}>Financial Summary</Text>
              <View style={s.row}><Text style={s.rowLbl}>Total Collected</Text><Text style={[s.rowVal, { color: theme.primary }]}>EGP {stats.collected.toLocaleString()}</Text></View>
              <View style={s.row}><Text style={s.rowLbl}>Total Expenses</Text><Text style={[s.rowVal, { color: theme.danger }]}>EGP {stats.expenses.toLocaleString()}</Text></View>
              <View style={[s.row, s.netRow]}>
                <Text style={s.rowLbl}>Net Income</Text>
                <Text style={[s.rowVal, { color: stats.collected - stats.expenses >= 0 ? theme.primary : theme.danger }]}>
                  EGP {Math.abs(stats.collected - stats.expenses).toLocaleString()}
                </Text>
              </View>
            </View>

            {/* Subscription Overview — GM only */}
            {user?.role === 'GENERAL_MANAGER' && villaManagers.length > 0 && (
              <View style={s.subPanel}>
                <View style={s.subPanelHeader}>
                  <Ionicons name="time-outline" size={18} color={theme.primary} />
                  <Text style={s.subPanelTitle}>Subscriptions</Text>
                </View>
                {villaManagers.map((vm: any) => {
                  const expired = vm.subscriptionExpired;
                  const expDate = vm.subscriptionExpiresAt ? new Date(vm.subscriptionExpiresAt) : null;
                  const daysLeft = expDate ? Math.ceil((expDate.getTime() - Date.now()) / 86400000) : null;
                  const nearExpiry = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;
                  return (
                    <View key={vm.id} style={s.subRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.subName} numberOfLines={1}>{vm.fullName || vm.email}</Text>
                        <Text style={s.subEmail} numberOfLines={1}>{vm.email}</Text>
                        <Text style={s.subVilla}>
                          {villas.find((v: any) => v.id === vm.villaId)?.name || `Villa #${vm.villaId}`}
                        </Text>
                      </View>
                      <View style={s.subStatus}>
                        {expired ? (
                          <View style={[s.subBadge, s.subBadgeExpired]}>
                            <Text style={s.subBadgeText}>⛔ Expired</Text>
                          </View>
                        ) : expDate ? (
                          <View style={[s.subBadge, nearExpiry ? s.subBadgeWarn : s.subBadgeOk]}>
                            <Text style={s.subBadgeText}>
                              {nearExpiry ? `⚠️ ${daysLeft}d left` : `✅ ${expDate.toLocaleDateString()}`}
                            </Text>
                          </View>
                        ) : (
                          <View style={[s.subBadge, s.subBadgeNone]}>
                            <Text style={s.subBadgeText}>♾️ No expiry</Text>
                          </View>
                        )}
                        <Text style={s.subViewerCount}>👥 {vm.maxViewers || 5} viewers</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.header, gap: 8 },
  welcome: { color: theme.muted, fontSize: 13 },
  name: { color: theme.text, fontSize: 18, fontWeight: 'bold' },
  role: { color: theme.primary, fontSize: 12, marginTop: 2 },
  logout: { padding: 8 },
  bellBtn: { padding: 8, position: 'relative' },
  badge: { position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  villaSwitcher: { backgroundColor: theme.card, borderRadius: 10, borderWidth: 1, borderColor: theme.border, padding: 8, maxWidth: 140 },
  villaSwitcherInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  villaSwitcherText: { color: theme.text, fontSize: 12, fontWeight: '700', flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: theme.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { color: theme.text, fontSize: 18, fontWeight: '900', marginBottom: 16 },
  villaPickerItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: theme.chip },
  villaPickerItemActive: { backgroundColor: theme.primary + '22', borderWidth: 1, borderColor: theme.primary },
  villaPickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  villaPickerName: { color: theme.text, fontWeight: '800', fontSize: 15 },
  villaPickerMeta: { color: theme.muted, fontSize: 12 },
  addVillaBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, padding: 14, borderRadius: 12, backgroundColor: theme.primary + '22' },
  addVillaBtnText: { color: theme.primary, fontWeight: '800' },
  section: { color: theme.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: rowDirection, flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '47%', backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  cardVal: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  cardLbl: { color: theme.muted, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  actionBtn: { alignItems: 'center', width: '22%' },
  actionIcon: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  actionLbl: { color: theme.muted, fontSize: 11, textAlign: 'center' },
  villaRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14, marginBottom: 8 },
  villaRowActive: { borderColor: theme.primary, backgroundColor: theme.primary + '11' },
  villaRowName: { color: theme.text, fontWeight: '800', fontSize: 15 },
  villaRowMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  typeBadge: { backgroundColor: theme.primary + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  typeBadgeText: { color: theme.primary, fontSize: 10, fontWeight: '900' },
  summary: { backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border, marginTop: 8 },
  summaryTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  // Subscription panel styles
  subPanel: { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 14 },
  subPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  subPanelTitle: { color: theme.text, fontSize: 16, fontWeight: '900' },
  subRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 },
  subName: { color: theme.text, fontSize: 13, fontWeight: '800' },
  subEmail: { color: theme.muted, fontSize: 11 },
  subVilla: { color: theme.primary, fontSize: 11, fontWeight: '700', marginTop: 2 },
  subStatus: { alignItems: 'flex-end', gap: 4 },
  subBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  subBadgeOk: { backgroundColor: '#D1FAE5' },
  subBadgeWarn: { backgroundColor: '#FEF3C7' },
  subBadgeExpired: { backgroundColor: '#FEE2E2' },
  subBadgeNone: { backgroundColor: theme.chip },
  subBadgeText: { fontSize: 11, fontWeight: '800', color: '#1F2937' },
  subViewerCount: { color: theme.muted, fontSize: 11 },
  row: { flexDirection: rowDirection, justifyContent: 'space-between', marginBottom: 12 },
  netRow: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 },
  rowLbl: { color: theme.muted, fontSize: 14 },
  rowVal: { fontSize: 15, fontWeight: '700' },
});
