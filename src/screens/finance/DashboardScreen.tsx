import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { apiService } from '../../services/api';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export default function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [stats, setStats] = useState({ apts: 0, occupied: 0, collected: 0, expenses: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, p, e] = await Promise.all([
          apiService.getApartments(1).catch(() => []),
          apiService.getPayments(1).catch(() => []),
          apiService.getExpenses(1).catch(() => []),
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
    })();
  }, []);

  const cards = [
    { label: 'Total Units', value: String(stats.apts), icon: 'home-outline' as IconName, color: '#3B82F6', nav: 'Apartments' },
    { label: 'Occupied', value: String(stats.occupied), icon: 'people-outline' as IconName, color: '#10B981', nav: 'Apartments' },
    { label: 'Collected', value: 'EGP ' + stats.collected.toLocaleString(), icon: 'cash-outline' as IconName, color: '#10B981', nav: 'Payments' },
    { label: 'Expenses', value: 'EGP ' + stats.expenses.toLocaleString(), icon: 'receipt-outline' as IconName, color: '#EF4444', nav: 'Expenses' },
  ];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <View>
          <Text style={s.welcome}>Welcome back 👋</Text>
          <Text style={s.name}>{user?.fullName || user?.email || 'Manager'}</Text>
          <Text style={s.role}>{user?.role || 'GENERAL_MANAGER'}</Text>
        </View>
        <TouchableOpacity onPress={() => dispatch(logoutUser())} style={s.logout}>
          <Ionicons name="log-out-outline" size={26} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> : (
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
                { label: 'Apartments', icon: 'home' as IconName, color: '#3B82F6', nav: 'Apartments' },
                { label: 'Payments', icon: 'card' as IconName, color: '#10B981', nav: 'Payments' },
                { label: 'Expenses', icon: 'receipt' as IconName, color: '#EF4444', nav: 'Expenses' },
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
              <Text style={s.summaryTitle}>💰 Financial Summary</Text>
              <View style={s.row}><Text style={s.rowLbl}>Total Collected</Text><Text style={[s.rowVal, { color: '#10B981' }]}>EGP {stats.collected.toLocaleString()}</Text></View>
              <View style={s.row}><Text style={s.rowLbl}>Total Expenses</Text><Text style={[s.rowVal, { color: '#EF4444' }]}>EGP {stats.expenses.toLocaleString()}</Text></View>
              <View style={[s.row, s.netRow]}>
                <Text style={s.rowLbl}>Net Income</Text>
                <Text style={[s.rowVal, { color: stats.collected - stats.expenses >= 0 ? '#10B981' : '#EF4444' }]}>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1F2937' },
  welcome: { color: '#9CA3AF', fontSize: 13 },
  name: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  role: { color: '#10B981', fontSize: 12, marginTop: 2 },
  logout: { padding: 8 },
  section: { color: '#6B7280', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  card: { width: '47%', backgroundColor: '#1F2937', borderRadius: 14, padding: 16 },
  cardVal: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  cardLbl: { color: '#9CA3AF', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, alignItems: 'center' },
  actionIcon: { width: 60, height: 60, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLbl: { color: '#9CA3AF', fontSize: 12 },
  summary: { backgroundColor: '#1F2937', borderRadius: 14, padding: 16 },
  summaryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  netRow: { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 12, marginTop: 4 },
  rowLbl: { color: '#9CA3AF', fontSize: 14 },
  rowVal: { fontSize: 15, fontWeight: '700' },
});
