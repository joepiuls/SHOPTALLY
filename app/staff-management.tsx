import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
  Modal,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import type { UserProfile, StaffPermissions, StaffRole } from '@/lib/types';

const STAFF_ROLES: { key: StaffRole; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'cashier', icon: 'cash' },
  { key: 'stock_manager', icon: 'cube' },
  { key: 'delivery', icon: 'bicycle' },
];

type PermissionKey = keyof Omit<StaffPermissions,
  'id' | 'staff_id' | 'shop_id' | 'updated_at' | 'can_access_staff' | 'can_access_settings'>;

const PERMISSION_KEYS: { key: PermissionKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'can_access_dashboard', label: 'Home / Dashboard', icon: 'home-outline' },
  { key: 'can_access_products', label: 'Products', icon: 'bag-handle-outline' },
  { key: 'can_access_marketplace', label: 'Marketplace', icon: 'storefront-outline' },
  { key: 'can_access_orders', label: 'Orders', icon: 'cube-outline' },
  { key: 'can_access_sales', label: 'Sales History', icon: 'receipt-outline' },
  { key: 'can_access_reports', label: 'Reports', icon: 'bar-chart-outline' },
];

function getRoleColor(role: StaffRole, colors: ReturnType<typeof useThemeColors>) {
  switch (role) {
    case 'owner': return { bg: '#FFF7ED', text: colors.primary };
    case 'cashier': return { bg: '#DCFCE7', text: colors.green };
    case 'stock_manager': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'delivery': return { bg: '#FEF3C7', text: '#D97706' };
  }
}

