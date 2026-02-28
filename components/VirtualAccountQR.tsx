import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '@/constants/colors';
import type { VirtualAccount } from '@/lib/types';

interface VirtualAccountQRProps {
  account: VirtualAccount;
  amount?: number;       // include at checkout; omit for static display
  size?: number;         // default 200
  showDetails?: boolean; // show account number / bank / name below QR
}

export function VirtualAccountQR({
  account,
  amount,
  size = 200,
  showDetails = true,
}: VirtualAccountQRProps) {
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);

  const qrValue = JSON.stringify({
    provider: account.provider,
    account: account.accountNumber,
    bank: account.bankName,
    name: account.accountName,
    ...(amount !== undefined ? { amount } : {}),
  });

  return (
    <View style={styles.wrapper}>
      <View style={[styles.qrContainer, { backgroundColor: '#FFFFFF', borderColor: colors.border }]}>
        <QRCode
          value={qrValue || 'shoptally'}
          size={size}
          color="#1C1917"
          backgroundColor="#FFFFFF"
        />
      </View>
      {showDetails && (
        <View style={styles.details}>
          <Text style={[styles.accountNumber, { color: colors.text }]}>
            {account.accountNumber}
          </Text>
          <Text style={[styles.bankName, { color: colors.textSecondary }]}>
            {account.bankName || account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}
          </Text>
          <Text style={[styles.accountName, { color: colors.textMuted }]}>
            {account.accountName}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 12 },
  qrContainer: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  details: { alignItems: 'center', gap: 2 },
  accountNumber: { fontFamily: 'Poppins_700Bold', fontSize: 20, letterSpacing: 1 },
  bankName: { fontFamily: 'Poppins_500Medium', fontSize: 13 },
  accountName: { fontFamily: 'Poppins_400Regular', fontSize: 12 },
});
