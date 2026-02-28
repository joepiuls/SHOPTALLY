import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { AIInsightsCard } from '@/components/AIInsightsCard';

type Period = 'week' | 'month';

function BarChart({
  data,
  colors,
}: {
  data: { label: string; value: number }[];
  colors: ReturnType<typeof useThemeColors>;
}) {
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <View style={chartStyles.container}>
      {data.map((d, i) => (
        <View key={i} style={chartStyles.barWrap}>
          <Text style={[chartStyles.barValue, { color: colors.textSecondary }]}>
            {d.value > 0 ? formatCurrency(d.value) : '-'}
          </Text>
          <View style={[chartStyles.barTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                chartStyles.barFill,
                {
                  height: `${Math.max((d.value / maxVal) * 100, 2)}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
          <Text style={[chartStyles.barLabel, { color: colors.textMuted }]}>{d.label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function ReportsScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { sales, products } = useShop();
  const [period, setPeriod] = useState<Period>('week');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const chartData = useMemo(() => {
    if (period === 'week') {
      const days: { label: string; value: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day');
        const dayTotal = sales
          .filter(s => dayjs(s.createdAt).isSame(date, 'day'))
          .reduce((sum, s) => sum + s.total, 0);
        days.push({ label: date.format('ddd'), value: dayTotal });
      }
      return days;
    } else {
      const weeks: { label: string; value: number }[] = [];
      for (let i = 3; i >= 0; i--) {
        const weekStart = dayjs().subtract(i * 7, 'day').startOf('day');
        const weekEnd = dayjs().subtract((i - 1) * 7, 'day').startOf('day');
        const weekTotal = sales
          .filter(s => {
            const d = dayjs(s.createdAt);
            return d.isAfter(weekStart.subtract(1, 'day')) && d.isBefore(weekEnd);
          })
          .reduce((sum, s) => sum + s.total, 0);
        weeks.push({
          label: `Wk ${4 - i}`,
          value: weekTotal,
        });
      }
      return weeks;
    }
  }, [sales, period]);

  const periodSales = useMemo(() => {
    const now = dayjs();
    const days = period === 'week' ? 7 : 30;
    return sales.filter(s => dayjs(s.createdAt).isAfter(now.subtract(days, 'day')));
  }, [sales, period]);

  const totalRevenue = useMemo(() => periodSales.reduce((sum, s) => sum + s.total, 0), [periodSales]);
  const totalItems = useMemo(
    () => periodSales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0),
    [periodSales]
  );
  const avgSale = periodSales.length > 0 ? totalRevenue / periodSales.length : 0;

  const paymentBreakdown = useMemo(() => {
    const paid = periodSales.filter(s => !s.isCredit);
    const cash = paid.filter(s => (s.paymentMethod ?? 'cash') === 'cash').reduce((sum, s) => sum + s.total, 0);
    const transfer = paid.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0);
    const split = paid.filter(s => s.paymentMethod === 'split').reduce((sum, s) => sum + s.total, 0);
    const credit = periodSales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0);
    const total = cash + transfer + split + credit || 1;
    return [
      { label: 'Cash', value: cash, color: '#166534', pct: Math.round((cash / total) * 100) },
      { label: 'Transfer', value: transfer, color: '#1D4ED8', pct: Math.round((transfer / total) * 100) },
      { label: 'Split', value: split, color: '#D97706', pct: Math.round((split / total) * 100) },
      { label: 'Credit', value: credit, color: '#DC2626', pct: Math.round((credit / total) * 100) },
    ];
  }, [periodSales]);

  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    periodSales.forEach(s => {
      s.items.forEach(item => {
        if (!productMap[item.productId]) {
          productMap[item.productId] = { name: item.productName, quantity: 0, revenue: 0 };
        }
        productMap[item.productId].quantity += item.quantity;
        productMap[item.productId].revenue += item.subtotal;
      });
    });
    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [periodSales]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 12, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: colors.text }]}>Reports</Text>

        <View style={styles.periodRow}>
          {(['week', 'month'] as Period[]).map(p => (
            <Pressable
              key={p}
              style={[
                styles.periodBtn,
                {
                  backgroundColor: period === p ? colors.primary : colors.surface,
                  borderColor: period === p ? colors.primary : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setPeriod(p);
              }}
            >
              <Text style={[styles.periodText, { color: period === p ? '#fff' : colors.textSecondary }]}>
                {p === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <View style={styles.statsGrid}>
            <View style={[styles.reportStatCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="cash" size={22} color={colors.primary} />
              <Text style={[styles.reportStatValue, { color: colors.text }]}>{formatCurrency(totalRevenue)}</Text>
              <Text style={[styles.reportStatLabel, { color: colors.textSecondary }]}>Revenue</Text>
            </View>
            <View style={[styles.reportStatCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="cart" size={22} color={colors.gold} />
              <Text style={[styles.reportStatValue, { color: colors.text }]}>{periodSales.length}</Text>
              <Text style={[styles.reportStatLabel, { color: colors.textSecondary }]}>Sales</Text>
            </View>
            <View style={[styles.reportStatCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="trending-up" size={22} color={colors.green} />
              <Text style={[styles.reportStatValue, { color: colors.text }]}>{formatCurrency(avgSale)}</Text>
              <Text style={[styles.reportStatLabel, { color: colors.textSecondary }]}>Avg Sale</Text>
            </View>
            <View style={[styles.reportStatCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Ionicons name="cube" size={22} color="#8B5CF6" />
              <Text style={[styles.reportStatValue, { color: colors.text }]}>{totalItems}</Text>
              <Text style={[styles.reportStatLabel, { color: colors.textSecondary }]}>Items Sold</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sales Trend</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <BarChart data={chartData} colors={colors} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Financial Dashboard</Text>
          <View style={[styles.financeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.financeRow}>
              <View style={styles.financeItem}>
                <View style={[styles.financeIconWrap, { backgroundColor: colors.successLight }]}>
                  <Ionicons name="arrow-up-circle" size={20} color={colors.success} />
                </View>
                <Text style={[styles.financeLabel, { color: colors.textSecondary }]}>Paid Sales</Text>
                <Text style={[styles.financeValue, { color: colors.success }]}>
                  {formatCurrency(periodSales.filter(s => !s.isCredit).reduce((sum, s) => sum + s.total, 0))}
                </Text>
              </View>
              <View style={[styles.financeDivider, { backgroundColor: colors.border }]} />
              <View style={styles.financeItem}>
                <View style={[styles.financeIconWrap, { backgroundColor: colors.dangerLight }]}>
                  <Ionicons name="alert-circle" size={20} color={colors.danger} />
                </View>
                <Text style={[styles.financeLabel, { color: colors.textSecondary }]}>Credit Sales</Text>
                <Text style={[styles.financeValue, { color: colors.danger }]}>
                  {formatCurrency(periodSales.filter(s => s.isCredit).reduce((sum, s) => sum + s.total, 0))}
                </Text>
              </View>
            </View>
            <View style={[styles.cashFlowBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.cashFlowFill,
                  {
                    backgroundColor: colors.success,
                    width: `${totalRevenue > 0 ? Math.min(100, (periodSales.filter(s => !s.isCredit).reduce((sum, s) => sum + s.total, 0) / totalRevenue) * 100) : 0}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.cashFlowLabels}>
              <Text style={[styles.cashFlowLabel, { color: colors.success }]}>
                {periodSales.filter(s => !s.isCredit).length} paid
              </Text>
              <Text style={[styles.cashFlowLabel, { color: colors.danger }]}>
                {periodSales.filter(s => s.isCredit).length} credit
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(400).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment Methods</Text>
          <View style={[styles.financeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {/* Stacked bar */}
            <View style={[styles.payBar, { backgroundColor: colors.border }]}>
              {paymentBreakdown.filter(p => p.pct > 0).map(p => (
                <View key={p.label} style={{ flex: p.pct, backgroundColor: p.color, height: '100%' }} />
              ))}
            </View>
            {/* Legend rows */}
            {paymentBreakdown.map(p => (
              <View key={p.label} style={styles.payRow}>
                <View style={[styles.payDot, { backgroundColor: p.color }]} />
                <Text style={[styles.payLabel, { color: colors.textSecondary }]}>{p.label}</Text>
                <View style={styles.payBarTrack}>
                  <View style={[styles.payBarFill, { backgroundColor: p.color, width: `${p.pct}%` }]} />
                </View>
                <Text style={[styles.payPct, { color: colors.text }]}>{p.pct}%</Text>
                <Text style={[styles.payValue, { color: colors.textSecondary }]}>{formatCurrency(p.value)}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {topProducts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Products</Text>
            {topProducts.map((p, i) => (
              <View
                key={i}
                style={[styles.topProductCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={[styles.rankBadge, { backgroundColor: i === 0 ? colors.gold : colors.border }]}>
                  <Text style={[styles.rankText, { color: i === 0 ? '#fff' : colors.text }]}>{i + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={[styles.topProductName, { color: colors.text }]}>{p.name}</Text>
                  <Text style={[styles.topProductQty, { color: colors.textMuted }]}>{p.quantity} sold</Text>
                </View>
                <Text style={[styles.topProductRevenue, { color: colors.primary }]}>{formatCurrency(p.revenue)}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        <AIInsightsCard sales={periodSales} products={products} period={period} colors={colors} />

        {periodSales.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="analytics-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Start making sales to see your reports
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const chartStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 160 },
  barWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontFamily: 'Poppins_400Regular', fontSize: 9, marginBottom: 4, textAlign: 'center' },
  barTrack: { width: '100%', borderRadius: 6, height: 120, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 6 },
  barLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginTop: 6 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, marginBottom: 16 },
  periodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  periodText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  reportStatCard: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  reportStatValue: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  reportStatLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 12 },
  chartCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  rankBadge: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rankText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  topProductInfo: { flex: 1 },
  topProductName: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  topProductQty: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  topProductRevenue: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  financeCard: { borderRadius: 14, padding: 16, borderWidth: 1, marginBottom: 24 },
  financeRow: { flexDirection: 'row', marginBottom: 12 },
  financeItem: { flex: 1, alignItems: 'center', gap: 4 },
  financeIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  financeLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  financeValue: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  financeDivider: { width: 1, marginVertical: 4 },
  cashFlowBar: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  cashFlowFill: { height: '100%', borderRadius: 4 },
  cashFlowLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  cashFlowLabel: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  payBar: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row', marginBottom: 16 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  payDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  payLabel: { fontFamily: 'Poppins_500Medium', fontSize: 13, width: 60 },
  payBarTrack: { flex: 1, height: 6, backgroundColor: '#00000010', borderRadius: 3, overflow: 'hidden' } as any,
  payBarFill: { height: '100%', borderRadius: 3 },
  payPct: { fontFamily: 'Poppins_700Bold', fontSize: 13, width: 36, textAlign: 'right' },
  payValue: { fontFamily: 'Poppins_400Regular', fontSize: 12, width: 80, textAlign: 'right' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
