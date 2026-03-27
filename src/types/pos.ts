export interface CafeTable {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'billing';
  orderId?: string;
  orderStartTime?: number;
  pax?: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  price: number;
  image?: string;
}

export interface OrderItem {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  status?: 'unpaid' | 'paid';
  paidAt?: number;
  sentToKitchen?: boolean;
}

export interface TablePayment {
  id: string;
  itemIds: string[];
  total: number;
  method: string;
  timestamp: number;
  billNumber: number;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'active' | 'billed' | 'paid';
  kitchenStatus?: 'draft' | 'placed';
  hasUnsentItems?: boolean;
  createdAt: number;
  tablePayments?: TablePayment[];
}

export interface Payment {
  id: string;
  orderId: string;
  tableNumber: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'fixed';
  vatAmount: number;
  vatRate: number;
  vatMode: 'excluded' | 'included';
  vatEnabled?: boolean;
  total: number;
  method: string;
  reference: string;
  createdAt: number;
  cafeName: string;
  billNumber: number;
}

export interface WalletConfig {
  enabled: boolean;
  qrImage?: string;
  logoImage?: string;
}

export interface CustomWallet {
  id: string;
  name: string;
  enabled: boolean;
  qrImage?: string;
  logoImage?: string;
}

export interface Settings {
  cafeName: string;
  cafeLogo?: string;
  cafeAddress?: string;
  cafePhone?: string;
  cafePan?: string;
  billFooter?: string;
  adminPin: string;
  esewaId: string;
  esewaPhone: string;
  wallets: {
    esewa: WalletConfig;
    khalti: WalletConfig;
    fonepay: WalletConfig;
  };
  customWallets?: CustomWallet[];
  printerAddress?: string;
  billCounter: number;
  vatEnabled: boolean;
  vatRate: number;
  vatMode: 'excluded' | 'included';
}
