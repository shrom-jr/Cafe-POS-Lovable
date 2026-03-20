import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import MenuItemCard from '@/components/orders/MenuItemCard';
import OrderPanel from '@/components/orders/OrderPanel';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { playClick } from '@/utils/sounds';

const OrderScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { tables, updateTable } = useTables();
  const {
    getActiveOrder,
    createOrder,
    addItemToOrder,
    updateItemQuantity,
    removeItemFromOrder,
    updateOrderStatus,
    clearOrder,
    orders,
  } = useOrders();
  const categories = usePOSStore((s) => s.categories);
  const menuItems = usePOSStore((s) => s.menuItems);
  const payments = usePOSStore((s) => s.payments);

  const table = tables.find((t) => t.id === tableId);
  const [activeCat, setActiveCat] = useState(categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);

  const order = useMemo(() => {
    if (!tableId || !table) return null;
    return getActiveOrder(tableId) || null;
  }, [tableId, table, getActiveOrder, orders]);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(q));
    } else {
      items = items.filter((i) => i.categoryId === activeCat);
    }
    return items;
  }, [menuItems, activeCat, search]);

  const orderQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    (order?.items || []).forEach((i) => { map[i.menuItemId] = i.quantity; });
    return map;
  }, [order]);

  const hasLastOrder = useMemo(() => {
    if (!table) return false;
    return payments.some((p) => p.tableNumber === table.number);
  }, [payments, table]);

  if (!table || !tableId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        Table not found
      </div>
    );
  }

  const handleBill = () => {
    if (!order || order.items.length === 0) return;
    updateOrderStatus(order.id, 'billed');
    updateTable(tableId, { status: 'billing' });
    navigate(`/billing/${tableId}`);
  };

  const handleAddItem = (item: typeof menuItems[0]) => {
    const currentOrder = order || createOrder(tableId, table.number);
    addItemToOrder(currentOrder.id, item);
    playClick();
  };

  const handleClear = () => {
    if (!order) return;
    clearOrder(order.id);
  };

  const handleRepeatLast = () => {
    const tablePayments = payments
      .filter((p) => p.tableNumber === table.number)
      .sort((a, b) => b.createdAt - a.createdAt);
    if (!tablePayments.length) return;

    const lastPayment = tablePayments[0];
    const currentOrder = order || createOrder(tableId, table.number);

    lastPayment.items.forEach((orderItem) => {
      const menuItem = menuItems.find((m) => m.id === orderItem.menuItemId);
      if (!menuItem) return;
      for (let i = 0; i < orderItem.quantity; i++) {
        addItemToOrder(currentOrder.id, menuItem);
      }
    });
    playClick();
  };

  const itemCount = order?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  const runningTotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0;

  return (
    <div className="h-screen bg-background flex flex-col">
      <TopBar title={`Table ${table.number} — Order`} showBack onBack={() => navigate('/')} />
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search-menu"
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {!search && (
            <div className="flex gap-2 p-3 overflow-x-auto border-b border-border no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  data-testid={`button-category-${cat.id}`}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    activeCat === cat.id
                      ? 'bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          <div className={`flex-1 overflow-y-auto p-3 ${isMobile ? 'pb-24' : ''}`}>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2.5`}>
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantityInOrder={orderQtyMap[item.id] || 0}
                  onAdd={() => handleAddItem(item)}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No items found</p>
            )}
          </div>
        </div>

        {!isMobile && (
          <div className="w-[340px] lg:w-[380px] flex-shrink-0 p-3">
            <OrderPanel
              order={order}
              onUpdateQty={(menuItemId, delta) => order && updateItemQuantity(order.id, menuItemId, delta)}
              onRemove={(menuItemId) => order && removeItemFromOrder(order.id, menuItemId)}
              onBill={handleBill}
              onClear={handleClear}
              onRepeatLast={handleRepeatLast}
              hasLastOrder={hasLastOrder}
            />
          </div>
        )}
      </div>

      {isMobile && itemCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          data-testid="button-open-cart"
          className="fixed bottom-4 left-4 right-4 z-50 flex items-center justify-between px-5 py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-base shadow-[0_8px_24px_-4px_hsl(var(--accent)/0.5)] active:scale-95 transition-all"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} />
            <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
          </div>
          <span className="font-black">Rs. {runningTotal}</span>
        </button>
      )}

      {isMobile && showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="bg-card border-t border-border rounded-t-2xl max-h-[82vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground">Your Order</h3>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                data-testid="button-close-cart"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OrderPanel
                order={order}
                onUpdateQty={(menuItemId, delta) => order && updateItemQuantity(order.id, menuItemId, delta)}
                onRemove={(menuItemId) => order && removeItemFromOrder(order.id, menuItemId)}
                onBill={() => { setShowCart(false); handleBill(); }}
                onClear={() => { setShowCart(false); handleClear(); }}
                onRepeatLast={handleRepeatLast}
                hasLastOrder={hasLastOrder}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreen;
