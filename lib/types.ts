export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  imageUri: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
  isMarketplace: boolean;
  marketplaceListing?: MarketplaceListing | null;
}

export interface MarketplaceListing {
  title: string;
  description: string;
  photos: string[];
  location: string;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  amountPaid: number;
  change: number;
  isCredit: boolean;
  customerName: string | null;
  createdAt: string;
  staffId?: string | null;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface DailySummary {
  date: string;
  totalSales: number;
  totalRevenue: number;
  topProduct: string | null;
}

export type OrderStatus = 'new' | 'accepted' | 'preparing' | 'ready' | 'delivered';

export interface Order {
  id: string;
  items: SaleItem[];
  total: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  notes: string;
}

export type StaffRole = 'owner' | 'cashier' | 'stock_manager' | 'delivery';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  pin: string;
  isActive: boolean;
  createdAt: string;
  activityLog: StaffActivity[];
}

export interface StaffActivity {
  id: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ShopProfile {
  name: string;
  bio: string;
  logoUri: string | null;
  bannerUri: string | null;
  accentColor: string;
  slug: string;
  phone: string;
  address: string;
  openingHours: DayHours[];
  deliveryRadius: number;
  featuredProductIds: string[];
  language: 'en' | 'ha';
}

export interface DayHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}
