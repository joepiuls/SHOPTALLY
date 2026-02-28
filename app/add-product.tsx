import React, { useState } from 'react';
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
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { useShop } from '@/lib/shop-context';
import { useThemeColors } from '@/constants/colors';

export default function AddProductScreen() {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const { addProduct } = useShop();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStock, setLowStock] = useState('5');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  const launchPicker = async (useCamera: boolean) => {
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Camera access is required to take photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
    }
  };

  const pickImage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Product Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: () => launchPicker(true) },
      { text: 'Choose from Gallery', onPress: () => launchPicker(false) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Please enter a product name.');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addProduct({
      name: name.trim(),
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      lowStockThreshold: parseInt(lowStock) || 5,
      imageUri,
      category: category.trim() || 'General',
      barcode: barcode.trim() || null,
    });
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={colors.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.text }]}>Add Product</Text>
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
          placeholder="e.g. Rice (50kg bag)"
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.text }]}>Price ({'\u20A6'})</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Stock</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              value={stock}
              onChangeText={setStock}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: colors.text }]}>Low Stock Alert</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="5"
              placeholderTextColor={colors.textMuted}
              value={lowStock}
              onChangeText={setLowStock}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.text }]}>Category</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g. Food, Electronics, Drinks"
          placeholderTextColor={colors.textMuted}
          value={category}
          onChangeText={setCategory}
        />

        <Text style={[styles.label, { color: colors.text }]}>Barcode</Text>
        <View style={[styles.barcodeRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[styles.barcodeInput, { color: colors.text }]}
            placeholder="Scan or type barcode"
            placeholderTextColor={colors.textMuted}
            value={barcode}
            onChangeText={setBarcode}
            autoCapitalize="none"
          />
          <Pressable
            style={[styles.scanBtn, { backgroundColor: colors.primary }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowScanner(true); }}
          >
            <Ionicons name="barcode-outline" size={22} color="#fff" />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 }]}
          onPress={handleSave}
        >
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <Text style={styles.saveBtnText}>Save Product</Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <BarcodeScanner
        visible={showScanner}
        onScan={(code) => {
          setBarcode(code);
          setShowScanner(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onClose={() => setShowScanner(false)}
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
  row: { flexDirection: 'row', gap: 12 },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  barcodeInput: {
    flex: 1,
    fontFamily: 'Poppins_400Regular',
    fontSize: 16,
    height: 52,
    paddingHorizontal: 16,
  },
  scanBtn: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
});
