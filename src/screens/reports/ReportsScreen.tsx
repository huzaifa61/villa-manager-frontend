import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { exportCsv } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import { money, PAID_COLOR, UNPAID_COLOR } from '../../utils/money';

const VILLA_ID = 1;
const CATEGORIES = ['Maintenance', 'Utilities', 'Cleaning', 'Security', 'Management', 'Other'];

type Tab = 'balance' | 'ledger' | 'monthly' | 'category';

export default function ReportsScreen() {
  const { theme } = useAppPreferences();
  const { user, activeVillaId } = useSelector((s: RootState) => s.auth);
  const villaId = activeVillaId || user?.villaId || 1;
  const styles = makeStyles(theme);
  const [apartments, setApartments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('balance');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, e, p] = await Promise.all([
        apiService.getApartments(villaId).catch(() => []),
        apiService.getExpenses(villaId).catch(() => []),
        apiService.getPayments(villaId).catch(() => []),
      ]);
      setApartments(Array.isArray(a) ? a : []);
      setExpenses(Array.isArray(e) ? e : []);
      setPayments(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [villaId]);

  const totals = useMemo(() => {
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalCollected = payments
      .filter((p) => p.status === 'COMPLETED' || p.status === 'PAID')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return {
      totalExpenses,
      totalCollected,
      cashBalance: totalCollected - totalExpenses,
      totalUnpaid: apartments.reduce((sum, a) => sum + Math.max(Number(a.currentBalance || 0), 0), 0),
    };
  }, [apartments, expenses, payments]);

  const balanceRows = useMemo(() => apartments.map((apartment) => {
    const globalShare = apartments.length ? expenses
      .filter((e) => !e.apartmentId)
      .reduce((sum, e) => sum + Number(e.amount || 0) / apartments.length, 0) : 0;
    const directExpenses = expenses
      .filter((e) => e.apartmentId === apartment.id)
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const paid = payments
      .filter((p) => p.apartmentId === apartment.id && (p.status === 'COMPLETED' || p.status === 'PAID'))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const allocated = globalShare + directExpenses;
    return {
      id: apartment.id,
      apartment: apartment.apartmentNumber,
      owner: apartment.ownerName || '-',
      opening: Number(apartment.openingBalance || 0),
      allocated,
      paid,
      balance: Number(apartment.openingBalance || 0) + allocated - paid,
    };
  }), [apartments, expenses, payments]);

  const ledgerRows = useMemo(() => {
    const rows = [
      ...expenses.map((e) => ({ date: e.expenseDate || '', type: 'Expense', detail: e.description || 'Expense', amount: -Number(e.amount || 0) })),
      ...payments.map((p) => ({ date: p.paymentDate || '', type: 'Payment', detail: 'Apartment ' + (p.apartmentNumber || p.apartmentId), amount: Number(p.amount || 0) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return rows.map((row) => {
      running += row.amount;
      return { ...row, running };
    });
  }, [expenses, payments]);

  const monthlyRows = useMemo(() => {
    const byMonth: Record<string, { month: string; expenses: number; collected: number }> = {};
    expenses.forEach((e) => {
      const key = String(e.expenseDate || '').slice(0, 7) || 'No date';
      byMonth[key] = byMonth[key] || { month: key, expenses: 0, collected: 0 };
      byMonth[key].expenses += Number(e.amount || 0);
    });
    payments.forEach((p) => {
      const key = String(p.paymentDate || '').slice(0, 7) || 'No date';
      byMonth[key] = byMonth[key] || { month: key, expenses: 0, collected: 0 };
      if (p.status === 'COMPLETED' || p.status === 'PAID') byMonth[key].collected += Number(p.amount || 0);
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [expenses, payments]);

  const categoryRows = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      const label = e.categoryName || CATEGORIES[(e.categoryId || 1) - 1] || 'Maintenance';
      byCategory[label] = (byCategory[label] || 0) + Number(e.amount || 0);
    });
    return Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  }, [expenses]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'balance', label: 'Balance Sheet' },
    { key: 'ledger', label: 'Full Ledger' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'category', label: 'Category' },
  ];

  const reportData = () => {
    if (activeTab === 'ledger') {
      return {
        filename: 'ledger-report.csv',
        headers: ['Date', 'Type', 'Detail', 'Amount', 'Running Balance'],
        rows: ledgerRows.map((row) => [row.date, row.type, row.detail, row.amount, row.running]),
      };
    }
    if (activeTab === 'monthly') {
      return {
        filename: 'monthly-report.csv',
        headers: ['Month', 'Expenses', 'Collected', 'Balance'],
        rows: monthlyRows.map((row) => [row.month, row.expenses, row.collected, row.collected - row.expenses]),
      };
    }
    if (activeTab === 'category') {
      return {
        filename: 'category-report.csv',
        headers: ['Category', 'Amount'],
        rows: categoryRows.map((row) => [row.category, row.amount]),
      };
    }
    return {
      filename: 'balance-report.csv',
      headers: ['Apartment', 'Owner', 'Opening', 'Allocated', 'Paid', 'Balance'],
      rows: balanceRows.map((row) => [row.apartment, row.owner, row.opening, row.allocated, row.paid, row.balance]),
    };
  };

  const exportReport = async () => {
    const data = reportData();
    const villaName = await getActiveVillaName(villaId);
    await exportCsv(data.filename, data.headers, data.rows, { title: 'Reports', villaName });
  };

  const printReport = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }
    await exportReport();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refresh} onPress={exportReport}><Text style={styles.refreshText}>CSV</Text></TouchableOpacity>
          <TouchableOpacity style={styles.refresh} onPress={printReport}><Text style={styles.refreshText}>Print</Text></TouchableOpacity>
          <TouchableOpacity style={styles.refresh} onPress={fetchData}><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity>
        </View>
      </View>
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Expenses</Text><Text style={[styles.cardValue, { color: theme.danger }]}>{money(totals.totalExpenses)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Collected</Text><Text style={[styles.cardValue, { color: PAID_COLOR }]}>{money(totals.totalCollected)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Cash Balance</Text><Text style={[styles.cardValue, { color: totals.cashBalance >= 0 ? theme.primary : theme.danger }]}>{money(totals.cashBalance)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Unpaid</Text><Text style={[styles.cardValue, { color: theme.danger }]}>{money(totals.totalUnpaid)}</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeTab === 'balance' ? (
            <View style={styles.table}>
              {balanceRows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primary}>Apartment {row.apartment}</Text>
                    <Text style={styles.muted}>{row.owner}</Text>
                    <Text style={styles.muted}>Opening {money(row.opening)} • Allocated {money(row.allocated)} • Paid <Text style={{ color: PAID_COLOR }}>{money(row.paid)}</Text></Text>
                  </View>
                  <Text style={[styles.amount, { color: Math.max(row.balance, 0) > 0 ? UNPAID_COLOR : PAID_COLOR }]}>{money(Math.max(row.balance, 0))}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeTab === 'ledger' ? (
            <View style={styles.table}>
              {ledgerRows.map((row, index) => (
                <View key={index} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primary}>{row.detail}</Text>
                    <Text style={styles.muted}>{row.date} • {row.type} • Running {money(row.running)}</Text>
                  </View>
                  <Text style={[styles.amount, { color: row.type === 'Payment' ? PAID_COLOR : UNPAID_COLOR }]}>{money(row.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeTab === 'monthly' ? (
            <View style={styles.table}>
              {monthlyRows.map((row) => (
                <View key={row.month} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primary}>{row.month}</Text>
                    <Text style={styles.muted}>Expenses {money(row.expenses)} • Collected {money(row.collected)}</Text>
                  </View>
                  <Text style={[styles.amount, { color: row.collected - row.expenses >= 0 ? theme.primary : theme.danger }]}>{money(row.collected - row.expenses)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeTab === 'category' ? (
            <View style={styles.table}>
              {categoryRows.map((row) => (
                <View key={row.category} style={styles.row}>
                  <Text style={styles.primary}>{row.category}</Text>
                  <Text style={[styles.amount, { color: theme.danger }]}>{money(row.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const makeStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: theme.card },
  title: { color: theme.text, fontSize: 22, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  refresh: { backgroundColor: theme.chip, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  refreshText: { color: theme.subtleText, fontWeight: '700' },
  content: { padding: 16 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card: { width: '48%', backgroundColor: theme.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.chip },
  cardLabel: { color: theme.muted, fontSize: 12, marginBottom: 8 },
  cardValue: { fontSize: 18, fontWeight: '900' },
  tabScroll: { marginBottom: 14 },
  tab: { backgroundColor: theme.chip, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  tabActive: { backgroundColor: theme.primary },
  tabText: { color: theme.subtleText, fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: theme.text },
  table: { backgroundColor: theme.card, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.chip },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.chip },
  primary: { color: theme.text, fontSize: 14, fontWeight: '800' },
  muted: { color: theme.muted, fontSize: 12, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '900', textAlign: 'right' },
});
