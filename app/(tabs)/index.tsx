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
  const { todaySales, todayRevenue, todayItemsSold, lowStockProducts, products, sales, shopProfile, isLoading } = useShop();
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
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Text style={[styles.greeting, { color: colors.textSecondary }]}>{greeting()}</Text>
          <Text style={[styles.title, { color: colors.text }]}>ShopTally</Text>
          <Text style={[styles.dateText, { color: colors.textMuted }]}>{dayjs().format('dddd, MMMM D, YYYY')}</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(100).duration(400).springify()}
          style={[styles.revenueCard, { backgroundColor: colors.primary }]}
        >
          <View style={styles.revenueTitleRow}>
            <Text style={styles.revenueLabel}>Today's Revenue</Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowRevenue(v => !v);
              }}
              hitSlop={12}
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
                {showRevenue ? `${todayItemsSold} items` : '— items'}
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
            <Ionicons name="add-circle" size={28} color="#fff" />
            <Text style={styles.newSaleButtonText}>New Sale</Text>
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
              <Ionicons name="receipt" size={22} color={colors.gold} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>Sales History</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickLinkBtn,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/reports'); }}
            >
              <Ionicons name="bar-chart" size={22} color={colors.green} />
              <Text style={[styles.quickLinkText, { color: colors.text }]}>Reports</Text>
            </Pressable>
          </View>
        </Animated.View>

        {lowStockProducts.length > 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Low Stock Alerts</Text>
            {lowStockProducts.slice(0, 5).map(product => (
              <View
                key={product.id}
                style={[styles.alertCard, { backgroundColor: colors.dangerLight, borderColor: colors.danger + '30' }]}
              >
                <Ionicons name="warning" size={20} color={colors.danger} />
                <View style={styles.alertContent}>
                  <Text style={[styles.alertName, { color: colors.text }]}>{product.name}</Text>
                  <Text style={[styles.alertStock, { color: colors.danger }]}>
                    {product.stock} left in stock
                  </Text>
                </View>
              </View>
            ))}
          </Animated.View>
        )}

        {todaySales.length > 0 && (
          <Animated.View entering={FadeInDown.delay(600).duration(400).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sales</Text>
            {todaySales.slice(0, 5).map(sale => (
              <Pressable
                key={sale.id}
                style={[styles.saleCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({ pathname: '/sale-receipt', params: { saleId: sale.id } });
                }}
              >
                <View style={styles.saleCardLeft}>
                  <Text style={[styles.saleTime, { color: colors.textSecondary }]}>
                    {dayjs(sale.createdAt).format('h:mm A')}
                  </Text>
                  <Text style={[styles.saleItems, { color: colors.textMuted }]}>
                    {sale.items.length} item{sale.items.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Text style={[styles.saleTotal, { color: colors.primary }]}>
                  {formatCurrency(sale.total)}
                </Text>
              </Pressable>
            ))}
          </Animated.View>
        )}

        {todaySales.length === 0 && products.length === 0 && (
          <Animated.View entering={FadeInDown.delay(500).duration(400).springify()} style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Welcome to ShopTally</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add your first product to get started
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
  greeting: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginBottom: 2 },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28, marginBottom: 2 },
  dateText: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginBottom: 20 },
  revenueCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  revenueTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  revenueLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  revenueValue: { fontFamily: 'Poppins_700Bold', fontSize: 36, color: '#fff', marginVertical: 4 },
  revenueRow: { flexDirection: 'row', gap: 20, marginTop: 8 },
  revenueDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revenueDetailText: { fontFamily: 'Poppins_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 24 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  newSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    marginBottom: 24,
  },
  newSaleButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, color: '#fff' },
  quickLinks: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickLinkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  quickLinkText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 12 },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  alertContent: { flex: 1 },
  alertName: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  alertStock: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  saleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  saleCardLeft: {},
  saleTime: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  saleItems: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  saleTotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 20, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' },
});
