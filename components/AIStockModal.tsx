import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';
import { fetchStockAdvice } from '@/lib/ai';
import type { Product, Sale } from '@/lib/types';

interface Props {
  visible: boolean;
  products: Product[];
  sales: Sale[];
  colors: ReturnType<typeof useThemeColors>;
  onClose: () => void;
}

export function AIStockModal({ visible, products, sales, colors, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    setAdvice(null);
    try {
      const result = await fetchStockAdvice(products, sales);
      setAdvice(result);
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate advice');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAdvice(null);
    setError(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onShow={handleGenerate}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topInset + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="sparkles" size={18} color="#D97706" />
          </View>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Stock Advisor</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            AI-powered restocking recommendations based on your sales velocity and current stock levels.
          </Text>

          {loading && (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Analysing your stock levels…
              </Text>
            </View>
          )}

          {error && !loading && (
            <View style={[styles.errorWrap, { backgroundColor: colors.dangerLight }]}>
              <Ionicons name="warning-outline" size={20} color={colors.danger} />
              <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {advice && !loading && (
            <View style={[styles.adviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <Text style={[styles.adviceText, { color: colors.text }]}>{advice}</Text>
            </View>
          )}

          {!loading && (
            <Pressable
              onPress={handleGenerate}
              style={[styles.refreshBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="refresh" size={16} color={colors.textSecondary} />
              <Text style={[styles.refreshText, { color: colors.textSecondary }]}>Refresh analysis</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarTitle: { fontFamily: 'Poppins_600SemiBold', fontSize: 17, flex: 1 },
  closeBtn: { padding: 4 },
  body: { padding: 20, gap: 16 },
  description: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 20 },
  loadingWrap: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontFamily: 'Poppins_400Regular', fontSize: 14 },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 10,
  },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13, flex: 1 },
  adviceCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  adviceText: { fontFamily: 'Poppins_400Regular', fontSize: 14, lineHeight: 24 },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  refreshText: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
});
