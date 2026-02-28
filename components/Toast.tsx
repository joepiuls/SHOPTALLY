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
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
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

  // Progress bar — drains from full width to 0 over DURATION
  const trackWidthSV = useSharedValue(300);
  const progress = useSharedValue(1);

  const progressStyle = useAnimatedStyle(() => ({
    width: progress.value * trackWidthSV.value,
  }));

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
    progress.value = withTiming(0, { duration: DURATION, easing: Easing.linear });
    const t = setTimeout(onDismiss, DURATION);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(16).stiffness(240)}
      exiting={FadeOutUp.springify().damping(20).stiffness(300)}
      layout={LinearTransition.springify().damping(16)}
    >
      <Pressable
        onPress={onDismiss}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            elevation: 12,
            // Shadow tinted with the toast accent color for a premium feel
            boxShadow: `0px 6px 28px ${accentColor}30`,
          } as any,
        ]}
      >
        {/* 4px accent strip at the very top */}
        <View style={[styles.topStrip, { backgroundColor: accentColor }]} />

        {/* Main content row */}
        <View style={styles.content}>
          {/* Icon in a tinted rounded box */}
          <View style={[styles.iconBox, { backgroundColor: accentColor + '1A' }]}>
            <Ionicons name={ICON_MAP[toast.type]} size={22} color={accentColor} />
          </View>

          {/* Text block */}
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

          {/* Close button — small circle */}
          <Pressable onPress={onDismiss} hitSlop={10} style={styles.closeBtn}>
            <View style={[styles.closeCircle, { backgroundColor: colors.border }]}>
              <Ionicons name="close" size={11} color={colors.textMuted} />
            </View>
          </Pressable>
        </View>

        {/* Depleting progress bar */}
        <View
          style={[styles.progressTrack, { backgroundColor: accentColor + '18' }]}
          onLayout={e => { trackWidthSV.value = e.nativeEvent.layout.width; }}
        >
          <Animated.View
            style={[styles.progressFill, { backgroundColor: accentColor }, progressStyle]}
          />
        </View>
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
    borderRadius: 16,
    overflow: 'hidden',
  },
  topStrip: {
    height: 4,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  closeBtn: {
    flexShrink: 0,
  },
  closeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 3,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
