import React, { useMemo } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';

export default function SaleReceiptScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { saleId } = useLocalSearchParams<{ saleId: string }>();
  const { sales } = useShop();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const sale = useMemo(() => sales.find(s => s.id === saleId), [sales, saleId]);

  if (!sale) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.receiptTitle, { color: colors.text }]}>Sale not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins_500Medium' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Receipt</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]} showsVerticalScrollIndicator={false}>
        <Animated.View entering={BounceIn.delay(100).duration(500)} style={styles.successIcon}>
          <View style={[styles.successCircle, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle" size={56} color={colors.green} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={[styles.successText, { color: colors.text }]}>Sale Complete</Text>
          <Text style={[styles.successTotal, { color: colors.primary }]}>{formatCurrency(sale.total)}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()} style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.receiptHeader}>
            <Text style={[styles.receiptTitle, { color: colors.text }]}>ShopTally</Text>
            <Text style={[styles.receiptDate, { color: colors.textSecondary }]}>
              {dayjs(sale.createdAt).format('MMM D, YYYY h:mm A')}
            </Text>
            <Text style={[styles.receiptId, { color: colors.textMuted }]}>#{sale.id.slice(0, 8)}</Text>
          </View>

          <View style={[styles.divider, { borderColor: colors.border }]} />

          {sale.items.map((item, i) => (
            <View key={i} style={styles.receiptItem}>
              <View style={styles.receiptItemLeft}>
                <Text style={[styles.receiptItemName, { color: colors.text }]}>{item.productName}</Text>
                <Text style={[styles.receiptItemQty, { color: colors.textMuted }]}>
                  {item.quantity} x {formatCurrency(item.price)}
                </Text>
              </View>
              <Text style={[styles.receiptItemTotal, { color: colors.text }]}>{formatCurrency(item.subtotal)}</Text>
            </View>
          ))}

          <View style={[styles.divider, { borderColor: colors.border }]} />

          <View style={styles.receiptRow}>
            <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.total)}</Text>
          </View>

          {sale.isCredit ? (
            <View style={[styles.creditBanner, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={[styles.creditBannerText, { color: colors.danger }]}>
                Credit Sale{sale.customerName ? ` - ${sale.customerName}` : ''}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Amount Paid</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.amountPaid)}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.success }]}>Change</Text>
                <Text style={[styles.receiptChangeValue, { color: colors.success }]}>{formatCurrency(sale.change)}</Text>
              </View>
            </>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500).duration(400).springify()}>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.dismissAll();
            }}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  successIcon: { alignItems: 'center', marginBottom: 12 },
  successCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  successText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, textAlign: 'center', marginBottom: 4 },
  successTotal: { fontFamily: 'Poppins_700Bold', fontSize: 36, textAlign: 'center', marginBottom: 24 },
  receiptCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  receiptHeader: { alignItems: 'center', marginBottom: 12 },
  receiptTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  receiptDate: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  receiptId: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 12 },
  receiptItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  receiptItemLeft: {},
  receiptItemName: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  receiptItemQty: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  receiptItemTotal: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  receiptLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  receiptValue: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  receiptChangeValue: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  creditBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginTop: 8,
  },
  creditBannerText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
  },
  doneBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});
