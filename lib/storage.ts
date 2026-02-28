import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Sale, Order, StaffMember, ShopProfile, UserProfile, StaffPermissions, AppSettings, SyncQueueItem } from './types';

const PRODUCTS_KEY = '@shoptally_products';
const SALES_KEY = '@shoptally_sales';
const ORDERS_KEY = '@shoptally_orders';
const STAFF_KEY = '@shoptally_staff';
const SHOP_PROFILE_KEY = '@shoptally_shop_profile';

export async function loadProducts(): Promise<Product[]> {
  const data = await AsyncStorage.getItem(PRODUCTS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveProducts(products: Product[]): Promise<void> {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
}

export async function loadSales(): Promise<Sale[]> {
  const data = await AsyncStorage.getItem(SALES_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveSales(sales: Sale[]): Promise<void> {
  await AsyncStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

export async function loadOrders(): Promise<Order[]> {
  const data = await AsyncStorage.getItem(ORDERS_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

export async function loadStaff(): Promise<StaffMember[]> {
  const data = await AsyncStorage.getItem(STAFF_KEY);
  if (!data) return [];
  return JSON.parse(data);
}

export async function saveStaff(staff: StaffMember[]): Promise<void> {
  await AsyncStorage.setItem(STAFF_KEY, JSON.stringify(staff));
}

const DEFAULT_SHOP_PROFILE: ShopProfile = {
  name: 'My Shop',
  bio: '',
  logoUri: null,
  bannerUri: null,
  accentColor: '#C2410C',
  slug: '',
  phone: '',
  address: '',
  openingHours: [
    { day: 'Monday', open: '08:00', close: '18:00', isOpen: true },
    { day: 'Tuesday', open: '08:00', close: '18:00', isOpen: true },
    { day: 'Wednesday', open: '08:00', close: '18:00', isOpen: true },
    { day: 'Thursday', open: '08:00', close: '18:00', isOpen: true },
    { day: 'Friday', open: '08:00', close: '18:00', isOpen: true },
    { day: 'Saturday', open: '08:00', close: '14:00', isOpen: true },
    { day: 'Sunday', open: '00:00', close: '00:00', isOpen: false },
  ],
  deliveryRadius: 10,
  featuredProductIds: [],
  language: 'en',
  virtualAccount: null,
};

export async function loadShopProfile(): Promise<ShopProfile> {
  const data = await AsyncStorage.getItem(SHOP_PROFILE_KEY);
  if (!data) return DEFAULT_SHOP_PROFILE;
  return { ...DEFAULT_SHOP_PROFILE, ...JSON.parse(data) };
}

export async function saveShopProfile(profile: ShopProfile): Promise<void> {
  await AsyncStorage.setItem(SHOP_PROFILE_KEY, JSON.stringify(profile));
}

// --- Auth & sync storage ---

const ONBOARDING_DONE_KEY = '@shoptally_onboarding_done';
const AUTH_USER_CACHE_KEY = '@shoptally_auth_user';
const AUTH_PERMISSIONS_CACHE_KEY = '@shoptally_auth_permissions';
const APP_SETTINGS_KEY = '@shoptally_app_settings';
const SYNC_QUEUE_KEY = '@shoptally_sync_queue';

const DEFAULT_APP_SETTINGS: AppSettings = {
  theme: 'system',
  notificationsEnabled: true,
};

export async function loadOnboardingStatus(): Promise<boolean> {
  const data = await AsyncStorage.getItem(ONBOARDING_DONE_KEY);
  return data === 'true';
}

export async function saveOnboardingDone(): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_DONE_KEY, 'true');
}

export async function clearOnboardingDone(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_DONE_KEY);
}

export async function loadCachedUserProfile(): Promise<UserProfile | null> {
  const data = await AsyncStorage.getItem(AUTH_USER_CACHE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveCachedUserProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(profile));
}

export async function clearCachedUserProfile(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
}

export async function loadCachedPermissions(): Promise<StaffPermissions | null> {
  const data = await AsyncStorage.getItem(AUTH_PERMISSIONS_CACHE_KEY);
  return data ? JSON.parse(data) : null;
}

export async function saveCachedPermissions(permissions: StaffPermissions): Promise<void> {
  await AsyncStorage.setItem(AUTH_PERMISSIONS_CACHE_KEY, JSON.stringify(permissions));
}

export async function clearCachedPermissions(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_PERMISSIONS_CACHE_KEY);
}

export async function loadAppSettings(): Promise<AppSettings> {
  const data = await AsyncStorage.getItem(APP_SETTINGS_KEY);
  return data ? { ...DEFAULT_APP_SETTINGS, ...JSON.parse(data) } : DEFAULT_APP_SETTINGS;
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadSyncQueue(): Promise<SyncQueueItem[]> {
  const data = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return data ? JSON.parse(data) : [];
}

export async function saveSyncQueue(queue: SyncQueueItem[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

// Pending shop creation (stored while waiting for email confirmation)
const PENDING_SHOP_KEY = '@shoptally_pending_shop';

type PendingShopData = { name: string; phone: string; address: string; language: string };

export async function savePendingShop(data: PendingShopData): Promise<void> {
  await AsyncStorage.setItem(PENDING_SHOP_KEY, JSON.stringify(data));
}

export async function loadPendingShop(): Promise<PendingShopData | null> {
  const raw = await AsyncStorage.getItem(PENDING_SHOP_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function clearPendingShop(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_SHOP_KEY);
}
