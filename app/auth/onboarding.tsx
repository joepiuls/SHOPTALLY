import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import i18n from '@/lib/i18n';

const TOTAL_STEPS = 3;

export default function OnboardingScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { signUp, createShop, completeOnboarding } = useAuth();

  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<'en' | 'ha'>('en');

  // Step 2 — Shop
  const [shopName, setShopName] = useState('');
  const [shopPhone, setShopPhone] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  // Step 3 — Account
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

  const handleNext = () => {
    setError('');
    if (step === 2 && !shopName.trim()) {
      setError(t('shopNameRequired'));
      return;
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleCreateAccount = async () => {
    setError('');

    if (!fullName.trim()) { setError(t('fullNameRequired')); return; }
    if (!email.trim()) { setError(t('emailRequired')); return; }
    if (password.length < 6) { setError(t('passwordTooShort')); return; }
    if (password !== confirmPassword) { setError(t('passwordsDoNotMatch')); return; }

    setIsLoading(true);
    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      await createShop({
        name: shopName.trim(),
        phone: shopPhone.trim(),
        address: shopAddress.trim(),
        language,
      });
      await completeOnboarding();
      // Auth guard in _layout.tsx will redirect to (tabs) automatically
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

  const styles = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i + 1 === step && styles.dotActive, i + 1 < step && styles.dotDone]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOutUp.duration(200)}>
            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoIcon}>
                <Ionicons name="storefront" size={36} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>{t('welcome')}</Text>
            <Text style={styles.subtitle}>{t('welcomeSubtitle')}</Text>

            <Text style={styles.sectionLabel}>{t('chooseLanguage')}</Text>
            <View style={styles.langRow}>
              <Pressable
                style={[styles.langButton, language === 'en' && styles.langButtonActive]}
                onPress={() => handleLanguageSelect('en')}
              >
                <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>
                  English
                </Text>
              </Pressable>
              <Pressable
                style={[styles.langButton, language === 'ha' && styles.langButtonActive]}
                onPress={() => handleLanguageSelect('ha')}
              >
                <Text style={[styles.langText, language === 'ha' && styles.langTextActive]}>
                  Hausa
                </Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        {step === 2 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.logoRow}>
              <View style={styles.stepIconWrap}>
                <Ionicons name="business-outline" size={32} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>{t('setupYourShop')}</Text>
            <Text style={styles.subtitle}>{t('shopSetupSubtitle')}</Text>

            <Text style={styles.label}>{t('shopName')} *</Text>
            <TextInput
              style={styles.input}
              placeholder={t('shopNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={shopName}
              onChangeText={setShopName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>{t('phone')}</Text>
            <TextInput
              style={styles.input}
              placeholder="+234 800 000 0000"
              placeholderTextColor={colors.textMuted}
              value={shopPhone}
              onChangeText={setShopPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>{t('address')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder={t('addressPlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={shopAddress}
              onChangeText={setShopAddress}
              multiline
              numberOfLines={2}
            />
          </Animated.View>
        )}

        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={styles.logoRow}>
              <View style={styles.stepIconWrap}>
                <Ionicons name="person-outline" size={32} color={colors.primary} />
              </View>
            </View>
            <Text style={styles.title}>{t('createAccount')}</Text>
            <Text style={styles.subtitle}>{t('createAccountSubtitle')}</Text>

            <Text style={styles.label}>{t('fullName')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('fullNamePlaceholder')}
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />

            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{t('password')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>

            <Text style={styles.label}>{t('confirmPassword')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <Pressable onPress={() => setShowConfirmPassword(v => !v)} style={styles.eyeButton}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Actions */}
        <View style={styles.actions}>
          {step > 1 && (
            <Pressable style={styles.backButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
              <Text style={styles.backText}>{t('back')}</Text>
            </Pressable>
          )}

          {step < TOTAL_STEPS ? (
            <Pressable style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextText}>{t('next')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.nextButton, isLoading && styles.buttonDisabled]}
              onPress={handleCreateAccount}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.nextText}>{t('createAccount')}</Text>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </>
              )}
            </Pressable>
          )}
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>, insets: { top: number; bottom: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    stepIndicator: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 8,
      paddingTop: insets.top + 16,
      paddingBottom: 8,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.border,
    },
    dotActive: {
      width: 24,
      backgroundColor: colors.primary,
    },
    dotDone: {
      backgroundColor: colors.primaryLight,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    logoRow: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logoIcon: {
      width: 80,
      height: 80,
      borderRadius: 20,
      backgroundColor: colors.sandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepIconWrap: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.sandLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 26,
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 22,
    },
    sectionLabel: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 14,
      color: colors.text,
      marginBottom: 12,
    },
    langRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 32,
    },
    langButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
    },
    langButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.sandLight,
    },
    langText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 15,
      color: colors.textSecondary,
    },
    langTextActive: {
      color: colors.primary,
    },
    label: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
      marginTop: 4,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontFamily: 'Poppins_400Regular',
      fontSize: 15,
      color: colors.text,
      marginBottom: 12,
    },
    inputMultiline: {
      minHeight: 72,
      textAlignVertical: 'top',
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
    },
    eyeButton: {
      padding: 8,
    },
    error: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 8,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 12,
      marginTop: 16,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    backText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 15,
      color: colors.textSecondary,
    },
    nextButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
    },
    nextText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
