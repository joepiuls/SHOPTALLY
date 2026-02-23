import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  useColorScheme,
  Platform,
  Switch,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';
import { formatCurrency } from '@/lib/format';
import { Product, MarketplaceListing } from '@/lib/types';

function ListingModal({
  visible,
  product,
  colors,
  onClose,
  onSave,
}: {
  visible: boolean;
  product: Product | null;
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
  onSave: (listing: MarketplaceListing) => void;
}) {
  const { t } = useTranslation();
  const existing = product?.marketplaceListing;
  const [title, setTitle] = useState(existing?.title || product?.name || '');
  const [desc, setDesc] = useState(existing?.description || '');
  const [location, setLocation] = useState(existing?.location || '');
  const [photos, setPhotos] = useState<string[]>(existing?.photos || (product?.imageUri ? [product.imageUri] : []));

  React.useEffect(() => {
    if (product) {
      const l = product.marketplaceListing;
      setTitle(l?.title || product.name);
      setDesc(l?.description || '');
      setLocation(l?.location || '');
      setPhotos(l?.photos || (product.imageUri ? [product.imageUri] : []));
    }
  }, [product]);

  const addPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos(prev => [...prev, result.assets[0].uri]);
    }
  };

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a listing title');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ title: title.trim(), description: desc.trim(), photos, location: location.trim(), isActive: true });
  };

  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>{t('createListing')}</Text>
          <Pressable onPress={handleSave}>
            <Ionicons name="checkmark" size={28} color={colors.primary} />
          </Pressable>
        </View>
        <View style={styles.modalForm}>
          <Text style={[styles.label, { color: colors.text }]}>{t('listingTitle')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder={t('listingTitle')}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.label, { color: colors.text }]}>{t('description')}</Text>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={desc}
            onChangeText={setDesc}
            placeholder={t('description')}
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.label, { color: colors.text }]}>{t('location')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={location}
            onChangeText={setLocation}
            placeholder="e.g. Kano, Sabon Gari"
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.label, { color: colors.text }]}>{t('photos')}</Text>
          <View style={styles.photosRow}>
            {photos.map((uri, i) => (
              <Pressable key={i} onPress={() => setPhotos(prev => prev.filter((_, j) => j !== i))}>
                <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
                <View style={styles.photoRemove}>
                  <Ionicons name="close-circle" size={18} color={colors.danger} />
                </View>
              </Pressable>
            ))}
            {photos.length < 4 && (
              <Pressable style={[styles.addPhotoBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={addPhoto}>
                <Ionicons name="add" size={24} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
          <Pressable
            style={({ pressed }) => [styles.publishBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
            onPress={handleSave}
          >
            <Ionicons name="rocket" size={20} color="#fff" />
            <Text style={styles.publishBtnText}>{t('publish')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function MarketplaceScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { products, toggleMarketplace, updateMarketplaceListing } = useShop();
  const { t } = useTranslation();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const listedCount = useMemo(() => products.filter(p => p.isMarketplace).length, [products]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('marketplace')}</Text>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{listedCount} listed</Text>
        </View>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!products.length}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index * 40, 400)).duration(300).springify()}>
            <View style={[styles.productCard, { backgroundColor: colors.card, borderColor: item.isMarketplace ? colors.primary + '40' : colors.cardBorder }]}>
              <View style={styles.productCardTop}>
                {item.imageUri ? (
                  <Image source={{ uri: item.imageUri }} style={styles.productImg} contentFit="cover" />
                ) : (
                  <View style={[styles.productImgPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
                    <Ionicons name="cube" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.productPrice, { color: colors.primary }]}>{formatCurrency(item.price)}</Text>
                  <Text style={[styles.productStock, { color: colors.textMuted }]}>{item.stock} {t('inStock')}</Text>
                </View>
                <Switch
                  value={item.isMarketplace}
                  onValueChange={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleMarketplace(item.id);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary + '60' }}
                  thumbColor={item.isMarketplace ? colors.primary : colors.textMuted}
                />
              </View>
              {item.isMarketplace && (
                <View style={styles.listingActions}>
                  {item.marketplaceListing ? (
                    <View style={styles.listingStatusRow}>
                      <View style={[styles.listingStatusBadge, { backgroundColor: item.marketplaceListing.isActive ? colors.successLight : colors.dangerLight }]}>
                        <View style={[styles.statusDot, { backgroundColor: item.marketplaceListing.isActive ? colors.success : colors.danger }]} />
                        <Text style={[styles.listingStatusText, { color: item.marketplaceListing.isActive ? colors.success : colors.danger }]}>
                          {item.marketplaceListing.isActive ? t('active') : t('inactive')}
                        </Text>
                      </View>
                      <Pressable
                        style={[styles.editListingBtn, { borderColor: colors.border }]}
                        onPress={() => setEditingProduct(item)}
                      >
                        <Ionicons name="pencil" size={14} color={colors.primary} />
                        <Text style={[styles.editListingText, { color: colors.primary }]}>Edit</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      style={({ pressed }) => [styles.createListingBtn, { backgroundColor: colors.gold, opacity: pressed ? 0.9 : 1 }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setEditingProduct(item);
                      }}
                    >
                      <Ionicons name="add-circle" size={18} color="#fff" />
                      <Text style={styles.createListingText}>{t('createListing')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="storefront-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('noDataYet')}</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t('addFirstProduct')}</Text>
          </View>
        }
      />

      <ListingModal
        visible={!!editingProduct}
        product={editingProduct}
        colors={colors}
        onClose={() => setEditingProduct(null)}
        onSave={(listing) => {
          if (editingProduct) {
            updateMarketplaceListing(editingProduct.id, listing);
          }
          setEditingProduct(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontFamily: 'Poppins_700Bold', fontSize: 28 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#fff' },
  listContent: { paddingHorizontal: 20 },
  productCard: { borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1 },
  productCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  productImg: { width: 48, height: 48, borderRadius: 10 },
  productImgPlaceholder: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
  productPrice: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, marginTop: 1 },
  productStock: { fontFamily: 'Poppins_400Regular', fontSize: 11, marginTop: 1 },
  listingActions: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  listingStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listingStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  listingStatusText: { fontFamily: 'Poppins_500Medium', fontSize: 11 },
  editListingBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, gap: 4 },
  editListingText: { fontFamily: 'Poppins_500Medium', fontSize: 12 },
  createListingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  createListingText: { fontFamily: 'Poppins_600SemiBold', fontSize: 13, color: '#fff' },
  modalForm: { padding: 20, gap: 4 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 4, marginTop: 8 },
  input: { fontFamily: 'Poppins_400Regular', fontSize: 15, height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14 },
  textArea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  photosRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 4 },
  photoThumb: { width: 72, height: 72, borderRadius: 10 },
  photoRemove: { position: 'absolute', top: -4, right: -4 },
  addPhotoBtn: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  publishBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, gap: 8, marginTop: 20 },
  publishBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 18, marginTop: 16 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 14, textAlign: 'center', marginTop: 8 },
});
