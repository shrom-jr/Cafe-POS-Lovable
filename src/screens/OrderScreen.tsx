import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fmt } from '@/utils/format';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import MenuItemCard from '@/components/orders/MenuItemCard';
import OrderPanel from '@/components/orders/OrderPanel';
import { Search, ShoppingCart, X, Info } from 'lucide-react';
import { playClick } from '@/utils/sounds';

const OrderScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

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
        <div className="flex items-center gap-2 px-4 py-2.5 bg-accent/10 border-b border-accent/20 text-accent/90 flex-shrink-0">
          <Info size={14} className="flex-shrink-0" />
          <p className="text-xs font-medium">Payment in progress — you can still modify the order</p>
        </div>
      )}

      {/* ── Main content area ──
          Mobile (<640px): full-width menu, floating cart button + drawer
          Tablet (sm, >=640px): side-by-side 2/3 menu + 1/3 cart
          Desktop (lg, >=1024px): same as tablet, larger cart panel
      */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden min-h-0">

        {/* ── Menu area ── */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

          {/* Search */}
          <div className="p-3 border-b border-border bg-card/60 flex-shrink-0">
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

          {/* Category tabs — horizontal scroll on mobile, wrapping on tablet+ */}
          {!search && (
            <div className="flex gap-2 p-3 border-b border-border no-scrollbar bg-card/40 flex-shrink-0 overflow-x-auto sm:overflow-x-visible sm:flex-wrap">
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

          {/* Items grid — only this section scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 bg-background pb-24 sm:pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
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
                <ShoppingCart size={36} className="mb-3 opacity-20" />
                <p className="text-sm font-medium">No items found</p>
                <p className="text-xs opacity-60 mt-1.5 text-center">Try a different category or search</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Cart panel — hidden on mobile, always visible on tablet+ ── */}
        <div
          className="hidden sm:flex sm:w-1/3 lg:w-[360px] flex-shrink-0 flex-col"
          style={{
            borderLeft: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.4)',
          }}
        >
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
      </div>

      {/* ── Mobile only: Floating cart button (bottom-right) ── */}
      <button
        onClick={() => setShowCart(true)}
        data-testid="button-view-order"
        className="sm:hidden fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all active:scale-95"
        style={{
          background: hasItems
            ? 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)'
            : 'rgba(15,23,42,0.92)',
          border: hasItems
            ? '1px solid rgba(65,134,245,0.5)'
            : '1px solid rgba(255,255,255,0.10)',
          boxShadow: hasItems
            ? '0 8px 32px -4px rgba(59,130,246,0.55)'
            : '0 4px 24px -4px rgba(0,0,0,0.6)',
          color: hasItems ? '#ffffff' : 'rgba(255,255,255,0.5)',
        }}
      >
        <div className="relative">
          <ShoppingCart size={20} />
          {hasItems && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-0.5 rounded-full bg-white text-blue-600 text-[10px] font-black flex items-center justify-center leading-none">
              {itemCount}
            </span>
          )}
        </div>
        {hasItems ? (
          <span className="text-sm font-bold">Rs. {fmt(runningTotal)}</span>
        ) : (
          <span className="text-xs font-medium">Cart</span>
        )}
      </button>

      {/* ── Mobile only: Cart bottom drawer (75vh) ── */}
      {showCart && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div
            className="relative bg-card border-t border-border rounded-t-2xl flex flex-col animate-slide-up"
            style={{ height: '75vh' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
              <h3 className="font-bold text-foreground">
                Cart{itemCount > 0 ? ` (${itemCount} item${itemCount !== 1 ? 's' : ''})` : ''}
              </h3>
              <button
                onClick={() => setShowCart(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
                data-testid="button-close-cart"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
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
