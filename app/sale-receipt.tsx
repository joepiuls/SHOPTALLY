import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown, BounceIn } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import type { Sale, Product, ShopProfile } from '@/lib/types';

// ─── HTML Receipt Generator ───────────────────────────────────────────────────

function buildReceiptHTML(
  sale: Sale,
  products: Product[],
  shopProfile: ShopProfile,
): string {
  const date = dayjs(sale.createdAt).format('MMM D, YYYY h:mm A');
  const txId = sale.id.slice(0, 8).toUpperCase();

  const itemsHtml = sale.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    const barcode = product?.barcode;
    return `
      <tr>
        <td style="padding:6px 0;vertical-align:top;">
          <div style="font-weight:600;font-size:13px;">${item.productName}</div>
          ${barcode ? `<div style="font-size:10px;color:#888;margin-top:1px;">Barcode: ${barcode}</div>` : ''}
          <div style="font-size:11px;color:#888;margin-top:2px;">${item.quantity} × ${formatCurrency(item.price)}</div>
        </td>
        <td style="padding:6px 0;text-align:right;vertical-align:top;font-weight:600;font-size:13px;">
          ${formatCurrency(item.subtotal)}
        </td>
      </tr>`;
  }).join('');

  let paymentHtml = '';
  if (sale.isCredit) {
    paymentHtml = `
      <tr>
        <td colspan="2">
          <div style="background:#FEE2E2;color:#DC2626;padding:8px 12px;border-radius:6px;font-size:12px;font-weight:600;margin-top:4px;">
            ⚠ Credit Sale${sale.customerName ? ` — ${sale.customerName}` : ''}
          </div>
        </td>
      </tr>`;
  } else if (sale.paymentMethod === 'split') {
    paymentHtml = `
      <tr>
        <td style="font-size:13px;color:#666;padding:3px 0;">Cash</td>
        <td style="text-align:right;font-size:13px;padding:3px 0;">${formatCurrency(sale.cashAmount ?? 0)}</td>
      </tr>
      <tr>
        <td style="font-size:13px;color:#666;padding:3px 0;">Bank Transfer</td>
        <td style="text-align:right;font-size:13px;padding:3px 0;">${formatCurrency(sale.transferAmount ?? 0)}</td>
      </tr>`;
  } else {
    const label = sale.paymentMethod === 'transfer' ? 'Bank Transfer'
      : sale.paymentMethod === 'gateway'
        ? (sale.gatewayProvider
            ? sale.gatewayProvider.charAt(0).toUpperCase() + sale.gatewayProvider.slice(1)
            : 'Gateway Payment')
        : 'Amount Paid';
    paymentHtml = `
      <tr>
        <td style="font-size:13px;color:#666;padding:3px 0;">${label}</td>
        <td style="text-align:right;font-size:13px;padding:3px 0;">${formatCurrency(sale.amountPaid)}</td>
      </tr>`;
  }

  const changeHtml = (!sale.isCredit && sale.change > 0)
    ? `<tr>
        <td style="font-size:13px;color:#166534;font-weight:600;padding:3px 0;">Change</td>
        <td style="text-align:right;font-size:13px;color:#166534;font-weight:700;padding:3px 0;">${formatCurrency(sale.change)}</td>
      </tr>`
    : '';

  const staffHtml = sale.staffName
    ? `<tr>
        <td style="font-size:12px;color:#888;padding:2px 0;">Served by</td>
        <td style="text-align:right;font-size:12px;color:#555;padding:2px 0;font-weight:600;">${sale.staffName}</td>
      </tr>`
    : '';

  const customerHtml = (sale.customerName && !sale.isCredit)
    ? `<tr>
        <td style="font-size:12px;color:#888;padding:2px 0;">Customer</td>
        <td style="text-align:right;font-size:12px;color:#555;padding:2px 0;">${sale.customerName}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Receipt #${txId}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <div style="max-width:380px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.12);">

    <!-- Header -->
    <div style="background:#C2410C;padding:24px 20px;text-align:center;">
      <div style="font-size:22px;font-weight:800;color:#fff;letter-spacing:0.5px;">${shopProfile.name || 'ShopTally'}</div>
      ${shopProfile.address ? `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:4px;">${shopProfile.address}</div>` : ''}
      ${shopProfile.phone ? `<div style="font-size:12px;color:rgba(255,255,255,0.8);margin-top:2px;">${shopProfile.phone}</div>` : ''}
    </div>

    <!-- Receipt info -->
    <div style="padding:16px 20px;background:#FFF7ED;border-bottom:1px solid #FDE8CC;text-align:center;">
      <div style="font-size:12px;color:#888;">${date}</div>
      <div style="font-size:11px;color:#aaa;margin-top:2px;">TX# ${txId}</div>
    </div>

    <!-- Items -->
    <div style="padding:16px 20px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="text-align:left;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid #eee;">Item</th>
            <th style="text-align:right;font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.5px;padding-bottom:8px;border-bottom:1px solid #eee;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <!-- Totals -->
    <div style="padding:0 20px 16px;">
      <div style="border-top:1px dashed #ddd;padding-top:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:15px;font-weight:700;padding:4px 0;">Total</td>
            <td style="text-align:right;font-size:18px;font-weight:800;color:#C2410C;padding:4px 0;">${formatCurrency(sale.total)}</td>
          </tr>
          ${paymentHtml}
          ${changeHtml}
        </table>
      </div>
    </div>

    <!-- Staff & Customer -->
    <div style="padding:0 20px 16px;">
      <div style="border-top:1px solid #eee;padding-top:10px;">
        <table style="width:100%;border-collapse:collapse;">
          ${staffHtml}
          ${customerHtml}
          <tr>
            <td style="font-size:11px;color:#bbb;padding:2px 0;">Transaction ID</td>
            <td style="text-align:right;font-size:11px;color:#bbb;padding:2px 0;">#${txId}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#FFF7ED;padding:14px 20px;text-align:center;border-top:1px solid #FDE8CC;">
      <div style="font-size:13px;font-weight:600;color:#C2410C;">Thank you for your purchase!</div>
      <div style="font-size:11px;color:#aaa;margin-top:4px;">Powered by ShopTally</div>
    </div>

  </div>
