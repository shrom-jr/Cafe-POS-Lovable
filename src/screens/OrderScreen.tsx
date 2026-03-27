import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fmt } from '@/utils/format';
import { SEND_DELAY, SUCCESS_DURATION, FLASH_DURATION, NOW_TICK_INTERVAL } from '@/utils/kitchenTimings';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import MenuItemCard from '@/components/orders/MenuItemCard';
import OrderPanel from '@/components/orders/OrderPanel';
import { Search, ShoppingCart, ChevronUp, X, Info } from 'lucide-react';
import { playClick } from '@/utils/sounds';

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

const formatRelativeTime = (ts: number, now: number): string => {
  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return 'Sent just now';
  if (diffMin < 5) return `Sent ${diffMin} min ago`;
  return `Sent at ${formatTime(ts)}`;
};

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
    sendToKitchen,
    orders,
  } = useOrders();
  const categories = usePOSStore((s) => s.categories);
  const menuItems = usePOSStore((s) => s.menuItems);
  const payments = usePOSStore((s) => s.payments);

  const table = tables.find((t) => t.id === tableId);
  const [activeCat, setActiveCat] = useState(categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);
  const [drawerSendPhase, setDrawerSendPhase] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [drawerSentAt, setDrawerSentAt] = useState<number | null>(null);
  const [drawerFlashingIds, setDrawerFlashingIds] = useState<Set<string>>(new Set());
  const [showKitchenWarning, setShowKitchenWarning] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Timer refs — prevent memory leaks and stale updates on unmount
  const sendTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Swipe-to-close refs (portrait drawer only)
  const swipeTouchStartY = useRef(0);
  const swipeTouchCurrentY = useRef(0);

  // Landscape detection: any device where width > height gets split view
  const detectLandscape = () => window.innerWidth > window.innerHeight;
  const [isLandscape, setIsLandscape] = useState(detectLandscape);
  useEffect(() => {
    const update = () => setIsLandscape(detectLandscape());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  // Clean up all send/flash timers on unmount
  useEffect(() => {
    return () => {
      sendTimers.current.forEach(clearTimeout);
      if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), NOW_TICK_INTERVAL);
    return () => clearInterval(id);
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
  const runningTotal = order?.items.filter((i) => i.status !== 'paid').reduce((s, i) => s + i.price * i.quantity, 0) || 0;
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

  // Fallback safety — default to draft if unexpected value
  const rawKitchenStatus = order?.kitchenStatus;
  const kitchenStatus: 'draft' | 'placed' = rawKitchenStatus === 'placed' ? 'placed' : 'draft';
  const hasUnsentItems = kitchenStatus === 'placed' ? (order?.hasUnsentItems ?? false) : false;

  const drawerStatusLabel =
    kitchenStatus === 'draft' ? 'Draft' : hasUnsentItems ? 'Updated' : 'Sent';
  const drawerStatusStyle =
    kitchenStatus === 'draft'
      ? { background: 'rgba(148,163,184,0.12)', color: 'rgba(148,163,184,0.7)', border: '1px solid rgba(148,163,184,0.2)' }
      : hasUnsentItems
      ? { background: 'rgba(251,191,36,0.12)', color: 'rgba(251,191,36,0.8)', border: '1px solid rgba(251,191,36,0.25)' }
      : { background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.8)', border: '1px solid rgba(52,211,153,0.25)' };

  const drawerPrimaryLabel =
    kitchenStatus === 'draft'
      ? 'Send to Kitchen'
      : hasUnsentItems
      ? 'Send Update'
      : 'Proceed to Payment →';

  const drawerButtonLabel =
    drawerSendPhase === 'sending' ? 'Sending...'
    : drawerSendPhase === 'sent' ? 'Sent ✓'
    : drawerPrimaryLabel;

  const handleSendToKitchen = () => {
    if (!order || drawerSendPhase !== 'idle') return; // race condition guard

    // Snapshot unsent IDs at click time — stable for flash
    const unsentSnapshot = order.items
      .filter((i) => !i.sentToKitchen && i.status !== 'paid')
      .map((i) => i.id);

    // Cancel any prior flash and start a new one from the snapshot
    if (flashTimer.current !== null) clearTimeout(flashTimer.current);
    if (unsentSnapshot.length > 0) {
      setDrawerFlashingIds(new Set(unsentSnapshot));
      flashTimer.current = setTimeout(() => {
        setDrawerFlashingIds(new Set());
        flashTimer.current = null;
      }, FLASH_DURATION);
    }

    setDrawerSendPhase('sending');
    const ts = Date.now();
    setDrawerSentAt(ts);
    setNow(ts);
    setShowKitchenWarning(false);
    sendToKitchen(order.id);

    const t1 = setTimeout(() => setDrawerSendPhase('sent'), SEND_DELAY);
    const t2 = setTimeout(() => setDrawerSendPhase('idle'), SEND_DELAY + SUCCESS_DURATION);
    sendTimers.current.push(t1, t2);
  };

  const handleDrawerPrimary = () => {
    if (drawerSendPhase !== 'idle') return;
    if (kitchenStatus === 'placed' && !hasUnsentItems) {
      setShowCart(false);
      handlePay();
    } else if (kitchenStatus === 'draft' && order && order.items.length > 0) {
      handleSendToKitchen();
    } else {
      handleSendToKitchen();
    }
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

      {/* Kitchen status label */}
      {order && (
        <div className="flex items-center gap-2 px-4 py-1.5 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-xs font-semibold text-white/35">Order status:</span>
          <span
            className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
            style={drawerStatusStyle}
          >
            {drawerStatusLabel}
          </span>
        </div>
      )}

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
      <div className="flex-1 flex flex-row overflow-hidden min-h-0">

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
          <div className={`flex-1 min-h-0 overflow-y-auto p-3 lg:p-4 bg-background ${!isLandscape ? 'pb-24' : ''}`}>
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

        {/* ── Cart panel — JS-conditional, shown in landscape on any device ── */}
        {isLandscape && (
          <div
            className="w-80 lg:w-[360px] flex-shrink-0 flex flex-col min-h-0 overflow-hidden"
            style={{
              borderLeft: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.4)',
            }}
          >
            <OrderPanel
              order={order}
              onUpdateQty={(itemId, delta) =>
                order && updateItemQuantity(order.id, itemId, delta)
              }
              onRemove={(itemId) =>
                order && removeItemFromOrder(order.id, itemId)
              }
              onPay={handlePay}
              onSendToKitchen={handleSendToKitchen}
              onClear={handleClear}
              pax={table.pax ?? 1}
              onPaxChange={handlePaxChange}
            />
          </div>
        )}
      </div>

      {/* ── Portrait mobile only: COLLAPSED ORDER BAR ── */}
      {!isLandscape && hasItems && (
        <div
          onClick={() => setShowCart(true)}
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-5 cursor-pointer active:brightness-110 transition-all select-none"
          style={{
            background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 100%)',
            borderRadius: '18px 18px 0 0',
            paddingTop: 14,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
            boxShadow: '0 -4px 24px rgba(37,99,235,0.45)',
          }}
        >
          <span className="text-white font-bold text-sm">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <span className="text-white font-black text-base tracking-tight">
            Rs. {fmt(runningTotal)}
          </span>
          <span className="flex items-center gap-1 text-white/90 font-semibold text-sm">
            Review <ChevronUp size={15} strokeWidth={2.5} />
          </span>
        </div>
      )}

      {/* ── Portrait mobile only: EXPANDABLE ORDER DRAWER ── */}
      {!isLandscape && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setShowCart(false)}
            className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
            style={{ opacity: showCart ? 1 : 0, pointerEvents: showCart ? 'auto' : 'none' }}
          />

          {/* Drawer panel */}
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col"
            style={{
              maxHeight: '75dvh',
              minHeight: '40dvh',
              borderRadius: '18px 18px 0 0',
              background: '#0d1525',
              border: '1px solid rgba(255,255,255,0.09)',
              borderBottom: 'none',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.7)',
              transform: showCart ? 'translateY(0)' : 'translateY(100%)',
              transition: 'transform 300ms cubic-bezier(0.32, 0.72, 0, 1)',
            }}
          >
            <style>{`
              @keyframes dr-item-flash {
                0%   { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
                35%  { box-shadow: 0 0 0 6px rgba(251,191,36,0.28); }
                100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
              }
              @keyframes dr-fade-in {
                from { opacity: 0; transform: scale(0.88); }
                to   { opacity: 1; transform: scale(1); }
              }
              @keyframes dr-btn-pulse {
                0%   { opacity: 1; }
                50%  { opacity: 0.65; }
                100% { opacity: 1; }
              }
            `}</style>
            {/* Drag handle — swipe-to-close zone */}
            <div
              className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing"
              onTouchStart={(e) => { swipeTouchStartY.current = e.touches[0].clientY; swipeTouchCurrentY.current = e.touches[0].clientY; }}
              onTouchMove={(e) => { swipeTouchCurrentY.current = e.touches[0].clientY; }}
              onTouchEnd={() => {
                if (swipeTouchCurrentY.current - swipeTouchStartY.current > 60) setShowCart(false);
                swipeTouchCurrentY.current = 0;
              }}
            >
              <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
            </div>

            {/* Header */}
            <div
              className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <h3 className="font-bold text-white/90 text-sm">
                Your Order{itemCount > 0 ? ` · ${itemCount} item${itemCount !== 1 ? 's' : ''}` : ''}
              </h3>
              <button
                onClick={() => setShowCart(false)}
                data-testid="button-close-cart"
                className="p-1.5 rounded-lg transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)', background: 'rgba(255,255,255,0.07)' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Guests (Pax) selector */}
            <div
              className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
            >
              <span className="text-sm font-semibold text-white/60">Guests</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handlePaxChange(Math.max(1, (table.pax ?? 1) - 1))}
                  disabled={(table.pax ?? 1) <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 active:scale-90 transition-transform disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.07)' }}
                >
                  <span className="text-base leading-none select-none">−</span>
                </button>
                <span className="w-6 text-center font-black text-sm text-white/90 select-none tabular-nums">
                  {table.pax ?? 1}
                </span>
                <button
                  onClick={() => handlePaxChange((table.pax ?? 1) + 1)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform"
                  style={{ background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.30)' }}
                >
                  <span className="text-base leading-none text-blue-300 select-none">+</span>
                </button>
              </div>
            </div>

            {/* Items list — scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2">
              {(order?.items || []).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  <ShoppingCart size={32} className="mb-2 opacity-30" />
                  <p className="text-sm font-semibold">No items yet</p>
                  <p className="text-xs opacity-60 mt-1">Tap items on the menu to add</p>
                </div>
              ) : (() => {
                const allItems = order?.items || [];
                const hasGrouping = kitchenStatus === 'placed' && hasUnsentItems;
                const sentItems = hasGrouping
                  ? allItems.filter((i) => i.sentToKitchen)
                  : allItems;
                const unsentItems = hasGrouping
                  ? allItems.filter((i) => !i.sentToKitchen && i.status !== 'paid')
                  : [];

                const renderItem = (item: typeof allItems[0], isUnsent: boolean) => {
                  const isPaid = item.status === 'paid';
                  const isFlashing = drawerFlashingIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                      style={{
                        background: isPaid ? 'rgba(255,255,255,0.02)' : isUnsent ? 'rgba(251,191,36,0.05)' : 'rgba(255,255,255,0.06)',
                        border: isPaid ? '1px solid rgba(255,255,255,0.04)' : isUnsent ? '1px solid rgba(251,191,36,0.2)' : '1px solid rgba(255,255,255,0.07)',
                        opacity: isPaid ? 0.5 : 1,
                        transition: 'background 0.25s ease, border-color 0.25s ease',
                        animation: isFlashing ? 'dr-item-flash 0.65s ease' : undefined,
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-bold text-white/90 truncate ${isPaid ? 'line-through' : ''}`}>{item.name}</p>
                          {isPaid && (
                            <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(52,211,153,0.12)', color: 'rgba(52,211,153,0.7)' }}>
                              Paid
                            </span>
                          )}
                          {isUnsent && (
                            <span className="flex-shrink-0 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: 'rgba(251,191,36,0.15)', color: 'rgba(251,191,36,0.9)' }}>
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-white/40">Rs. {fmt(item.price)} each</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => !isPaid && order && updateItemQuantity(order.id, item.id, -1)}
                          disabled={isPaid}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white/50 active:scale-90 transition-transform disabled:pointer-events-none disabled:opacity-30"
                          style={{ background: 'rgba(255,255,255,0.07)' }}
                        >
                          <span className="text-base leading-none select-none">−</span>
                        </button>
                        <span className="w-7 text-center font-black text-sm text-white/90 select-none">{item.quantity}</span>
                        <button
                          onClick={() => !isPaid && order && updateItemQuantity(order.id, item.id, 1)}
                          disabled={isPaid}
                          className="w-8 h-8 rounded-lg flex items-center justify-center active:scale-90 transition-transform disabled:pointer-events-none disabled:opacity-30"
                          style={{ background: 'rgba(59,130,246,0.20)', border: '1px solid rgba(59,130,246,0.30)' }}
                        >
                          <span className="text-base leading-none text-blue-300 select-none">+</span>
                        </button>
                      </div>
                      <p className="w-16 text-right text-sm font-bold" style={{ color: isPaid ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.8)' }}>
                        Rs. {fmt(item.price * item.quantity)}
                      </p>
                    </div>
                  );
                };

                return (
                  <>
                    {sentItems.map((item) => renderItem(item, false))}
                    {hasGrouping && unsentItems.length > 0 && (
                      <>
                        <div className="flex items-center gap-2 pt-1 pb-0.5">
                          <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.18)' }} />
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(251,191,36,0.55)' }}>
                            New items
                          </span>
                          <div className="flex-1 h-px" style={{ background: 'rgba(251,191,36,0.18)' }} />
                        </div>
                        {unsentItems.map((item) => renderItem(item, true))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* Footer — pinned */}
            <div
              className="flex-shrink-0 px-4 pt-3"
              style={{
                paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                background: '#0d1525',
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/35">Total</span>
                  {kitchenStatus === 'placed' && drawerSentAt && (
                    <span
                      key={Math.floor((now - drawerSentAt) / 60000)}
                      className="text-[10px] font-medium"
                      style={{ color: 'rgba(52,211,153,0.65)', animation: 'dr-fade-in 0.2s ease' }}
                    >
                      {formatRelativeTime(drawerSentAt, now)}
                    </span>
                  )}
                </div>
                <span className="text-2xl font-black text-white/95">Rs. {fmt(runningTotal)}</span>
              </div>

              {/* Safety hint — shown in draft or as warning */}
              {(showKitchenWarning || (kitchenStatus === 'draft' && hasItems)) && (
                <p
                  className="text-[11px] text-center font-semibold mb-2 mt-1"
                  style={{ color: showKitchenWarning ? 'rgba(251,191,36,0.9)' : 'rgba(251,191,36,0.5)' }}
                >
                  Send to kitchen before payment
                </p>
              )}

              {hasItems && (
                <button
                  onClick={() => { handleClear(); setShowCart(false); }}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm mb-2.5 transition-all active:scale-[0.97]"
                  style={{ background: 'transparent', border: '1px solid #EF4444', color: '#EF4444' }}
                >
                  Clear Order
                </button>
              )}

              {/* Primary CTA — visual hierarchy by state */}
              {(() => {
                const isProceed = kitchenStatus === 'placed' && !hasUnsentItems;
                const isUpdate = kitchenStatus === 'placed' && hasUnsentItems;
                const isBtnDisabled = !order || order.items.length === 0 || drawerSendPhase === 'sending';
                const bg = drawerSendPhase === 'sent'
                  ? 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                  : isProceed
                  ? 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 60%, #3b82f6 100%)'
                  : isUpdate
                  ? 'linear-gradient(135deg, #1a3d9e 0%, #2d5dbf 100%)'
                  : 'linear-gradient(135deg, #1e50d0 0%, #4186f5 100%)';
                const shadow = drawerSendPhase === 'sent'
                  ? '0 4px 20px -4px rgba(16,185,129,0.6)'
                  : isProceed
                  ? '0 6px 28px -4px rgba(59,130,246,0.75)'
                  : isUpdate
                  ? '0 4px 12px -4px rgba(59,130,246,0.35)'
                  : '0 4px 20px -4px rgba(59,130,246,0.6)';
                const py = isUpdate && drawerSendPhase === 'idle' ? '13px' : '15px';
                const ariaLabel = drawerSendPhase === 'sending'
                  ? 'Sending to kitchen, please wait'
                  : drawerSendPhase === 'sent'
                  ? 'Order sent to kitchen'
                  : drawerPrimaryLabel;
                return (
                  <button
                    onClick={handleDrawerPrimary}
                    disabled={isBtnDisabled}
                    aria-disabled={isBtnDisabled}
                    aria-label={ariaLabel}
                    data-testid="button-proceed-to-bill"
                    className="w-full rounded-2xl font-black text-base active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed"
                    style={{
                      paddingTop: py,
                      paddingBottom: py,
                      background: bg,
                      color: '#ffffff',
                      boxShadow: shadow,
                      transition: 'background 0.35s ease, box-shadow 0.35s ease, padding 0.2s ease',
                      animation: drawerSendPhase === 'sending' ? 'dr-btn-pulse 0.7s ease' : undefined,
                    }}
                  >
                    {drawerButtonLabel}
                  </button>
                );
              })()}
            </div>
          </div>
        </>
      )}

    </div>
  );
};

export default OrderScreen;
