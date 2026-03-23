import { useState, useMemo, useEffect } from 'react';
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

  // Reliable landscape mobile detection: width > height AND height < 600px
  const detectLandscape = () =>
    window.innerWidth > window.innerHeight && window.innerHeight < 600;
  const [isLandscapeMobile, setIsLandscapeMobile] = useState(detectLandscape);
  useEffect(() => {
    const update = () => setIsLandscapeMobile(detectLandscape());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

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
    <div className="h-[100dvh] flex flex-col overflow-hidden" style={{ background: 'linear-gradient(180deg, #0d1525 0%, #060e1a 100%)' }}>
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
      <div className="flex-1 flex flex-col sm:flex-row short:col overflow-hidden min-h-0">

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
          <div className="flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 bg-background pb-24 sm:pb-4 short:pb-20">
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
          className="hidden sm:flex short:hidden sm:w-1/3 lg:w-[360px] flex-col min-h-0 overflow-hidden"
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
        className="sm:hidden short:flex fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl transition-all active:scale-95"
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

      {/* ── Portrait mobile: bottom sheet cart ── */}
      {showCart && !isLandscapeMobile && (
        <div className="sm:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div
            className="relative bg-card border-t border-border rounded-t-2xl flex flex-col animate-slide-up max-h-[100dvh] overflow-hidden"
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
            <div className="flex-1 min-h-0 flex flex-col">
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

      {/* ── Landscape mobile: FULL SCREEN cart (completely separate from bottom sheet) ── */}
      {isLandscapeMobile && showCart && (
        <div
          className="fixed inset-0 z-[100] flex flex-col"
          style={{ background: '#0a1628' }}
        >
          {/* DEBUG banner — remove once confirmed */}
          <div
            className="flex-shrink-0 flex items-center justify-center py-1 text-[11px] font-black tracking-widest uppercase"
            style={{ background: '#7c3aed', color: '#fff', letterSpacing: '0.12em' }}
          >
            ✦ LANDSCAPE CART ACTIVE ✦
          </div>

          {/* Header */}
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-2"
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.03)',
            }}
          >
            <h3 className="font-bold text-white/90 text-sm">
              Cart{itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
            </h3>
            <button
              onClick={() => setShowCart(false)}
              data-testid="button-close-cart"
              className="p-1.5 rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Items — only this scrolls */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
            {(order?.items || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8" style={{ color: 'rgba(255,255,255,0.25)' }}>
                <ShoppingCart size={32} className="mb-2 opacity-30" />
                <p className="text-sm font-semibold">No items yet</p>
                <p className="text-xs opacity-60 mt-1">Tap items on the left to add</p>
              </div>
            ) : (
              (order?.items || []).map((item) => (
                <div
                  key={item.menuItemId}
                  className="flex items-center gap-2 rounded-xl px-3 py-2"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white/90 truncate">{item.name}</p>
                    <p className="text-xs text-white/40">Rs. {fmt(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => order && updateItemQuantity(order.id, item.menuItemId, -1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 active:scale-90"
                      style={{ background: 'rgba(255,255,255,0.07)' }}
                    >
                      <span className="text-base leading-none">−</span>
                    </button>
                    <span className="w-6 text-center font-black text-sm text-white/85">{item.quantity}</span>
                    <button
                      onClick={() => order && updateItemQuantity(order.id, item.menuItemId, 1)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 active:scale-90"
                      style={{ background: 'rgba(59,130,246,0.18)', border: '1px solid rgba(59,130,246,0.28)' }}
                    >
                      <span className="text-base leading-none">+</span>
                    </button>
                  </div>
                  <p className="w-16 text-right text-sm font-bold text-white/80">Rs. {fmt(item.price * item.quantity)}</p>
                </div>
              ))
            )}
          </div>

          {/* Footer — always pinned, never scrolls */}
          <div
            className="flex-shrink-0 px-4 pt-3 pb-4"
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              background: '#0c1828',
              boxShadow: '0 -6px 20px rgba(0,0,0,0.4)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Total</span>
              <span className="text-2xl font-black text-white/95">
                Rs. {fmt((order?.items || []).reduce((s, i) => s + i.price * i.quantity, 0))}
              </span>
            </div>
            <button
              onClick={() => { setShowCart(false); handlePay(); }}
              disabled={!order || order.items.length === 0}
              data-testid="button-proceed-to-bill"
              className="w-full py-3 rounded-xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed"
              style={{
                background: order && order.items.length > 0
                  ? 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)'
                  : 'rgba(59,130,246,0.12)',
                color: order && order.items.length > 0 ? '#ffffff' : 'rgba(255,255,255,0.3)',
                boxShadow: order && order.items.length > 0
                  ? '0 4px 20px -4px rgba(59,130,246,0.55)'
                  : 'none',
              }}
            >
              {order && order.items.length > 0 ? 'Review Order →' : 'Add items to order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreen;
