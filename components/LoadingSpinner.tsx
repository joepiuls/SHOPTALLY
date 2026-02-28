import React, { useEffect } from 'react';
import { View, StyleSheet, Platform, useColorScheme } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
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
  const c = color ?? colors.primary;
  const sw = strokeWidth ?? Math.max(2, Math.round(size / 10));

  const rotation = useSharedValue(0);
  const counterRotation = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Outer comet ring — clockwise, fast
    rotation.value = withRepeat(
      withTiming(360, { duration: 900, easing: Easing.linear }),
      -1,
    );
    // Inner arc — counter-clockwise, slower
    counterRotation.value = withRepeat(
      withTiming(-360, { duration: 1400, easing: Easing.linear }),
      -1,
    );
    // Subtle breathing pulse on the whole spinner
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 700, easing: Easing.out(Easing.ease) }),
        withTiming(1.0, { duration: 700, easing: Easing.in(Easing.ease) }),
      ),
      -1,
    );
  }, [rotation, counterRotation, pulse]);

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${counterRotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  // Dot orbits at the bright head of the comet arc
  const dotStyle = useAnimatedStyle(() => {
    'worklet';
    const angleRad = ((rotation.value - 90) * Math.PI) / 180;
    const r = size / 2 - sw / 2;
    return {
      transform: [
        { translateX: r * Math.cos(angleRad) },
        { translateY: r * Math.sin(angleRad) },
      ],
    };
  });

  const innerSize = size * 0.55;
  const innerSw = Math.max(1.5, sw * 0.75);
  const dotR = Math.max(2, sw * 1.3);

  return (
    <Animated.View
      style={[
        { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
        pulseStyle,
      ]}
    >
      {/* Faint static track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: sw,
          borderColor: c + '22',
        }}
      />

      {/* Outer comet arc — bright head fades to transparent tail */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { alignItems: 'center', justifyContent: 'center' },
          outerStyle,
        ]}
      >
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: sw,
            borderTopColor: c,
            borderRightColor: c + '88',
            borderBottomColor: c + '28',
            borderLeftColor: 'transparent',
          }}
        />
      </Animated.View>

      {/* Orbiting dot — sits exactly at the comet's bright head */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            width: dotR * 2,
            height: dotR * 2,
            borderRadius: dotR,
            backgroundColor: c,
          },
          dotStyle,
        ]}
      />

      {/* Inner counter-rotating arc — creates depth */}
      <Animated.View
        style={[
          { position: 'absolute', width: innerSize, height: innerSize },
          innerStyle,
        ]}
      >
        <View
          style={{
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderWidth: innerSw,
            borderTopColor: 'transparent',
            borderRightColor: c + '44',
            borderBottomColor: c + '99',
            borderLeftColor: c + '44',
          }}
        />
      </Animated.View>

      {/* Center anchor dot */}
      <View
        style={{
          width: sw * 2.2,
          height: sw * 2.2,
          borderRadius: sw * 1.1,
          backgroundColor: c,
          opacity: 0.85,
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
          <LoadingSpinner size={52} color="#fff" />
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
        <LoadingSpinner size={44} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 999,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 14,
    boxShadow: '0px 8px 32px rgba(0,0,0,0.2)',
  } as any,
});
