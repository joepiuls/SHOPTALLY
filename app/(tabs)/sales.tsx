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

type Filter = 'today' | 'week' | 'month' | 'all';

export default function SalesScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { sales } = useShop();
  const [filter, setFilter] = useState<Filter>('today');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    const now = dayjs();
    switch (filter) {
      case 'today':
        return sales.filter(s => dayjs(s.createdAt).isSame(now, 'day'));
      case 'week':
        return sales.filter(s => dayjs(s.createdAt).isAfter(now.subtract(7, 'day')));
      case 'month':
        return sales.filter(s => dayjs(s.createdAt).isAfter(now.subtract(30, 'day')));
      default:
        return sales;
    }
  }, [sales, filter]);

  const totalRevenue = useMemo(() => filtered.reduce((sum, s) => sum + s.total, 0), [filtered]);

  const filters: { key: Filter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: '7 Days' },
    { key: 'month', label: '30 Days' },
    { key: 'all', label: 'All' },
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
                router.push({ pathname: '/sale-receipt', params: { saleId: item.id } });
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
                  {dayjs(item.createdAt).format('h:mm A')} - {item.items.length} item{item.items.length !== 1 ? 's' : ''}
                </Text>
                {item.isCredit && (
                  <View style={[styles.creditBadge, { backgroundColor: colors.dangerLight }]}>
                    <Text style={[styles.creditText, { color: colors.danger }]}>Credit</Text>
                  </View>
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  filterText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
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
  creditBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  creditText: { fontFamily: 'Poppins_500Medium', fontSize: 10 },
  saleTotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
