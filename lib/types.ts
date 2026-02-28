export interface Product {
  id: string;
  name: string;
  price: number;
  costPrice: number | null;
  unit: string | null;
  stock: number;
  lowStockThreshold: number;
  imageUri: string | null;
  category: string;
  barcode: string | null;
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

export type PaymentMethod = 'cash' | 'transfer' | 'split' | 'gateway';
export type PaymentGateway = 'moniepoint' | 'opay' | 'palmpay';

export interface VirtualAccount {
  provider: PaymentGateway;
  accountNumber: string;
  bankName: string;
  accountName: string;
  isActive: boolean;
}

export interface PaymentRecord {
  id: string;
  shop_id: string;
  sale_id: string | null;
  order_id: string | null;
  provider: PaymentGateway;
  reference: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
  raw_payload: Record<string, unknown>;
  created_at: string;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  amountPaid: number;
  change: number;
  cashAmount: number;
  transferAmount: number;
  paymentMethod: PaymentMethod;
  isCredit: boolean;
  customerName: string | null;
  staffId: string | null;
  staffName: string | null;
  paymentId: string | null;
  gatewayProvider: PaymentGateway | null;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  price: number;
  costPrice?: number;
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

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;      // YYYY-MM-DD
  notes: string;
  createdAt: string; // ISO, for sort order
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
  virtualAccount: VirtualAccount | null;
}

export interface DayHours {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

// --- Auth & User types ---

export interface UserProfile {
  id: string;
  name: string;
  role: StaffRole;
  shop_id: string | null;
  is_active: boolean;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  shop?: ShopRecord | null;
}

// Supabase-side shop record (snake_case, from DB)
export interface ShopRecord {
  id: string;
  name: string;
  bio: string;
  logo_url: string | null;
  banner_url: string | null;
  accent_color: string;
  slug: string;
  phone: string;
  address: string;
  delivery_radius: number;
  opening_hours: DayHours[];
  language: 'en' | 'ha';
  owner_id: string;
}

export interface StaffPermissions {
  id: string;
  staff_id: string;
  shop_id: string;
  can_access_dashboard: boolean;
  can_access_products: boolean;
  can_access_marketplace: boolean;
  can_access_orders: boolean;
  can_access_sales: boolean;
  can_access_reports: boolean;
  can_access_staff: boolean;
  can_access_settings: boolean;
  updated_at: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  notificationsEnabled: boolean;
}

// Offline sync queue
export type SyncOperation = 'insert' | 'update' | 'delete';
export type SyncTable = 'products' | 'sales' | 'orders' | 'payments';

export interface SyncQueueItem {
  id: string;
  table: SyncTable;
  operation: SyncOperation;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

// Staff invitation
export interface StaffInvitation {
  id: string;
  shop_id: string;
  invitee_email: string;
  role: StaffRole;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_by: string;
}
