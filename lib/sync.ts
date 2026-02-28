import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { loadSyncQueue, saveSyncQueue } from './storage';
import type { SyncQueueItem, SyncTable } from './types';

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
