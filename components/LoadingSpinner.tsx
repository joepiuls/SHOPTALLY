import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useThemeColors } from '@/constants/colors';

interface SpinnerProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function LoadingSpinner({ size = 32, color, strokeWidth }: SpinnerProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const rotation = useSharedValue(0);
  const sw = strokeWidth ?? Math.max(2, Math.round(size / 10));

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 750, easing: Easing.linear }),
      -1,
    );
  }, [rotation]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const c = color ?? colors.primary;

  return (
    <Animated.View style={[{ width: size, height: size }, animStyle]}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: sw,
          borderColor: c + '30',  // faint track
          borderTopColor: c,       // bright leading edge
        }}
      />
    </Animated.View>
  );
}

interface OverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: OverlayProps) {
  if (!visible) return null;

  if (Platform.OS === 'ios') {
    return (
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(150)}
        style={StyleSheet.absoluteFill}
        pointerEvents="auto"
      >
        <BlurView intensity={50} tint="dark" style={[StyleSheet.absoluteFill, styles.center]}>
          <LoadingSpinner size={48} color="#fff" />
        </BlurView>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[styles.overlay, styles.center]}
      pointerEvents="auto"
    >
      <View style={styles.card}>
        <LoadingSpinner size={40} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
    boxShadow: '0px 8px 32px rgba(0,0,0,0.2)',
  } as any,
});
