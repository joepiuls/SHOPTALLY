import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Sale, Order, StaffMember, ShopProfile } from './types';

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
};

export async function loadShopProfile(): Promise<ShopProfile> {
  const data = await AsyncStorage.getItem(SHOP_PROFILE_KEY);
  if (!data) return DEFAULT_SHOP_PROFILE;
  return { ...DEFAULT_SHOP_PROFILE, ...JSON.parse(data) };
}

export async function saveShopProfile(profile: ShopProfile): Promise<void> {
  await AsyncStorage.setItem(SHOP_PROFILE_KEY, JSON.stringify(profile));
}
