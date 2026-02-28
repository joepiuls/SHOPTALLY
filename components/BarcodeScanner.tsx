/**
 * BarcodeScanner — requires expo-camera
 * Before using, run: npx expo install expo-camera
 *
 * Usage:
 *   import { BarcodeScanner } from '@/components/BarcodeScanner';
 *   <BarcodeScanner visible={show} onScan={(code) => ...} onClose={() => setShow(false)} />
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '@/constants/colors';

interface Props {
  visible: boolean;
  onScan: (barcode: string) => void;
  onClose: () => void;
}

const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 4;

function ScanFrame({ color }: { color: string }) {
  const lineY = useSharedValue(0);

  useEffect(() => {
    lineY.value = withRepeat(
      withTiming(FRAME_SIZE - 4, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [lineY]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: lineY.value }],
  }));

  return (
    <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
      {/* Corner brackets */}
      {/* Top-left */}
      <View style={[styles.cornerTL, styles.cornerH, { borderColor: color }]} />
      <View style={[styles.cornerTL, styles.cornerV, { borderColor: color }]} />
      {/* Top-right */}
      <View style={[styles.cornerTR, styles.cornerH, { borderColor: color }]} />
      <View style={[styles.cornerTR, styles.cornerV, { borderColor: color }]} />
      {/* Bottom-left */}
      <View style={[styles.cornerBL, styles.cornerH, { borderColor: color }]} />
      <View style={[styles.cornerBL, styles.cornerV, { borderColor: color }]} />
      {/* Bottom-right */}
      <View style={[styles.cornerBR, styles.cornerH, { borderColor: color }]} />
      <View style={[styles.cornerBR, styles.cornerV, { borderColor: color }]} />

      {/* Animated scan line */}
      <Animated.View style={[styles.scanLine, { backgroundColor: color }, lineStyle]} />
    </View>
  );
}

export function BarcodeScanner({ visible, onScan, onClose }: Props) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    if (visible) setScanned(false);
  }, [visible]);

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
        <View style={styles.permissionCard}>
          <Ionicons name="camera-outline" size={48} color={colors.primary} />
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Needed</Text>
          <Text style={[styles.permText, { color: colors.textSecondary }]}>
            Allow camera access to scan barcodes.
          </Text>
          <Pressable
            style={[styles.permBtn, { backgroundColor: colors.primary }]}
            onPress={requestPermission}
          >
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelLink}>
            <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.overlay}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr'] }}
        onBarcodeScanned={scanned ? undefined : (result) => {
          setScanned(true);
          onScan(result.data);
        }}
      />

      {/* Dark overlay with transparent center */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <ScanFrame color={colors.primary} />
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom} />

      {/* Label */}
      <View style={styles.labelWrap}>
        <Text style={styles.labelText}>Point camera at barcode</Text>
      </View>

      {/* Close button */}
      <Pressable style={styles.closeBtn} onPress={onClose}>
        <View style={styles.closeCircle}>
          <Ionicons name="close" size={24} color="#fff" />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.65)';
const SIDE_WIDTH = (/* screen width estimate */ 400 - FRAME_SIZE) / 2;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '50%',
    marginBottom: FRAME_SIZE / 2,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayMiddle: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    marginTop: -(FRAME_SIZE / 2),
    height: FRAME_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    flex: 1,
    backgroundColor: OVERLAY_COLOR,
  },
  overlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: '50%',
    marginTop: FRAME_SIZE / 2,
    backgroundColor: OVERLAY_COLOR,
  },
  frame: {
    position: 'relative',
  },
  cornerTL: { position: 'absolute', top: 0, left: 0 },
  cornerTR: { position: 'absolute', top: 0, right: 0 },
  cornerBL: { position: 'absolute', bottom: 0, left: 0 },
  cornerBR: { position: 'absolute', bottom: 0, right: 0 },
  cornerH: {
    width: CORNER_SIZE,
    height: CORNER_THICKNESS,
    borderTopWidth: CORNER_THICKNESS,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerV: {
    width: CORNER_THICKNESS,
    height: CORNER_SIZE,
    borderLeftWidth: CORNER_THICKNESS,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    borderRadius: 1,
    opacity: 0.9,
  },
  labelWrap: {
    position: 'absolute',
    bottom: '50%',
    left: 0,
    right: 0,
    marginBottom: FRAME_SIZE / 2 + 16,
    alignItems: 'center',
  },
  labelText: {
    color: '#fff',
    fontFamily: 'Poppins_500Medium',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
  },
  closeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#000',
    gap: 12,
  },
  permTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
    color: '#fff',
  },
  permText: {
    fontFamily: 'Poppins_400Regular',
    fontSize: 14,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 22,
  },
  permBtn: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  permBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    color: '#fff',
  },
  cancelLink: { paddingVertical: 8 },
  cancelText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: 'rgba(255,255,255,0.6)' },
});
