import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/storage/db';
import { CafeTable, Category, MenuItem, Order, OrderItem, Payment, Settings } from '@/types/pos';

interface POSContextType {
  tables: CafeTable[];
  addTable: (number: number) => void;
  updateTable: (id: string, updates: Partial<CafeTable>) => void;
  deleteTable: (id: string) => void;
  resetTable: (id: string) => void;

  categories: Category[];
  addCategory: (name: string) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;

  orders: Order[];
  getActiveOrder: (tableId: string) => Order | undefined;
  createOrder: (tableId: string, tableNumber: number) => Order;
  addItemToOrder: (orderId: string, item: MenuItem) => void;
  updateItemQuantity: (orderId: string, menuItemId: string, delta: number) => void;
  removeItemFromOrder: (orderId: string, menuItemId: string) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;

  payments: Payment[];
  addPayment: (payment: Omit<Payment, 'id'>) => void;

  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  getNextBillNumber: () => number;

  exportData: () => string;
  importData: (json: string) => void;
  factoryReset: () => void;
}

const POSContext = createContext<POSContextType | null>(null);

export const usePOS = () => {
  const ctx = useContext(POSContext);
  if (!ctx) throw new Error('usePOS must be used within POSProvider');
  return ctx;
};

export const POSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => { db.seed(); }, []);

  const [tables, setTables] = useState<CafeTable[]>(() => db.getTables());
  const [categories, setCategories] = useState<Category[]>(() => db.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => db.getMenuItems());
  const [orders, setOrders] = useState<Order[]>(() => db.getOrders());
  const [payments, setPayments] = useState<Payment[]>(() => db.getPayments());
  const [settings, setSettings] = useState<Settings>(() => db.getSettings());

  useEffect(() => { db.saveTables(tables); }, [tables]);
  useEffect(() => { db.saveCategories(categories); }, [categories]);
  useEffect(() => { db.saveMenuItems(menuItems); }, [menuItems]);
  useEffect(() => { db.saveOrders(orders); }, [orders]);
  useEffect(() => { db.savePayments(payments); }, [payments]);
  useEffect(() => { db.saveSettings(settings); }, [settings]);

  const addTable = useCallback((number: number) => {
    setTables(prev => [...prev, { id: crypto.randomUUID(), number, status: 'free' }]);
  }, []);

  const updateTable = useCallback((id: string, updates: Partial<CafeTable>) => {
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTable = useCallback((id: string) => {
    setTables(prev => prev.filter(t => t.id !== id));
  }, []);

  const resetTable = useCallback((id: string) => {
    setTables(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'free' as const, orderId: undefined, orderStartTime: undefined } : t
    ));
    setOrders(prev => prev.map(o => {
      if (o.tableId === id && (o.status === 'active' || o.status === 'billed')) {
        return { ...o, status: 'paid' as const };
      }
      return o;
    }));
  }, []);

  const addCategory = useCallback((name: string) => {
    setCategories(prev => [...prev, { id: crypto.randomUUID(), name, order: prev.length + 1 }]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  }, []);

  const addMenuItem = useCallback((item: Omit<MenuItem, 'id'>) => {
    setMenuItems(prev => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

  const updateMenuItem = useCallback((id: string, updates: Partial<MenuItem>) => {
    setMenuItems(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  }, []);

  const deleteMenuItem = useCallback((id: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== id));
  }, []);

  const getActiveOrder = useCallback((tableId: string) => {
    return orders.find(o => o.tableId === tableId && (o.status === 'active' || o.status === 'billed'));
  }, [orders]);

  const createOrder = useCallback((tableId: string, tableNumber: number) => {
    const existing = orders.find(o => o.tableId === tableId && (o.status === 'active' || o.status === 'billed'));
    if (existing) return existing;
    const order: Order = {
      id: crypto.randomUUID(),
      tableId,
      tableNumber,
      items: [],
      status: 'active',
      createdAt: Date.now(),
    };
    setOrders(prev => [...prev, order]);
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, status: 'occupied' as const, orderId: order.id, orderStartTime: Date.now() } : t
    ));
    return order;
  }, [orders]);

  const addItemToOrder = useCallback((orderId: string, item: MenuItem) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const existing = o.items.find(i => i.menuItemId === item.id);
      if (existing) {
        return { ...o, items: o.items.map(i => i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i) };
      }
      return { ...o, items: [...o.items, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1 }] };
    }));
  }, []);

  const updateItemQuantity = useCallback((orderId: string, menuItemId: string, delta: number) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return {
        ...o,
        items: o.items
          .map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i)
          .filter(i => i.quantity > 0),
      };
    }));
  }, []);

  const removeItemFromOrder = useCallback((orderId: string, menuItemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      return { ...o, items: o.items.filter(i => i.menuItemId !== menuItemId) };
    }));
  }, []);

  const updateOrderStatus = useCallback((orderId: string, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>) => {
    setPayments(prev => [...prev, { ...payment, id: crypto.randomUUID() }]);
  }, []);

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  }, []);

  const getNextBillNumber = useCallback(() => {
    const next = settings.billCounter + 1;
    setSettings(prev => ({ ...prev, billCounter: next }));
    return next;
  }, [settings.billCounter]);

  const exportData = useCallback(() => db.exportAll(), []);
  const importData = useCallback((json: string) => {
    db.importAll(json);
    setTables(db.getTables());
    setCategories(db.getCategories());
    setMenuItems(db.getMenuItems());
    setOrders(db.getOrders());
    setPayments(db.getPayments());
    setSettings(db.getSettings());
  }, []);

  return (
    <POSContext.Provider value={{
      tables, addTable, updateTable, deleteTable, resetTable,
      categories, addCategory, updateCategory, deleteCategory,
      menuItems, addMenuItem, updateMenuItem, deleteMenuItem,
      orders, getActiveOrder, createOrder, addItemToOrder, updateItemQuantity, removeItemFromOrder, updateOrderStatus,
      payments, addPayment,
      settings, updateSettings, getNextBillNumber,
      exportData, importData,
    }}>
      {children}
    </POSContext.Provider>
  );
};
