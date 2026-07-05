import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiService } from '../../services/api';

const VILLA_ID = 1;
const CATEGORIES = ['Maintenance', 'Utilities', 'Cleaning', 'Security', 'Management', 'Other'];
const money = (value: any) => 'EGP ' + Number(value || 0).toLocaleString();

type Tab = 'balance' | 'ledger' | 'monthly' | 'category';

export default function ReportsScreen() {
  const [apartments, setApartments] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('balance');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [a, e, p] = await Promise.all([
        apiService.getApartments(VILLA_ID).catch(() => []),
        apiService.getExpenses(VILLA_ID).catch(() => []),
        apiService.getPayments(VILLA_ID).catch(() => []),
      ]);
      setApartments(Array.isArray(a) ? a : []);
      setExpenses(Array.isArray(e) ? e : []);
      setPayments(Array.isArray(p) ? p : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity style={styles.refresh} onPress={fetchData}><Text style={styles.refreshText}>Refresh</Text></TouchableOpacity>
      </View>
      {loading ? <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Expenses</Text><Text style={[styles.cardValue, { color: '#EF4444' }]}>{money(totals.totalExpenses)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Collected</Text><Text style={[styles.cardValue, { color: '#10B981' }]}>{money(totals.totalCollected)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Cash Balance</Text><Text style={[styles.cardValue, { color: totals.cashBalance >= 0 ? '#10B981' : '#EF4444' }]}>{money(totals.cashBalance)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>Total Unpaid</Text><Text style={[styles.cardValue, { color: '#EF4444' }]}>{money(totals.totalUnpaid)}</Text></View>
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
                    <Text style={styles.muted}>Opening {money(row.opening)} • Allocated {money(row.allocated)} • Paid {money(row.paid)}</Text>
                  </View>
                  <Text style={[styles.amount, { color: row.balance > 0 ? '#EF4444' : '#10B981' }]}>{money(row.balance)}</Text>
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
                  <Text style={[styles.amount, { color: row.amount >= 0 ? '#10B981' : '#EF4444' }]}>{money(row.amount)}</Text>
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
                  <Text style={[styles.amount, { color: row.collected - row.expenses >= 0 ? '#10B981' : '#EF4444' }]}>{money(row.collected - row.expenses)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {activeTab === 'category' ? (
            <View style={styles.table}>
              {categoryRows.map((row) => (
                <View key={row.category} style={styles.row}>
                  <Text style={styles.primary}>{row.category}</Text>
                  <Text style={[styles.amount, { color: '#EF4444' }]}>{money(row.amount)}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#1F2937' },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  refresh: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  refreshText: { color: '#E5E7EB', fontWeight: '700' },
  content: { padding: 16 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  card: { width: '48%', backgroundColor: '#1F2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#374151' },
  cardLabel: { color: '#9CA3AF', fontSize: 12, marginBottom: 8 },
  cardValue: { fontSize: 18, fontWeight: '900' },
  tabScroll: { marginBottom: 14 },
  tab: { backgroundColor: '#374151', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8 },
  tabActive: { backgroundColor: '#10B981' },
  tabText: { color: '#D1D5DB', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  table: { backgroundColor: '#1F2937', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#374151' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  primary: { color: '#fff', fontSize: 14, fontWeight: '800' },
  muted: { color: '#9CA3AF', fontSize: 12, marginTop: 3 },
  amount: { fontSize: 14, fontWeight: '900', textAlign: 'right' },
});
