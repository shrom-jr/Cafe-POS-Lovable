import { CafeTable, Category, Ingredient, MenuItem, Order, Payment, Recipe, Settings } from '@/types/pos';

const KEYS = {
  tables: 'pos_tables',
  categories: 'pos_categories',
  menuItems: 'pos_menuItems',
  orders: 'pos_orders',
  payments: 'pos_payments',
  settings: 'pos_settings',
  ingredients: 'pos_ingredients',
  recipes: 'pos_recipes',
};

function get<T>(key: string, fallback: T): T {
  try {
    const d = localStorage.getItem(key);
    return d ? JSON.parse(d) : fallback;
  } catch {
    return fallback;
  }
}

function set(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val));
}

const defaultTables: CafeTable[] = Array.from({ length: 8 }, (_, i) => ({
  id: `table-${i + 1}`,
  number: i + 1,
  status: 'free' as const,
}));

const defaultCategories: Category[] = [
  { id: 'cat-hot', name: 'Hot Drinks', order: 1 },
  { id: 'cat-cold', name: 'Cold Drinks', order: 2 },
  { id: 'cat-pastry', name: 'Pastries', order: 3 },
  { id: 'cat-snack', name: 'Snacks', order: 4 },
];

const defaultMenuItems: MenuItem[] = [
  { id: 'mi-1', categoryId: 'cat-hot', name: 'Espresso', price: 150 },
  { id: 'mi-2', categoryId: 'cat-hot', name: 'Americano', price: 180 },
  { id: 'mi-3', categoryId: 'cat-hot', name: 'Cappuccino', price: 250 },
  { id: 'mi-4', categoryId: 'cat-hot', name: 'Latte', price: 280 },
  { id: 'mi-5', categoryId: 'cat-hot', name: 'Mocha', price: 300 },
  { id: 'mi-6', categoryId: 'cat-hot', name: 'Hot Chocolate', price: 220 },
  { id: 'mi-7', categoryId: 'cat-hot', name: 'Macchiato', price: 200 },
  { id: 'mi-8', categoryId: 'cat-cold', name: 'Iced Latte', price: 300 },
  { id: 'mi-9', categoryId: 'cat-cold', name: 'Iced Americano', price: 220 },
  { id: 'mi-10', categoryId: 'cat-cold', name: 'Cold Brew', price: 280 },
  { id: 'mi-11', categoryId: 'cat-cold', name: 'Mango Smoothie', price: 350 },
  { id: 'mi-12', categoryId: 'cat-cold', name: 'Berry Smoothie', price: 350 },
  { id: 'mi-13', categoryId: 'cat-cold', name: 'Iced Mocha', price: 320 },
  { id: 'mi-14', categoryId: 'cat-pastry', name: 'Croissant', price: 180 },
  { id: 'mi-15', categoryId: 'cat-pastry', name: 'Chocolate Muffin', price: 200 },
  { id: 'mi-16', categoryId: 'cat-pastry', name: 'Blueberry Scone', price: 220 },
  { id: 'mi-17', categoryId: 'cat-pastry', name: 'Cinnamon Roll', price: 250 },
  { id: 'mi-18', categoryId: 'cat-pastry', name: 'Bagel', price: 160 },
  { id: 'mi-19', categoryId: 'cat-snack', name: 'Club Sandwich', price: 350 },
  { id: 'mi-20', categoryId: 'cat-snack', name: 'Caesar Salad', price: 400 },
  { id: 'mi-21', categoryId: 'cat-snack', name: 'French Fries', price: 200 },
  { id: 'mi-22', categoryId: 'cat-snack', name: 'Garlic Bread', price: 180 },
  { id: 'mi-23', categoryId: 'cat-snack', name: 'Panini', price: 320 },
];

const defaultSettings: Settings = {
  cafeName: 'Café Brew',
  adminPin: '1234',
  esewaId: '',
  esewaPhone: '',
  wallets: {
    esewa: { enabled: true },
    khalti: { enabled: true },
    fonepay: { enabled: true },
  },
  customWallets: [],
  billCounter: 1000,
  vatEnabled: true,
  vatRate: 0.13,
  vatMode: 'excluded',
};

const SETTINGS_VERSION = 2;

function migrateSettings() {
  const versionKey = 'pos_settings_version';
  const storedVersion = parseInt(localStorage.getItem(versionKey) || '0', 10);
  if (storedVersion < SETTINGS_VERSION) {
    const raw = localStorage.getItem(KEYS.settings);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        parsed.wallets = {
          esewa: { ...(parsed.wallets?.esewa || {}), enabled: true },
          khalti: { ...(parsed.wallets?.khalti || {}), enabled: true },
          fonepay: { ...(parsed.wallets?.fonepay || {}), enabled: true },
        };
        localStorage.setItem(KEYS.settings, JSON.stringify(parsed));
      } catch {
      }
    }
    localStorage.setItem(versionKey, String(SETTINGS_VERSION));
  }
}

migrateSettings();

export const db = {
  getTables: (): CafeTable[] => get(KEYS.tables, defaultTables),
  saveTables: (t: CafeTable[]) => set(KEYS.tables, t),

  getCategories: (): Category[] => get(KEYS.categories, defaultCategories),
  saveCategories: (c: Category[]) => set(KEYS.categories, c),

  getMenuItems: (): MenuItem[] => get(KEYS.menuItems, defaultMenuItems),
  saveMenuItems: (m: MenuItem[]) => set(KEYS.menuItems, m),

  getOrders: (): Order[] => get(KEYS.orders, []),
  saveOrders: (o: Order[]) => set(KEYS.orders, o),

  getPayments: (): Payment[] => get(KEYS.payments, []),
  savePayments: (p: Payment[]) => set(KEYS.payments, p),

  getIngredients: (): Ingredient[] => get(KEYS.ingredients, []),
  saveIngredients: (i: Ingredient[]) => set(KEYS.ingredients, i),

  getRecipes: (): Recipe[] => get(KEYS.recipes, []),
  saveRecipes: (r: Recipe[]) => set(KEYS.recipes, r),

  getSettings: (): Settings => {
    const stored = get<Partial<Settings>>(KEYS.settings, defaultSettings);
    return {
      ...defaultSettings,
      ...stored,
      wallets: {
        ...defaultSettings.wallets,
        ...stored?.wallets,
      },
    };
  },
  saveSettings: (s: Settings) => set(KEYS.settings, s),

  exportAll: () => {
    const data: Record<string, string | null> = {};
    Object.entries(KEYS).forEach(([k, v]) => {
      data[k] = localStorage.getItem(v);
    });
    return JSON.stringify(data, null, 2);
  },

  importAll: (json: string) => {
    const data = JSON.parse(json);
    Object.entries(KEYS).forEach(([k, v]) => {
      if (data[k]) localStorage.setItem(v, typeof data[k] === 'string' ? data[k] : JSON.stringify(data[k]));
    });
  },

  seed: () => {
    if (!localStorage.getItem('pos_initialized')) {
      set(KEYS.tables, defaultTables);
      set(KEYS.categories, defaultCategories);
      set(KEYS.menuItems, defaultMenuItems);
      set(KEYS.orders, []);
      set(KEYS.payments, []);
      set(KEYS.settings, defaultSettings);
      localStorage.setItem('pos_initialized', 'true');
    }
  },

  clearAll: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem('pos_initialized');
  },
};
