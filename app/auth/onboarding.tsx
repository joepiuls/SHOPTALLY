import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { savePendingShop } from '@/lib/storage';
import { LoadingOverlay } from '@/components/LoadingSpinner';
import i18n from '@/lib/i18n';

type Mode = 'choose' | 'register' | 'login';

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { completeOnboarding, signIn, isOnboardingDone } = useAuth();

  const [mode, setMode] = useState<Mode>('choose');
  const [step, setStep] = useState(1); // register: 1=shop, 2=account
  const [language, setLanguage] = useState<'en' | 'ha'>('en');

  // Shop fields
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  // Account / login fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLanguageSelect = (lang: 'en' | 'ha') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
  };

  const goToRegister = () => { setError(''); setMode('register'); setStep(1); };
  const goToLogin = () => { setError(''); setMode('login'); };
  const goBack = () => {
    setError('');
    if (mode === 'register' && step === 2) setStep(1);
    else setMode('choose');
  };

  const handleShopNext = () => {
    setError('');
    if (!shopName.trim()) { setError(t('shopNameRequired')); return; }
    setStep(2);
  };

  const handleRegister = async () => {
    setError('');
    if (!fullName.trim()) { setError(t('fullNameRequired')); return; }
    if (!email.trim()) { setError(t('emailRequired')); return; }
    if (password.length < 6) { setError(t('passwordTooShort')); return; }
    if (password !== confirmPassword) { setError(t('passwordsDoNotMatch')); return; }

    setIsLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { name: fullName.trim() },
          emailRedirectTo: 'shoptally://auth/confirm-email',
        },
      });
      if (signUpError) throw signUpError;

      if (data.session) {
        // No email confirmation required — create shop now using the returned session
        const userId = data.session.user.id;
        const { data: shop, error: shopError } = await supabase
          .from('shops')
          .insert({
            name: shopName.trim(),
            phone: shopPhone.trim(),
            address: shopAddress.trim(),
            bio: '',
            accent_color: '#C2410C',
            language,
            owner_id: userId,
            opening_hours: [],
            delivery_radius: 10,
          })
          .select()
          .single();

        if (!shopError && shop) {
          await supabase
            .from('profiles')
            .update({ shop_id: shop.id, role: 'owner' })
            .eq('id', userId);
        }
        // Mark onboarding done — guard sees session + isOnboardingDone → redirects to tabs
        await completeOnboarding();
      } else {
        // Email confirmation required — store shop data and navigate to confirm screen
        await savePendingShop({
          name: shopName.trim(),
          phone: shopPhone.trim(),
          address: shopAddress.trim(),
          language,
        });
        router.replace({
          pathname: '/auth/confirm-email',
          params: { email: email.trim().toLowerCase() },
        });
      }
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError(t('emailAlreadyUsed'));
      } else {
        setError(msg || t('somethingWentWrong'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email.trim()) { setError(t('emailRequired')); return; }
    if (!password) { setError(t('passwordRequired')); return; }

    setIsLoading(true);
    try {
      // Mark onboarding done first so the _layout.tsx guard doesn't bounce back to onboarding
      if (!isOnboardingDone) await completeOnboarding();
      await signIn(email.trim().toLowerCase(), password);
      // Guard: session + isOnboardingDone=true → redirects to tabs
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('Invalid login credentials') || msg.includes('invalid_grant')) {
        setError(t('invalidCredentials'));
      } else {
        setError(msg || t('somethingWentWrong'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Choose ────────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingOverlay visible={isLoading} />
        <ScrollView
          contentContainerStyle={[styles.chooseScroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400).springify()}>
            {/* Branding */}
            <View style={styles.brandRow}>
              <View style={[styles.logoBox, { backgroundColor: colors.sandLight }]}>
                <Ionicons name="storefront" size={42} color={colors.primary} />
              </View>
              <Text style={[styles.appName, { color: colors.primary }]}>ShopTally</Text>
            </View>

            <Text style={[styles.welcomeTitle, { color: colors.text }]}>{t('welcome')}</Text>
            <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>{t('welcomeSubtitle')}</Text>

            {/* Language selector */}
            <Text style={[styles.sectionLabel, { color: colors.text }]}>{t('chooseLanguage')}</Text>
            <View style={styles.langRow}>
              <Pressable
                style={[
                  styles.langBtn,
                  {
                    borderColor: language === 'en' ? colors.primary : colors.border,
                    backgroundColor: language === 'en' ? colors.sandLight : colors.surface,
                  },
                ]}
                onPress={() => handleLanguageSelect('en')}
              >
                <Text style={[styles.langBtnText, { color: language === 'en' ? colors.primary : colors.textSecondary }]}>
                  English
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.langBtn,
                  {
                    borderColor: language === 'ha' ? colors.primary : colors.border,
                    backgroundColor: language === 'ha' ? colors.sandLight : colors.surface,
                  },
                ]}
                onPress={() => handleLanguageSelect('ha')}
              >
                <Text style={[styles.langBtnText, { color: language === 'ha' ? colors.primary : colors.textSecondary }]}>
                  Hausa
                </Text>
              </Pressable>
            </View>

            {/* Create shop CTA */}
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
              onPress={goToRegister}
            >
              <Ionicons name="storefront-outline" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Create New Shop</Text>
            </Pressable>

            {/* Sign in link */}
            <Pressable style={styles.signInLink} onPress={goToLogin}>
              <Text style={[styles.signInLinkText, { color: colors.textSecondary }]}>
                Already have an account?{'  '}
                <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Sign In</Text>
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ── Login ─────────────────────────────────────────────────────────────────
  if (mode === 'login') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingOverlay visible={isLoading} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            contentContainerStyle={[styles.formScroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
          >
            <Animated.View entering={FadeInRight.duration(280).springify()}>
              <Pressable style={styles.backBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.stepIconRow}>
                <View style={[styles.stepIconBox, { backgroundColor: colors.sandLight }]}>
                  <Ionicons name="log-in-outline" size={34} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('welcomeBack')}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>{t('signInSubtitle')}</Text>

              <Text style={[styles.label, { color: colors.text }]}>{t('email')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={v => { setEmail(v); setError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('password')}</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onSubmitEditing={handleLogin}
                  returnKeyType="go"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Pressable style={styles.forgotLink} onPress={() => router.push('/auth/forgot-password')}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>{t('forgotPassword')}</Text>
              </Pressable>

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, marginTop: 4, opacity: pressed ? 0.88 : 1 }]}
                onPress={handleLogin}
              >
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('signIn')}</Text>
              </Pressable>

              <Pressable style={styles.signInLink} onPress={goBack}>
                <Text style={[styles.signInLinkText, { color: colors.textSecondary }]}>
                  New here?{'  '}
                  <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>Create a Shop</Text>
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // ── Register (step 1: shop · step 2: account) ─────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoadingOverlay visible={isLoading} />

      {/* Step indicator */}
      <View style={[styles.stepIndicatorWrap, { paddingTop: insets.top + 14 }]}>
        {[1, 2].map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: colors.border },
              i === step && { width: 24, backgroundColor: colors.primary },
              i < step && { backgroundColor: colors.primaryLight ?? colors.primary },
            ]}
          />
        ))}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={[styles.formScroll, { paddingTop: 8, paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          automaticallyAdjustKeyboardInsets
        >
          {step === 1 && (
            <Animated.View entering={FadeInRight.duration(280).springify()}>
              <Pressable style={styles.backBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.stepIconRow}>
                <View style={[styles.stepIconBox, { backgroundColor: colors.sandLight }]}>
                  <Ionicons name="business-outline" size={34} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('setupYourShop')}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>{t('shopSetupSubtitle')}</Text>

              <Text style={[styles.label, { color: colors.text }]}>{t('shopName')} *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder={t('shopNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={shopName}
                onChangeText={setShopName}
                autoCapitalize="words"
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('phone')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="+234 800 000 0000"
                placeholderTextColor={colors.textMuted}
                value={shopPhone}
                onChangeText={setShopPhone}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('address')}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.inputMultiline,
                  { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
                ]}
                placeholder={t('addressPlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={shopAddress}
                onChangeText={setShopAddress}
                multiline
                numberOfLines={2}
              />

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
                onPress={handleShopNext}
              >
                <Text style={styles.primaryBtnText}>{t('next')}</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </Pressable>
            </Animated.View>
          )}

          {step === 2 && (
            <Animated.View entering={FadeInRight.duration(280).springify()}>
              <Pressable style={styles.backBtn} onPress={goBack}>
                <Ionicons name="arrow-back" size={22} color={colors.textSecondary} />
              </Pressable>

              <View style={styles.stepIconRow}>
                <View style={[styles.stepIconBox, { backgroundColor: colors.sandLight }]}>
                  <Ionicons name="person-outline" size={34} color={colors.primary} />
                </View>
              </View>

              <Text style={[styles.stepTitle, { color: colors.text }]}>{t('createAccount')}</Text>
              <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>{t('createAccountSubtitle')}</Text>

              <Text style={[styles.label, { color: colors.text }]}>{t('fullName')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder={t('fullNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('email')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={[styles.label, { color: colors.text }]}>{t('password')}</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Text style={[styles.label, { color: colors.text }]}>{t('confirmPassword')}</Text>
              <View style={[styles.passwordRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.passwordInput, { color: colors.text }]}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <Pressable onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              </View>

              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
                  <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
                </View>
              ) : null}

              <Pressable
                style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 }]}
                onPress={handleRegister}
              >
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.primaryBtnText}>{t('createAccount')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Choose screen
  chooseScroll: { paddingHorizontal: 24 },
  brandRow: { alignItems: 'center', marginBottom: 24 },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  appName: { fontFamily: 'Poppins_700Bold', fontSize: 22 },
  welcomeTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 22,
  },
  sectionLabel: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 12 },
  langRow: { flexDirection: 'row', gap: 12, marginBottom: 36 },
  langBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 2, alignItems: 'center' },
  langBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  signInLink: { alignItems: 'center', paddingVertical: 18 },
  signInLinkText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },

  // Register / login shared
  formScroll: { paddingHorizontal: 24 },
  stepIndicatorWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  backBtn: { padding: 4, marginBottom: 20, alignSelf: 'flex-start' },
  stepIconRow: { alignItems: 'center', marginBottom: 20 },
  stepIconBox: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTitle: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 22,
  },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    marginBottom: 12,
  },
  inputMultiline: { minHeight: 76, textAlignVertical: 'top' },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 12,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
  },
  eyeBtn: { padding: 8 },
  forgotLink: { alignSelf: 'flex-end', marginBottom: 20, paddingVertical: 4 },
  forgotText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  errorBanner: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
});
