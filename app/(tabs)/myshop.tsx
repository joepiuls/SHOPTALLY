import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useShop } from '@/lib/shop-context';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useThemeColors } from '@/constants/colors';
import i18n from '@/lib/i18n';

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) === 1 ? '' : 's'} ago`;
}

// Section header for grouping form fields
function FormSection({ title, icon, colors, children }: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  colors: ReturnType<typeof useThemeColors>;
  children: React.ReactNode;
}) {
  return (
    <View style={formSectionStyles.wrap}>
      <View style={formSectionStyles.titleRow}>
        <View style={[formSectionStyles.iconWrap, { backgroundColor: colors.primary + '14' }]}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        <Text style={[formSectionStyles.title, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      <View style={[formSectionStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {children}
      </View>
    </View>
  );
}

const formSectionStyles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  iconWrap: { width: 22, height: 22, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
});

// Field row inside a section card
function FieldRow({ label, colors, children, noBorder }: {
  label: string;
  colors: ReturnType<typeof useThemeColors>;
  children: React.ReactNode;
  noBorder?: boolean;
}) {
  return (
    <View style={[fieldRowStyles.wrap, !noBorder && { borderBottomWidth: 1, borderBottomColor: colors.borderLight }]}>
      <Text style={[fieldRowStyles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const fieldRowStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingVertical: 10 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 11, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
});

export default function MyShopScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { shopProfile, updateShopProfile, products, staff, syncNow, isSyncing, lastSyncAt } = useShop();
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useTranslation();

  const [name, setName] = useState(shopProfile.name);
  const [bio, setBio] = useState(shopProfile.bio);
  const [phone, setPhone] = useState(shopProfile.phone);
  const [address, setAddress] = useState(shopProfile.address);
  const [slug, setSlug] = useState(shopProfile.slug);
  const [deliveryRadius, setDeliveryRadius] = useState(shopProfile.deliveryRadius.toString());
  const [logoUri, setLogoUri] = useState(shopProfile.logoUri);
  const [bannerUri, setBannerUri] = useState(shopProfile.bannerUri);
  const [hours, setHours] = useState(shopProfile.openingHours);
  const [language, setLanguage] = useState(shopProfile.language);

  const tabBarHeight = useBottomTabBarHeight();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : tabBarHeight;

  const pickImage = async (type: 'logo' | 'banner') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      if (type === 'logo') setLogoUri(result.assets[0].uri);
      else setBannerUri(result.assets[0].uri);
    }
  };

  const toggleDay = (index: number) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, isOpen: !h.isOpen } : h));
  };

  const updateTime = (index: number, field: 'open' | 'close', value: string) => {
    setHours(prev => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateShopProfile({
      name: name.trim(),
      bio: bio.trim(),
      phone: phone.trim(),
      address: address.trim(),
      slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
      deliveryRadius: parseInt(deliveryRadius) || 10,
      logoUri,
      bannerUri,
      openingHours: hours,
      language,
    });
    await i18n.changeLanguage(language);
    toast.success(t('saveChanges'));
  };

  const openDays = hours.filter(h => h.isOpen).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('myShop')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/staff-management'); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/settings'); }}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: 16 }]}
        bottomOffset={20}
      >
        {/* Banner + Logo */}
        <Animated.View entering={FadeInDown.duration(400).springify()} style={{ marginBottom: 24 }}>
          <Pressable
            style={[styles.bannerArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => pickImage('banner')}
          >
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerImage} contentFit="cover" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <View style={[styles.bannerPlaceholderIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="image-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[styles.bannerPlaceholderText, { color: colors.textMuted }]}>Tap to add banner photo</Text>
              </View>
            )}
            {/* Banner overlay label */}
            <View style={styles.bannerEditBadge}>
              <Ionicons name="camera" size={12} color="#fff" />
              <Text style={styles.bannerEditText}>Banner</Text>
            </View>
          </Pressable>

          {/* Logo overlapping the banner bottom */}
          <Pressable
            style={[styles.logoArea, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={(e) => { e.stopPropagation?.(); pickImage('logo'); }}
          >
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="cover" />
            ) : (
              <View style={[styles.logoPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                <Ionicons name="storefront" size={26} color={colors.textMuted} />
              </View>
            )}
            <View style={[styles.logoCameraBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={10} color="#fff" />
            </View>
          </Pressable>
        </Animated.View>

        {/* Language */}
        <Animated.View entering={FadeInDown.delay(80).duration(400).springify()}>
          <FormSection title={t('language')} icon="language-outline" colors={colors}>
            <View style={styles.langBtns}>
              {(['en', 'ha'] as const).map(lang => (
                <Pressable
                  key={lang}
                  style={[
                    styles.langBtn,
                    {
                      backgroundColor: language === lang ? colors.primary : colors.surface,
                      borderColor: language === lang ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage(lang); i18n.changeLanguage(lang); }}
                >
                  <Ionicons name="language" size={15} color={language === lang ? '#fff' : colors.textSecondary} />
                  <Text style={[styles.langBtnText, { color: language === lang ? '#fff' : colors.textSecondary }]}>
                    {lang === 'en' ? t('english') : t('hausa')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </FormSection>
        </Animated.View>

        {/* Shop Details */}
        <Animated.View entering={FadeInDown.delay(160).duration(400).springify()}>
          <FormSection title={t('shopName')} icon="storefront-outline" colors={colors}>
            <FieldRow label="Name" colors={colors}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={name} onChangeText={setName}
                placeholder="e.g. Kano Spice Mart"
                placeholderTextColor={colors.textMuted}
              />
            </FieldRow>
            <FieldRow label="Bio / Description" colors={colors}>
              <TextInput
                style={[styles.fieldInput, styles.fieldTextArea, { color: colors.text }]}
                value={bio} onChangeText={setBio}
                placeholder="Tell customers about your shop"
                placeholderTextColor={colors.textMuted}
                multiline numberOfLines={3}
              />
            </FieldRow>
            <FieldRow label="Slug (URL handle)" colors={colors} noBorder>
              <View style={styles.slugRow}>
                <Text style={[styles.slugPrefix, { color: colors.textMuted }]}>shoptally.app/</Text>
                <TextInput
                  style={[styles.fieldInput, { color: colors.text, flex: 1 }]}
                  value={slug} onChangeText={setSlug}
                  placeholder="kano-spice-mart"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                />
              </View>
            </FieldRow>
          </FormSection>
        </Animated.View>

        {/* Contact */}
        <Animated.View entering={FadeInDown.delay(220).duration(400).springify()}>
          <FormSection title="Contact & Location" icon="location-outline" colors={colors}>
            <FieldRow label="Phone Number" colors={colors}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={phone} onChangeText={setPhone}
                placeholder="08012345678"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
            </FieldRow>
            <FieldRow label="Address" colors={colors}>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={address} onChangeText={setAddress}
                placeholder="Shop address"
                placeholderTextColor={colors.textMuted}
              />
            </FieldRow>
            <FieldRow label="Delivery Radius (km)" colors={colors} noBorder>
              <TextInput
                style={[styles.fieldInput, { color: colors.text }]}
                value={deliveryRadius} onChangeText={setDeliveryRadius}
                placeholder="10"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </FieldRow>
          </FormSection>
        </Animated.View>

        {/* Opening Hours */}
        <Animated.View entering={FadeInDown.delay(280).duration(400).springify()}>
          <FormSection title={`${t('openingHours')} · ${openDays} days open`} icon="time-outline" colors={colors}>
            {hours.map((h, i) => (
              <View
                key={h.day}
                style={[
                  styles.hoursRow,
                  i < hours.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
                ]}
              >
                <Switch
                  value={h.isOpen}
                  onValueChange={() => toggleDay(i)}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={h.isOpen ? colors.primary : colors.textMuted}
                  style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                />
                <Text style={[styles.dayText, { color: h.isOpen ? colors.text : colors.textMuted }]}>
                  {h.day}
                </Text>
                {h.isOpen ? (
                  <View style={styles.hoursRight}>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={h.open}
                      onChangeText={(v) => updateTime(i, 'open', v)}
                      placeholder="08:00"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={[styles.timeDash, { color: colors.textMuted }]}>—</Text>
                    <TextInput
                      style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                      value={h.close}
                      onChangeText={(v) => updateTime(i, 'close', v)}
                      placeholder="18:00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                ) : (
                  <Text style={[styles.closedText, { color: colors.textMuted }]}>{t('closed')}</Text>
                )}
              </View>
            ))}
          </FormSection>
        </Animated.View>

        {/* Payment Account */}
        <Animated.View entering={FadeInDown.delay(330).duration(400).springify()}>
          <Pressable
            style={[styles.paymentRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (user?.role !== 'owner') {
                toast.warning(t('ownerOnlyFeature'), t('ownerOnlyTitle'));
                return;
              }
              router.push('/payment-account');
            }}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.paymentLabel, { color: colors.text }]}>{t('paymentAccount')}</Text>
                <Text style={[styles.paymentSub, { color: colors.textMuted }]}>
                  {shopProfile.virtualAccount?.isActive ? shopProfile.virtualAccount.accountNumber : 'Not configured'}
                </Text>
              </View>
            </View>
            <View style={styles.paymentRight}>
              <View style={[
                styles.badge,
                { backgroundColor: shopProfile.virtualAccount?.isActive ? '#DCFCE7' : colors.primary + '14' },
              ]}>
                <View style={[styles.badgeDot, {
                  backgroundColor: shopProfile.virtualAccount?.isActive ? '#166534' : colors.primary,
                }]} />
                <Text style={[styles.badgeText, {
                  color: shopProfile.virtualAccount?.isActive ? '#166534' : colors.primary,
                }]}>
                  {shopProfile.virtualAccount?.isActive ? t('paymentAccountConfigured') : t('paymentAccountSetup')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        </Animated.View>

        {/* Sync */}
        <Animated.View entering={FadeInDown.delay(365).duration(400).springify()}>
          <Pressable
            style={({ pressed }) => [
              styles.syncRow,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              syncNow();
            }}
            disabled={isSyncing}
          >
            <View style={[styles.syncIcon, { backgroundColor: colors.primary + '14' }]}>
              {isSyncing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Ionicons name="cloud-upload-outline" size={20} color={colors.primary} />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.syncLabel, { color: colors.text }]}>Sync to Cloud</Text>
              <Text style={[styles.syncSub, { color: colors.textMuted }]}>
                {isSyncing
                  ? 'Syncing…'
                  : lastSyncAt
                  ? `Last synced ${formatRelativeTime(lastSyncAt)}`
                  : 'Never synced'}
              </Text>
            </View>
            {!isSyncing && (
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            )}
          </Pressable>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(380).duration(400).springify()}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {[
              { icon: 'cube' as const, value: products.length, label: t('products'), color: colors.primary },
              { icon: 'storefront' as const, value: products.filter(p => p.isMarketplace).length, label: t('marketplace'), color: colors.gold },
              { icon: 'people' as const, value: staff.length, label: 'Staff', color: colors.green },
            ].map((stat, i, arr) => (
              <React.Fragment key={stat.label}>
                <View style={styles.statItem}>
                  <View style={[styles.statIconWrap, { backgroundColor: stat.color + '14' }]}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{stat.label}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>

      {/* Save footer */}
      <View style={[styles.saveFooter, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: bottomInset + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>{t('saveChanges')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  form: { paddingHorizontal: 16 },

  // Banner
  bannerArea: {
    height: 170, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed',
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
    marginBottom: 42,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { alignItems: 'center', gap: 8 },
  bannerPlaceholderIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  bannerPlaceholderText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  bannerEditBadge: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  bannerEditText: { fontFamily: 'Poppins_500Medium', fontSize: 11, color: '#fff' },

  // Logo
  logoArea: {
    position: 'absolute', bottom: -36, left: 20,
    width: 76, height: 76, borderRadius: 20, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', overflow: 'visible',
  },
  logoPlaceholder: { width: 70, height: 70, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  logoImage: { width: '100%', height: '100%', borderRadius: 17 },
  logoCameraBtn: {
    position: 'absolute', bottom: -2, right: -2,
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  // Language
  langBtns: { flexDirection: 'row', gap: 10, padding: 14 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, gap: 8,
  },
  langBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 14 },

  // Field inputs
  fieldInput: {
    fontFamily: 'Poppins_400Regular', fontSize: 15,
    minHeight: 42, paddingVertical: 4,
  },
  fieldTextArea: { minHeight: 72, textAlignVertical: 'top' },
  slugRow: { flexDirection: 'row', alignItems: 'center' },
  slugPrefix: { fontFamily: 'Poppins_400Regular', fontSize: 13 },

  // Opening hours
  hoursRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 8,
  },
  dayText: { fontFamily: 'Poppins_500Medium', fontSize: 13, flex: 1 },
  hoursRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: {
    fontFamily: 'Poppins_400Regular', fontSize: 13,
    width: 64, height: 36, borderRadius: 10, borderWidth: 1, textAlign: 'center',
  },
  timeDash: { fontFamily: 'Poppins_400Regular', fontSize: 14, paddingHorizontal: 2 },
  closedText: { fontFamily: 'Poppins_400Regular', fontSize: 13, fontStyle: 'italic' },

  // Payment row
  paymentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 20,
  },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  paymentIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  paymentLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  paymentSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },
  paymentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 5 },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },

  // Sync row
  syncRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  syncIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  syncLabel: { fontFamily: 'Poppins_600SemiBold', fontSize: 14 },
  syncSub: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },

  // Stats card
  statsCard: {
    flexDirection: 'row', padding: 16, borderRadius: 16, borderWidth: 1,
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 6 },
  statIconWrap: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  statDivider: { width: 1, marginVertical: 4 },

  // Save footer
  saveFooter: {
    paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 16, gap: 8,
    shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});
