import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function DashboardScreen({ navigation }: any) {
  const { theme, t, textAlign, rowDirection, direction } = useAppPreferences();
  const s = makeStyles(theme, textAlign, rowDirection, direction);
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const villaId = user?.villaId || 1;
  const [stats, setStats] = useState({ apts: 0, occupied: 0, collected: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
      try {
        setLoading(true);
        const [a, p, e] = await Promise.all([
          apiService.getApartments(villaId).catch(() => []),
          apiService.getPayments(villaId).catch(() => []),
          apiService.getExpenses(villaId).catch(() => []),
        ]);
        const apts = Array.isArray(a) ? a : [];
        const pays = Array.isArray(p) ? p : [];
        const exps = Array.isArray(e) ? e : [];
        setStats({
          apts: apts.length,
          occupied: apts.filter((x: any) => x.status === 'OCCUPIED' || x.status === 'ACTIVE').length,
          collected: pays.filter((x: any) => x.status === 'COMPLETED' || x.status === 'PAID').reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
          expenses: exps.reduce((s: number, x: any) => s + Number(x.amount || 0), 0),
        });
      } finally { setLoading(false); }
  }, [villaId]);

  useFocusEffect(useCallback(() => {
    loadStats();
  }, [loadStats]));

  const cards = [
    { label: 'Total Units', value: String(stats.apts), icon: 'home-outline' as IconName, color: theme.secondary, nav: 'Apartments' },
    { label: 'Occupied', value: String(stats.occupied), icon: 'people-outline' as IconName, color: theme.primary, nav: 'Apartments' },
    { label: 'Collected', value: 'EGP ' + stats.collected.toLocaleString(), icon: 'cash-outline' as IconName, color: theme.primary, nav: 'Payments' },
    { label: t('expenses'), value: 'EGP ' + stats.expenses.toLocaleString(), icon: 'receipt-outline' as IconName, color: theme.danger, nav: 'Expenses' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.welcome}>Welcome back</Text>
          <Text style={s.name}>{user?.fullName || user?.email || 'Manager'}</Text>
          <Text style={s.role}>{user?.role || 'GENERAL_MANAGER'}</Text>
        </View>
        <TouchableOpacity onPress={() => dispatch(logoutUser())} style={s.logout}>
          <Ionicons name="log-out-outline" size={26} color={theme.danger} />
        </TouchableOpacity>
      </View>

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
              ].map((a) => (
                <TouchableOpacity key={a.label} style={s.actionBtn} onPress={() => navigation.navigate(a.nav)}>
                  <View style={[s.actionIcon, { backgroundColor: a.color + '22' }]}>
                    <Ionicons name={a.icon} size={28} color={a.color} />
                  </View>
                  <Text style={s.actionLbl}>{a.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.summary}>
              <Text style={s.summaryTitle}>Financial Summary</Text>
              <View style={s.row}><Text style={s.rowLbl}>Total Collected</Text><Text style={[s.rowVal, { color: theme.primary }]}>EGP {stats.collected.toLocaleString()}</Text></View>
              <View style={s.row}><Text style={s.rowLbl}>Total Expenses</Text><Text style={[s.rowVal, { color: theme.danger }]}>EGP {stats.expenses.toLocaleString()}</Text></View>
              <View style={[s.row, s.netRow]}>
                <Text style={s.rowLbl}>Net Income</Text>
                <Text style={[s.rowVal, { color: stats.collected - stats.expenses >= 0 ? theme.primary : theme.danger }]}>
                  EGP {(stats.collected - stats.expenses).toLocaleString()}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (theme: any, textAlign: 'right' | 'left', rowDirection: 'row-reverse' | 'row', direction: 'rtl' | 'ltr') => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: rowDirection, justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.header },
  welcome: { color: theme.muted, fontSize: 13, textAlign, writingDirection: direction },
  name: { color: theme.text, fontSize: 20, fontWeight: 'bold', textAlign, writingDirection: direction },
  role: { color: theme.primary, fontSize: 12, marginTop: 2, textAlign, writingDirection: direction },
  logout: { padding: 8 },
  section: { color: theme.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8, textAlign, writingDirection: direction },
  grid: { flexDirection: rowDirection, flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '47%', backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  cardVal: { color: theme.text, fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 4, textAlign, writingDirection: direction },
  cardLbl: { color: theme.muted, fontSize: 13, textAlign, writingDirection: direction },
  actions: { flexDirection: rowDirection, gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLbl: { color: theme.muted, fontSize: 12, textAlign, writingDirection: direction },
  summary: { backgroundColor: theme.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.border },
  summaryTitle: { color: theme.text, fontSize: 16, fontWeight: 'bold', marginBottom: 16, textAlign, writingDirection: direction },
  row: { flexDirection: rowDirection, justifyContent: 'space-between', marginBottom: 12 },
  netRow: { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12, marginTop: 4 },
  rowLbl: { color: theme.muted, fontSize: 14, textAlign, writingDirection: direction },
  rowVal: { fontSize: 15, fontWeight: '700' },
});
