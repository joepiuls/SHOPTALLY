import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { sendPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => setResendCountdown(v => v - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  const handleSend = async () => {
    setError('');
    if (!email.trim()) { setError(t('emailRequired')); return; }

    setIsLoading(true);
    try {
      await sendPasswordReset(email.trim().toLowerCase());
      setSent(true);
      setResendCountdown(60);
    } catch (err: any) {
      setError(err?.message || t('somethingWentWrong'));
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
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={colors.text} />
      </Pressable>

      <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-outline" size={36} color={colors.primary} />
        </View>

        {!sent ? (
          <>
            <Text style={styles.title}>{t('forgotPasswordTitle')}</Text>
            <Text style={styles.subtitle}>{t('forgotPasswordSubtitle')}</Text>

            <Text style={styles.label}>{t('email')}</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={v => { setEmail(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onSubmitEditing={handleSend}
              returnKeyType="send"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSend}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>{t('sendResetLink')}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.title}>{t('checkYourEmail')}</Text>
            <Text style={styles.subtitle}>{t('resetLinkSent')}</Text>

            <Pressable
              style={[styles.button, resendCountdown > 0 && styles.buttonDisabled]}
              onPress={resendCountdown === 0 ? handleSend : undefined}
              disabled={resendCountdown > 0 || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {resendCountdown > 0
                    ? `${t('resendIn')} ${resendCountdown}s`
                    : t('resendLink')}
                </Text>
              )}
            </Pressable>

            <Pressable style={styles.backToLogin} onPress={() => router.replace('/auth/login')}>
              <Text style={styles.backToLoginText}>{t('backToLogin')}</Text>
            </Pressable>
          </>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>, insets: { top: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: insets.top,
    },
    backButton: {
      padding: 16,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 16,
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 18,
      backgroundColor: colors.sandLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 24,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 22,
    },
    label: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
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
      marginBottom: 16,
    },
    error: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.danger,
      backgroundColor: colors.dangerLight,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
      marginBottom: 16,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    buttonText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    backToLogin: {
      alignItems: 'center',
      marginTop: 24,
    },
    backToLoginText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 14,
      color: colors.primary,
    },
  });
}
