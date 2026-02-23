import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, Sale } from './types';

const PRODUCTS_KEY = '@shoptally_products';
const SALES_KEY = '@shoptally_sales';

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