</body>
</html>`;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SaleReceiptScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { saleId, source } = useLocalSearchParams<{ saleId: string; source?: string }>();
  const fromHistory = source === 'history';
  const { sales, products, shopProfile } = useShop();

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const receiptRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSharePicker, setShowSharePicker] = useState(false);

  const sale = useMemo(() => sales.find(s => s.id === saleId), [sales, saleId]);

  const shareAsPDF = async () => {
    if (!sale) return;
    setIsSharing(true);
    try {
      const html = buildReceiptHTML(sale, products, shopProfile);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Receipt #${sale.id.slice(0, 8).toUpperCase()}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Could not share receipt.');
    } finally {
      setIsSharing(false);
    }
  };

  const shareAsImage = async () => {
    if (!sale) return;
    setIsSharing(true);
    try {
      const uri = await captureRef(receiptRef, { format: 'jpg', quality: 0.95 });
      await Sharing.shareAsync(uri, {
        mimeType: 'image/jpeg',
        dialogTitle: `Receipt #${sale.id.slice(0, 8).toUpperCase()}`,
        UTI: 'public.jpeg',
      });
    } catch (err: any) {
      Alert.alert('Share Failed', err?.message || 'Could not capture receipt image.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleShare = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSharePicker(true);
  };

  const handlePrint = async () => {
    if (!sale) return;
    setIsPrinting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const html = buildReceiptHTML(sale, products, shopProfile);
      await Print.printAsync({ html });
    } catch (err: any) {
      Alert.alert('Print Failed', err?.message || 'Could not print receipt.');
    } finally {
      setIsPrinting(false);
    }
  };

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
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Receipt</Text>
        <View style={styles.topBarActions}>
          <Pressable
            style={[styles.topBarBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="print-outline" size={20} color={colors.text} />}
          </Pressable>
          <Pressable
            style={[styles.topBarBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="share-social-outline" size={20} color="#fff" />}
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomInset + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Success header — only shown when coming from a fresh sale */}
        {!fromHistory && (
          <>
            <Animated.View entering={BounceIn.delay(100).duration(500)} style={styles.successIcon}>
              <View style={[styles.successCircle, { backgroundColor: colors.successLight }]}>
                <Ionicons name="checkmark-circle" size={56} color={colors.green} />
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
              <Text style={[styles.successText, { color: colors.text }]}>Sale Complete</Text>
              <Text style={[styles.successTotal, { color: colors.primary }]}>{formatCurrency(sale.total)}</Text>
            </Animated.View>
          </>
        )}

        {/* Receipt card — ref used for image capture */}
        <Animated.View ref={receiptRef} entering={FadeInDown.delay(300).duration(400).springify()} style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>

          {/* Shop header */}
          <View style={[styles.receiptShopHeader, { backgroundColor: colors.primary }]}>
            <Text style={styles.receiptShopName}>{shopProfile.name || 'ShopTally'}</Text>
            {!!shopProfile.address && (
              <Text style={styles.receiptShopSub}>{shopProfile.address}</Text>
            )}
            {!!shopProfile.phone && (
              <Text style={styles.receiptShopSub}>{shopProfile.phone}</Text>
            )}
          </View>

          <View style={styles.receiptBody}>
            {/* Date + TX ID */}
            <View style={styles.receiptHeader}>
              <Text style={[styles.receiptDate, { color: colors.textSecondary }]}>
                {dayjs(sale.createdAt).format('MMM D, YYYY h:mm A')}
              </Text>
              <Text style={[styles.receiptId, { color: colors.textMuted }]}>
                TX# {sale.id.slice(0, 8).toUpperCase()}
              </Text>
            </View>

            <View style={[styles.divider, { borderColor: colors.border }]} />

            {/* Items */}
            {sale.items.map((item, i) => {
              const product = products.find(p => p.id === item.productId);
              const barcode = product?.barcode;
              return (
                <View key={i} style={styles.receiptItem}>
                  <View style={styles.receiptItemLeft}>
                    <Text style={[styles.receiptItemName, { color: colors.text }]}>{item.productName}</Text>
                    <Text style={[styles.receiptItemQty, { color: colors.textMuted }]}>
                      {item.quantity} × {formatCurrency(item.price)}
                    </Text>
                    {barcode ? (
                      <Text style={[styles.receiptBarcode, { color: colors.textMuted }]}>
                        {barcode}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.receiptItemTotal, { color: colors.text }]}>{formatCurrency(item.subtotal)}</Text>
                </View>
              );
            })}

            <View style={[styles.divider, { borderColor: colors.border }]} />

            {/* Totals */}
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Subtotal</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.total)}</Text>
            </View>

            {sale.isCredit ? (
              <View style={[styles.creditBanner, { backgroundColor: colors.dangerLight }]}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={[styles.creditBannerText, { color: colors.danger }]}>
                  Credit Sale{sale.customerName ? ` — ${sale.customerName}` : ''}
                </Text>
              </View>
            ) : (
              <>
                {sale.paymentMethod === 'split' ? (
                  <>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Cash</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.cashAmount ?? sale.amountPaid)}</Text>
                    </View>
                    <View style={styles.receiptRow}>
                      <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Bank Transfer</Text>
                      <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.transferAmount ?? 0)}</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>
                      {sale.paymentMethod === 'transfer' ? 'Bank Transfer'
                        : sale.paymentMethod === 'gateway'
                          ? (sale.gatewayProvider
                              ? sale.gatewayProvider.charAt(0).toUpperCase() + sale.gatewayProvider.slice(1)
                              : 'Gateway Payment')
                          : 'Amount Paid'}
                    </Text>
                    <Text style={[styles.receiptValue, { color: colors.text }]}>{formatCurrency(sale.amountPaid)}</Text>
                  </View>
                )}
                {sale.change > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptLabel, { color: colors.success }]}>Change</Text>
                    <Text style={[styles.receiptChangeValue, { color: colors.success }]}>{formatCurrency(sale.change)}</Text>
                  </View>
                )}
              </>
            )}

            {/* Staff + Customer + TX ID */}
            <View style={[styles.divider, { borderColor: colors.border }]} />

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Served by</Text>
              <Text style={[styles.receiptValue, { color: colors.text }]}>{sale.staffName || 'N/A'}</Text>
            </View>

            {sale.customerName ? (
              <View style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textSecondary }]}>Customer</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>{sale.customerName}</Text>
              </View>
            ) : null}

            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Transaction ID</Text>
              <Text style={[styles.receiptId, { color: colors.textMuted }]}>#{sale.id.slice(0, 8).toUpperCase()}</Text>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.receiptFooter, { backgroundColor: colors.sandLight, borderTopColor: colors.border }]}>
            <Text style={[styles.receiptFooterText, { color: colors.primary }]}>Thank you for your purchase!</Text>
            <Text style={[styles.receiptFooterSub, { color: colors.textMuted }]}>Powered by ShopTally</Text>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View entering={FadeInDown.delay(450).duration(400).springify()} style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handlePrint}
            disabled={isPrinting}
          >
            {isPrinting
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="print-outline" size={22} color={colors.text} />}
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Print</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
            onPress={handleShare}
            disabled={isSharing}
          >
            {isSharing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="logo-whatsapp" size={22} color="#25D366" />}
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Share</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(550).duration(400).springify()}>
          <Pressable
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (fromHistory) router.back();
              else router.dismissAll();
            }}
          >
            <Text style={styles.doneBtnText}>{fromHistory ? 'Back' : 'Done'}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>

      {/* Share format picker — custom bottom sheet, works in all contexts */}
      <Modal
        visible={showSharePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSharePicker(false)}
      >
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowSharePicker(false)}>
          <Pressable style={[styles.pickerSheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={[styles.pickerHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.pickerTitle, { color: colors.text }]}>Share Receipt As</Text>

            <Pressable
              style={[styles.pickerOption, { borderColor: colors.border }]}
              onPress={() => { setShowSharePicker(false); setTimeout(shareAsImage, 300); }}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="image-outline" size={24} color="#0284C7" />
              </View>
              <View style={styles.pickerOptionInfo}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>Image (JPG)</Text>
                <Text style={[styles.pickerOptionSub, { color: colors.textSecondary }]}>Share on WhatsApp, save to gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={[styles.pickerOption, { borderColor: colors.border }]}
              onPress={() => { setShowSharePicker(false); setTimeout(shareAsPDF, 300); }}
            >
              <View style={[styles.pickerIconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="document-text-outline" size={24} color="#DC2626" />
              </View>
              <View style={styles.pickerOptionInfo}>
                <Text style={[styles.pickerOptionTitle, { color: colors.text }]}>PDF Document</Text>
                <Text style={[styles.pickerOptionSub, { color: colors.textSecondary }]}>Email, print, or save to files</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>

            <Pressable
              style={[styles.pickerCancel, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => setShowSharePicker(false)}
            >
              <Text style={[styles.pickerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
  topBarActions: { flexDirection: 'row', gap: 8 },
  topBarBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24 },
  successIcon: { alignItems: 'center', marginBottom: 12 },
  successCircle: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center' },
  successText: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, textAlign: 'center', marginBottom: 4 },
  successTotal: { fontFamily: 'Poppins_700Bold', fontSize: 36, textAlign: 'center', marginBottom: 24 },
  receiptCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  receiptShopHeader: {
    padding: 18,
    alignItems: 'center',
  },
  receiptShopName: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 18,
    color: '#fff',
    letterSpacing: 0.3,
  },
  receiptShopSub: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  receiptBody: { padding: 16 },
  receiptHeader: { alignItems: 'center', marginBottom: 12 },
  receiptTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  receiptDate: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  receiptId: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 10 },
  receiptItem: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10, alignItems: 'flex-start' },
  receiptItemLeft: { flex: 1, marginRight: 8 },
  receiptItemName: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  receiptItemQty: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  receiptBarcode: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.5,
  },
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
  receiptFooter: {
    padding: 14,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  receiptFooterText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  receiptFooterSub: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  actionBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  doneBtn: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 4,
  },
  doneBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  // Share picker
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
  },
  pickerHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  pickerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  pickerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerOptionInfo: { flex: 1 },
  pickerOptionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  pickerOptionSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 2 },
  pickerCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  pickerCancelText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
});
