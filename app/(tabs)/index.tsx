import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import dayjs from 'dayjs';
import { AIChatModal } from '@/components/AIChatModal';

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function SectionHeader({
  title,
  count,
  colors,
}: {
  title: string;
  count?: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <View style={sectionHeaderStyles.row}>
      <Text style={[sectionHeaderStyles.title, { color: colors.text }]}>{title}</Text>
      {count !== undefined && count > 0 && (
        <View style={[sectionHeaderStyles.badge, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[sectionHeaderStyles.badgeText, { color: colors.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontFamily: 'Poppins_700Bold', fontSize: 12 },
});

function StatCard({
  icon,
  iconColor,
  label,
  value,
  bgColor,
  delay,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  bgColor: string;
  delay: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify()}
      style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { todaySales, todayRevenue, todayItemsSold, lowStockProducts, products, sales, shopProfile, isLoading, syncNow, isSyncing, lastSyncAt } = useShop();
  const toast = useToast();
  const alertedRef = useRef(false);
  const [showChat, setShowChat] = useState(false);
  const [showRevenue, setShowRevenue] = useState(true);

  useEffect(() => {
    if (isLoading || alertedRef.current || lowStockProducts.length === 0) return;
    alertedRef.current = true;
    const outOfStock = lowStockProducts.filter(p => p.stock === 0);
    const lowStock = lowStockProducts.filter(p => p.stock > 0);
    if (outOfStock.length > 0) {
      toast.error(
        outOfStock.length === 1
          ? `${outOfStock[0].name} is out of stock`
          : `${outOfStock.length} products are out of stock`,
        'Out of Stock',
      );
    }
    if (lowStock.length > 0) {
      toast.warning(
        lowStock.length === 1
          ? `${lowStock[0].name} is running low (${lowStock[0].stock} left)`
          : `${lowStock.length} products are running low on stock`,
        'Low Stock',
      );
    }
  }, [isLoading, lowStockProducts]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 16, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.titleRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
            <Text style={[styles.title, { color: colors.text }]}>ShopTally</Text>
            <Text style={[styles.dateText, { color: colors.textMuted }]}>{dayjs().format('dddd, MMMM D, YYYY')}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.syncBtn,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              syncNow();
            }}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
            )}
            <Text style={[styles.syncBtnLabel, { color: colors.textMuted }]}>
              {lastSyncAt ? formatRelativeTime(lastSyncAt) : 'Sync'}
            </Text>
          </Pressable>
        </Animated.View>

        {/* Revenue card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={[styles.revenueCard, { backgroundColor: colors.primary }]}
        >
          {/* Decorative circles */}
          <View style={styles.revenueDecorCircle1} />
          <View style={styles.revenueDecorCircle2} />

          <View style={styles.revenueTitleRow}>
            <Text style={styles.revenueLabel}>Today's Revenue</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRevenue(v => !v);
              }}
              hitSlop={12}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showRevenue ? 'eye-outline' : 'eye-off-outline'}
                size={18}
                color="rgba(255,255,255,0.75)"
              />
            </Pressable>
          </View>
          <Text style={styles.revenueValue}>
            {showRevenue ? formatCurrency(todayRevenue) : '₦ ••••••'}
          </Text>
          <View style={styles.revenueDivider} />
          <View style={styles.revenueRow}>
            <View style={styles.revenueDetail}>
              <Ionicons name="cart" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.revenueDetailText}>
                {showRevenue ? `${todaySales.length} sales` : '— sales'}
              </Text>
            </View>
            <View style={styles.revenueDetail}>
              <Ionicons name="cube" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.revenueDetailText}>
                {showRevenue ? `${todayItemsSold} items sold` : '— items'}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.statsRow}>
          <StatCard
            icon="bag-handle"
            iconColor={colors.primary}
            label="Products"
            value={products.length.toString()}
            bgColor={colorScheme === 'dark' ? 'rgba(194, 65, 12, 0.15)' : '#FFF7ED'}
            delay={200}
            colors={colors}
          />
          <StatCard
            icon="alert-circle"
            iconColor={colors.danger}
            label="Low Stock"
            value={lowStockProducts.length.toString()}
            bgColor={colorScheme === 'dark' ? 'rgba(220, 38, 38, 0.15)' : '#FEF2F2'}
            delay={300}
            colors={colors}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.newSaleButton,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push('/new-sale');
            }}
          >
            <View style={styles.newSaleIconWrap}>
              <Ionicons name="add-circle" size={28} color="#fff" />
            </View>
            <View>
              <Text style={styles.newSaleButtonText}>New Sale</Text>
              <Text style={styles.newSaleSubText}>Start a transaction</Text>
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(450).duration(400).springify()}>
          <View style={styles.quickLinks}>
            <Pressable
              style={({ pressed }) => [
                styles.quickLinkBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/sales'); }}
            >
              <View style={[styles.quickLinkIconWrap, { backgroundColor: colors.gold + '18' }]}>
                <Ionicons name="receipt" size={20} color={colors.gold} />
              </View>
              <View>
                <Text style={[styles.quickLinkText, { color: colors.text }]}>Sales History</Text>
                <Text style={[styles.quickLinkSub, { color: colors.textMuted }]}>{sales.length} total</Text>
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickLinkBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/reports'); }}
            >
              <View style={[styles.quickLinkIconWrap, { backgroundColor: colors.green + '18' }]}>
                <Ionicons name="bar-chart" size={20} color={colors.green} />
              </View>
              <View>
                <Text style={[styles.quickLinkText, { color: colors.text }]}>Reports</Text>
                <Text style={[styles.quickLinkSub, { color: colors.textMuted }]}>Analytics</Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {lowStockProducts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
            <SectionHeader title="Low Stock Alerts" count={lowStockProducts.length} colors={colors} />
            {lowStockProducts.slice(0, 5).map(product => (
              <Pressable
                key={product.id}
                style={({ pressed }) => [
                  styles.alertCard,
                  { backgroundColor: colors.dangerLight, borderColor: colors.danger + '25', opacity: pressed ? 0.85 : 1 },
                ]}
                onPress={() => router.push({ pathname: '/edit-product', params: { productId: product.id } })}
              >
                <View style={[styles.alertAccent, { backgroundColor: colors.danger }]} />
                <View style={[styles.alertIconWrap, { backgroundColor: colors.danger + '18' }]}>
                  <Ionicons name="warning" size={18} color={colors.danger} />
                </View>
                <View style={styles.alertContent}>
                  <Text style={[styles.alertName, { color: colors.text }]}>{product.name}</Text>
                  <Text style={[styles.alertStock, { color: colors.danger }]}>
                    {product.stock === 0 ? 'Out of stock' : `${product.stock} left`}
                  </Text>
                </View>
                <View style={[styles.alertCountBadge, { backgroundColor: product.stock === 0 ? colors.danger : colors.danger + '30' }]}>
                  <Text style={[styles.alertCountText, { color: product.stock === 0 ? '#fff' : colors.danger }]}>
                    {product.stock}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {todaySales.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(400).springify()}>
            <SectionHeader title="Recent Sales" count={todaySales.length} colors={colors} />
            {todaySales.slice(0, 5).map(sale => (
              <Pressable
                key={sale.id}
                style={({ pressed }) => [
                  styles.saleCard,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/sale-receipt', params: { saleId: sale.id } });
                }}
              >
                <View style={[styles.saleAccent, { backgroundColor: colors.primary + '60' }]} />
                <View style={[styles.saleIconWrap, { backgroundColor: colors.primary + '12' }]}>
                  <Ionicons name="receipt-outline" size={16} color={colors.primary} />
                </View>
                <View style={styles.saleCardLeft}>
                  <Text style={[styles.saleTime, { color: colors.text }]}>
                    {dayjs(sale.createdAt).format('h:mm A')}
                  </Text>
                  <Text style={[styles.saleItems, { color: colors.textMuted }]}>
                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                    {sale.isCredit ? ' · Credit' : ''}
                  </Text>
                </View>
                <View style={styles.saleRight}>
                  <Text style={[styles.saleTotal, { color: colors.primary }]}>
                    {formatCurrency(sale.total)}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {todaySales.length === 0 && products.length === 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400).springify()} style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="storefront-outline" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to ShopTally</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add your first product to get started selling
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.emptyButton,
                { backgroundColor: colors.gold, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/add-product');
              }}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.emptyButtonText}>Add Product</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* AI Chat floating button */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowChat(true);
        }}
        style={[styles.chatFab, { backgroundColor: colors.primary }]}
      >
        <Ionicons name="sparkles" size={22} color="#fff" />
      </Pressable>

      <AIChatModal
        visible={showChat}
        products={products}
        sales={sales}
        shopName={shopProfile.name}
        colors={colors}
        onClose={() => setShowChat(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatFab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0 },
  greeting: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginBottom: 2 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 30, marginBottom: 2 },
  dateText: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 20 },
  syncBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
    marginTop: 4,
  },
  syncBtnLabel: { fontFamily: 'Poppins_400Regular', fontSize: 10 },

  // Revenue card
  revenueCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    overflow: 'hidden',
  },
  revenueDecorCircle1: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -40,
    right: -30,
  },
  revenueDecorCircle2: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -20,
    right: 60,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  revenueTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  revenueLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  revenueValue: { fontFamily: 'Poppins_700Bold', fontSize: 40, color: '#fff', marginVertical: 6 },
  revenueDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 12 },
  revenueRow: { flexDirection: 'row', gap: 20 },
  revenueDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revenueDetailText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)' },

  // Stats row
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },

  // New Sale button
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 14,
    marginBottom: 16,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  newSaleIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newSaleButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#fff' },
  newSaleSubText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 1 },

  // Quick links
  quickLinks: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  quickLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  quickLinkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickLinkText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  quickLinkSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 1 },

  // Low stock alerts
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    paddingLeft: 0,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
  },
  alertAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginRight: 2,
  },
  alertIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContent: { flex: 1 },
  alertName: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  alertStock: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },
  alertCountBadge: {
    minWidth: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  alertCountText: { fontFamily: 'Poppins_700Bold', fontSize: 14 },

  // Sale cards
  saleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    paddingLeft: 0,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
  },
  saleAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginRight: 2,
  },
  saleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saleCardLeft: { flex: 1 },
  saleTime: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  saleItems: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },
  saleRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  saleTotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, marginBottom: 8 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  emptyButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' },
});
