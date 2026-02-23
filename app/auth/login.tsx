import React, { useState } from 'react';
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
} from 'react-native';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';

export default function LoginScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    setError('');
    if (!email.trim()) { setError(t('emailRequired')); return; }
    if (!password) { setError(t('passwordRequired')); return; }

    setIsLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      // Auth guard in _layout.tsx handles navigation automatically
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

  const styles = makeStyles(colors, insets);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(300)}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="storefront" size={40} color={colors.primary} />
            </View>
            <Text style={styles.appName}>ShopTally</Text>
          </View>

          <Text style={styles.title}>{t('welcomeBack')}</Text>
          <Text style={styles.subtitle}>{t('signInSubtitle')}</Text>

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
          />

          <Text style={styles.label}>{t('password')}</Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={v => { setPassword(v); setError(''); }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              onSubmitEditing={handleSignIn}
              returnKeyType="go"
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.forgotLink}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotText}>{t('forgotPassword')}</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.signInButton, isLoading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signInText}>{t('signIn')}</Text>
            )}
          </Pressable>
        </Animated.View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>, insets: { top: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: 24,
      paddingTop: insets.top + 40,
    },
    logoRow: {
      alignItems: 'center',
      marginBottom: 32,
    },
    logoIcon: {
      width: 88,
      height: 88,
      borderRadius: 22,
      backgroundColor: colors.sandLight,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    appName: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 22,
      color: colors.primary,
    },
    title: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 24,
      color: colors.text,
      marginBottom: 6,
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
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 8,
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
    forgotLink: {
      alignSelf: 'flex-end',
      marginBottom: 24,
      paddingVertical: 4,
    },
    forgotText: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 13,
      color: colors.primary,
    },
    error: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.danger,
      textAlign: 'center',
      marginBottom: 12,
      backgroundColor: colors.dangerLight,
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 10,
    },
    signInButton: {
      backgroundColor: colors.primary,
      paddingVertical: 16,
      borderRadius: 14,
      alignItems: 'center',
    },
    signInText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 16,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
