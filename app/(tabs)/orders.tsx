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
    case 'new': return { bg: '#DBEAFE', text: '#1D4ED8', icon: 'notifications' as const };
    case 'accepted': return { bg: '#FEF3C7', text: '#D97706', icon: 'checkmark-circle' as const };
    case 'preparing': return { bg: '#FFF7ED', text: '#EA580C', icon: 'flame' as const };
    case 'ready': return { bg: colors.successLight, text: colors.success, icon: 'bag-check' as const };
    case 'delivered': return { bg: '#E0E7FF', text: '#4338CA', icon: 'bicycle' as const };
  }
}

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
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Ionicons name="close" size={28} color={colors.text} /></Pressable>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>New Order</Text>
          <Pressable onPress={handleSave}><Ionicons name="checkmark" size={28} color={colors.primary} /></Pressable>
        </View>
        <View style={styles.modalForm}>
          <Text style={[styles.label, { color: colors.text }]}>{t('customerName')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={name} onChangeText={setName} placeholder="e.g. Aisha Ibrahim" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.text }]}>{t('phone')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={phone} onChangeText={setPhone} placeholder="e.g. 08012345678" placeholderTextColor={colors.textMuted} keyboardType="phone-pad" />
          <Text style={[styles.label, { color: colors.text }]}>{t('total')} ({'\u20A6'})</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={total} onChangeText={setTotal} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" />
          <Text style={[styles.label, { color: colors.text }]}>{t('address')}</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={address} onChangeText={setAddress} placeholder="Delivery address" placeholderTextColor={colors.textMuted} />
          <Text style={[styles.label, { color: colors.text }]}>Notes</Text>
          <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]} value={notes} onChangeText={setNotes} placeholder="Order notes" placeholderTextColor={colors.textMuted} multiline />
          <Pressable style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>{t('save')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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
        <Text style={[styles.title, { color: colors.text }]}>{t('orders')}</Text>
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
              { backgroundColor: activeTab === item.key ? colors.primary : colors.surface, borderColor: activeTab === item.key ? colors.primary : colors.border },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveTab(item.key); }}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === item.key ? '#fff' : colors.textSecondary }]}>
              {item.label}
            </Text>
            {statusCounts[item.key] > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: activeTab === item.key ? 'rgba(255,255,255,0.3)' : colors.border }]}>
                <Text style={[styles.tabBadgeText, { color: activeTab === item.key ? '#fff' : colors.textSecondary }]}>{statusCounts[item.key]}</Text>
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
          return (
            <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 400)).duration(300).springify()}>
              <View style={[styles.orderCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.orderTop}>
                  <View style={[styles.statusChip, { backgroundColor: sc.bg }]}>
                    <Ionicons name={sc.icon} size={14} color={sc.text} />
                    <Text style={[styles.statusChipText, { color: sc.text }]}>{t(item.status === 'new' ? 'newOrders' : item.status)}</Text>
                  </View>
                  <Text style={[styles.orderDate, { color: colors.textMuted }]}>
                    {dayjs(item.createdAt).format('MMM D, h:mm A')}
                  </Text>
                </View>
                <View style={styles.orderInfo}>
                  <Text style={[styles.orderCustomer, { color: colors.text }]}>{item.customerName}</Text>
                  <Text style={[styles.orderTotal, { color: colors.primary }]}>{formatCurrency(item.total)}</Text>
                </View>
                {item.deliveryAddress ? (
                  <View style={styles.addressRow}>
                    <Ionicons name="location" size={14} color={colors.textMuted} />
                    <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>{item.deliveryAddress}</Text>
                  </View>
                ) : null}
                {item.notes ? (
                  <Text style={[styles.orderNotes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text>
                ) : null}
                <View style={styles.orderActions}>
                  {canAdvance && (
                    <Pressable
                      style={({ pressed }) => [styles.advanceBtn, { backgroundColor: sc.bg, opacity: pressed ? 0.8 : 1 }]}
                      onPress={() => advanceStatus(item)}
                    >
                      <Ionicons name="arrow-forward" size={16} color={sc.text} />
                      <Text style={[styles.advanceBtnText, { color: sc.text }]}>
                        {t(STATUS_FLOW[nextIndex + 1] === 'new' ? 'newOrders' : STATUS_FLOW[nextIndex + 1])}
                      </Text>
                    </Pressable>
                  )}
                  {item.customerPhone ? (
                    <Pressable
                      style={[styles.whatsappBtn, { backgroundColor: '#25D366' }]}
                      onPress={() => openWhatsApp(item.customerPhone)}
                    >
                      <Ionicons name="logo-whatsapp" size={18} color="#fff" />
                    </Pressable>
                  ) : null}
                  <Pressable
                    style={[styles.deleteBtn, { borderColor: colors.danger + '40' }]}
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
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noOrders')}</Text>
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 8,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  addBtn: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tabsRow: { paddingHorizontal: 20, gap: 8, paddingVertical: 8, height: 52 },
  tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10, borderWidth: 1, gap: 6 },
  tabBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  tabBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  tabBadgeText: { fontFamily: 'Poppins_600SemiBold', fontSize: 10 },
  listContent: { paddingHorizontal: 20, paddingTop: 4 },
  orderCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 4 },
  statusChipText: { fontFamily: 'Poppins_600SemiBold', fontSize: 11 },
  orderDate: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  orderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  orderCustomer: { fontFamily: 'Poppins_600SemiBold', fontSize: 16 },
  orderTotal: { fontFamily: 'Poppins_700Bold', fontSize: 18 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  addressText: { fontFamily: 'Poppins_400Regular', fontSize: 12, flex: 1 },
  orderNotes: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginBottom: 8 },
  orderActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  advanceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  advanceBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13 },
  whatsappBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  modalForm: { padding: 20, gap: 4 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 4, marginTop: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  saveBtn: { alignItems: 'center', paddingVertical: 16, borderRadius: 14, marginTop: 20 },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
});
