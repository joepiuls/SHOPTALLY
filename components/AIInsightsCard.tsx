import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useThemeColors } from '@/constants/colors';
import { fetchAIInsights } from '@/lib/ai';
import type { Sale, Product } from '@/lib/types';

interface Props {
  sales: Sale[];
  products: Product[];
  period: 'week' | 'month';
  colors: ReturnType<typeof useThemeColors>;
}

export function AIInsightsCard({ sales, products, period, colors }: Props) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setError(null);
    setInsights(null);
    try {
      const result = await fetchAIInsights(sales, products, period);
      setInsights(result);
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate insights');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(450).duration(400).springify()}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="sparkles" size={18} color="#D97706" />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>AI Insights</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Powered by Claude
            </Text>
          </View>
          {!loading && (
            <Pressable
              onPress={handleGenerate}
              style={[styles.generateBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name={insights ? 'refresh' : 'flash'} size={14} color="#fff" />
              <Text style={styles.generateBtnText}>{insights ? 'Refresh' : 'Analyse'}</Text>
            </Pressable>
          )}
        </View>

        {loading && (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Analysing your sales data…
            </Text>
          </View>
        )}

        {error && !loading && (
          <View style={[styles.errorWrap, { backgroundColor: colors.dangerLight }]}>
            <Ionicons name="warning-outline" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        )}

        {insights && !loading && (
          <View style={styles.insightsBody}>
            <Text style={[styles.insightsText, { color: colors.text }]}>{insights}</Text>
          </View>
        )}

        {!insights && !loading && !error && (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Tap Analyse to get AI-powered insights about your {period === 'week' ? 'week' : 'month'}.
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 15 },
  subtitle: { fontFamily: 'Poppins_400Regular', fontSize: 11 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  generateBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
    color: '#fff',
  },
  loadingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  loadingText: { fontFamily: 'Poppins_400Regular', fontSize: 13 },
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  errorText: { fontFamily: 'Poppins_400Regular', fontSize: 13, flex: 1 },
  insightsBody: { gap: 4 },
  insightsText: { fontFamily: 'Poppins_400Regular', fontSize: 13, lineHeight: 22 },
  emptyText: { fontFamily: 'Poppins_400Regular', fontSize: 13, fontStyle: 'italic' },
});