// ─── Invite Staff Modal ────────────────────────────────────────────────
function InviteStaffModal({
  visible,
  colors,
  onClose,
  onSend,
}: {
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onSend: (email: string, role: StaffRole) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleSend = async () => {
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError(t('emailRequired'));
      return;
    }
    setIsLoading(true);
    try {
      await onSend(email.trim().toLowerCase(), role);
      setEmail('');
      setRole('cashier');
      onClose();
    } catch (err: any) {
      setError(err?.message || t('somethingWentWrong'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
        <View style={[
          modalStyles.topBar,
          { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }
        ]}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[modalStyles.topBarTitle, { color: colors.text }]}>{t('inviteStaff')}</Text>
          <Pressable onPress={handleSend} disabled={isLoading}>
            {isLoading
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Ionicons name="send" size={24} color={colors.primary} />
            }
          </Pressable>
        </View>

        <View style={modalStyles.form}>
          <Text style={[modalStyles.subtitle, { color: colors.textSecondary }]}>
            {t('inviteStaffSubtitle')}
          </Text>

          <Text style={[modalStyles.label, { color: colors.text }]}>{t('staffEmail')}</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={email}
            onChangeText={v => { setEmail(v); setError(''); }}
            placeholder="staff@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={[modalStyles.label, { color: colors.text }]}>{t('role')}</Text>
          <View style={modalStyles.rolesRow}>
            {STAFF_ROLES.map(r => {
              const rc = getRoleColor(r.key, colors);
              const isActive = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={[
                    modalStyles.roleBtn,
                    {
                      backgroundColor: isActive ? rc.bg : colors.surface,
                      borderColor: isActive ? rc.text : colors.border,
                    }
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setRole(r.key);
                  }}
                >
                  <Ionicons name={r.icon} size={18} color={isActive ? rc.text : colors.textMuted} />
                  <Text style={[modalStyles.roleBtnText, { color: isActive ? rc.text : colors.textSecondary }]}>
                    {t(r.key === 'stock_manager' ? 'stockManager' : r.key === 'delivery' ? 'deliveryRider' : r.key)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={[modalStyles.error, { color: colors.danger }]}>{error}</Text> : null}

          <Pressable
            style={[modalStyles.sendBtn, { backgroundColor: colors.primary }, isLoading && { opacity: 0.6 }]}
            onPress={handleSend}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="mail" size={20} color="#fff" />
                <Text style={modalStyles.sendBtnText}>{t('inviteByEmail')}</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Staff Card with expandable permissions ───────────────────────────
function StaffCard({
  member,
  colors,
  onDeactivate,
  onUpdatePermission,
}: {
  member: UserProfile & { permissions?: StaffPermissions };
  colors: ReturnType<typeof useThemeColors>;
  onDeactivate: (id: string, name: string) => void;
  onUpdatePermission: (staffId: string, key: PermissionKey, value: boolean) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const rc = getRoleColor(member.role, colors);

  const handleToggle = async (key: PermissionKey, value: boolean) => {
    setSaving(key);
    try {
      await onUpdatePermission(member.id, key, value);
    } finally {
      setSaving(null);
    }
  };

  return (
    <View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {/* Card header row */}
      <View style={cardStyles.headerRow}>
        <View style={[cardStyles.avatar, { backgroundColor: rc.bg }]}>
          <Ionicons name="person" size={22} color={rc.text} />
        </View>
        <View style={cardStyles.info}>
          <Text style={[cardStyles.name, { color: colors.text }]}>{member.name}</Text>
          <View style={[cardStyles.roleBadge, { backgroundColor: rc.bg }]}>
            <Text style={[cardStyles.roleBadgeText, { color: rc.text }]}>
              {t(member.role === 'stock_manager' ? 'stockManager' : member.role === 'delivery' ? 'deliveryRider' : member.role)}
            </Text>
          </View>
          <Text style={[cardStyles.dateText, { color: colors.textMuted }]}>
            Added {dayjs(member.created_at).format('MMM D, YYYY')}
          </Text>
        </View>
        <View style={cardStyles.actions}>
          {!member.is_active && (
            <View style={[cardStyles.inactiveBadge, { backgroundColor: colors.dangerLight }]}>
              <Text style={[cardStyles.inactiveBadgeText, { color: colors.danger }]}>{t('deactivated')}</Text>
            </View>
          )}
          {member.is_active && (
            <Pressable
              style={[cardStyles.permBtn, { borderColor: colors.border }]}
              onPress={() => setExpanded(v => !v)}
            >
              <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSecondary} />
              <Text style={[cardStyles.permBtnText, { color: colors.textSecondary }]}>
                {expanded ? 'Hide' : t('permissionsTitle')}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {/* Expandable permissions section */}
      {expanded && member.is_active && (
        <View style={[cardStyles.permSection, { borderTopColor: colors.borderLight }]}>
          <Text style={[cardStyles.permTitle, { color: colors.textSecondary }]}>{t('permissionsTitle')}</Text>
          {PERMISSION_KEYS.map(perm => {
            const currentValue = member.permissions?.[perm.key] ?? false;
            return (
              <View key={perm.key} style={cardStyles.permRow}>
                <View style={cardStyles.permRowLeft}>
                  <Ionicons name={perm.icon} size={16} color={colors.textSecondary} />
                  <Text style={[cardStyles.permLabel, { color: colors.text }]}>{perm.label}</Text>
                </View>
                {saving === perm.key ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Switch
                    value={currentValue}
                    onValueChange={v => handleToggle(perm.key, v)}
                    trackColor={{ true: colors.primary, false: colors.border }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            );
          })}

          <Pressable
            style={[cardStyles.deactivateBtn, { borderColor: colors.danger }]}
            onPress={() => onDeactivate(member.id, member.name)}
          >
            <Ionicons name="person-remove-outline" size={16} color={colors.danger} />
            <Text style={[cardStyles.deactivateBtnText, { color: colors.danger }]}>{t('deactivate')}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────
export default function StaffManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user, inviteStaff, updateStaffPermissions, deactivateStaff, fetchShopStaff } = useAuth();

  const [showInvite, setShowInvite] = useState(false);
  const [staffList, setStaffList] = useState<(UserProfile & { permissions?: StaffPermissions })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const isOwner = user?.role === 'owner';

  const loadStaff = useCallback(async () => {
    setIsLoading(true);
    try {
      const members = await fetchShopStaff();
      setStaffList(members as (UserProfile & { permissions?: StaffPermissions })[]);
    } catch {
      // Network error — show empty state
    } finally {
      setIsLoading(false);
    }
  }, [fetchShopStaff]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleInvite = async (email: string, role: StaffRole) => {
    await inviteStaff(email, role);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('', t('inviteSent', { email }));
    await loadStaff();
  };

  const handleDeactivate = (id: string, name: string) => {
    Alert.alert(t('deactivate'), `Remove access for "${name}"?`, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deactivate'),
        style: 'destructive',
        onPress: async () => {
          await deactivateStaff(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await loadStaff();
        },
      },
    ]);
  };

  const handleUpdatePermission = async (staffId: string, key: PermissionKey, value: boolean) => {
    await updateStaffPermissions(staffId, { [key]: value });
    setStaffList(prev =>
      prev.map(m =>
        m.id === staffId
          ? { ...m, permissions: { ...(m.permissions as StaffPermissions), [key]: value } }
          : m
      )
    );
  };

  if (!isOwner) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="lock-closed-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.text, marginTop: 16 }]}>Access Restricted</Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Only the shop owner can manage staff.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[
        styles.topBar,
        { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }
      ]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('staffManagement')}</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowInvite(true); }}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={staffList}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          showsVerticalScrollIndicator={false}
          onRefresh={loadStaff}
          refreshing={isLoading}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 400)).duration(300).springify()}>
              <StaffCard
                member={item}
                colors={colors}
                onDeactivate={handleDeactivate}
                onUpdatePermission={handleUpdatePermission}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No staff yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Invite team members to help run your shop
              </Text>
              <Pressable
                style={[styles.inviteEmptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => setShowInvite(true)}
              >
                <Ionicons name="mail" size={18} color="#fff" />
                <Text style={styles.inviteEmptyBtnText}>{t('inviteStaff')}</Text>
              </Pressable>
            </View>
          }
        />
      )}

      <InviteStaffModal
        visible={showInvite}
        colors={colors}
        onClose={() => setShowInvite(false)}
        onSend={handleInvite}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  listContent: { paddingHorizontal: 16, paddingTop: 16 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
  inviteEmptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
  },
  inviteEmptyBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#fff' },
});

const cardStyles = StyleSheet.create({
  card: { borderRadius: 14, marginBottom: 10, borderWidth: 1, overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1 },
  name: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  roleBadgeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  dateText: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 4 },
  actions: { alignItems: 'flex-end', gap: 8 },
  inactiveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  inactiveBadgeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  permBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5,
  },
  permBtnText: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  permSection: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  permTitle: { fontFamily: 'Poppins_500Medium', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  permRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  permLabel: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  deactivateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10, marginTop: 8,
  },
  deactivateBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 14 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  form: { padding: 20 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 14, marginBottom: 24, lineHeight: 22 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 6, marginTop: 12 },
  input: {
    fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48,
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 14,
  },
  rolesRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  roleBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  roleBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 11, textAlign: 'center' },
  error: { fontFamily: 'Poppins_400Regular', fontSize: 13, marginTop: 4 },
  sendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 24,
  },
  sendBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});
