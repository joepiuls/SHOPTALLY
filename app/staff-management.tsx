import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { StaffRole } from '@/lib/types';

const ROLES: { key: StaffRole; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'cashier', icon: 'cash' },
  { key: 'stock_manager', icon: 'cube' },
  { key: 'delivery', icon: 'bicycle' },
];

function getRoleColor(role: StaffRole, colors: ReturnType<typeof useThemeColors>) {
  switch (role) {
    case 'owner': return { bg: '#FFF7ED', text: colors.primary };
    case 'cashier': return { bg: '#DCFCE7', text: colors.green };
    case 'stock_manager': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'delivery': return { bg: '#FEF3C7', text: '#D97706' };
  }
}

function AddStaffModal({
  visible,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onSave: (data: { name: string; role: StaffRole; pin: string }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('cashier');
  const [pin, setPin] = useState('');
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Missing', 'Staff name is required'); return; }
    if (pin.length < 4) { Alert.alert('Invalid PIN', 'PIN must be at least 4 digits'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ name: name.trim(), role, pin });
    setName(''); setRole('cashier'); setPin('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={28} color={colors.text} /></Pressable>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('addStaff')}</Text>
          <Pressable onPress={handleSave}><Ionicons name="checkmark" size={28} color={colors.primary} /></Pressable>
        </View>
        <View style={styles.modalForm}>
          <Text style={[styles.label, { color: colors.text }]}>{t('staffName')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Musa Abdullahi" placeholderTextColor={colors.textMuted} />

          <Text style={[styles.label, { color: colors.text }]}>{t('role')}</Text>
          <View style={styles.rolesRow}>
            {ROLES.map(r => {
              const rc = getRoleColor(r.key, colors);
              const isActive = role === r.key;
              return (
                <Pressable
                  key={r.key}
                  style={[styles.roleBtn, { backgroundColor: isActive ? rc.bg : colors.surface, borderColor: isActive ? rc.text : colors.border }]}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setRole(r.key); }}
                >
                  <Ionicons name={r.icon} size={18} color={isActive ? rc.text : colors.textMuted} />
                  <Text style={[styles.roleBtnText, { color: isActive ? rc.text : colors.textSecondary }]}>{t(r.key === 'stock_manager' ? 'stockManager' : r.key === 'delivery' ? 'deliveryRider' : r.key)}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: colors.text }]}>{t('pin')}</Text>
          <TextInput
            style={[styles.input, styles.pinInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={pin}
            onChangeText={setPin}
            placeholder="1234"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            maxLength={6}
            secureTextEntry
          />

          <Pressable style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]} onPress={handleSave}>
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>{t('addStaff')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function StaffManagementScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { staff, addStaffMember, deleteStaffMember } = useShop();
  const { t } = useTranslation();
  const [showAdd, setShowAdd] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Remove Staff', `Remove "${name}" from your team?`, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); deleteStaffMember(id); } },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('staffManagement')}</Text>
        <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAdd(true); }}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={staff}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!staff.length}
        renderItem={({ item, index }) => {
          const rc = getRoleColor(item.role, colors);
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 50, 400)).duration(300).springify()}>
              <Pressable
                style={[styles.staffCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onLongPress={() => handleDelete(item.id, item.name)}
              >
                <View style={[styles.staffAvatar, { backgroundColor: rc.bg }]}>
                  <Ionicons name="person" size={22} color={rc.text} />
                </View>
                <View style={styles.staffInfo}>
                  <Text style={[styles.staffName, { color: colors.text }]}>{item.name}</Text>
                  <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
                    <Text style={[styles.roleBadgeText, { color: rc.text }]}>
                      {t(item.role === 'stock_manager' ? 'stockManager' : item.role === 'delivery' ? 'deliveryRider' : item.role)}
                    </Text>
                  </View>
                  <Text style={[styles.staffDate, { color: colors.textMuted }]}>
                    Added {dayjs(item.createdAt).format('MMM D, YYYY')}
                  </Text>
                </View>
                <View style={styles.staffActions}>
                  <View style={[styles.pinBadge, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="key" size={14} color={colors.textMuted} />
                    <Text style={[styles.pinText, { color: colors.textMuted }]}>****</Text>
                  </View>
                  {item.activityLog.length > 0 && (
                    <Text style={[styles.activityCount, { color: colors.textMuted }]}>
                      {item.activityLog.length} actions
                    </Text>
                  )}
                </View>
              </Pressable>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No staff yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Add team members to help run your shop
            </Text>
          </View>
        }
      />

      <AddStaffModal
        visible={showAdd}
        colors={colors}
        onClose={() => setShowAdd(false)}
        onSave={(data) => {
          addStaffMember({ ...data, isActive: true });
          setShowAdd(false);
        }}
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
  listContent: { paddingHorizontal: 20, paddingTop: 16 },
  staffCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 14, marginBottom: 10, borderWidth: 1, gap: 12,
  },
  staffAvatar: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  staffInfo: { flex: 1 },
  staffName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  roleBadgeText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  staffDate: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 4 },
  staffActions: { alignItems: 'flex-end', gap: 4 },
  pinBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, gap: 4 },
  pinText: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  activityCount: { fontFamily: 'Poppins_400Regular', fontSize: 10 },
  modalForm: { padding: 20, gap: 4 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 4, marginTop: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  pinInput: { letterSpacing: 8, fontSize: 24, textAlign: 'center', fontFamily: 'Poppins_700Bold' },
  rolesRow: { flexDirection: 'row', gap: 8 },
  roleBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, gap: 6 },
  roleBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 11, textAlign: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 20 },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
