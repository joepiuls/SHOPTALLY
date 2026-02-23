import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useThemeColors } from '@/constants/colors';
import { useAuth } from '@/lib/auth-context';
import { useShop } from '@/lib/shop-context';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const colors = useThemeColors(colorScheme);
  const insets = useSafeAreaInsets();
  const {
    user,
    appSettings,
    updateAppSettings,
    signOut,
    signOutAllDevices,
    updatePassword,
    deleteAccount,
  } = useAuth();
  const { products, sales } = useShop();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleThemeSelect = (theme: ThemeOption) => {
    updateAppSettings({ theme });
  };

  const handleSavePassword = async () => {
    setPasswordError('');
    if (newPassword.length < 6) { setPasswordError(t('passwordTooShort')); return; }
    if (newPassword !== confirmPassword) { setPasswordError(t('passwordsDoNotMatch')); return; }

    setSavingPassword(true);
    try {
      await updatePassword(newPassword);
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('', t('passwordUpdated'));
    } catch (err: any) {
      setPasswordError(err?.message || t('somethingWentWrong'));
    } finally {
      setSavingPassword(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      // Products CSV
      const productHeader = 'Name,Price,Stock,Category,Created\n';
      const productRows = products
        .map(p => `"${p.name}",${p.price},${p.stock},"${p.category}","${p.createdAt}"`)
        .join('\n');

      // Sales CSV
      const salesHeader = 'ID,Total,Amount Paid,Change,Type,Customer,Date\n';
      const salesRows = sales
        .map(s =>
          `"${s.id}",${s.total},${s.amountPaid},${s.change},"${s.isCredit ? 'Credit' : 'Cash'}","${s.customerName ?? ''}","${s.createdAt}"`
        )
        .join('\n');

      const csvContent = `PRODUCTS\n${productHeader}${productRows}\n\nSALES\n${salesHeader}${salesRows}`;

      const filename = `shoptally-export-${new Date().toISOString().slice(0, 10)}.csv`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: filename });
      }
    } catch (err: any) {
      Alert.alert('Export failed', err?.message || t('somethingWentWrong'));
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(t('signOut'), t('signOutConfirm') || 'Are you sure you want to sign out?', [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('signOut'),
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  };

  const handleSignOutAll = () => {
    Alert.alert(
      t('signOutAllDevices'),
      t('signOutAllConfirm') || 'This will sign you out on all devices.',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('signOutAllDevices'),
          style: 'destructive',
          onPress: () => signOutAllDevices(),
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('deleteAccount'), t('deleteAccountConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('deleteAccountButton'),
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteAccount();
          } catch (err: any) {
            Alert.alert('Error', err?.message || t('somethingWentWrong'));
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  const styles = makeStyles(colors, insets);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('settings')}</Text>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Account Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(50)}>
          <Text style={styles.sectionTitle}>{t('account')}</Text>
          <View style={styles.card}>
            <View style={styles.accountRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{user?.name ?? ''}</Text>
                <Text style={styles.accountRole}>
                  {user?.role === 'owner' ? t('owner') :
                   user?.role === 'cashier' ? t('cashier') :
                   user?.role === 'stock_manager' ? t('stockManager') : t('deliveryRider')}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Change Password */}
            <Pressable
              style={styles.row}
              onPress={() => setShowChangePassword(v => !v)}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.rowText}>{t('changePassword')}</Text>
              </View>
              <Ionicons
                name={showChangePassword ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {showChangePassword && (
              <View style={styles.changePasswordForm}>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder={t('newPassword')}
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={v => { setNewPassword(v); setPasswordError(''); }}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('confirmPassword')}
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={v => { setConfirmPassword(v); setPasswordError(''); }}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
                <Pressable
                  style={[styles.saveButton, savingPassword && styles.buttonDisabled]}
                  onPress={handleSavePassword}
                  disabled={savingPassword}
                >
                  {savingPassword ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>{t('savePassword')}</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Appearance Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(100)}>
          <Text style={styles.sectionTitle}>{t('appearance')}</Text>
          <View style={styles.card}>
            <Text style={styles.rowLabel}>{t('theme')}</Text>
            <View style={styles.themeRow}>
              {(['light', 'dark', 'system'] as ThemeOption[]).map(opt => (
                <Pressable
                  key={opt}
                  style={[
                    styles.themeButton,
                    appSettings.theme === opt && styles.themeButtonActive,
                  ]}
                  onPress={() => handleThemeSelect(opt)}
                >
                  <Ionicons
                    name={
                      opt === 'light' ? 'sunny-outline' :
                      opt === 'dark' ? 'moon-outline' : 'phone-portrait-outline'
                    }
                    size={18}
                    color={appSettings.theme === opt ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.themeText,
                      appSettings.theme === opt && styles.themeTextActive,
                    ]}
                  >
                    {t(opt)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>

        {/* Notifications Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(150)}>
          <Text style={styles.sectionTitle}>{t('notifications')}</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
                <Text style={styles.rowText}>{t('pushNotifications')}</Text>
              </View>
              <Switch
                value={appSettings.notificationsEnabled}
                onValueChange={v => updateAppSettings({ notificationsEnabled: v })}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </Animated.View>

        {/* Data Section */}
        <Animated.View entering={FadeInDown.duration(300).delay(200)}>
          <Text style={styles.sectionTitle}>{t('data')}</Text>
          <View style={styles.card}>
            <Pressable
              style={styles.row}
              onPress={handleExportCSV}
              disabled={isExporting}
            >
              <View style={styles.rowLeft}>
                <Ionicons name="download-outline" size={20} color={colors.textSecondary} />
                <View>
                  <Text style={styles.rowText}>{t('exportData')}</Text>
                  <Text style={styles.rowSub}>
                    {t('exportSummary', {
                      sales: sales.length,
                      products: products.length,
                    })}
                  </Text>
                </View>
              </View>
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </Pressable>
          </View>
        </Animated.View>

        {/* Danger Zone */}
        <Animated.View entering={FadeInDown.duration(300).delay(250)}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>{t('dangerZone')}</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <Pressable style={styles.row} onPress={handleSignOut}>
              <View style={styles.rowLeft}>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={[styles.rowText, styles.dangerText]}>{t('signOut')}</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.row} onPress={handleSignOutAll}>
              <View style={styles.rowLeft}>
                <Ionicons name="phone-portrait-outline" size={20} color={colors.danger} />
                <Text style={[styles.rowText, styles.dangerText]}>{t('signOutAllDevices')}</Text>
              </View>
            </Pressable>

            <View style={styles.divider} />

            <Pressable style={styles.row} onPress={handleDeleteAccount} disabled={isDeleting}>
              <View style={styles.rowLeft}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.rowText, styles.dangerText]}>{t('deleteAccount')}</Text>
              </View>
              {isDeleting && <ActivityIndicator size="small" color={colors.danger} />}
            </Pressable>
          </View>
        </Animated.View>

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useThemeColors>, insets: { top: number }) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: insets.top + 16,
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 22,
      color: colors.text,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: {
      paddingHorizontal: 16,
    },
    sectionTitle: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 12,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 24,
      marginBottom: 8,
      marginLeft: 4,
    },
    dangerTitle: {
      color: colors.danger,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    dangerCard: {
      borderColor: colors.dangerLight,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      gap: 12,
    },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: 'Poppins_700Bold',
      fontSize: 18,
      color: '#fff',
    },
    accountInfo: {
      flex: 1,
    },
    accountName: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
      color: colors.text,
    },
    accountRole: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 13,
      color: colors.textSecondary,
      textTransform: 'capitalize',
    },
    divider: {
      height: 1,
      backgroundColor: colors.borderLight,
      marginHorizontal: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    rowLabel: {
      fontFamily: 'Poppins_500Medium',
      fontSize: 14,
      color: colors.text,
      paddingHorizontal: 16,
      paddingTop: 14,
      paddingBottom: 10,
    },
    rowText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 15,
      color: colors.text,
    },
    rowSub: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 1,
    },
    dangerText: {
      color: colors.danger,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },
    themeButton: {
      flex: 1,
      flexDirection: 'column',
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      gap: 4,
    },
    themeButtonActive: {
      borderColor: colors.primary,
      backgroundColor: colors.sandLight,
    },
    themeText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
    themeTextActive: {
      color: colors.primary,
      fontFamily: 'Poppins_500Medium',
    },
    changePasswordForm: {
      paddingHorizontal: 16,
      paddingBottom: 16,
      gap: 8,
    },
    passwordRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingRight: 8,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: colors.text,
    },
    eyeButton: {
      padding: 6,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: 'Poppins_400Regular',
      fontSize: 14,
      color: colors.text,
    },
    errorText: {
      fontFamily: 'Poppins_400Regular',
      fontSize: 12,
      color: colors.danger,
    },
    saveButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
    },
    saveButtonText: {
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
      color: '#fff',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
  });
}
