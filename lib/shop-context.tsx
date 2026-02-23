import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import * as Crypto from 'expo-crypto';
import dayjs from 'dayjs';
import { Product, Sale, CartItem, SaleItem } from './types';
import { loadProducts, saveProducts, loadSales, saveSales } from './storage';

interface ShopContextValue {
  products: Product[];
  sales: Sale[];
  cart: CartItem[];
  isLoading: boolean;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (id: string, quantity: number) => Promise<void>;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  completeSale: (amountPaid: number, isCredit?: boolean, customerName?: string | null) => Promise<Sale>;
  cartTotal: number;
  cartItemCount: number;
  todaySales: Sale[];
  todayRevenue: number;
  todayItemsSold: number;
  lowStockProducts: Product[];
  getSalesByDateRange: (start: string, end: string) => Sale[];
}

const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [p, s] = await Promise.all([loadProducts(), loadSales()]);
      setProducts(p);
      setSales(s);
      setIsLoading(false);
    })();
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...product,
      id: Crypto.randomUUID(),
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

  const getSalesByDateRange = useCallback((start: string, end: string) => {
    return sales.filter(s => {
      const date = dayjs(s.createdAt);
      return date.isAfter(dayjs(start).subtract(1, 'day')) && date.isBefore(dayjs(end).add(1, 'day'));
    });
  }, [sales]);

  const value = useMemo(() => ({
    products,
    sales,
    cart,
    isLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    adjustStock,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    completeSale,
    cartTotal,
    cartItemCount,
    todaySales,
    todayRevenue,
    todayItemsSold,
    lowStockProducts,
    getSalesByDateRange,
  }), [products, sales, cart, isLoading, addProduct, updateProduct, deleteProduct, adjustStock, addToCart, removeFromCart, updateCartQuantity, clearCart, completeSale, cartTotal, cartItemCount, todaySales, todayRevenue, todayItemsSold, lowStockProducts, getSalesByDateRange]);

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
