import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { loadPendingShop, clearPendingShop } from '@/lib/storage';
import { LoadingOverlay } from '@/components/LoadingSpinner';

export default function ConfirmEmailScreen() {
  const { email, code } = useLocalSearchParams<{ email?: string; code?: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { session, completeOnboarding } = useAuth();

  const [isProcessing, setIsProcessing] = useState(false);
  const [resent, setResent] = useState(false);
  const [resentError, setResentError] = useState('');
  const [codeError, setCodeError] = useState('');

  // Exchange the PKCE code from the deep link for a session
  useEffect(() => {
    if (!code || session) return;
    supabase.auth.exchangeCodeForSession(code).catch(() => {
      setCodeError('This confirmation link has expired or is invalid. Please request a new one.');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // When a session appears (email confirmed via deep link), finish shop creation
  useEffect(() => {
    if (!session) return;

    const finishSetup = async () => {
      setIsProcessing(true);
      try {
        const pending = await loadPendingShop();
        if (pending) {
          const userId = session.user.id;
          const { data: shop, error: shopError } = await supabase
            .from('shops')
            .insert({
              name: pending.name,
              phone: pending.phone,
              address: pending.address,
              bio: '',
              accent_color: '#C2410C',
              language: pending.language,
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
          await clearPendingShop();
        }
        await completeOnboarding();
        router.replace('/(tabs)');
      } catch {
        // Even if shop creation failed, mark done and proceed
        await completeOnboarding();
        router.replace('/(tabs)');
      } finally {
        setIsProcessing(false);
      }
    };

    finishSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleResend = async () => {
    if (!email) return;
    setResentError('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      setResent(true);
    } catch (err: any) {
      setResentError(err?.message || 'Failed to resend. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LoadingOverlay visible={isProcessing} />

      <View style={[styles.inner, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}>
        <Animated.View entering={FadeInDown.duration(400).springify()} style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconBox, { backgroundColor: colors.sandLight }]}>
            <Ionicons name="mail-open-outline" size={48} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>Check Your Inbox</Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            We sent a confirmation link to
          </Text>
          {email ? (
            <Text style={[styles.emailHighlight, { color: colors.primary }]}>{email}</Text>
          ) : null}

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Click the link in that email to activate your account. The app will continue automatically once confirmed.
          </Text>

          {codeError ? (
            <Text style={[styles.errorText, { color: colors.danger, marginBottom: 16 }]}>{codeError}</Text>
          ) : null}

          {/* Resend */}
          <Pressable
            style={[
              styles.resendBtn,
              {
                backgroundColor: resent ? colors.successLight : colors.surface,
                borderColor: resent ? colors.success : colors.border,
              },
            ]}
            onPress={handleResend}
            disabled={resent}
          >
            <Ionicons
              name={resent ? 'checkmark-circle' : 'refresh-outline'}
              size={18}
              color={resent ? colors.success : colors.textSecondary}
            />
            <Text style={[styles.resendText, { color: resent ? colors.success : colors.textSecondary }]}>
              {resent ? 'Email Resent!' : 'Resend Confirmation Email'}
            </Text>
          </Pressable>

          {resentError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{resentError}</Text>
          ) : null}

          {/* Start over */}
          <Pressable
            style={styles.backLink}
            onPress={() => router.replace('/auth/onboarding')}
          >
            <Text style={[styles.backLinkText, { color: colors.textMuted }]}>
              Wrong email?{'  '}
              <Text style={{ color: colors.primary, fontFamily: 'Poppins_500Medium' }}>Start over</Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    alignItems: 'center',
  },
  iconBox: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 26,
    textAlign: 'center',
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  emailHighlight: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  hint: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  resendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  resendText: {
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
  },
  errorText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  backLink: {
    marginTop: 20,
    paddingVertical: 8,
  },
  backLinkText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    textAlign: 'center',
  },
});
