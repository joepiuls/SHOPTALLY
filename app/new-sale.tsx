import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { Product } from '@/lib/types';

type Step = 'products' | 'cart' | 'payment';

export default function NewSaleScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const {
    products,
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartTotal,
    cartItemCount,
    completeSale,
  } = useShop();

  const [step, setStep] = useState<Step>('products');
  const [search, setSearch] = useState('');
  const [paymentInput, setPaymentInput] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const amountPaid = parseFloat(paymentInput) || 0;
  const change = Math.max(0, amountPaid - cartTotal);

  const handleAddProduct = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCart(product, 1);
  }, [addToCart]);

  const handleComplete = useCallback(async () => {
    if (!isCredit && amountPaid < cartTotal) {
      Alert.alert('Insufficient Payment', 'The amount paid is less than the total.');
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sale = await completeSale(isCredit ? 0 : amountPaid, isCredit, customerName || null);
      router.replace({ pathname: '/sale-receipt', params: { saleId: sale.id } });
    } catch (e) {
      Alert.alert('Error', 'Could not complete sale');
    }
  }, [amountPaid, cartTotal, isCredit, customerName, completeSale]);

  const handleKeypad = useCallback((key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'C') {
      setPaymentInput('');
    } else if (key === 'DEL') {
      setPaymentInput(prev => prev.slice(0, -1));
    } else {
      setPaymentInput(prev => {
        if (key === '.' && prev.includes('.')) return prev;
        return prev + key;
      });
    }
  }, []);

  const quickAmounts = useMemo(() => {
    const rounded = Math.ceil(cartTotal / 100) * 100;
    return [rounded, rounded + 500, rounded + 1000].filter(a => a > 0);
  }, [cartTotal]);

  const getCartQuantity = useCallback((productId: string) => {
    const item = cart.find(c => c.product.id === productId);
    return item ? item.quantity : 0;
  }, [cart]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => { clearCart(); router.back(); }}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>
          {step === 'products' ? 'Select Items' : step === 'cart' ? 'Review Cart' : 'Payment'}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {step === 'products' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search products..."
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!filtered.length}
            renderItem={({ item }) => {
              const qty = getCartQuantity(item.id);
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.productRow,
                    {
                      backgroundColor: qty > 0 ? (colorScheme === 'dark' ? 'rgba(194,65,12,0.1)' : '#FFF7ED') : colors.card,
                      borderColor: qty > 0 ? colors.primary + '40' : colors.cardBorder,
                      opacity: pressed ? 0.95 : 1,
                    },
                  ]}
                  onPress={() => handleAddProduct(item)}
                >
                  <View style={styles.productRowLeft}>
                    <Text style={[styles.productRowName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.productRowPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
                    <Text style={[styles.productRowStock, { color: colors.textMuted }]}>{item.stock} in stock</Text>
                  </View>
                  {qty > 0 ? (
                    <View style={styles.qtyControls}>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.border }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          updateCartQuantity(item.id, qty - 1);
                        }}
                      >
                        <Ionicons name="remove" size={18} color={colors.text} />
                      </Pressable>
                      <Text style={[styles.qtyText, { color: colors.primary }]}>{qty}</Text>
                      <Pressable
                        style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                        onPress={() => handleAddProduct(item)}
                      >
                        <Ionicons name="add" size={18} color="#fff" />
                      </Pressable>
                    </View>
                  ) : (
                    <View style={[styles.addBtnSmall, { backgroundColor: colors.primary }]}>
                      <Ionicons name="add" size={22} color="#fff" />
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="cube-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  {search ? 'No products found' : 'Add products first'}
                </Text>
              </View>
            }
          />

          {cartItemCount > 0 && (
            <Animated.View entering={FadeIn.duration(200)} style={[styles.bottomBar, { paddingBottom: bottomInset + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <View>
                <Text style={[styles.cartSummary, { color: colors.textSecondary }]}>{cartItemCount} items</Text>
                <Text style={[styles.cartTotal, { color: colors.text }]}>{formatCurrency(cartTotal)}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep('cart');
                }}
              >
                <Text style={styles.nextBtnText}>Review Cart</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </Animated.View>
          )}
        </View>
      )}

      {step === 'cart' && (
        <View style={{ flex: 1 }}>
          <FlatList
            data={cart}
            keyExtractor={item => item.product.id}
            contentContainerStyle={styles.cartList}
            showsVerticalScrollIndicator={false}
            scrollEnabled={!!cart.length}
            renderItem={({ item }) => (
              <View style={[styles.cartItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, { color: colors.text }]}>{item.product.name}</Text>
                  <Text style={[styles.cartItemPrice, { color: colors.textSecondary }]}>
                    {formatCurrency(item.product.price)} x {item.quantity}
                  </Text>
                </View>
                <View style={styles.cartItemRight}>
                  <Text style={[styles.cartItemSubtotal, { color: colors.primary }]}>
                    {formatCurrency(item.product.price * item.quantity)}
                  </Text>
                  <View style={styles.qtyControls}>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateCartQuantity(item.product.id, item.quantity - 1);
                        if (item.quantity <= 1 && cart.length <= 1) setStep('products');
                      }}
                    >
                      <Ionicons name="remove" size={16} color={colors.text} />
                    </Pressable>
                    <Text style={[styles.qtyText, { color: colors.text }]}>{item.quantity}</Text>
                    <Pressable
                      style={[styles.qtyBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        updateCartQuantity(item.product.id, item.quantity + 1);
                      }}
                    >
                      <Ionicons name="add" size={16} color="#fff" />
                    </Pressable>
                  </View>
                </View>
              </View>
            )}
          />
          <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View>
              <Text style={[styles.cartSummary, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.cartTotal, { color: colors.text }]}>{formatCurrency(cartTotal)}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                style={({ pressed }) => [styles.backBtn, { borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => setStep('products')}
              >
                <Ionicons name="arrow-back" size={20} color={colors.text} />
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.nextBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep('payment');
                }}
              >
                <Text style={styles.nextBtnText}>Pay</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {step === 'payment' && (
        <View style={{ flex: 1 }}>
          <View style={styles.paymentContent}>
            <View style={[styles.totalDisplay, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Amount Due</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(cartTotal)}</Text>
            </View>

            <Pressable
              style={[styles.creditToggle, { backgroundColor: isCredit ? colors.dangerLight : colors.surface, borderColor: isCredit ? colors.danger : colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsCredit(!isCredit);
              }}
            >
              <Ionicons name={isCredit ? "checkbox" : "square-outline"} size={22} color={isCredit ? colors.danger : colors.textMuted} />
              <Text style={[styles.creditToggleText, { color: isCredit ? colors.danger : colors.textSecondary }]}>Credit Sale</Text>
            </Pressable>

            {isCredit && (
              <TextInput
                style={[styles.customerInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="Customer name (optional)"
                placeholderTextColor={colors.textMuted}
                value={customerName}
                onChangeText={setCustomerName}
              />
            )}

            {!isCredit && (
              <>
                <Text style={[styles.paymentLabel, { color: colors.text }]}>Amount Received</Text>
                <View style={[styles.paymentDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.nairaSymbol, { color: colors.textMuted }]}>{'\u20A6'}</Text>
                  <Text style={[styles.paymentValue, { color: colors.text }]}>
                    {paymentInput || '0'}
                  </Text>
                </View>

                <View style={styles.quickAmountRow}>
                  {quickAmounts.map(amt => (
                    <Pressable
                      key={amt}
                      style={[styles.quickAmountBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setPaymentInput(amt.toString());
                      }}
                    >
                      <Text style={[styles.quickAmountText, { color: colors.text }]}>{formatCurrency(amt)}</Text>
                    </Pressable>
                  ))}
                </View>

                {amountPaid >= cartTotal && amountPaid > 0 && (
                  <View style={[styles.changeDisplay, { backgroundColor: colors.successLight }]}>
                    <Text style={[styles.changeLabel, { color: colors.success }]}>Change</Text>
                    <Text style={[styles.changeValue, { color: colors.success }]}>{formatCurrency(change)}</Text>
                  </View>
                )}

                <View style={styles.keypad}>
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'DEL'].map(key => (
                    <Pressable
                      key={key}
                      style={({ pressed }) => [
                        styles.keypadBtn,
                        {
                          backgroundColor: key === 'DEL' ? colors.border : colors.surface,
                          borderColor: colors.border,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                      onPress={() => handleKeypad(key)}
                    >
                      {key === 'DEL' ? (
                        <Ionicons name="backspace" size={22} color={colors.text} />
                      ) : (
                        <Text style={[styles.keypadText, { color: colors.text }]}>{key}</Text>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>

          <View style={[styles.bottomBar, { paddingBottom: bottomInset + 12, backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Pressable
              style={({ pressed }) => [styles.backBtn, { borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
              onPress={() => setStep('cart')}
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.completeBtn,
                {
                  backgroundColor: (!isCredit && amountPaid < cartTotal) ? colors.border : colors.green,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleComplete}
              disabled={!isCredit && amountPaid < cartTotal && cartTotal > 0}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.completeBtnText}>Complete Sale</Text>
            </Pressable>
          </View>
        </View>
      )}
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 10,
  },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48 },
  productList: { paddingHorizontal: 16, paddingBottom: 120 },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  productRowLeft: { flex: 1 },
  productRowName: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
  productRowPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginTop: 2 },
  productRowStock: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, minWidth: 20, textAlign: 'center' },
  addBtnSmall: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  cartSummary: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  cartTotal: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  nextBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' },
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cartList: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 120 },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
  cartItemPrice: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 2 },
  cartItemRight: { alignItems: 'flex-end', gap: 8 },
  cartItemSubtotal: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  paymentContent: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  totalDisplay: { padding: 20, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  totalAmount: { fontFamily: 'Poppins_700Bold', fontSize: 32, marginTop: 4 },
  creditToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  creditToggleText: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  customerInput: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  paymentLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 8 },
  paymentDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 4,
  },
  nairaSymbol: { fontFamily: 'Poppins_400Regular', fontSize: 20 },
  paymentValue: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  quickAmountRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  quickAmountBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1 },
  quickAmountText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  changeDisplay: { flexDirection: 'row', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 12 },
  changeLabel: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
  changeValue: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  keypadBtn: {
    width: '31%',
    flexGrow: 1,
    flexBasis: '30%',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  keypadText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22 },
  completeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginLeft: 10,
  },
  completeBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 12 },
});
