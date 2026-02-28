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
import { router, useURL } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { updatePassword } = useAuth();
  const url = useURL();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Parse recovery tokens from the deep-link URL and establish a Supabase session.
  // The email link redirects to shoptally://auth/reset-password#access_token=...&type=recovery
  useEffect(() => {
    const parseAndSetSession = async (rawUrl: string) => {
      try {
        // Tokens may be in the fragment (#) or query string (?)
        const fragmentIndex = rawUrl.indexOf('#');
        const queryIndex = rawUrl.indexOf('?');
        const paramString =
          fragmentIndex !== -1
            ? rawUrl.substring(fragmentIndex + 1)
            : queryIndex !== -1
            ? rawUrl.substring(queryIndex + 1)
            : '';

        if (paramString) {
          const params = new URLSearchParams(paramString);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const type = params.get('type');

          if (type === 'recovery' && access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) setError(t('somethingWentWrong'));
          }
        }
      } catch {
        // URL parse failed — session may already be set from native deep-link handling
      } finally {
        setTokenLoading(false);
      }
    };

    if (url) {
      parseAndSetSession(url);
    } else {
      // No URL — user navigated here directly (already authenticated), allow immediately
      setTokenLoading(false);
    }
  }, [url]);

  const handleUpdate = async () => {
    setError('');
    if (password.length < 6) { setError(t('passwordTooShort')); return; }
    if (password !== confirmPassword) { setError(t('passwordsDoNotMatch')); return; }

    setIsLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => router.replace('/(tabs)'), 2000);
    } catch (err: any) {
      setError(err?.message || t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  const styles = makeStyles(colors, insets);

  if (tokenLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View entering={FadeInDown.duration(300)} style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={36} color={colors.primary} />
        </View>

        {!success ? (
          <>
            <Text style={styles.title}>{t('setNewPassword')}</Text>
            <Text style={styles.subtitle}>{t('setNewPasswordSubtitle')}</Text>

            <Text style={styles.label}>{t('newPassword')}</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={styles.passwordInput}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={v => { setPassword(v); setError(''); }}
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
                onChangeText={v => { setConfirmPassword(v); setError(''); }}
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleUpdate}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>{t('updatePassword')}</Text>
              )}
            </Pressable>
          </>
        ) : (
          <View style={styles.successBox}>
            <Ionicons name="checkmark-circle" size={56} color={colors.green} />
            <Text style={styles.successTitle}>{t('passwordUpdated')}</Text>
            <Text style={styles.successSub}>{t('redirectingToApp')}</Text>
          </View>
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
      paddingTop: insets.top + 24,
    },
    centered: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
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
    },
    label: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 13,
      color: colors.text,
      marginBottom: 6,
      marginTop: 4,
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
      marginTop: 8,
    },
    buttonText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    successBox: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
    },
    successTitle: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 22,
      color: colors.text,
    },
    successSub: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: colors.textSecondary,
    },
  });
}
