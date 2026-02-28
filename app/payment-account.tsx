import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Switch,
  Alert,
  ScrollView,
  useColorScheme,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/lib/shop-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useThemeColors } from '@/constants/colors';
import { VirtualAccountQR } from '@/components/VirtualAccountQR';
import type { PaymentGateway, VirtualAccount } from '@/lib/types';

const PROVIDERS: { key: PaymentGateway; label: string }[] = [
  { key: 'moniepoint', label: 'Moniepoint' },
  { key: 'opay', label: 'OPay' },
  { key: 'palmpay', label: 'PalmPay' },
];

export default function PaymentAccountScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { shopProfile, updateShopProfile } = useShop();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const existing = shopProfile.virtualAccount;

  const [provider, setProvider] = useState<PaymentGateway>(existing?.provider ?? 'moniepoint');
  const [accountNumber, setAccountNumber] = useState(existing?.accountNumber ?? '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [accountName, setAccountName] = useState(existing?.accountName ?? '');
  const [isActive, setIsActive] = useState(existing?.isActive ?? false);
  const [saving, setSaving] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 20 : insets.bottom;

  // Non-owners see a lock screen — only the shop owner can configure payments
  if (user?.role !== 'owner') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{t('paymentAccount')}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.lockedWrap}>
          <View style={[styles.lockedIconBox, { backgroundColor: colors.sandLight }]}>
            <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.text }]}>{t('ownerOnlyTitle')}</Text>
          <Text style={[styles.lockedText, { color: colors.textSecondary }]}>{t('ownerOnlyFeature')}</Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.lockedBackBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.lockedBackBtnText}>{t('back')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const previewAccount: VirtualAccount | null =
    accountNumber.trim()
      ? { provider, accountNumber: accountNumber.trim(), bankName: bankName.trim(), accountName: accountName.trim(), isActive }
      : null;

  const handleSave = async () => {
    if (!accountNumber.trim()) {
      Alert.alert('Required', t('accountNumber') + ' is required');
      return;
    }
    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateShopProfile({
      virtualAccount: {
        provider,
        accountNumber: accountNumber.trim(),
        bankName: bankName.trim() || provider.charAt(0).toUpperCase() + provider.slice(1) + ' MFB',
        accountName: accountName.trim(),
        isActive,
      },
    });
    setSaving(false);
    toast.success(t('paymentAccountConfigured'));
    router.back();
  };

  const handleRemove = () => {
    Alert.alert(
      t('removeAccount'),
      t('removeAccountConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('removeAccount'),
          style: 'destructive',
          onPress: async () => {
            await updateShopProfile({ virtualAccount: null });
            toast.info(t('removeAccount'));
            router.back();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t('paymentAccount')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info banner */}
        <Animated.View entering={FadeInDown.duration(350).springify()}>
          <View style={[styles.infoBanner, { backgroundColor: '#FEF9C3', borderColor: '#FDE047' }]}>
            <Ionicons name="information-circle" size={18} color="#92400E" />
            <Text style={styles.infoText}>{t('apiCredentialsPending')}</Text>
          </View>
        </Animated.View>

        {/* Provider selector */}
        <Animated.View entering={FadeInDown.delay(60).duration(350).springify()}>
          <Text style={[styles.label, { color: colors.text }]}>{t('paymentProvider')}</Text>
          <View style={styles.pillRow}>
            {PROVIDERS.map(p => (
              <Pressable
                key={p.key}
                style={[
                  styles.pill,
                  {
                    backgroundColor: provider === p.key ? colors.primary : colors.surface,
                    borderColor: provider === p.key ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProvider(p.key); }}
              >
                <Text style={[styles.pillText, { color: provider === p.key ? '#fff' : colors.textSecondary }]}>
                  {p.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        {/* Form fields */}
        <Animated.View entering={FadeInDown.delay(120).duration(350).springify()}>
          <Text style={[styles.label, { color: colors.text }]}>{t('accountNumber')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={accountNumber}
            onChangeText={setAccountNumber}
            placeholder="e.g. 1234567890"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={10}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t('bankName')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={bankName}
            onChangeText={setBankName}
            placeholder="e.g. Moniepoint MFB"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { color: colors.text }]}>{t('accountHolderName')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={accountName}
            onChangeText={setAccountName}
            placeholder="e.g. Amina Fashion Store"
            placeholderTextColor={colors.textMuted}
          />
        </Animated.View>

        {/* Active toggle */}
        <Animated.View entering={FadeInDown.delay(180).duration(350).springify()}>
          <View style={[styles.toggleRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.toggleLeft}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={[styles.toggleLabel, { color: colors.text }]}>{t('showToCustomers')}</Text>
            </View>
            <Switch
              value={isActive}
              onValueChange={v => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsActive(v); }}
              trackColor={{ false: colors.border, true: colors.primary + '60' }}
              thumbColor={isActive ? colors.primary : colors.textMuted}
            />
          </View>
        </Animated.View>

        {/* QR preview */}
        {previewAccount && (
          <Animated.View entering={FadeInDown.delay(240).duration(350).springify()}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview</Text>
            <View style={[styles.qrCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <VirtualAccountQR account={previewAccount} size={180} showDetails />
            </View>
          </Animated.View>
        )}

        {/* Remove button */}
        {existing && (
          <Animated.View entering={FadeInDown.delay(300).duration(350).springify()}>
            <Pressable
              style={({ pressed }) => [styles.removeBtn, { borderColor: colors.danger, opacity: pressed ? 0.8 : 1 }]}
              onPress={handleRemove}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={[styles.removeBtnText, { color: colors.danger }]}>{t('removeAccount')}</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>

      {/* Save footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed || saving ? 0.85 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : t('save')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  lockedIconBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  lockedTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, textAlign: 'center' },
  lockedText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 22 },
  lockedBackBtn: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  lockedBackBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, color: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  content: { paddingHorizontal: 20, paddingTop: 20, gap: 0 },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  infoText: { fontFamily: 'Poppins_400Regular', fontSize: 12, color: '#92400E', flex: 1 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 6, marginTop: 4 },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  pillText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, marginBottom: 12 },
  qrCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 20,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  removeBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});
