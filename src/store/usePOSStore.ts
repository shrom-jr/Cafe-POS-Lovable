import { create } from 'zustand';
import { db } from '@/storage/db';
import { CafeTable, Category, MenuItem, Order, Payment, Settings } from '@/types/pos';

db.seed();

interface POSState {
  tables: CafeTable[];
  categories: Category[];
  menuItems: MenuItem[];
  orders: Order[];
  payments: Payment[];
  settings: Settings;

  addTable: (number: number) => void;
  updateTable: (id: string, updates: Partial<CafeTable>) => void;
  deleteTable: (id: string) => void;
  resetTable: (id: string) => void;

  addCategory: (name: string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  getActiveOrder: (tableId: string) => Order | undefined;
  createOrder: (tableId: string, tableNumber: number) => Order;
  addItemToOrder: (orderId: string, item: MenuItem) => void;
  updateItemQuantity: (orderId: string, menuItemId: string, delta: number) => void;
  removeItemFromOrder: (orderId: string, menuItemId: string) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  clearOrder: (orderId: string) => void;

  addPayment: (payment: Omit<Payment, 'id'>) => void;

  updateSettings: (updates: Partial<Settings>) => void;
  getNextBillNumber: () => number;

  exportData: () => string;
  importData: (json: string) => void;
  factoryReset: () => void;
}

export const usePOSStore = create<POSState>((set, get) => ({
  tables: db.getTables(),
  categories: db.getCategories(),
  menuItems: db.getMenuItems(),
  orders: db.getOrders(),
  payments: db.getPayments(),
  settings: db.getSettings(),

  addTable: (number) => {
    set((state) => {
      const tables = [...state.tables, { id: crypto.randomUUID(), number, status: 'free' as const }];
      db.saveTables(tables);
      return { tables };
    });
  },

  updateTable: (id, updates) => {
    set((state) => {
      const tables = state.tables.map((t) => (t.id === id ? { ...t, ...updates } : t));
      db.saveTables(tables);
      return { tables };
    });
  },

  deleteTable: (id) => {
    set((state) => {
      const tables = state.tables.filter((t) => t.id !== id);
      db.saveTables(tables);
      return { tables };
    });
  },

  resetTable: (id) => {
    set((state) => {
      const tables = state.tables.map((t) =>
        t.id === id ? { ...t, status: 'free' as const, orderId: undefined, orderStartTime: undefined } : t
      );
      const orders = state.orders.map((o) =>
        o.tableId === id && (o.status === 'active' || o.status === 'billed')
          ? { ...o, status: 'paid' as const }
          : o
      );
      db.saveTables(tables);
      db.saveOrders(orders);
      return { tables, orders };
    });
  },

  addCategory: (name) => {
    set((state) => {
      const categories = [...state.categories, { id: crypto.randomUUID(), name, order: state.categories.length + 1 }];
      db.saveCategories(categories);
      return { categories };
    });
  },

  updateCategory: (id, updates) => {
    set((state) => {
      const categories = state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c));
      db.saveCategories(categories);
      return { categories };
    });
  },

  deleteCategory: (id) => {
    set((state) => {
      const categories = state.categories.filter((c) => c.id !== id);
      db.saveCategories(categories);
      return { categories };
    });
  },

  addMenuItem: (item) => {
    set((state) => {
      const menuItems = [...state.menuItems, { ...item, id: crypto.randomUUID() }];
      db.saveMenuItems(menuItems);
      return { menuItems };
    });
  },

  updateMenuItem: (id, updates) => {
    set((state) => {
      const menuItems = state.menuItems.map((m) => (m.id === id ? { ...m, ...updates } : m));
      db.saveMenuItems(menuItems);
      return { menuItems };
    });
  },

  deleteMenuItem: (id) => {
    set((state) => {
      const menuItems = state.menuItems.filter((m) => m.id !== id);
      db.saveMenuItems(menuItems);
      return { menuItems };
    });
  },

  getActiveOrder: (tableId) => {
    return get().orders.find(
      (o) => o.tableId === tableId && (o.status === 'active' || o.status === 'billed')
    );
  },

  createOrder: (tableId, tableNumber) => {
    const existing = get().getActiveOrder(tableId);
    if (existing) return existing;

    const order: Order = {
      id: crypto.randomUUID(),
      tableId,
      tableNumber,
      items: [],
      status: 'active',
      createdAt: Date.now(),
    };

    set((state) => {
      const orders = [...state.orders, order];
      const tables = state.tables.map((t) =>
        t.id === tableId
          ? { ...t, status: 'occupied' as const, orderId: order.id, orderStartTime: Date.now() }
          : t
      );
      db.saveOrders(orders);
      db.saveTables(tables);
      return { orders, tables };
    });

    return order;
  },

  addItemToOrder: (orderId, item) => {
    set((state) => {
      const orders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        const existing = o.items.find((i) => i.menuItemId === item.id);
        if (existing) {
          return {
            ...o,
            items: o.items.map((i) =>
              i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
            ),
          };
        }
        return {
          ...o,
          items: [...o.items, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }],
        };
      });
      db.saveOrders(orders);
      return { orders };
    });
  },

  updateItemQuantity: (orderId, menuItemId, delta) => {
    set((state) => {
      let updatedOrders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        const items = o.items
          .map((i) => (i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i))
          .filter((i) => i.quantity > 0);
        return { ...o, items };
      });

      const order = updatedOrders.find((o) => o.id === orderId);
      let tables = state.tables;

      if (order && order.items.length === 0) {
        tables = state.tables.map((t) =>
          t.id === order.tableId
            ? { ...t, status: 'free' as const, orderId: undefined, orderStartTime: undefined }
            : t
        );
        updatedOrders = updatedOrders.filter((o) => o.id !== orderId);
        db.saveTables(tables);
      }

      db.saveOrders(updatedOrders);
      return { orders: updatedOrders, tables };
    });
  },

  removeItemFromOrder: (orderId, menuItemId) => {
    set((state) => {
      let updatedOrders = state.orders.map((o) => {
        if (o.id !== orderId) return o;
        return { ...o, items: o.items.filter((i) => i.menuItemId !== menuItemId) };
      });

      const order = updatedOrders.find((o) => o.id === orderId);
      let tables = state.tables;

      if (order && order.items.length === 0) {
        tables = state.tables.map((t) =>
          t.id === order.tableId
            ? { ...t, status: 'free' as const, orderId: undefined, orderStartTime: undefined }
            : t
        );
        updatedOrders = updatedOrders.filter((o) => o.id !== orderId);
        db.saveTables(tables);
      }

      db.saveOrders(updatedOrders);
      return { orders: updatedOrders, tables };
    });
  },

  updateOrderStatus: (orderId, status) => {
    set((state) => {
      const orders = state.orders.map((o) => (o.id === orderId ? { ...o, status } : o));
      db.saveOrders(orders);
      return { orders };
    });
  },

  clearOrder: (orderId) => {
    set((state) => {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) return {};
      const orders = state.orders.filter((o) => o.id !== orderId);
      const tables = state.tables.map((t) =>
        t.id === order.tableId
          ? { ...t, status: 'free' as const, orderId: undefined, orderStartTime: undefined }
          : t
      );
      db.saveOrders(orders);
      db.saveTables(tables);
      return { orders, tables };
    });
  },

  addPayment: (payment) => {
    set((state) => {
      const payments = [...state.payments, { ...payment, id: crypto.randomUUID() }];
      db.savePayments(payments);
      return { payments };
    });
  },

  updateSettings: (updates) => {
    set((state) => {
      const settings = { ...state.settings, ...updates };
      db.saveSettings(settings);
      return { settings };
    });
  },

  getNextBillNumber: () => {
    const next = get().settings.billCounter + 1;
    set((state) => {
      const settings = { ...state.settings, billCounter: next };
      db.saveSettings(settings);
      return { settings };
    });
    return next;
  },

  exportData: () => db.exportAll(),

  importData: (json) => {
    db.importAll(json);
    set({
      tables: db.getTables(),
      categories: db.getCategories(),
      menuItems: db.getMenuItems(),
      orders: db.getOrders(),
      payments: db.getPayments(),
      settings: db.getSettings(),
    });
  },

  factoryReset: () => {
    db.clearAll();
    db.seed();
    set({
      tables: db.getTables(),
      categories: db.getCategories(),
      menuItems: db.getMenuItems(),
      orders: db.getOrders(),
      payments: db.getPayments(),
      settings: db.getSettings(),
    });
  },
}));
