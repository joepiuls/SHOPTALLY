import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useColorScheme,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';

export default function EditProductScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const { products, updateProduct, adjustStock, deleteProduct } = useShop();

  const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);

  const [name, setName] = useState(product?.name || '');
  const [price, setPrice] = useState(product?.price.toString() || '');
  const [stock, setStock] = useState(product?.stock.toString() || '');
  const [lowStock, setLowStock] = useState(product?.lowStockThreshold.toString() || '5');
  const [category, setCategory] = useState(product?.category || '');
  const [imageUri, setImageUri] = useState<string | null>(product?.imageUri || null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  if (!product) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Product not found</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, fontFamily: 'Poppins_500Medium' }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const pickImage = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await updateProduct(product.id, {
      name: name.trim(),
      price: parseFloat(price) || 0,
      stock: parseInt(stock) || 0,
      lowStockThreshold: parseInt(lowStock) || 5,
      category: category.trim() || 'General',
      imageUri,
    });
    router.back();
  };

  const handleDelete = () => {
    Alert.alert('Delete Product', `Are you sure you want to delete "${product.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteProduct(product.id);
          router.back();
        },
      },
    ]);
  };

  const handleQuickAdjust = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newStock = Math.max(0, (parseInt(stock) || 0) + amount);
    setStock(newStock.toString());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Edit Product</Text>
        <Pressable onPress={handleSave}>
          <Ionicons name="checkmark" size={28} color={colors.primary} />
        </Pressable>
      </View>

      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[styles.form, { paddingBottom: bottomInset + 20 }]}
        bottomOffset={20}
      >
        <Pressable style={[styles.imagePickerArea, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]} onPress={pickImage}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} contentFit="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera" size={32} color={colors.textMuted} />
              <Text style={[styles.imagePlaceholderText, { color: colors.textMuted }]}>Add Photo</Text>
            </View>
          )}
        </Pressable>

        <Text style={[styles.label, { color: colors.text }]}>Product Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Price ({'\u20A6'})</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Stock</Text>
        <View style={styles.stockRow}>
          <Pressable
            style={[styles.stockAdjustBtn, { backgroundColor: colors.danger }]}
            onPress={() => handleQuickAdjust(-1)}
          >
            <Ionicons name="remove" size={22} color="#fff" />
          </Pressable>
          <TextInput
            style={[styles.stockInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            value={stock}
            onChangeText={setStock}
            keyboardType="numeric"
            textAlign="center"
          />
          <Pressable
            style={[styles.stockAdjustBtn, { backgroundColor: colors.green }]}
            onPress={() => handleQuickAdjust(1)}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.quickStockRow}>
          {[5, 10, 20, 50].map(amt => (
            <Pressable
              key={amt}
              style={[styles.quickStockBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
              onPress={() => handleQuickAdjust(amt)}
            >
              <Text style={[styles.quickStockText, { color: colors.green }]}>+{amt}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Low Stock Alert</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={lowStock}
          onChangeText={setLowStock}
          keyboardType="numeric"
        />

        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          value={category}
          onChangeText={setCategory}
        />

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.danger, opacity: pressed ? 0.9 : 1 }]}
          onPress={handleDelete}
        >
          <Ionicons name="trash" size={20} color={colors.danger} />
          <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete Product</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
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
  form: { paddingHorizontal: 20, paddingTop: 20 },
  imagePickerArea: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignSelf: 'center',
    marginBottom: 24,
    overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 },
  imagePlaceholderText: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
  label: { fontFamily: 'Poppins_500Medium', fontSize: 14, marginBottom: 6 },
  input: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  stockAdjustBtn: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  stockInput: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickStockRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  quickStockBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  quickStockText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 16, color: '#fff' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 12,
  },
  deleteBtnText: { fontFamily: 'Poppins_500Medium', fontSize: 15 },
});
