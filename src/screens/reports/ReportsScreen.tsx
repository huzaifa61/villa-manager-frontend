import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { apiService } from '../../services/api';
import { useAppPreferences } from '../../context/AppPreferences';
import { RootState } from '../../store';
import { exportCsv } from '../../utils/csv';
import { getActiveVillaName } from '../../utils/villa';
import { money, PAID_COLOR, UNPAID_COLOR } from '../../utils/money';
import { formatT, translateEnum, translateExpenseCategory } from '../../i18n/helpers';

type Tab = 'balance' | 'ledger' | 'monthly' | 'category';

export default function ReportsScreen() {
  const { theme, t } = useAppPreferences();
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
      ...expenses.map((e) => ({ date: e.expenseDate || '', type: 'Expense', detail: e.description || t('typeExpense'), amount: -Number(e.amount || 0) })),
      ...payments.map((p) => ({ date: p.paymentDate || '', type: 'Payment', detail: `${t('apartment')} ${p.apartmentNumber || p.apartmentId}`, amount: Number(p.amount || 0) })),
    ].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return rows.map((row) => {
      running += row.amount;
      return { ...row, running };
    });
  }, [expenses, payments, t]);

  const monthlyRows = useMemo(() => {
    const byMonth: Record<string, { month: string; expenses: number; collected: number }> = {};
    expenses.forEach((e) => {
      const key = String(e.expenseDate || '').slice(0, 7) || t('noDate');
      byMonth[key] = byMonth[key] || { month: key, expenses: 0, collected: 0 };
      byMonth[key].expenses += Number(e.amount || 0);
    });
    payments.forEach((p) => {
      const key = String(p.paymentDate || '').slice(0, 7) || t('noDate');
      byMonth[key] = byMonth[key] || { month: key, expenses: 0, collected: 0 };
      if (p.status === 'COMPLETED' || p.status === 'PAID') byMonth[key].collected += Number(p.amount || 0);
    });
    return Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month));
  }, [expenses, payments, t]);

  const categoryRows = useMemo(() => {
    const byCategory: Record<string, number> = {};
    expenses.forEach((e) => {
      const label = translateExpenseCategory(t, e.categoryName || 'Other');
      byCategory[label] = (byCategory[label] || 0) + Number(e.amount || 0);
    });
    return Object.entries(byCategory).map(([category, amount]) => ({ category, amount }));
  }, [expenses, t]);

  const tabs: { key: Tab; labelKey: string }[] = [
    { key: 'balance', labelKey: 'tabBalance' },
    { key: 'ledger', labelKey: 'tabLedger' },
    { key: 'monthly', labelKey: 'tabMonthly' },
    { key: 'category', labelKey: 'tabCategory' },
  ];

  const reportData = () => {
    if (activeTab === 'ledger') {
      return {
        filename: 'ledger-report.csv',
        headers: [t('date'), t('category'), t('description'), t('amount'), t('running')],
        rows: ledgerRows.map((row) => [row.date, typeLabel(row.type), row.detail, row.amount, row.running]),
      };
    }
    if (activeTab === 'monthly') {
      return {
        filename: 'monthly-report.csv',
        headers: [t('month'), t('expenses'), t('collected'), t('balance')],
        rows: monthlyRows.map((row) => [row.month, row.expenses, row.collected, row.collected - row.expenses]),
      };
    }
    if (activeTab === 'category') {
      return {
        filename: 'category-report.csv',
        headers: [t('category'), t('amount')],
        rows: categoryRows.map((row) => [row.category, row.amount]),
      };
    }
    return {
      filename: 'balance-report.csv',
      headers: [t('apartment'), t('owner'), t('opening'), t('allocated'), t('paid'), t('balance')],
      rows: balanceRows.map((row) => [row.apartment, row.owner, row.opening, row.allocated, row.paid, row.balance]),
    };
  };

  const exportReport = async () => {
    const data = reportData();
    const villaName = await getActiveVillaName(villaId);
    await exportCsv(data.filename, data.headers, data.rows, { title: t('reportsTitle'), villaName });
  };

  const printReport = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.print();
      return;
    }
    await exportReport();
  };

  const typeLabel = (type: string) => (type === 'Payment' ? t('typePayment') : t('typeExpense'));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('reportsTitle')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.refresh} onPress={exportReport}><Text style={styles.refreshText}>{t('csv')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.refresh} onPress={printReport}><Text style={styles.refreshText}>{t('print')}</Text></TouchableOpacity>
          <TouchableOpacity style={styles.refresh} onPress={fetchData}><Text style={styles.refreshText}>{t('refresh')}</Text></TouchableOpacity>
        </View>
      </View>
      {loading ? <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.cards}>
            <View style={styles.card}><Text style={styles.cardLabel}>{t('totalExpenses')}</Text><Text style={[styles.cardValue, { color: theme.danger }]}>{money(totals.totalExpenses)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>{t('totalCollected')}</Text><Text style={[styles.cardValue, { color: PAID_COLOR }]}>{money(totals.totalCollected)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>{t('cashBalance')}</Text><Text style={[styles.cardValue, { color: totals.cashBalance >= 0 ? theme.primary : theme.danger }]}>{money(totals.cashBalance)}</Text></View>
            <View style={styles.card}><Text style={styles.cardLabel}>{t('totalUnpaid')}</Text><Text style={[styles.cardValue, { color: theme.danger }]}>{money(totals.totalUnpaid)}</Text></View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            {tabs.map((tab) => (
              <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{t(tab.labelKey)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {activeTab === 'balance' ? (
            <View style={styles.table}>
              {balanceRows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.primary}>{t('apartment')} {row.apartment}</Text>
                    <Text style={styles.muted}>{row.owner}</Text>
                    <Text style={styles.muted}>{t('opening')} {money(row.opening)} • {t('allocated')} {money(row.allocated)} • {t('paid')} <Text style={{ color: PAID_COLOR }}>{money(row.paid)}</Text></Text>
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
                    <Text style={styles.muted}>{row.date} • {typeLabel(row.type)} • {t('running')} {money(row.running)}</Text>
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
                    <Text style={styles.muted}>{t('expenses')} {money(row.expenses)} • {t('collected')} {money(row.collected)}</Text>
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
