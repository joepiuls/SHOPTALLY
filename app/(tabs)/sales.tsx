import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';

import type { PaymentMethod } from '@/lib/types';

type Filter = 'today' | 'week' | 'month' | 'all';
type MethodFilter = 'all' | 'cash' | 'transfer' | 'split' | 'credit';

const METHOD_CONFIG: Record<PaymentMethod, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  cash:     { label: 'Cash',     color: '#166534', icon: 'cash-outline' },
  transfer: { label: 'Transfer', color: '#1D4ED8', icon: 'phone-portrait-outline' },
  split:    { label: 'Split',    color: '#D97706', icon: 'shuffle-outline' },
  gateway:  { label: 'Gateway',  color: '#7C3AED', icon: 'qr-code-outline' },
};

export default function SalesScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { sales } = useShop();
  const [filter, setFilter] = useState<Filter>('today');
  const [methodFilter, setMethodFilter] = useState<MethodFilter>('all');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    const now = dayjs();
    let result = sales;
    switch (filter) {
      case 'today':
        result = result.filter(s => dayjs(s.createdAt).isSame(now, 'day'));
        break;
      case 'week':
        result = result.filter(s => dayjs(s.createdAt).isAfter(now.subtract(7, 'day')));
        break;
      case 'month':
        result = result.filter(s => dayjs(s.createdAt).isAfter(now.subtract(30, 'day')));
        break;
    }
    if (methodFilter !== 'all') {
      if (methodFilter === 'credit') {
        result = result.filter(s => s.isCredit);
      } else {
        result = result.filter(s => !s.isCredit && (s.paymentMethod ?? 'cash') === methodFilter);
      }
    }
    return result;
  }, [sales, filter, methodFilter]);

  const totalRevenue = useMemo(() => filtered.reduce((sum, s) => sum + s.total, 0), [filtered]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: 'all', label: 'All' },
  ];

  const methodFilters: { key: MethodFilter; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: colors.textSecondary },
    { key: 'cash', label: 'Cash', color: '#166534' },
    { key: 'transfer', label: 'Transfer', color: '#1D4ED8' },
    { key: 'split', label: 'Split', color: '#D97706' },
    { key: 'credit', label: 'Credit', color: colors.danger },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Sales History</Text>
      </View>

      <View style={styles.filterRow}>
        {filters.map(f => (
          <Pressable
            key={f.key}
            style={[
              styles.filterBtn,
              {
                backgroundColor: filter === f.key ? colors.primary : colors.surface,
                borderColor: filter === f.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter(f.key);
            }}
          >
            <Text
              style={[
                styles.filterText,
                { color: filter === f.key ? '#fff' : colors.textSecondary },
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.methodFilterRow}>
        {methodFilters.map(m => {
          const active = methodFilter === m.key;
          return (
            <Pressable
              key={m.key}
              style={[
                styles.methodFilterBtn,
                {
                  backgroundColor: active ? m.color + '18' : 'transparent',
                  borderColor: active ? m.color : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setMethodFilter(m.key);
              }}
            >
              <Text style={[styles.methodFilterText, { color: active ? m.color : colors.textSecondary }]}>
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Total Revenue</Text>
          <Text style={[styles.summaryValue, { color: colors.primary }]}>{formatCurrency(totalRevenue)}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={[styles.summaryCount, { color: colors.text }]}>{filtered.length}</Text>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sales</Text>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 400)).duration(300).springify()}>
            <Pressable
              style={({ pressed }) => [
                styles.saleCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.95 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/sale-receipt', params: { saleId: item.id, source: 'history' } });
              }}
            >
              <View style={[styles.saleIcon, { backgroundColor: colorScheme === 'dark' ? colors.surfaceElevated : '#FFF7ED' }]}>
                <Ionicons name="receipt" size={20} color={colors.primary} />
              </View>
              <View style={styles.saleInfo}>
                <Text style={[styles.saleDate, { color: colors.text }]}>
                  {dayjs(item.createdAt).format('MMM D, YYYY')}
                </Text>
                <Text style={[styles.saleTime, { color: colors.textMuted }]}>
                  {dayjs(item.createdAt).format('h:mm A')} · {item.items.length} item{item.items.length !== 1 ? 's' : ''}
                </Text>
                <View style={styles.badgeRow}>
                  {item.isCredit ? (
                    <View style={[styles.badge, { backgroundColor: colors.dangerLight }]}>
                      <Text style={[styles.badgeText, { color: colors.danger }]}>Credit</Text>
                    </View>
                  ) : (() => {
                    const method = item.paymentMethod ?? 'cash';
                    const cfg = METHOD_CONFIG[method] ?? METHOD_CONFIG.cash;
                    const label = method === 'gateway' && item.gatewayProvider
                      ? item.gatewayProvider.charAt(0).toUpperCase() + item.gatewayProvider.slice(1)
                      : cfg.label;
                    return (
                      <View style={[styles.badge, { backgroundColor: cfg.color + '18' }]}>
                        <Ionicons name={cfg.icon} size={10} color={cfg.color} />
                        <Text style={[styles.badgeText, { color: cfg.color }]}>{label}</Text>
                      </View>
                    );
                  })()}
                  {item.staffName ? (
                    <View style={[styles.badge, { backgroundColor: colors.surfaceElevated }]}>
                      <Ionicons name="person-outline" size={10} color={colors.textSecondary} />
                      <Text style={[styles.badgeText, { color: colors.textSecondary }]}>{item.staffName}</Text>
                    </View>
                  ) : null}
                </View>
                {(item.paymentMethod === 'split') && !item.isCredit && (
                  <Text style={[styles.splitLine, { color: colors.textMuted }]}>
                    {formatCurrency(item.cashAmount ?? 0)} cash · {formatCurrency(item.transferAmount ?? 0)} transfer
                  </Text>
                )}
              </View>
              <Text style={[styles.saleTotal, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No sales yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Complete your first sale to see it here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  filterText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  methodFilterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 6, marginBottom: 16 },
  methodFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  methodFilterText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  summaryValue: { fontFamily: 'Poppins_700Bold', fontSize: 24, marginTop: 2 },
  summaryRight: { alignItems: 'center' },
  summaryCount: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
  listContent: { paddingHorizontal: 20 },
  saleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  saleIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  saleInfo: { flex: 1 },
  saleDate: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  saleTime: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
  splitLine: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 3 },
  saleTotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
