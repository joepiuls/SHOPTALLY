import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import type { StaffInvitation } from '@/lib/types';

type ScreenStatus = 'loading' | 'ready' | 'error' | 'done';

type InviteData = StaffInvitation & { shop_name: string };

export default function AcceptInviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [status, setStatus] = useState<ScreenStatus>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }
    loadInvite();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadInvite = async () => {
    const { data, error } = await supabase
      .from('staff_invitations')
      .select('*, shops:shop_id(name)')
      .eq('token', token)
      .single();

    if (error || !data) {
      setErrorMsg('Invite not found or has already expired.');
      setStatus('error');
      return;
    }
    if (data.accepted_at) {
      setErrorMsg('This invite has already been accepted.');
      setStatus('error');
      return;
    }
    if (new Date(data.expires_at) < new Date()) {
      setErrorMsg('This invite link has expired. Ask the shop owner to resend it.');
      setStatus('error');
      return;
    }

    setInvite({ ...data, shop_name: (data.shops as any)?.name ?? 'your shop' });
    setStatus('ready');
  };

  const handleAccept = async () => {
    setErrorMsg('');
    if (!fullName.trim()) { setErrorMsg('Please enter your full name.'); return; }
    if (password.length < 6) { setErrorMsg('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setErrorMsg('Passwords do not match.'); return; }
    if (!invite) return;

    setIsSubmitting(true);
    try {
      // 1. Sign up the user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: invite.invitee_email,
        password,
        options: { data: { name: fullName.trim() } },
      });
      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Sign up failed.');

      // 2. Set profile with shop_id and role (upsert in case trigger already ran)
      await supabase.from('profiles').upsert(
        {
          id: authData.user.id,
          name: fullName.trim(),
          shop_id: invite.shop_id,
          role: invite.role,
          is_active: true,
        },
        { onConflict: 'id' },
      );

      // 3. Mark invite as accepted
      await supabase
        .from('staff_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('token', token);

      setStatus('done');
    } catch (err: any) {
      const msg = err?.message ?? '';
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setErrorMsg('An account with this email already exists. Sign in instead.');
      } else {
        setErrorMsg(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading invitation…</Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <View style={[styles.bigIcon, { backgroundColor: colors.dangerLight }]}>
          <Ionicons name="close-circle" size={44} color={colors.danger} />
        </View>
        <Text style={[styles.title, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>Invite Error</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>{errorMsg}</Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.replace('/auth/login')}
        >
          <Text style={styles.btnText}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  // ── Success ──────────────────────────────────────────────────────────────
  if (status === 'done') {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Animated.View
          entering={FadeInDown.springify()}
          style={[styles.bigIcon, { backgroundColor: colors.successLight }]}
        >
          <Ionicons name="checkmark-circle" size={52} color={colors.success} />
        </Animated.View>
        <Text style={[styles.title, { color: colors.text, textAlign: 'center', marginTop: 16 }]}>
          Account Created!
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, textAlign: 'center' }]}>
          Check your email for a confirmation link, then sign in to get started.
        </Text>
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.replace('/auth/login')}
        >
          <Ionicons name="log-in-outline" size={20} color="#fff" />
          <Text style={styles.btnText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topInset + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
      >
        <Animated.View entering={FadeInDown.duration(350).springify()}>
          {/* Icon */}
          <View style={styles.iconRow}>
            <View style={[styles.inviteIcon, { backgroundColor: colors.sandLight }]}>
              <Ionicons name="people" size={36} color={colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, { color: colors.text }]}>You're Invited!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join{' '}
            <Text style={{ color: colors.primary, fontFamily: 'Poppins_600SemiBold' }}>
              {invite!.shop_name}
            </Text>{' '}
            as{' '}
            <Text style={{ color: colors.text, fontFamily: 'Poppins_600SemiBold' }}>
              {invite!.role}
            </Text>
          </Text>

          {/* Email pill */}
          <View style={[styles.emailPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.emailText, { color: colors.textSecondary }]}>
              {invite!.invitee_email}
            </Text>
          </View>

          {/* Full name */}
          <Text style={[styles.label, { color: colors.text }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Your full name"
            placeholderTextColor={colors.textMuted}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />

          {/* Password */}
          <Text style={[styles.label, { color: colors.text }]}>Password</Text>
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

          {/* Confirm password */}
          <Text style={[styles.label, { color: colors.text }]}>Confirm Password</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="••••••••"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Error */}
          {errorMsg ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.errorText, { color: colors.danger }]}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Submit */}
          <Pressable
            style={[styles.btn, { backgroundColor: colors.primary, opacity: isSubmitting ? 0.6 : 1 }]}
            onPress={handleAccept}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.btnText}>Create Account & Join</Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.loginLink} onPress={() => router.replace('/auth/login')}>
            <Text style={[styles.loginLinkText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary }}>Sign in</Text>
            </Text>
          </Pressable>
        </Animated.View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center', padding: 32 },
  scroll: { paddingHorizontal: 24 },
  iconRow: { alignItems: 'center', marginBottom: 20 },
  inviteIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigIcon: {
    width: 88,
    height: 88,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 26, marginBottom: 8 },
  subtitle: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 24,
  },
  emailText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
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
    fontFamily: 'Poppins_400Regular',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  eyeBtn: { padding: 8 },
  errorBanner: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12 },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  loadingText: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginTop: 16 },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  btnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  loginLink: { alignItems: 'center', paddingVertical: 16 },
  loginLinkText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
});
