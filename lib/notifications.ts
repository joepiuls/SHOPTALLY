import Constants from 'expo-constants';
import { Platform } from 'react-native';

// expo-notifications auto-registers a push token listener on import,
// which crashes in Expo Go since SDK 53 (remote push was removed).
// Lazy-require the module inside each function so the side-effect
// never fires when running in Expo Go.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

function N() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

/** Create Android notification channels + configure foreground handler. Call once at app start. */
export function setupNotificationChannels(): void {
  if (IS_EXPO_GO) return;
  const n = N();
  n.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS !== 'android') return;
  n.setNotificationChannelAsync('low-stock', {
    name: 'Low Stock Alerts',
    importance: n.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  n.setNotificationChannelAsync('orders', {
    name: 'New Orders',
    importance: n.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
  });
  n.setNotificationChannelAsync('default', {
    name: 'General',
    importance: n.AndroidImportance.DEFAULT,
  });
}

/** Request notification permission. Local notifications work without an EAS token. */
export async function registerForPushNotifications(): Promise<void> {
  if (IS_EXPO_GO) return;
  const n = N();
  const { status } = await n.getPermissionsAsync();
  if (status !== 'granted') {
    await n.requestPermissionsAsync();
  }
}

/** Fire a local notification immediately. No-op in Expo Go. */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: object,
): Promise<void> {
  if (IS_EXPO_GO) return;
  const n = N();
  const channelId =
    Platform.OS === 'android'
      ? (data as Record<string, string> | undefined)?.type === 'low_stock'
        ? 'low-stock'
        : 'orders'
      : undefined;
  await n.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data ?? {},
      ...(channelId ? { channelId } : {}),
    },
    trigger: null,
  });
}
