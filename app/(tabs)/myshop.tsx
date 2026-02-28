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

export default function MyShopScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { shopProfile, updateShopProfile, products, staff } = useShop();
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
    Alert.alert('✓', t('saveChanges'));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('myShop')}</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/staff-management'); }}
            style={({ pressed }) => [styles.staffBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}
          >
            <Ionicons name="people" size={18} color={colors.primary} />
            <Text style={[styles.staffBtnText, { color: colors.primary }]}>{t('staffManagement')}</Text>
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
        <Animated.View entering={FadeInDown.duration(400).springify()}>
          <Pressable style={[styles.bannerArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={() => pickImage('banner')}>
            {bannerUri ? (
              <Image source={{ uri: bannerUri }} style={styles.bannerImage} contentFit="cover" />
            ) : (
              <View style={styles.bannerPlaceholder}>
                <Ionicons name="image" size={32} color={colors.textMuted} />
                <Text style={[styles.bannerPlaceholderText, { color: colors.textMuted }]}>{t('banner')}</Text>
              </View>
            )}
            <Pressable style={[styles.logoArea, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={(e) => { e.stopPropagation?.(); pickImage('logo'); }}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoImage} contentFit="cover" />
              ) : (
                <Ionicons name="storefront" size={28} color={colors.textMuted} />
              )}
            </Pressable>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
          <View style={[styles.langToggle, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.langLeft}>
              <Ionicons name="language" size={20} color={colors.primary} />
              <Text style={[styles.langLabel, { color: colors.text }]}>{t('language')}</Text>
            </View>
            <View style={styles.langBtns}>
              <Pressable
                style={[styles.langBtn, { backgroundColor: language === 'en' ? colors.primary : colors.surface, borderColor: language === 'en' ? colors.primary : colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage('en'); i18n.changeLanguage('en'); }}
              >
                <Text style={[styles.langBtnText, { color: language === 'en' ? '#fff' : colors.textSecondary }]}>{t('english')}</Text>
              </Pressable>
              <Pressable
                style={[styles.langBtn, { backgroundColor: language === 'ha' ? colors.primary : colors.surface, borderColor: language === 'ha' ? colors.primary : colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setLanguage('ha'); i18n.changeLanguage('ha'); }}
              >
                <Text style={[styles.langBtnText, { color: language === 'ha' ? '#fff' : colors.textSecondary }]}>{t('hausa')}</Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
          <Text style={[styles.label, { color: colors.text }]}>{t('shopName')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Kano Spice Mart" placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.text }]}>{t('bio')}</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={bio} onChangeText={setBio} placeholder="Tell customers about your shop" placeholderTextColor={colors.textMuted} multiline numberOfLines={3} />

          <Text style={[styles.label, { color: colors.text }]}>{t('shopSlug')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={slug} onChangeText={setSlug} placeholder="kano-spice-mart" placeholderTextColor={colors.textMuted} autoCapitalize="none" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>{t('phone')}</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={phone} onChangeText={setPhone} placeholder="08012345678" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.text }]}>{t('deliveryRadius')}</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={deliveryRadius} onChangeText={setDeliveryRadius} placeholder="10" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.text }]}>{t('address')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={address} onChangeText={setAddress} placeholder="Shop address" placeholderTextColor={colors.textMuted} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('openingHours')}</Text>
          {hours.map((h, i) => (
            <View key={h.day} style={[styles.hoursRow, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.hoursLeft}>
                <Switch
                  value={h.isOpen}
                  onValueChange={() => toggleDay(i)}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={h.isOpen ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.dayText, { color: h.isOpen ? colors.text : colors.textMuted }]}>{h.day.slice(0, 3)}</Text>
              </View>
              {h.isOpen ? (
                <View style={styles.hoursRight}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={h.open}
                    onChangeText={(v) => updateTime(i, 'open', v)}
                    placeholder="08:00"
                    placeholderTextColor={colors.textMuted}
                  />
                  <Text style={[styles.timeDash, { color: colors.textMuted }]}>-</Text>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(350).duration(400).springify()}>
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
              <Text style={[styles.paymentLabel, { color: colors.text }]}>{t('paymentAccount')}</Text>
            </View>
            <View style={styles.paymentRight}>
              {shopProfile.virtualAccount?.isActive ? (
                <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[styles.badgeText, { color: '#166534' }]}>{t('paymentAccountConfigured')}</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>{t('paymentAccountSetup')}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400).springify()}>
          <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.statItem}>
              <Ionicons name="cube" size={20} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{products.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('products')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="storefront" size={20} color={colors.gold} />
              <Text style={[styles.statValue, { color: colors.text }]}>{products.filter(p => p.isMarketplace).length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('marketplace')}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Ionicons name="people" size={20} color={colors.green} />
              <Text style={[styles.statValue, { color: colors.text }]}>{staff.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{t('staffManagement')}</Text>
            </View>
          </View>
        </Animated.View>

      </KeyboardAwareScrollViewCompat>

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
    paddingHorizontal: 20, paddingBottom: 20,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  staffBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, gap: 6 },
  staffBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  form: { paddingHorizontal: 20 },
  bannerArea: {
    height: 160, borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    marginBottom: 40, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerPlaceholder: { alignItems: 'center', gap: 4 },
  bannerPlaceholderText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  logoArea: {
    position: 'absolute', bottom: -28, left: 20,
    width: 72, height: 72, borderRadius: 16, borderWidth: 3,
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  paymentLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  paymentIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  paymentLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  paymentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  langToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16 },
  langLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  langLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
  langBtns: { flexDirection: 'row', gap: 8 },
  langBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  langBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 6 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, marginBottom: 14 },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  sectionTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 12, marginTop: 8 },
  hoursRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 6,
  },
  hoursLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dayText: { fontFamily: 'Poppins_500Medium', fontSize: 14, width: 36 },
  hoursRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: { fontFamily: 'Poppins_400Regular', fontSize: 13, width: 60, height: 36, borderRadius: 8, borderWidth: 1, textAlign: 'center' },
  timeDash: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  closedText: { fontFamily: 'Poppins_400Regular', fontSize: 13, fontStyle: 'italic' },
  statsCard: {
    flexDirection: 'row', padding: 16, borderRadius: 14, borderWidth: 1,
    marginTop: 16, marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  statDivider: { width: 1, marginVertical: 4 },
  saveFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, gap: 8,
  },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});
