import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import {
  loadSyncQueue,
  saveSyncQueue,
  saveProducts,
  saveSales,
  saveOrders,
  saveShopProfile,
  loadShopProfile,
  saveLastSyncAt,
} from './storage';
import type { SyncQueueItem, SyncTable, Product, Sale, Order, ShopProfile } from './types';

// Generate a UUID (Expo crypto or Math.random fallback)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Map local table names to Supabase table names
const TABLE_MAP: Record<SyncTable, string> = {
  products: 'products',
  sales: 'sales',
  orders: 'orders',
  payments: 'payments',
};

/**
 * Add a write operation to the offline sync queue.
 * Call this after every AsyncStorage write in shop-context.
 */
export async function enqueueSync(
  item: Omit<SyncQueueItem, 'id' | 'createdAt' | 'retryCount'>
): Promise<void> {
  const queue = await loadSyncQueue();
  const newItem: SyncQueueItem = {
    ...item,
    id: generateId(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  await saveSyncQueue([...queue, newItem]);
}

/**
 * Attempt to push all queued items to Supabase.
 * Items that succeed are removed from the queue.
 * Items that fail are retried up to 3 times, then dropped.
 */
export async function flushSyncQueue(shopId: string): Promise<void> {
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;

  const queue = await loadSyncQueue();
  if (queue.length === 0) return;

  const remaining: SyncQueueItem[] = [];

  for (const item of queue) {
    try {
      await syncItem(item, shopId);
      // Success — don't add back to queue
    } catch {
      if (item.retryCount < 3) {
        remaining.push({ ...item, retryCount: item.retryCount + 1 });
      }
      // After 3 retries, silently drop the item
    }
  }

  await saveSyncQueue(remaining);
}

async function syncItem(item: SyncQueueItem, shopId: string): Promise<void> {
  const supabaseTable = TABLE_MAP[item.table];
  const payload = { ...item.payload, shop_id: shopId };

  if (item.operation === 'insert' || item.operation === 'update') {
    const { error } = await supabase
      .from(supabaseTable)
      .upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  } else if (item.operation === 'delete') {
    const { error } = await supabase
      .from(supabaseTable)
      .delete()
      .eq('id', item.payload.id as string)
      .eq('shop_id', shopId);
    if (error) throw error;
  }
}

/**
 * Subscribe to network changes and auto-flush the queue when connectivity is restored.
 * Returns an unsubscribe function — call it in component cleanup.
 */
export function startSyncListener(shopId: string): () => void {
  const unsubscribe = NetInfo.addEventListener(state => {
    if (state.isConnected) {
      flushSyncQueue(shopId).catch(() => {
        // Silently ignore flush errors — will retry on next connection
      });
    }
  });

  return unsubscribe;
}

// ── Pull (Supabase → AsyncStorage) ───────────────────────────────────────────

function fromSupabaseProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    price: row.price as number,
    stock: row.stock as number,
    lowStockThreshold: (row.low_stock_threshold as number) ?? 5,
    imageUri: (row.image_uri as string) ?? null,
    category: (row.category as string) ?? '',
    barcode: (row.barcode as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isMarketplace: (row.is_marketplace as boolean) ?? false,
    marketplaceListing: (row.marketplace_listing as Product['marketplaceListing']) ?? null,
  };
}

function fromSupabaseSale(row: Record<string, unknown>): Sale {
  return {
    id: row.id as string,
    items: (row.items as Sale['items']) ?? [],
    total: row.total as number,
    amountPaid: row.amount_paid as number,
    change: (row.change as number) ?? 0,
    cashAmount: (row.cash_amount as number) ?? (row.amount_paid as number),
    transferAmount: (row.transfer_amount as number) ?? 0,
    paymentMethod: (row.payment_method as Sale['paymentMethod']) ?? 'cash',
    isCredit: (row.is_credit as boolean) ?? false,
    customerName: (row.customer_name as string) ?? null,
    staffId: (row.staff_id as string) ?? null,
    staffName: (row.staff_name as string) ?? null,
    paymentId: (row.payment_id as string) ?? null,
    gatewayProvider: (row.gateway_provider as Sale['gatewayProvider']) ?? null,
    createdAt: row.created_at as string,
  };
}

function fromSupabaseOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    items: (row.items as Order['items']) ?? [],
    total: row.total as number,
    customerName: (row.customer_name as string) ?? '',
    customerPhone: (row.customer_phone as string) ?? '',
    deliveryAddress: (row.delivery_address as string) ?? '',
    status: (row.status as Order['status']) ?? 'new',
    notes: (row.notes as string) ?? '',
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

async function fromSupabaseShop(row: Record<string, unknown>): Promise<ShopProfile> {
  // Merge with existing local profile to preserve fields not stored in Supabase
  const existing = await loadShopProfile();
  return {
    ...existing,
    name: (row.name as string) ?? existing.name,
    bio: (row.bio as string) ?? existing.bio,
    phone: (row.phone as string) ?? existing.phone,
    address: (row.address as string) ?? existing.address,
    accentColor: (row.accent_color as string) ?? existing.accentColor,
    slug: (row.slug as string) ?? existing.slug,
    language: (row.language as ShopProfile['language']) ?? existing.language,
    openingHours: (row.opening_hours as ShopProfile['openingHours']) ?? existing.openingHours,
    deliveryRadius: (row.delivery_radius as number) ?? existing.deliveryRadius,
  };
}

export async function pullFromSupabase(shopId: string): Promise<boolean> {
  try {
    const [productsRes, salesRes, ordersRes, shopRes] = await Promise.all([
      supabase.from('products').select('*').eq('shop_id', shopId),
      supabase.from('sales').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('orders').select('*').eq('shop_id', shopId).order('created_at', { ascending: false }),
      supabase.from('shops').select('*').eq('id', shopId).single(),
    ]);

    if (productsRes.data) {
      await saveProducts(productsRes.data.map(r => fromSupabaseProduct(r as Record<string, unknown>)));
    }
    if (salesRes.data) {
      await saveSales(salesRes.data.map(r => fromSupabaseSale(r as Record<string, unknown>)));
    }
    if (ordersRes.data) {
      await saveOrders(ordersRes.data.map(r => fromSupabaseOrder(r as Record<string, unknown>)));
    }
    if (shopRes.data) {
      const shopProfile = await fromSupabaseShop(shopRes.data as Record<string, unknown>);
      await saveShopProfile(shopProfile);
    }

    return true;
  } catch {
    return false;
  }
}

export async function syncAll(shopId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const netState = await NetInfo.fetch();
    if (!netState.isConnected) {
      return { success: false, error: 'No internet connection' };
    }

    await flushSyncQueue(shopId);
    const pulled = await pullFromSupabase(shopId);
    if (!pulled) {
      return { success: false, error: 'Failed to pull data from server' };
    }

    await saveLastSyncAt(new Date().toISOString());
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error)?.message ?? 'Sync failed' };
  }
}
