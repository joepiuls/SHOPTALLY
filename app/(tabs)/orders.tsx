import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { Order, OrderStatus } from '@/lib/types';

const STATUS_FLOW: OrderStatus[] = ['new', 'accepted', 'preparing', 'ready', 'delivered'];

function getStatusColor(status: OrderStatus, colors: ReturnType<typeof useThemeColors>) {
  switch (status) {
    case 'new': return { bg: '#DBEAFE', text: '#1D4ED8', accent: '#3B82F6', icon: 'notifications' as const };
    case 'accepted': return { bg: '#FEF3C7', text: '#D97706', accent: '#F59E0B', icon: 'checkmark-circle' as const };
    case 'preparing': return { bg: '#FFF7ED', text: '#EA580C', accent: '#F97316', icon: 'flame' as const };
    case 'ready': return { bg: colors.successLight, text: colors.success, accent: '#22C55E', icon: 'bag-check' as const };
    case 'delivered': return { bg: '#E0E7FF', text: '#4338CA', accent: '#6366F1', icon: 'bicycle' as const };
  }
}

function StatusSteps({ current, colors }: { current: OrderStatus; colors: ReturnType<typeof useThemeColors> }) {
  const currentIndex = STATUS_FLOW.indexOf(current);
  return (
    <View style={stepStyles.row}>
      {STATUS_FLOW.map((s, i) => {
        const sc = getStatusColor(s, colors);
        const isDone = i <= currentIndex;
        return (
          <React.Fragment key={s}>
            <View style={[stepStyles.dot, { backgroundColor: isDone ? sc.accent : colors.border }]} />
            {i < STATUS_FLOW.length - 1 && (
              <View style={[stepStyles.line, { backgroundColor: i < currentIndex ? sc.accent : colors.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  line: { flex: 1, height: 2, borderRadius: 1 },
});

function AddOrderModal({
  visible,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onSave: (order: { customerName: string; customerPhone: string; deliveryAddress: string; notes: string; total: number }) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [total, setTotal] = useState('');
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Missing', 'Customer name is required'); return; }
    if (!total || parseFloat(total) <= 0) { Alert.alert('Missing', 'Order total is required'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      customerName: name.trim(),
      customerPhone: phone.trim(),
      deliveryAddress: address.trim(),
      notes: notes.trim(),
      total: parseFloat(total),
    });
    setName(''); setPhone(''); setAddress(''); setNotes(''); setTotal('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[modalStyles.container, { backgroundColor: colors.background }]}>
        <View style={[modalStyles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[modalStyles.topBarTitle, { color: colors.text }]}>New Order</Text>
          <Pressable onPress={handleSave} hitSlop={12}>
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </Pressable>
        </View>
        <View style={modalStyles.form}>
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>{t('customerName')}</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={name} onChangeText={setName}
            placeholder="e.g. Aisha Ibrahim" placeholderTextColor={colors.textMuted}
          />
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>{t('phone')}</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={phone} onChangeText={setPhone}
            placeholder="e.g. 08012345678" placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
          />
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>{t('total')} (₦)</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={total} onChangeText={setTotal}
            placeholder="0" placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>{t('address')}</Text>
          <TextInput
            style={[modalStyles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={address} onChangeText={setAddress}
            placeholder="Delivery address" placeholderTextColor={colors.textMuted}
          />
          <Text style={[modalStyles.label, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[modalStyles.input, modalStyles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={notes} onChangeText={setNotes}
            placeholder="Any special instructions..." placeholderTextColor={colors.textMuted}
            multiline
          />
          <Pressable
            style={({ pressed }) => [modalStyles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={handleSave}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={modalStyles.saveBtnText}>{t('save')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  form: { padding: 20, gap: 4 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 12, marginBottom: 6, marginTop: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  textArea: { height: 90, paddingTop: 14, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, marginTop: 24, gap: 8 },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
});

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { orders, addOrder, updateOrderStatus, deleteOrder } = useShop();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<OrderStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    if (activeTab === 'all') return orders;
    return orders.filter(o => o.status === activeTab);
  }, [orders, activeTab]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    STATUS_FLOW.forEach(s => { counts[s] = orders.filter(o => o.status === s).length; });
    return counts;
  }, [orders]);

  const advanceStatus = useCallback((order: Order) => {
    const currentIndex = STATUS_FLOW.indexOf(order.status);
    if (currentIndex < STATUS_FLOW.length - 1) {
      const nextStatus = STATUS_FLOW[currentIndex + 1];
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      updateOrderStatus(order.id, nextStatus);
    }
  }, [updateOrderStatus]);

  const openWhatsApp = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    const url = `https://wa.me/${cleaned.startsWith('0') ? '234' + cleaned.slice(1) : cleaned}`;
    Linking.openURL(url);
  }, []);

  const tabs: { key: OrderStatus | 'all'; label: string }[] = [
    { key: 'all', label: t('all') },
    { key: 'new', label: t('newOrders') },
    { key: 'accepted', label: t('accepted') },
    { key: 'preparing', label: t('preparing') },
    { key: 'ready', label: t('ready') },
    { key: 'delivered', label: t('delivered') },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{t('orders')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowAddModal(true); }}
          style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={tabs}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.tabsRow}
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.tabBtn,
              {
                backgroundColor: activeTab === item.key ? colors.primary : colors.surface,
                borderColor: activeTab === item.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(item.key); }}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === item.key ? '#fff' : colors.textSecondary }]}>
              {item.label}
            </Text>
            {statusCounts[item.key] > 0 && (
              <View style={[
                styles.tabBadge,
                { backgroundColor: activeTab === item.key ? 'rgba(255,255,255,0.25)' : colors.primary + '18' },
              ]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === item.key ? '#fff' : colors.primary }]}>
                  {statusCounts[item.key]}
                </Text>
              </View>
            )}
          </Pressable>
        )}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        renderItem={({ item, index }) => {
          const sc = getStatusColor(item.status, colors);
          const nextIndex = STATUS_FLOW.indexOf(item.status);
          const canAdvance = nextIndex < STATUS_FLOW.length - 1;
          const nextLabel = canAdvance ? STATUS_FLOW[nextIndex + 1] : '';
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 400)).duration(300).springify()}>
              <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {/* Left status accent */}
                <View style={[styles.orderAccent, { backgroundColor: sc.accent }]} />

                <View style={styles.orderBody}>
                  {/* Status progress dots */}
                  <StatusSteps current={item.status} colors={colors} />

                  <View style={styles.orderTop}>
                    <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                      <Ionicons name={sc.icon} size={13} color={sc.text} />
                      <Text style={[styles.statusChipText, { color: sc.text }]}>
                        {t(item.status === 'new' ? 'newOrders' : item.status)}
                      </Text>
                    </View>
                    <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                      {dayjs(item.createdAt).format('MMM D · h:mm A')}
                    </Text>
                  </View>

                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderCustomer, { color: colors.text }]}>{item.customerName}</Text>
                    <Text style={[styles.orderTotal, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
                  </View>

                  {item.deliveryAddress ? (
                    <View style={styles.addressRow}>
                      <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>
                        {item.deliveryAddress}
                      </Text>
                    </View>
                  ) : null}

                  {item.notes ? (
                    <Text style={[styles.orderNotes, { color: colors.textMuted }]} numberOfLines={2}>
                      "{item.notes}"
                    </Text>
                  ) : null}

                  <View style={styles.orderActions}>
                    {canAdvance && (
                      <Pressable
                        style={({ pressed }) => [styles.advanceBtn, { backgroundColor: sc.bg, opacity: pressed ? 0.8 : 1 }]}
                        onPress={() => advanceStatus(item)}
                      >
                        <Ionicons name="arrow-forward-circle" size={16} color={sc.text} />
                        <Text style={[styles.advanceBtnText, { color: sc.text }]}>
                          Mark {nextLabel === 'new' ? 'new' : nextLabel}
                        </Text>
                      </Pressable>
                    )}
                    {item.customerPhone ? (
                      <Pressable
                        style={[styles.actionIconBtn, { backgroundColor: '#25D366' }]}
                        onPress={() => openWhatsApp(item.customerPhone)}
                      >
                        <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                      </Pressable>
                    ) : null}
                    <Pressable
                      style={[styles.actionIconBtn, { borderColor: colors.danger + '35', borderWidth: 1, backgroundColor: colors.dangerLight }]}
                      onPress={() => {
                        Alert.alert('Delete Order', 'Remove this order?', [
                          { text: t('cancel'), style: 'cancel' },
                          { text: t('delete'), style: 'destructive', onPress: () => deleteOrder(item.id) },
                        ]);
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.primary + '10' }]}>
              <Ionicons name="receipt-outline" size={44} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noOrders')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {activeTab === 'all' ? 'Tap + to add your first order' : `No ${activeTab} orders`}
            </Text>
          </View>
        }
      />

      <AddOrderModal
        visible={showAddModal}
        colors={colors}
        onClose={() => setShowAddModal(false)}
        onSave={(data) => {
          addOrder({ ...data, items: [], status: 'new' as OrderStatus });
          setShowAddModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 10,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },
  addBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tabsRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 8, height: 54 },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1, gap: 6,
  },
  tabBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  tabBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  tabBadgeText: { fontFamily: 'Poppins_700Bold', fontSize: 11 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },

  orderCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  orderAccent: {
    width: 4,
    alignSelf: 'stretch',
  },
  orderBody: {
    flex: 1,
    padding: 14,
  },
  orderTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 5,
  },
  statusChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  orderDate: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  orderInfo: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
  },
  orderCustomer: { fontFamily: 'Poppins_700Bold', fontSize: 16 },
  orderTotal: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  addressText: { fontFamily: 'Poppins_400Regular', fontSize: 12, flex: 1 },
  orderNotes: {
    fontFamily: 'Poppins_400Regular', fontSize: 12,
    marginBottom: 8, fontStyle: 'italic',
  },
  orderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  advanceBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 10, gap: 6,
  },
  advanceBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  actionIconBtn: {
    width: 42, height: 42, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: {
    width: 88, height: 88, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginBottom: 6 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', color: '#999' },
});
