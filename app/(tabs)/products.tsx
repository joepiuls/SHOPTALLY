import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import Animated, { FadeInDown } from 'react-native-reanimated';
import dayjs from 'dayjs';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast-context';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { AIStockModal } from '@/components/AIStockModal';
import { BarcodeScanner } from '@/components/BarcodeScanner';

export default function ProductsScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { products, sales, deleteProduct } = useShop();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);
  const [showStockAdvisor, setShowStockAdvisor] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }, [products, search]);

  const handleExport = useCallback(async () => {
    if (products.length === 0) {
      toast.warning('No products to export');
      return;
    }
    setExporting(true);
    try {
      const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      const header = 'Name,Price (₦),Stock,Category,Low Stock Alert,Created\n';
      const rows = products.map(p =>
        [escape(p.name), p.price, p.stock, escape(p.category), p.lowStockThreshold, dayjs(p.createdAt).format('YYYY-MM-DD')].join(',')
      ).join('\n');
      const csv = header + rows;
      const fileName = `stock-${dayjs().format('YYYY-MM-DD')}.csv`;
      const path = (FileSystem.documentDirectory ?? '') + fileName;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export Stock List' });
      toast.success(`${products.length} products exported`);
    } catch {
      toast.error('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }, [products, toast]);

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteProduct(id);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Products</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowStockAdvisor(true);
            }}
            style={[styles.iconBtn, { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
          >
            <Ionicons name="sparkles" size={20} color="#D97706" />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleExport();
            }}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            disabled={exporting}
          >
            {exporting
              ? <LoadingSpinner size={18} />
              : <Ionicons name="download-outline" size={22} color={colors.text} />}
          </Pressable>
          <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/add-product');
          }}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
            <Ionicons name="add" size={24} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Ionicons name="search" size={20} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search products..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowScanner(true); }}>
            <Ionicons name="barcode-outline" size={22} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(300).springify()}>
            <Pressable
              style={({ pressed }) => [
                styles.productCard,
                { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: pressed ? 0.95 : 1 },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({ pathname: '/edit-product', params: { productId: item.id } });
              }}
              onLongPress={() => handleDelete(item.id, item.name)}
            >
              {item.imageUri ? (
                <Image source={{ uri: item.imageUri }} style={styles.productImage} contentFit="cover" />
              ) : (
                <View style={[styles.productImagePlaceholder, { backgroundColor: colorScheme === 'dark' ? colors.surfaceElevated : '#FFF7ED' }]}>
                  <Ionicons name="cube" size={24} color={colors.primary} />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={[styles.productCategory, { color: colors.textMuted }]}>{item.category || 'General'}</Text>
                <Text style={[styles.productPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
              </View>
              <View style={styles.productRight}>
                <View
                  style={[
                    styles.stockBadge,
                    {
                      backgroundColor: item.stock <= item.lowStockThreshold
                        ? colors.dangerLight
                        : colors.successLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockText,
                      { color: item.stock <= item.lowStockThreshold ? colors.danger : colors.success },
                    ]}
                  >
                    {item.stock} in stock
                  </Text>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? 'No products found' : 'No products yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {search ? 'Try a different search term' : 'Tap + to add your first product'}
            </Text>
          </View>
        }
      />
      <AIStockModal
        visible={showStockAdvisor}
        products={products}
        sales={sales}
        colors={colors}
        onClose={() => setShowStockAdvisor(false)}
      />
      <BarcodeScanner
        visible={showScanner}
        onScan={(code) => {
          setShowScanner(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const match = products.find(p => p.barcode === code);
          if (match) {
            router.push({ pathname: '/edit-product', params: { productId: match.id } });
          } else {
            setSearch(code);
          }
        }}
        onClose={() => setShowScanner(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    height: 48,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48 },
  listContent: { paddingHorizontal: 20 },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  productImage: { width: 56, height: 56, borderRadius: 12 },
  productImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: { flex: 1 },
  productName: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  productCategory: { fontFamily: 'Poppins_400Regular', fontSize: 12, marginTop: 1 },
  productPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 14, marginTop: 2 },
  productRight: { alignItems: 'flex-end' },
  stockBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stockText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
