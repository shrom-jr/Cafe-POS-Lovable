import { useState, useRef } from 'react';
import { usePOSStore } from '@/store/usePOSStore';
import AppLayout from '@/components/ui/AppLayout';
import ReceiptPreview from '@/components/ReceiptPreview';
import { printer } from '@/utils/printer';
import {
  BarChart3, Coffee, UtensilsCrossed, CreditCard, Table2, TrendingUp, FileDown,
  Plus, Trash2, Edit3, Save, X, Lock, DollarSign, ShoppingCart,
  Printer, Download, Upload, Bluetooth, Smartphone, ToggleLeft, ToggleRight,
  Receipt, ImagePlus, Image,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfDay, subDays, startOfWeek, startOfMonth } from 'date-fns';

type AdminTab = 'dashboard' | 'menu' | 'tables' | 'payments' | 'bill' | 'reports' | 'backup';

const AdminPanel = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const settings = usePOSStore((s) => s.settings);

  const handlePinSubmit = () => {
    if (pin === settings.adminPin) {
      setAuthenticated(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  if (!authenticated) {
    return (
      <AppLayout title="Admin Panel">
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
          <div className="bg-card rounded-xl border border-border p-8 w-full max-w-sm space-y-4">
            <div className="text-center">
              <Lock size={40} className="mx-auto text-accent mb-3" />
              <h2 className="text-lg font-bold text-foreground">Admin Access</h2>
              <p className="text-sm text-muted-foreground mt-1">Enter PIN to continue</p>
            </div>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(false); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
              placeholder="Enter PIN"
              data-testid="input-admin-pin"
              className="w-full text-center text-2xl tracking-widest px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
            {pinError && <p className="text-danger text-sm text-center">Incorrect PIN</p>}
            <button
              onClick={handlePinSubmit}
              data-testid="button-unlock-admin"
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold transition-all active:scale-[0.98]"
            >
              Unlock
            </button>
            <p className="text-xs text-muted-foreground text-center">Default PIN: 1234</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={16} /> },
    { id: 'menu', label: 'Menu', icon: <Coffee size={16} /> },
    { id: 'tables', label: 'Tables', icon: <Table2 size={16} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={16} /> },
    { id: 'bill', label: 'Bill Design', icon: <Receipt size={16} /> },
    { id: 'reports', label: 'Reports', icon: <TrendingUp size={16} /> },
    { id: 'backup', label: 'Backup', icon: <FileDown size={16} /> },
  ];

  return (
    <AppLayout title="Admin Panel">
      <div className="flex-shrink-0 flex gap-1 p-3 overflow-x-auto border-b border-border bg-black/10">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            data-testid={`tab-admin-${t.id}`}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === t.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 max-w-4xl mx-auto">
          {activeTab === 'dashboard' && <DashboardSection />}
          {activeTab === 'menu' && <MenuSection />}
          {activeTab === 'tables' && <TablesSection />}
          {activeTab === 'payments' && <PaymentsSection />}
          {activeTab === 'bill' && <BillDesignSection />}
          {activeTab === 'reports' && <ReportsSection />}
          {activeTab === 'backup' && <BackupSection />}
        </div>
      </div>
    </AppLayout>
  );
};

// ====== DASHBOARD ======
const DashboardSection = () => {
  const payments = usePOSStore((s) => s.payments);
  const orders = usePOSStore((s) => s.orders);
  const today = startOfDay(new Date()).getTime();

  const todayPayments = payments.filter((p) => p.createdAt >= today);
  const todaySales = todayPayments.reduce((s, p) => s + p.total, 0);
  const todayOrders = todayPayments.length;
  const cashToday = todayPayments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.total, 0);
  const digitalToday = todaySales - cashToday;

  const itemCounts: Record<string, { name: string; count: number; revenue: number }> = {};
  todayPayments.forEach((p) => {
    p.items.forEach((i) => {
      if (!itemCounts[i.menuItemId]) itemCounts[i.menuItemId] = { name: i.name, count: 0, revenue: 0 };
      itemCounts[i.menuItemId].count += i.quantity;
      itemCounts[i.menuItemId].revenue += i.price * i.quantity;
    });
  });
  const topItems = Object.values(itemCounts).sort((a, b) => b.count - a.count).slice(0, 5);

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = startOfDay(subDays(new Date(), 6 - i));
    const dayEnd = startOfDay(subDays(new Date(), 5 - i));
    const daySales = payments
      .filter((p) => p.createdAt >= day.getTime() && p.createdAt < (i === 6 ? Date.now() : dayEnd.getTime()))
      .reduce((s, p) => s + p.total, 0);
    return { day: format(day, 'EEE'), sales: daySales };
  });

  const stats = [
    { label: "Today's Sales", value: `Rs. ${todaySales}`, icon: <DollarSign size={20} />, color: 'text-accent' },
    { label: 'Orders', value: todayOrders, icon: <ShoppingCart size={20} />, color: 'text-success' },
    { label: 'Cash', value: `Rs. ${cashToday}`, icon: <DollarSign size={20} />, color: 'text-highlight' },
    { label: 'Digital', value: `Rs. ${digitalToday}`, icon: <Smartphone size={20} />, color: 'text-foreground' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-bold text-foreground mb-4">Weekly Sales</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={last7}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 20%)" />
            <XAxis dataKey="day" stroke="hsl(0 0% 60%)" fontSize={12} />
            <YAxis stroke="hsl(0 0% 60%)" fontSize={12} />
            <Tooltip contentStyle={{ background: 'hsl(0 0% 12%)', border: '1px solid hsl(0 0% 20%)', borderRadius: '8px', color: '#fff' }} />
            <Bar dataKey="sales" fill="hsl(36 63% 48%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-bold text-foreground mb-3">Top Selling Items</h3>
        {topItems.length === 0 && <p className="text-sm text-muted-foreground">No sales today yet.</p>}
        <div className="space-y-2">
          {topItems.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50">
              <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">{i + 1}</span>
              <span className="flex-1 text-sm text-foreground">{item.name}</span>
              <span className="text-sm text-muted-foreground">{item.count} sold</span>
              <span className="text-sm font-medium text-accent">Rs. {item.revenue}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ====== HELPERS ======
const compressImage = (file: File, maxPx = 400): Promise<string> =>
  new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = maxPx;
      canvas.height = maxPx;
      const ctx = canvas.getContext('2d')!;
      const srcSize = Math.min(img.width, img.height);
      const sx = (img.width - srcSize) / 2;
      const sy = (img.height - srcSize) / 2;
      ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, maxPx, maxPx);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });

