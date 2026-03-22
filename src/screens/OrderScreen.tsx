import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import MenuItemCard from '@/components/orders/MenuItemCard';
import OrderPanel from '@/components/orders/OrderPanel';
import { Search, ShoppingBag, X, Info } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { playClick } from '@/utils/sounds';

const OrderScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const { tables } = useTables();
  const updateTable = usePOSStore((s) => s.updateTable);
  const {
    getActiveOrder,
    createOrder,
    addItemToOrder,
    updateItemQuantity,
    removeItemFromOrder,
    clearOrder,
    orders,
  } = useOrders();
  const categories = usePOSStore((s) => s.categories);
  const menuItems = usePOSStore((s) => s.menuItems);
  const payments = usePOSStore((s) => s.payments);
  const settings = usePOSStore((s) => s.settings);

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

  const itemCount = order?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  const runningTotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
  const hasItems = itemCount > 0;

  const handlePay = () => {
    if (!order || order.items.length === 0) return;
    navigate(`/review/${tableId}`);
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

  const handlePaxChange = (newPax: number) => {
    if (tableId) updateTable(tableId, { pax: newPax });
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

  return (
    <div className="h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #0d1525 0%, #060e1a 100%)' }}>
      <TopBar title={`Table ${table.number}`} showBack onBack={() => navigate('/')} />

      {/* Payment-in-progress info banner */}
      {table.status === 'billing' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border-b border-accent/20 text-accent/90">
          <Info size={14} className="flex-shrink-0" />
          <p className="text-xs font-medium">Payment in progress — you can still modify the order</p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Search */}
          <div className="p-3 border-b border-border bg-card/60">
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

          {/* Categories */}
          {!search && (
            <div className="flex gap-2 p-3 overflow-x-auto border-b border-border no-scrollbar bg-card/40">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  data-testid={`button-category-${cat.id}`}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all active:scale-95"
                  style={activeCat === cat.id ? {
                    background: 'rgba(59,130,246,0.22)',
                    color: 'rgba(255,255,255,0.95)',
                    border: '1px solid rgba(59,130,246,0.35)',
                    boxShadow: '0 2px 10px -2px rgba(59,130,246,0.3)',
                  } : {
                    background: 'rgba(15,23,42,0.6)',
                    color: 'rgba(255,255,255,0.45)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-3 bg-background">
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
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ShoppingBag size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No items found</p>
                <p className="text-xs opacity-60 mt-1">Try a different category or search</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Order Panel — desktop only */}
        {!isMobile && (
          <div className="w-[340px] lg:w-[380px] flex-shrink-0 border-l border-border flex flex-col">
            <OrderPanel
              order={order}
              onUpdateQty={(menuItemId, delta) =>
                order && updateItemQuantity(order.id, menuItemId, delta)
              }
              onRemove={(menuItemId) =>
                order && removeItemFromOrder(order.id, menuItemId)
              }
              onPay={handlePay}
              onClear={handleClear}
              pax={table.pax ?? 1}
              onPaxChange={handlePaxChange}
            />
          </div>
        )}
      </div>

      {/* Mobile: Cart summary button (opens slide-up panel) */}
      {isMobile && (
        <button
          onClick={() => setShowCart(true)}
          data-testid="button-view-order"
          className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 border-t border-border safe-bottom transition-all ${
            hasItems
              ? 'bg-card/95 backdrop-blur-sm'
              : 'bg-card/70'
          }`}
        >
          <div className="relative">
            <ShoppingBag size={20} className={hasItems ? 'text-accent' : 'text-muted-foreground'} />
            {hasItems && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 rounded-full bg-accent text-accent-foreground text-[10px] font-black flex items-center justify-center leading-none">
                {itemCount}
              </span>
            )}
          </div>
          <span className="flex-1 text-sm font-medium text-left text-muted-foreground">
            {hasItems ? `${itemCount} item${itemCount !== 1 ? 's' : ''} in order` : 'No items yet — tap to add'}
          </span>
          {hasItems && (
            <span className="font-black text-accent text-base">Rs. {runningTotal}</span>
          )}
        </button>
      )}

      {/* Mobile: Cart slide-up sheet */}
      {isMobile && showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="bg-card border-t border-border rounded-t-2xl max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground">Table {table.number} — Order</h3>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                data-testid="button-close-cart"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <OrderPanel
                order={order}
                onUpdateQty={(menuItemId, delta) =>
                  order && updateItemQuantity(order.id, menuItemId, delta)
                }
                onRemove={(menuItemId) =>
                  order && removeItemFromOrder(order.id, menuItemId)
                }
                onPay={() => { setShowCart(false); handlePay(); }}
                onClear={handleClear}
                pax={table.pax ?? 1}
                onPaxChange={handlePaxChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreen;
