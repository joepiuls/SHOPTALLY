import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  useColorScheme,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeOutUp,
  LinearTransition,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '@/constants/colors';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

const DURATION = 3500;

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const accentColor =
    toast.type === 'success' ? colors.success
    : toast.type === 'error' ? colors.danger
    : toast.type === 'warning' ? colors.gold
    : colors.primary;

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        toast.type === 'success'
          ? Haptics.NotificationFeedbackType.Success
          : toast.type === 'error'
            ? Haptics.NotificationFeedbackType.Error
            : Haptics.NotificationFeedbackType.Warning,
      );
    }
    const t = setTimeout(onDismiss, DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(15).stiffness(200)}
      exiting={FadeOutUp.duration(220)}
      layout={LinearTransition.springify().damping(15)}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderLeftColor: accentColor,
            elevation: 8,
            boxShadow: `0px 4px 20px ${colors.shadow}`,
          } as any,
        ]}
      >
        <Ionicons name={ICON_MAP[toast.type]} size={22} color={accentColor} />
        <View style={styles.textBlock}>
          {toast.title ? (
            <Text style={[styles.title, { color: colors.text }]}>
              {toast.title}
            </Text>
          ) : null}
          <Text
            style={[
              styles.message,
              { color: toast.title ? colors.textSecondary : colors.text },
            ]}
            numberOfLines={3}
          >
            {toast.message}
          </Text>
        </View>
        <Ionicons name="close" size={16} color={colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  const insets = useSafeAreaInsets();

  if (!toasts.length) return null;

  return (
    <View
      style={[styles.container, { top: insets.top + 8 }]}
      pointerEvents="box-none"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderLeftWidth: 4,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  message: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
});
