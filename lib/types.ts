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
