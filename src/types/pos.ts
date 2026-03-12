export interface CafeTable {
  id: string;
  number: number;
  status: 'free' | 'occupied' | 'billing';
  orderId?: string;
  orderStartTime?: number;
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
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableId: string;
  tableNumber: number;
  items: OrderItem[];
  status: 'active' | 'billed' | 'paid';
  createdAt: number;
}

export interface Payment {
  id: string;
  orderId: string;
  tableNumber: number;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  discountType: 'percent' | 'fixed';
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
}

export interface Settings {
  cafeName: string;
  adminPin: string;
  esewaId: string;
  esewaPhone: string;
  wallets: {
    esewa: WalletConfig;
    khalti: WalletConfig;
    fonepay: WalletConfig;
  };
  printerAddress?: string;
  billCounter: number;
}