const ItemImageField = ({
  image,
  onChange,
  onRemove,
}: {
  image?: string;
  onChange: (dataUrl: string) => void;
  onRemove: () => void;
}) => {
  const [dragging, setDragging] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const compressed = await compressImage(file);
    onChange(compressed);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex items-center gap-3">
      {/* Preview / drop zone */}
      <label
        className={`relative w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden transition-colors flex-shrink-0
          ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 bg-secondary/50'}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {image ? (
          <img src={image} alt="Item" className="w-full h-full object-cover" />
        ) : (
          <Image size={20} className="text-muted-foreground" />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </label>

      {/* Actions */}
      <div className="flex flex-col gap-1.5">
        <label className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium cursor-pointer hover:bg-accent/15 hover:text-accent transition-colors">
          <Upload size={12} /> {image ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
        {image && (
          <button
            onClick={onRemove}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-danger/70 hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <X size={12} /> Remove
          </button>
        )}
      </div>
    </div>
  );
};

// ====== MENU MANAGEMENT ======
const MenuSection = () => {
  const categories = usePOSStore((s) => s.categories);
  const menuItems = usePOSStore((s) => s.menuItems);
  const addCategory = usePOSStore((s) => s.addCategory);
  const updateCategory = usePOSStore((s) => s.updateCategory);
  const deleteCategory = usePOSStore((s) => s.deleteCategory);
  const addMenuItem = usePOSStore((s) => s.addMenuItem);
  const updateMenuItem = usePOSStore((s) => s.updateMenuItem);
  const deleteMenuItem = usePOSStore((s) => s.deleteMenuItem);

  const [newCat, setNewCat] = useState('');
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [selectedCat, setSelectedCat] = useState(categories[0]?.id || '');
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImage, setItemImage] = useState<string | undefined>(undefined);
  const [editItem, setEditItem] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemImage, setEditItemImage] = useState<string | undefined>(undefined);

  const catItems = menuItems.filter((i) => i.categoryId === selectedCat);

  const handleAddItem = () => {
    if (itemName.trim() && Number(itemPrice) > 0 && selectedCat) {
      addMenuItem({ categoryId: selectedCat, name: itemName.trim(), price: Number(itemPrice), image: itemImage });
      setItemName(''); setItemPrice(''); setItemImage(undefined); setShowAddItem(false);
    }
  };

  const handleSaveEdit = () => {
    if (!editItem) return;
    updateMenuItem(editItem, { name: editItemName, price: Number(editItemPrice), image: editItemImage });
    setEditItem(null);
  };

  const startEdit = (item: typeof catItems[0]) => {
    setEditItem(item.id);
    setEditItemName(item.name);
    setEditItemPrice(String(item.price));
    setEditItemImage(item.image);
  };

  return (
    <div className="space-y-4">
      {/* Categories */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Categories</h3>
        <div className="flex gap-2">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="New category"
            data-testid="input-new-category"
            className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button
            onClick={() => { if (newCat.trim()) { addCategory(newCat.trim()); setNewCat(''); } }}
            data-testid="button-add-category"
            className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all ${selectedCat === c.id ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'}`}
            >
              {editCat === c.id ? (
                <>
                  <input
                    value={editCatName}
                    onChange={(e) => setEditCatName(e.target.value)}
                    className="bg-transparent border-b border-accent-foreground text-sm w-20 focus:outline-none"
                    autoFocus
                  />
                  <button onClick={() => { updateCategory(c.id, { name: editCatName }); setEditCat(null); }}><Save size={12} /></button>
                  <button onClick={() => setEditCat(null)}><X size={12} /></button>
                </>
              ) : (
                <>
                  <span onClick={() => setSelectedCat(c.id)}>{c.name}</span>
                  <button onClick={() => { setEditCat(c.id); setEditCatName(c.name); }} className="ml-1 opacity-60 hover:opacity-100"><Edit3 size={12} /></button>
                  <button onClick={() => deleteCategory(c.id)} className="opacity-60 hover:opacity-100 text-danger"><Trash2 size={12} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Menu items */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-foreground">Menu Items</h3>
          <button
            onClick={() => { setShowAddItem(!showAddItem); setItemName(''); setItemPrice(''); setItemImage(undefined); }}
            data-testid="button-toggle-add-item"
            className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center gap-1"
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        {/* Add item form */}
        {showAddItem && (
          <div className="p-3 bg-secondary/50 rounded-xl border border-border/50 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Item</p>
            <ItemImageField
              image={itemImage}
              onChange={setItemImage}
              onRemove={() => setItemImage(undefined)}
            />
            <div className="flex gap-2">
              <input
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Item name"
                data-testid="input-item-name"
                className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                value={itemPrice}
                onChange={(e) => setItemPrice(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Price"
                type="number"
                data-testid="input-item-price"
                className="w-24 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button
                onClick={handleAddItem}
                data-testid="button-add-item-confirm"
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium"
              >Add</button>
            </div>
          </div>
        )}

        {/* Item list */}
        <div className="space-y-2">
          {catItems.map((item) => (
            <div key={item.id} className="bg-secondary/50 rounded-xl border border-border/30" data-testid={`menu-item-row-${item.id}`}>
              {editItem === item.id ? (
                <div className="p-3 space-y-3">
                  <ItemImageField
                    image={editItemImage}
                    onChange={setEditItemImage}
                    onRemove={() => setEditItemImage(undefined)}
                  />
                  <div className="flex gap-2 items-center">
                    <input value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                    <input value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)} type="number" className="w-24 px-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
                    <button onClick={handleSaveEdit} className="text-success hover:opacity-80"><Save size={16} /></button>
                    <button onClick={() => setEditItem(null)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3.5 px-3 py-2.5 rounded-xl transition-colors duration-150 hover:bg-white/[0.03] cursor-default">
                  {/* Thumbnail */}
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 text-accent font-bold text-lg select-none">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  {/* Text block */}
                  <div className="flex flex-col gap-[3px] flex-1 min-w-0 pt-0.5">
                    <span className="text-sm font-medium text-foreground leading-snug truncate">{item.name}</span>
                    <span className="text-xs text-muted-foreground">Rs. {item.price}</span>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-0.5 pt-0.5">
                    <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"><Edit3 size={15} /></button>
                    <button onClick={() => deleteMenuItem(item.id)} className="p-1.5 rounded-lg text-danger/60 hover:text-danger hover:bg-danger/10 transition-colors"><Trash2 size={15} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {catItems.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No items in this category.</p>}
        </div>
      </div>
    </div>
  );
};

// ====== TABLE MANAGEMENT ======
const TablesSection = () => {
  const tables = usePOSStore((s) => s.tables);
  const addTable = usePOSStore((s) => s.addTable);
  const deleteTable = usePOSStore((s) => s.deleteTable);
  const [newNum, setNewNum] = useState('');

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <h3 className="font-bold text-foreground">Tables</h3>
      <div className="flex gap-2">
        <input
          value={newNum}
          onChange={(e) => setNewNum(e.target.value)}
          type="number"
          placeholder="Table number"
          data-testid="input-table-number"
          className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          onClick={() => { if (Number(newNum) > 0) { addTable(Number(newNum)); setNewNum(''); } }}
          data-testid="button-add-table"
          className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center gap-1"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {tables.sort((a, b) => a.number - b.number).map((t) => (
          <div key={t.id} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg" data-testid={`table-row-${t.id}`}>
            <span className="font-bold text-foreground">Table {t.number}</span>
            <button
              onClick={() => deleteTable(t.id)}
              disabled={t.status !== 'free'}
              className="text-danger hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ====== PAYMENT SETTINGS ======
const PaymentsSection = () => {
  const settings = usePOSStore((s) => s.settings);
  const updateSettings = usePOSStore((s) => s.updateSettings);

  const [cafeName, setCafeName] = useState(settings.cafeName);
  const [adminPin, setAdminPin] = useState(settings.adminPin);
  const [esewaPhone, setEsewaPhone] = useState(settings.esewaPhone);
  const [printerStatus, setPrinterStatus] = useState(printer.isConnected ? printer.deviceName : 'Not connected');

  const toggleWallet = (key: 'esewa' | 'khalti' | 'fonepay') => {
    updateSettings({
      wallets: {
        ...settings.wallets,
        [key]: { ...settings.wallets[key], enabled: !settings.wallets[key].enabled },
      },
    });
  };

  const connectPrinter = async () => {
    setPrinterStatus('Connecting...');
    const ok = await printer.connect();
    setPrinterStatus(ok ? printer.deviceName : 'Connection failed');
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">General Settings</h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Café Name</label>
            <input value={cafeName} onChange={(e) => setCafeName(e.target.value)} onBlur={() => updateSettings({ cafeName })} data-testid="input-cafe-name" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Admin PIN</label>
            <input value={adminPin} onChange={(e) => setAdminPin(e.target.value)} onBlur={() => updateSettings({ adminPin })} data-testid="input-admin-pin-change" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Digital Wallets</h3>
        <div>
          <label className="text-xs text-muted-foreground">eSewa Phone Number</label>
          <input value={esewaPhone} onChange={(e) => setEsewaPhone(e.target.value)} onBlur={() => updateSettings({ esewaPhone })} placeholder="98XXXXXXXX" data-testid="input-esewa-phone" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        {(['esewa', 'khalti', 'fonepay'] as const).map((key) => (
          <div key={key} className="p-3 bg-secondary/50 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground capitalize">{key}</span>
              <button onClick={() => toggleWallet(key)} className="text-accent" data-testid={`toggle-wallet-${key}`}>
                {settings.wallets[key].enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} className="text-muted-foreground" />}
              </button>
            </div>
            {settings.wallets[key].enabled && (
              <div className="space-y-2">
                {settings.wallets[key].qrImage && (
                  <div className="relative w-32 h-32 mx-auto">
                    <img src={settings.wallets[key].qrImage} alt={`${key} QR`} className="w-full h-full object-contain rounded-lg border border-border bg-foreground p-1" />
                    <button
                      onClick={() => updateSettings({ wallets: { ...settings.wallets, [key]: { ...settings.wallets[key], qrImage: undefined } } })}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-danger text-accent-foreground flex items-center justify-center"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                <label className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-primary text-foreground text-sm font-medium cursor-pointer hover:bg-accent/20 transition-colors">
                  <Upload size={14} /> {settings.wallets[key].qrImage ? 'Replace' : 'Upload'} QR Image
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        updateSettings({ wallets: { ...settings.wallets, [key]: { ...settings.wallets[key], qrImage: reader.result as string } } });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Thermal Printer</h3>
        <p className="text-sm text-muted-foreground">Status: {printerStatus}</p>
        <button
          onClick={connectPrinter}
          className="w-full py-2.5 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
        >
          <Bluetooth size={16} /> Connect Printer
        </button>
      </div>
    </div>
  );
};

// ====== BILL DESIGN ======
const BillDesignSection = () => {
  const settings = usePOSStore((s) => s.settings);
  const updateSettings = usePOSStore((s) => s.updateSettings);

  const [cafeName, setCafeName] = useState(settings.cafeName);
  const [cafeAddress, setCafeAddress] = useState(settings.cafeAddress || '');
  const [cafePhone, setCafePhone] = useState(settings.cafePhone || '');
  const [billFooter, setBillFooter] = useState(settings.billFooter || 'Thank you for visiting!');
  const [billCounter, setBillCounter] = useState(String(settings.billCounter));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateSettings({ cafeLogo: reader.result as string });
    reader.readAsDataURL(file);
  };

  const saveAll = () => {
    updateSettings({
      cafeName,
      cafeAddress: cafeAddress || undefined,
      cafePhone: cafePhone || undefined,
      billFooter: billFooter || undefined,
      billCounter: Number(billCounter) || settings.billCounter,
    });
  };

  const sampleItems = [
    { menuItemId: '1', name: 'Cappuccino', price: 250, quantity: 2 },
    { menuItemId: '2', name: 'Croissant', price: 180, quantity: 1 },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Café Logo</h3>
        <div className="flex items-center gap-4">
          {settings.cafeLogo ? (
            <div className="relative w-20 h-20">
              <img src={settings.cafeLogo} alt="Logo" className="w-full h-full object-contain rounded-lg border border-border" />
              <button
                onClick={() => updateSettings({ cafeLogo: undefined })}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
              <ImagePlus size={24} />
            </div>
          )}
          <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium cursor-pointer hover:bg-accent/20 transition-colors">
            <Upload size={14} /> {settings.cafeLogo ? 'Replace' : 'Upload'} Logo
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
          </label>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Bill Information</h3>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground">Café Name</label>
            <input value={cafeName} onChange={(e) => setCafeName(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Address</label>
            <input value={cafeAddress} onChange={(e) => setCafeAddress(e.target.value)} placeholder="e.g. Kathmandu, Nepal" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Phone</label>
            <input value={cafePhone} onChange={(e) => setCafePhone(e.target.value)} placeholder="e.g. 01-XXXXXXX" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Bill Footer Message</label>
            <input value={billFooter} onChange={(e) => setBillFooter(e.target.value)} placeholder="Thank you for visiting!" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Current Bill Number</label>
            <input value={billCounter} onChange={(e) => setBillCounter(e.target.value)} type="number" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
            <p className="text-xs text-muted-foreground mt-1">Next bill will be #{Number(billCounter) + 1}</p>
          </div>
        </div>
        <button onClick={saveAll} data-testid="button-save-bill-design" className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Bill Preview</h3>
        <ReceiptPreview
          cafeName={cafeName}
          cafeLogo={settings.cafeLogo}
          cafeAddress={cafeAddress}
          cafePhone={cafePhone}
          billFooter={billFooter}
          tableNumber={1}
          items={sampleItems}
          subtotal={680}
          discount={0}
          discountType="fixed"
          total={680}
          billNumber={Number(billCounter) + 1}
          date={Date.now()}
        />
      </div>
    </div>
  );
};

// ====== REPORTS ======
const ReportsSection = () => {
  const payments = usePOSStore((s) => s.payments);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');

  const now = new Date();
  const periodStart =
    period === 'day' ? startOfDay(now) : period === 'week' ? startOfWeek(now) : startOfMonth(now);
  const periodPayments = payments.filter((p) => p.createdAt >= periodStart.getTime());
  const totalRevenue = periodPayments.reduce((s, p) => s + p.total, 0);
  const cashTotal = periodPayments.filter((p) => p.method === 'cash').reduce((s, p) => s + p.total, 0);
  const digitalTotal = totalRevenue - cashTotal;

  const exportCSV = () => {
    const headers = 'Bill#,Table,Items,Subtotal,Discount,Total,Method,Date\n';
    const rows = periodPayments
      .map((p) =>
        `${p.billNumber},${p.tableNumber},"${p.items.map((i) => `${i.name}x${i.quantity}`).join('; ')}",${p.subtotal},${p.discount},${p.total},${p.method},${format(p.createdAt, 'yyyy-MM-dd HH:mm')}`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${period}-${format(now, 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(['day', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            data-testid={`button-report-period-${p}`}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium capitalize transition-all ${
              period === p ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground'
            }`}
          >
            {p === 'day' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Revenue</p>
          <p className="text-xl font-bold text-accent">Rs. {totalRevenue}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Orders</p>
          <p className="text-xl font-bold text-foreground">{periodPayments.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Cash</p>
          <p className="text-xl font-bold text-highlight">Rs. {cashTotal}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Digital</p>
          <p className="text-xl font-bold text-foreground">Rs. {digitalTotal}</p>
        </div>
      </div>

      <button
        onClick={exportCSV}
        data-testid="button-export-csv"
        className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
      >
        <Download size={16} /> Export CSV
      </button>
    </div>
  );
};

// ====== BACKUP ======
const BackupSection = () => {
  const exportData = usePOSStore((s) => s.exportData);
  const importData = usePOSStore((s) => s.importData);
  const factoryReset = usePOSStore((s) => s.factoryReset);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cafe-pos-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        importData(reader.result as string);
        alert('Data restored successfully!');
      } catch {
        alert('Invalid backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Backup Data</h3>
        <p className="text-sm text-muted-foreground">Export all data as a JSON file for safekeeping.</p>
        <button
          onClick={handleExport}
          data-testid="button-export-backup"
          className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-medium flex items-center justify-center gap-2"
        >
          <Download size={16} /> Export Backup
        </button>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        <h3 className="font-bold text-foreground">Restore Data</h3>
        <p className="text-sm text-muted-foreground">Import a previously exported backup file.</p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          data-testid="button-import-backup"
          className="w-full py-3 rounded-xl bg-secondary text-secondary-foreground font-medium flex items-center justify-center gap-2 hover:bg-accent/20 transition-colors"
        >
          <Upload size={16} /> Import Backup
        </button>
      </div>

      <div className="bg-card rounded-xl border-2 border-destructive/30 p-4 space-y-3">
        <h3 className="font-bold text-destructive">Factory Reset</h3>
        <p className="text-sm text-muted-foreground">Delete all data and restore default settings. This cannot be undone.</p>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            data-testid="button-factory-reset"
            className="w-full py-3 rounded-xl bg-destructive/10 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/20 transition-colors"
          >
            <Trash2 size={16} /> Factory Reset
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive text-center">Are you sure? All data will be erased.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-secondary text-secondary-foreground font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => { factoryReset(); window.location.reload(); }}
                data-testid="button-confirm-factory-reset"
                className="flex-1 py-3 rounded-xl bg-destructive text-destructive-foreground font-bold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
