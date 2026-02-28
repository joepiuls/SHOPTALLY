import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';
import i18n from './i18n';
import { Product, Sale, CartItem, SaleItem, Order, OrderStatus, StaffMember, StaffRole, ShopProfile, MarketplaceListing, PaymentMethod, PaymentGateway, Expense } from './types';
import { useAuth } from './auth-context';
import { supabase } from './supabase';
import { enqueueSync, syncAll } from './sync';
import { useToast } from './toast-context';
import { loadLastSyncAt } from './storage';
import { scheduleLocalNotification } from './notifications';
import {
  loadProducts, saveProducts,
  loadSales, saveSales,
  loadOrders, saveOrders,
  loadStaff, saveStaff,
  loadShopProfile, saveShopProfile,
  loadExpenses, saveExpenses,
} from './storage';

// ── Supabase format converters ────────────────────────────────────────────────
function toSupabaseProduct(p: Product) {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    cost_price: p.costPrice ?? null,
    unit: p.unit ?? null,
    stock: p.stock,
    low_stock_threshold: p.lowStockThreshold,
    image_uri: p.imageUri ?? null,
    category: p.category,
    is_marketplace: p.isMarketplace,
    marketplace_listing: p.marketplaceListing ?? null,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function toSupabaseSale(s: Sale) {
  return {
    id: s.id,
    items: s.items,
    total: s.total,
    amount_paid: s.amountPaid,
    change: s.change,
    is_credit: s.isCredit,
    customer_name: s.customerName ?? null,
    staff_id: s.staffId ?? null,
    payment_method: s.paymentMethod,
    cash_amount: s.cashAmount,
    transfer_amount: s.transferAmount,
    payment_id: s.paymentId ?? null,
    gateway_provider: s.gatewayProvider ?? null,
    created_at: s.createdAt,
  };
}

function toSupabaseOrder(o: Order) {
  return {
    id: o.id,
    items: o.items,
    total: o.total,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    delivery_address: o.deliveryAddress,
    status: o.status,
    notes: o.notes,
    created_at: o.createdAt,
    updated_at: o.updatedAt,
  };
}

interface ShopContextValue {
  products: Product[];
  sales: Sale[];
  orders: Order[];
  staff: StaffMember[];
  shopProfile: ShopProfile;
  cart: CartItem[];
  isLoading: boolean;

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isMarketplace'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, quantity: number) => Promise<void>;
  toggleMarketplace: (id: string) => Promise<void>;
  updateMarketplaceListing: (id: string, listing: MarketplaceListing) => Promise<void>;

  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (
    amountPaid: number,
    isCredit?: boolean,
    customerName?: string | null,
    paymentMethod?: PaymentMethod,
    cashAmount?: number,
    transferAmount?: number,
    paymentId?: string | null,
    gatewayProvider?: PaymentGateway | null,
  ) => Promise<Sale>;

  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  addStaffMember: (member: Omit<StaffMember, 'id' | 'createdAt' | 'activityLog'>) => Promise<void>;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  deleteStaffMember: (id: string) => Promise<void>;
  logStaffActivity: (staffId: string, action: string, details: string) => Promise<void>;

  updateShopProfile: (updates: Partial<ShopProfile>) => Promise<void>;

  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  isSyncing: boolean;
  lastSyncAt: Date | null;
  syncNow: () => Promise<void>;
  reloadData: () => Promise<void>;

  cartTotal: number;
  cartItemCount: number;
  todaySales: Sale[];
  todayRevenue: number;
  todayItemsSold: number;
  lowStockProducts: Product[];
  marketplaceProducts: Product[];
  getSalesByDateRange: (start: string, end: string) => Sale[];
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile>({
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
      { day: 'Saturday', open: '09:00', close: '16:00', isOpen: true },
      { day: 'Sunday', open: '00:00', close: '00:00', isOpen: false },
    ],
    deliveryRadius: 10,
    featuredProductIds: [],
    language: 'en',
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const reloadData = useCallback(async () => {
    const [p, s, o, st, sp, ex] = await Promise.all([
      loadProducts(),
      loadSales(),
      loadOrders(),
      loadStaff(),
      loadShopProfile(),
      loadExpenses(),
    ]);
    setProducts(p);
    setSales(s);
    setOrders(o);
    setStaff(st);
    setShopProfile(sp);
    setExpenses(ex);
    if (sp.language) {
      i18n.changeLanguage(sp.language);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await reloadData();
      const ts = await loadLastSyncAt();
      setLastSyncAt(ts ? new Date(ts) : null);
      setIsLoading(false);
    })();
  }, [reloadData]);

  // Auto-pull from Supabase when shop_id becomes available (login / session restore)
  useEffect(() => {
    if (!user?.shop_id) return;
    setIsSyncing(true);
    syncAll(user.shop_id)
      .then(() => reloadData())
      .finally(async () => {
        setIsSyncing(false);
        const ts = await loadLastSyncAt();
        setLastSyncAt(ts ? new Date(ts) : null);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.shop_id]);

  const syncNow = useCallback(async () => {
    if (!user?.shop_id || isSyncing) return;
    setIsSyncing(true);
    const result = await syncAll(user.shop_id);
    if (result.success) {
      await reloadData();
      const ts = await loadLastSyncAt();
      setLastSyncAt(ts ? new Date(ts) : null);
      toast.success('Synced successfully');
    } else {
      toast.error(result.error ?? 'Sync failed');
    }
    setIsSyncing(false);
  }, [user, isSyncing, reloadData, toast]);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'isMarketplace'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: Crypto.randomUUID(),
      isMarketplace: false,
      createdAt: now,
      updatedAt: now,
    };
    setProducts(prev => {
      const next = [newProduct, ...prev];
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'insert', payload: toSupabaseProduct(newProduct) }).catch(() => {});
    }
  }, [user]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    const updatedAt = new Date().toISOString();
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt } : p
      );
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'update', payload: { id, ...toSupabaseProduct({ ...updates, updatedAt } as Product), updated_at: updatedAt } }).catch(() => {});
    }
  }, [user]);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'delete', payload: { id } }).catch(() => {});
    }
  }, [user]);

  const adjustStock = useCallback(async (id: string, quantity: number) => {
    const updatedAt = new Date().toISOString();
    let newStock = 0;
    setProducts(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          newStock = Math.max(0, p.stock + quantity);
          return { ...p, stock: newStock, updatedAt };
        }
        return p;
      });
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'update', payload: { id, stock: newStock, updated_at: updatedAt } }).catch(() => {});
    }
  }, [user]);

  const toggleMarketplace = useCallback(async (id: string) => {
    const updatedAt = new Date().toISOString();
    let newIsMarketplace = false;
    setProducts(prev => {
      const next = prev.map(p => {
        if (p.id === id) {
          newIsMarketplace = !p.isMarketplace;
          return { ...p, isMarketplace: newIsMarketplace, updatedAt };
        }
        return p;
      });
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'update', payload: { id, is_marketplace: newIsMarketplace, updated_at: updatedAt } }).catch(() => {});
    }
  }, [user]);

  const updateMarketplaceListing = useCallback(async (id: string, listing: MarketplaceListing) => {
    const updatedAt = new Date().toISOString();
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, marketplaceListing: listing, isMarketplace: true, updatedAt } : p
      );
      saveProducts(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'products', operation: 'update', payload: { id, marketplace_listing: listing, is_marketplace: true, updated_at: updatedAt } }).catch(() => {});
    }
  }, [user]);

  const addToCart = useCallback((product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  }, []);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId));
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const cartTotal = useMemo(() =>
    cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart]
  );

  const cartItemCount = useMemo(() =>
    cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const completeSale = useCallback(async (
    amountPaid: number,
    isCredit: boolean = false,
    customerName: string | null = null,
    paymentMethod: PaymentMethod = 'cash',
    cashAmount: number = amountPaid,
    transferAmount: number = 0,
    paymentId: string | null = null,
    gatewayProvider: PaymentGateway | null = null,
  ) => {
    const saleItems: SaleItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice ?? undefined,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity,
    }));

    const total = saleItems.reduce((sum, item) => sum + item.subtotal, 0);
    const sale: Sale = {
      id: Crypto.randomUUID(),
      items: saleItems,
      total,
      amountPaid,
      change: Math.max(0, amountPaid - total),
      cashAmount,
      transferAmount,
      paymentMethod,
      isCredit,
      customerName,
      staffId: user?.id ?? null,
      staffName: user?.name ?? null,
      paymentId,
      gatewayProvider,
      createdAt: new Date().toISOString(),
    };

    const updatedAt = new Date().toISOString();
    const stockUpdates: { id: string; stock: number }[] = [];

    setProducts(prev => {
      const next = prev.map(p => {
        const cartItem = cart.find(ci => ci.product.id === p.id);
        if (cartItem) {
          const newStock = Math.max(0, p.stock - cartItem.quantity);
          stockUpdates.push({ id: p.id, stock: newStock });
          return { ...p, stock: newStock, updatedAt };
        }
        return p;
      });
      saveProducts(next);
      // Check for low stock after update
      next.forEach(p => {
        if (p.stock <= p.lowStockThreshold && p.stock >= 0) {
          scheduleLocalNotification(
            '⚠ Low Stock Alert',
            `${p.name} is low (${p.stock} left)`,
            { productId: p.id, type: 'low_stock' },
          ).catch(() => {});
        }
      });
      return next;
    });

    setSales(prev => {
      const next = [sale, ...prev];
      saveSales(next);
      return next;
    });

    // Enqueue sale + stock updates for sync
    if (user?.shop_id) {
      enqueueSync({ table: 'sales', operation: 'insert', payload: toSupabaseSale(sale) }).catch(() => {});
      stockUpdates.forEach(({ id, stock }) => {
        enqueueSync({ table: 'products', operation: 'update', payload: { id, stock, updated_at: updatedAt } }).catch(() => {});
      });
    }

    setCart([]);
    return sale;
  }, [cart, user]);

  const addOrder = useCallback(async (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newOrder: Order = {
      ...order,
      id: Crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    setOrders(prev => {
      const next = [newOrder, ...prev];
      saveOrders(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'orders', operation: 'insert', payload: toSupabaseOrder(newOrder) }).catch(() => {});
    }
  }, [user]);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    const updatedAt = new Date().toISOString();
    setOrders(prev => {
      const next = prev.map(o =>
        o.id === id ? { ...o, status, updatedAt } : o
      );
      saveOrders(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'orders', operation: 'update', payload: { id, status, updated_at: updatedAt } }).catch(() => {});
    }
  }, [user]);

  const deleteOrder = useCallback(async (id: string) => {
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      saveOrders(next);
      return next;
    });
    if (user?.shop_id) {
      enqueueSync({ table: 'orders', operation: 'delete', payload: { id } }).catch(() => {});
    }
  }, [user]);

  const addStaffMember = useCallback(async (member: Omit<StaffMember, 'id' | 'createdAt' | 'activityLog'>) => {
    const newMember: StaffMember = {
      ...member,
      id: Crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      activityLog: [],
    };
    setStaff(prev => {
      const next = [newMember, ...prev];
      saveStaff(next);
      return next;
    });
  }, []);

  const updateStaffMember = useCallback(async (id: string, updates: Partial<StaffMember>) => {
    setStaff(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...updates } : s);
      saveStaff(next);
      return next;
    });
  }, []);

  const deleteStaffMember = useCallback(async (id: string) => {
    setStaff(prev => {
      const next = prev.filter(s => s.id !== id);
      saveStaff(next);
      return next;
    });
  }, []);

  const logStaffActivity = useCallback(async (staffId: string, action: string, details: string) => {
    setStaff(prev => {
      const next = prev.map(s => {
        if (s.id !== staffId) return s;
        return {
          ...s,
          activityLog: [
            { id: Crypto.randomUUID(), action, details, timestamp: new Date().toISOString() },
            ...s.activityLog.slice(0, 99),
          ],
        };
      });
      saveStaff(next);
      return next;
    });
  }, []);

  const updateShopProfile = useCallback(async (updates: Partial<ShopProfile>) => {
    setShopProfile(prev => {
      const next = { ...prev, ...updates };
      saveShopProfile(next);
      if (updates.language) {
        i18n.changeLanguage(updates.language);
      }
      return next;
    });
    // Sync all shop fields directly to Supabase shops table (not via offline queue)
    if (user?.shop_id) {
      const next = { ...shopProfile, ...updates };
      const va = next.virtualAccount;
      supabase.from('shops').update({
        name: next.name,
        bio: next.bio,
        slug: next.slug,
        phone: next.phone,
        address: next.address,
        accent_color: next.accentColor,
        delivery_radius: next.deliveryRadius,
        opening_hours: next.openingHours,
        language: next.language,
        virtual_account_provider: va?.provider ?? null,
        virtual_account_number: va?.accountNumber ?? null,
        virtual_account_bank_name: va?.bankName ?? null,
        virtual_account_account_name: va?.accountName ?? null,
        virtual_account_is_active: va?.isActive ?? false,
      }).eq('id', user.shop_id).then(() => {}).catch(() => {});
    }
  }, [user, shopProfile]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = { ...data, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
    setExpenses(prev => {
      const next = [newExpense, ...prev];
      saveExpenses(next);
      return next;
    });
  }, []);

  const deleteExpense = useCallback(async (id: string) => {
    setExpenses(prev => {
      const next = prev.filter(e => e.id !== id);
      saveExpenses(next);
      return next;
    });
  }, []);

  const todaySales = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return sales.filter(s => dayjs(s.createdAt).format('YYYY-MM-DD') === today);
  }, [sales]);

  const todayRevenue = useMemo(() =>
    todaySales.reduce((sum, s) => sum + s.total, 0),
    [todaySales]
  );

  const todayItemsSold = useMemo(() =>
    todaySales.reduce((sum, s) => sum + s.items.reduce((iSum, item) => iSum + item.quantity, 0), 0),
    [todaySales]
  );

  const lowStockProducts = useMemo(() =>
    products.filter(p => p.stock <= p.lowStockThreshold),
    [products]
  );

  const marketplaceProducts = useMemo(() =>
    products.filter(p => p.isMarketplace),
    [products]
  );

  const getSalesByDateRange = useCallback((start: string, end: string) => {
    return sales.filter(s => {
      const date = dayjs(s.createdAt);
      return date.isAfter(dayjs(start).subtract(1, 'day')) && date.isBefore(dayjs(end).add(1, 'day'));
    });
  }, [sales]);

  const value = useMemo(() => ({
    products, sales, orders, staff, shopProfile, cart, isLoading,
    isSyncing, lastSyncAt, syncNow, reloadData,
    addProduct, updateProduct, deleteProduct, adjustStock,
    toggleMarketplace, updateMarketplaceListing,
    addToCart, removeFromCart, updateCartQuantity, clearCart, completeSale,
    addOrder, updateOrderStatus, deleteOrder,
    addStaffMember, updateStaffMember, deleteStaffMember, logStaffActivity,
    updateShopProfile,
    expenses, addExpense, deleteExpense,
    cartTotal, cartItemCount, todaySales, todayRevenue, todayItemsSold,
    lowStockProducts, marketplaceProducts, getSalesByDateRange,
  }), [products, sales, orders, staff, shopProfile, cart, isLoading,
    isSyncing, lastSyncAt, syncNow, reloadData,
    addProduct, updateProduct, deleteProduct, adjustStock,
    toggleMarketplace, updateMarketplaceListing,
    addToCart, removeFromCart, updateCartQuantity, clearCart, completeSale,
    addOrder, updateOrderStatus, deleteOrder,
    addStaffMember, updateStaffMember, deleteStaffMember, logStaffActivity,
    updateShopProfile,
    expenses, addExpense, deleteExpense,
    cartTotal, cartItemCount, todaySales, todayRevenue, todayItemsSold,
    lowStockProducts, marketplaceProducts, getSalesByDateRange]);

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) throw new Error('useShop must be used within ShopProvider');
  return ctx;
}
