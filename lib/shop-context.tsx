import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';
import i18n from './i18n';
import { Product, Sale, CartItem, SaleItem, Order, OrderStatus, StaffMember, StaffRole, ShopProfile, MarketplaceListing } from './types';
import {
  loadProducts, saveProducts,
  loadSales, saveSales,
  loadOrders, saveOrders,
  loadStaff, saveStaff,
  loadShopProfile, saveShopProfile,
} from './storage';

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
  completeSale: (amountPaid: number, isCredit?: boolean, customerName?: string | null) => Promise<Sale>;

  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateOrderStatus: (id: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;

  addStaffMember: (member: Omit<StaffMember, 'id' | 'createdAt' | 'activityLog'>) => Promise<void>;
  updateStaffMember: (id: string, updates: Partial<StaffMember>) => Promise<void>;
  deleteStaffMember: (id: string) => Promise<void>;
  logStaffActivity: (staffId: string, action: string, details: string) => Promise<void>;

  updateShopProfile: (updates: Partial<ShopProfile>) => Promise<void>;

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
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s, o, st, sp] = await Promise.all([
        loadProducts(),
        loadSales(),
        loadOrders(),
        loadStaff(),
        loadShopProfile(),
      ]);
      setProducts(p);
      setSales(s);
      setOrders(o);
      setStaff(st);
      setShopProfile(sp);
      if (sp.language) {
        i18n.changeLanguage(sp.language);
      }
      setIsLoading(false);
    })();
  }, []);

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
  }, []);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>) => {
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
      );
      saveProducts(next);
      return next;
    });
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    setProducts(prev => {
      const next = prev.filter(p => p.id !== id);
      saveProducts(next);
      return next;
    });
  }, []);

  const adjustStock = useCallback(async (id: string, quantity: number) => {
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, stock: Math.max(0, p.stock + quantity), updatedAt: new Date().toISOString() } : p
      );
      saveProducts(next);
      return next;
    });
  }, []);

  const toggleMarketplace = useCallback(async (id: string) => {
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, isMarketplace: !p.isMarketplace, updatedAt: new Date().toISOString() } : p
      );
      saveProducts(next);
      return next;
    });
  }, []);

  const updateMarketplaceListing = useCallback(async (id: string, listing: MarketplaceListing) => {
    setProducts(prev => {
      const next = prev.map(p =>
        p.id === id ? { ...p, marketplaceListing: listing, isMarketplace: true, updatedAt: new Date().toISOString() } : p
      );
      saveProducts(next);
      return next;
    });
  }, []);

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

  const completeSale = useCallback(async (amountPaid: number, isCredit: boolean = false, customerName: string | null = null) => {
    const saleItems: SaleItem[] = cart.map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      price: item.product.price,
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
      isCredit,
      customerName,
      createdAt: new Date().toISOString(),
    };

    setProducts(prev => {
      const next = prev.map(p => {
        const cartItem = cart.find(ci => ci.product.id === p.id);
        if (cartItem) {
          return { ...p, stock: Math.max(0, p.stock - cartItem.quantity), updatedAt: new Date().toISOString() };
        }
        return p;
      });
      saveProducts(next);
      return next;
    });

    setSales(prev => {
      const next = [sale, ...prev];
      saveSales(next);
      return next;
    });

    setCart([]);
    return sale;
  }, [cart]);

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
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: OrderStatus) => {
    setOrders(prev => {
      const next = prev.map(o =>
        o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o
      );
      saveOrders(next);
      return next;
    });
  }, []);

  const deleteOrder = useCallback(async (id: string) => {
    setOrders(prev => {
      const next = prev.filter(o => o.id !== id);
      saveOrders(next);
      return next;
    });
  }, []);

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
    addProduct, updateProduct, deleteProduct, adjustStock,
    toggleMarketplace, updateMarketplaceListing,
    addToCart, removeFromCart, updateCartQuantity, clearCart, completeSale,
    addOrder, updateOrderStatus, deleteOrder,
    addStaffMember, updateStaffMember, deleteStaffMember, logStaffActivity,
    updateShopProfile,
    cartTotal, cartItemCount, todaySales, todayRevenue, todayItemsSold,
    lowStockProducts, marketplaceProducts, getSalesByDateRange,
  }), [products, sales, orders, staff, shopProfile, cart, isLoading,
    addProduct, updateProduct, deleteProduct, adjustStock,
    toggleMarketplace, updateMarketplaceListing,
    addToCart, removeFromCart, updateCartQuantity, clearCart, completeSale,
    addOrder, updateOrderStatus, deleteOrder,
    addStaffMember, updateStaffMember, deleteStaffMember, logStaffActivity,
    updateShopProfile,
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
