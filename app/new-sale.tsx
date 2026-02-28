import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
import { Product, PaymentMethod } from '@/lib/types';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { VirtualAccountQR } from '@/components/VirtualAccountQR';

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
    shopProfile,
  } = useShop();

  const virtualAccount = shopProfile.virtualAccount;
  const hasGateway = !!(virtualAccount?.isActive && virtualAccount.accountNumber);
  const gatewayLabel = virtualAccount?.provider === 'opay' ? 'OPay'
    : virtualAccount?.provider === 'palmpay' ? 'PalmPay'
    : 'Moniepoint';

  const [step, setStep] = useState<Step>('products');
  const [search, setSearch] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashInput, setCashInput] = useState('');
  const [transferInput, setTransferInput] = useState('');
  const [splitCashInput, setSplitCashInput] = useState('');
  const [splitTransferInput, setSplitTransferInput] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  // Derived payment values
  const cashPaid = parseFloat(cashInput) || 0;
  const transferPaid = parseFloat(transferInput) || cartTotal;
  const splitCash = parseFloat(splitCashInput) || 0;
  const splitTransfer = parseFloat(splitTransferInput) || 0;

  const amountPaid = isCredit ? 0
    : paymentMethod === 'cash' ? cashPaid
    : paymentMethod === 'transfer' ? cartTotal
    : paymentMethod === 'gateway' ? cartTotal
    : splitCash + splitTransfer;

  const cashAmount = isCredit ? 0
    : paymentMethod === 'cash' ? cashPaid
    : paymentMethod === 'split' ? splitCash
    : 0;

  const transferAmount = isCredit ? 0
    : paymentMethod === 'transfer' ? cartTotal
    : paymentMethod === 'gateway' ? cartTotal
    : paymentMethod === 'split' ? splitTransfer
    : 0;

  const change = paymentMethod === 'cash' ? Math.max(0, cashPaid - cartTotal) : 0;
  const splitRemaining = Math.max(0, cartTotal - splitCash - splitTransfer);
  const isPaymentValid = isCredit || (
    paymentMethod === 'cash' ? cashPaid >= cartTotal
    : paymentMethod === 'transfer' ? true
    : paymentMethod === 'gateway' ? true
    : splitCash + splitTransfer >= cartTotal
  );

  const handleAddProduct = useCallback((product: Product) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addToCart(product, 1);
  }, [addToCart]);

  const handleComplete = useCallback(async () => {
    if (!isPaymentValid) {
      Alert.alert('Insufficient Payment', 'The amount paid is less than the total.');
      return;
    }
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const sale = await completeSale(
        amountPaid,
        isCredit,
        customerName || null,
        isCredit ? 'cash' : paymentMethod,
        cashAmount,
        transferAmount,
        null,
        paymentMethod === 'gateway' ? (virtualAccount?.provider ?? null) : null,
      );
      router.replace({ pathname: '/sale-receipt', params: { saleId: sale.id } });
    } catch {
      Alert.alert('Error', 'Could not complete sale');
    }
  }, [isPaymentValid, amountPaid, isCredit, customerName, paymentMethod, cashAmount, transferAmount, completeSale]);

  const handleKeypad = useCallback((key: string, setter: (fn: (prev: string) => string) => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (key === 'DEL') {
      setter(prev => prev.slice(0, -1));
    } else {
      setter(prev => {
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
            {search.length > 0 ? (
              <Pressable onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </Pressable>
            ) : (
              <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowScanner(true); }}>
                <Ionicons name="barcode-outline" size={24} color={colors.primary} />
              </Pressable>
            )}
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
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.paymentContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.totalDisplay, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Amount Due</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>{formatCurrency(cartTotal)}</Text>
            </View>

            {/* Credit toggle */}
            <Pressable
              style={[styles.creditToggle, { backgroundColor: isCredit ? colors.dangerLight : colors.surface, borderColor: isCredit ? colors.danger : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsCredit(!isCredit); }}
            >
              <Ionicons name={isCredit ? 'checkbox' : 'square-outline'} size={22} color={isCredit ? colors.danger : colors.textMuted} />
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
                {/* Payment method pills */}
                <View style={styles.methodRow}>
                  {([
                    { key: 'cash' as PaymentMethod, label: 'Cash', icon: 'cash-outline' },
                    { key: 'transfer' as PaymentMethod, label: 'Transfer', icon: 'phone-portrait-outline' },
                    { key: 'split' as PaymentMethod, label: 'Split', icon: 'shuffle-outline' },
                    ...(hasGateway ? [{ key: 'gateway' as PaymentMethod, label: gatewayLabel, icon: 'qr-code-outline' }] : []),
                  ] as { key: PaymentMethod; label: string; icon: string }[]).map(m => (
                    <Pressable
                      key={m.key}
                      style={[
                        styles.methodPill,
                        {
                          backgroundColor: paymentMethod === m.key ? colors.primary : colors.surface,
                          borderColor: paymentMethod === m.key ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPaymentMethod(m.key); }}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={16}
                        color={paymentMethod === m.key ? '#fff' : colors.textSecondary}
                      />
                      <Text style={[styles.methodPillText, { color: paymentMethod === m.key ? '#fff' : colors.textSecondary }]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                {/* Cash */}
                {paymentMethod === 'cash' && (
                  <>
                    <Text style={[styles.paymentLabel, { color: colors.text }]}>Amount Received</Text>
                    <View style={[styles.paymentDisplay, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.nairaSymbol, { color: colors.textMuted }]}>{'\u20A6'}</Text>
                      <Text style={[styles.paymentValue, { color: colors.text }]}>{cashInput || '0'}</Text>
                    </View>
                    <View style={styles.quickAmountRow}>
                      {quickAmounts.map(amt => (
                        <Pressable key={amt} style={[styles.quickAmountBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
                          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setCashInput(amt.toString()); }}>
                          <Text style={[styles.quickAmountText, { color: colors.text }]}>{formatCurrency(amt)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {cashPaid >= cartTotal && cashPaid > 0 && (
                      <View style={[styles.changeDisplay, { backgroundColor: colors.successLight }]}>
                        <Text style={[styles.changeLabel, { color: colors.success }]}>Change</Text>
                        <Text style={[styles.changeValue, { color: colors.success }]}>{formatCurrency(change)}</Text>
                      </View>
                    )}
                    <View style={styles.keypad}>
                      {['1','2','3','4','5','6','7','8','9','.','0','DEL'].map(key => (
                        <Pressable key={key}
                          style={({ pressed }) => [styles.keypadBtn, { backgroundColor: key === 'DEL' ? colors.border : colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
                          onPress={() => handleKeypad(key, setCashInput)}>
                          {key === 'DEL' ? <Ionicons name="backspace" size={22} color={colors.text} /> : <Text style={[styles.keypadText, { color: colors.text }]}>{key}</Text>}
                        </Pressable>
                      ))}
                    </View>
                  </>
                )}

                {/* Bank Transfer */}
                {paymentMethod === 'transfer' && (
                  <View style={[styles.transferBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Ionicons name="phone-portrait-outline" size={28} color={colors.primary} />
                    <Text style={[styles.transferLabel, { color: colors.textSecondary }]}>Full payment via bank transfer</Text>
                    <Text style={[styles.transferAmount, { color: colors.primary }]}>{formatCurrency(cartTotal)}</Text>
                    <Text style={[styles.transferHint, { color: colors.textMuted }]}>Confirm transfer then complete sale</Text>
                  </View>
                )}

                {/* Split */}
                {paymentMethod === 'split' && (
                  <>
                    <Text style={[styles.paymentLabel, { color: colors.text }]}>Cash Amount</Text>
                    <View style={[styles.splitInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.nairaSymbol, { color: colors.textMuted }]}>{'\u20A6'}</Text>
                      <TextInput
                        style={[styles.splitInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={splitCashInput}
                        onChangeText={setSplitCashInput}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={[styles.paymentLabel, { color: colors.text, marginTop: 8 }]}>Bank Transfer Amount</Text>
                    <View style={[styles.splitInputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.nairaSymbol, { color: colors.textMuted }]}>{'\u20A6'}</Text>
                      <TextInput
                        style={[styles.splitInput, { color: colors.text }]}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={splitTransferInput}
                        onChangeText={setSplitTransferInput}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={[styles.splitSummary, {
                      backgroundColor: splitRemaining > 0 ? colors.dangerLight : colors.successLight,
                      borderColor: splitRemaining > 0 ? colors.danger + '40' : colors.success + '40',
                    }]}>
                      <Text style={[styles.splitSummaryLabel, { color: splitRemaining > 0 ? colors.danger : colors.success }]}>
                        {splitRemaining > 0 ? `Remaining: ${formatCurrency(splitRemaining)}` : `Covered \u2714`}
                      </Text>
                      <Text style={[styles.splitSummaryTotal, { color: colors.textSecondary }]}>
                        Total: {formatCurrency(splitCash + splitTransfer)}
                      </Text>
                    </View>
                  </>
                )}

                {/* Gateway (Moniepoint / OPay / PalmPay) */}
                {paymentMethod === 'gateway' && virtualAccount && (
                  <View style={[styles.gatewayBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Text style={[styles.transferLabel, { color: colors.textSecondary }]}>Scan to Pay</Text>
                    <VirtualAccountQR account={virtualAccount} amount={cartTotal} size={220} />
                    <Text style={[styles.transferHint, { color: colors.textMuted }]}>
                      Ask customer to scan QR or transfer {formatCurrency(cartTotal)} to {virtualAccount.accountNumber}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>

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
                { backgroundColor: isPaymentValid ? colors.green : colors.border, opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={handleComplete}
              disabled={!isPaymentValid && cartTotal > 0}
            >
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.completeBtnText}>Complete Sale</Text>
            </Pressable>
          </View>
        </View>
      )}

      <BarcodeScanner
        visible={showScanner}
        onScan={(code) => {
          setShowScanner(false);
          const match = products.find(p => p.barcode === code);
          if (match) {
            if (match.stock <= 0) {
              Alert.alert('Out of Stock', `"${match.name}" has no stock left.`);
              return;
            }
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            addToCart(match, 1);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert('Not Found', 'No product with that barcode. Add the barcode in the Products screen first.');
          }
        }}
        onClose={() => setShowScanner(false)}
      />
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
  paymentContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
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
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  methodPill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 11, borderRadius: 12, borderWidth: 1.5,
  },
  methodPillText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  transferBox: {
    alignItems: 'center', gap: 6, padding: 24,
    borderRadius: 16, borderWidth: 1, marginTop: 4,
  },
  transferLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center' },
  transferAmount: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  transferHint: { fontFamily: 'Poppins_400Regular', fontSize: 12, textAlign: 'center' },
  splitInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginBottom: 4,
  },
  splitInput: { flex: 1, fontFamily: 'Poppins_600SemiBold', fontSize: 22, paddingVertical: 10 },
  splitSummary: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  splitSummaryLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  splitSummaryTotal: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  gatewayBox: {
    alignItems: 'center', gap: 16, padding: 24,
    borderRadius: 16, borderWidth: 1, marginTop: 4,
  },
});
