import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOSStore } from '@/store/usePOSStore';
import { useOrders } from '@/hooks/useOrders';
import { useTables } from '@/hooks/useTables';
import { TopBar } from '@/components/ui/Navigation';
import MenuItemCard from '@/components/orders/MenuItemCard';
import OrderPanel from '@/components/orders/OrderPanel';
import { Search, ShoppingBag, X, Trash2, RotateCcw, Receipt, AlertTriangle, ArrowRight } from 'lucide-react';
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

  const isBilling = table.status === 'billing';
  const itemCount = order?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  const runningTotal = order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
  const hasItems = itemCount > 0;

  const handleBill = () => {
    if (!order || order.items.length === 0) return;
    updateOrderStatus(order.id, 'billed');
    updateTable(tableId, { status: 'billing' });
    navigate(`/billing/${tableId}`);
  };

  const handleAddItem = (item: typeof menuItems[0]) => {
    if (isBilling) return;
    const currentOrder = order || createOrder(tableId, table.number);
    addItemToOrder(currentOrder.id, item);
    playClick();
  };

  const handleClear = () => {
    if (!order || isBilling) return;
    clearOrder(order.id);
  };

  const handleRepeatLast = () => {
    if (isBilling) return;
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
    <div className="h-screen bg-background flex flex-col">
      <TopBar title={`Table ${table.number}`} showBack onBack={() => navigate('/')} />

      {/* Billing lock banner */}
      {isBilling && (
        <button
          onClick={() => navigate(`/billing/${tableId}`)}
          className="flex items-center justify-between px-4 py-3 bg-warning/15 border-b border-warning/30 text-warning w-full"
          data-testid="banner-billing-lock"
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle size={15} />
            This table is currently being billed
          </div>
          <div className="flex items-center gap-1 text-xs font-bold">
            Go to Payment <ArrowRight size={13} />
          </div>
        </button>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {/* Search */}
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

          {/* Categories */}
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

          {/* Items grid */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-2.5`}>
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  quantityInOrder={orderQtyMap[item.id] || 0}
                  onAdd={() => handleAddItem(item)}
                  disabled={isBilling}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-muted-foreground py-12 text-sm">No items found</p>
            )}
          </div>
        </div>

        {/* Right: Order Panel — desktop only */}
        {!isMobile && (
          <div className="w-[340px] lg:w-[380px] flex-shrink-0 p-3 pb-0">
            <OrderPanel
              order={order}
              onUpdateQty={(menuItemId, delta) =>
                !isBilling && order && updateItemQuantity(order.id, menuItemId, delta)
              }
              onRemove={(menuItemId) =>
                !isBilling && order && removeItemFromOrder(order.id, menuItemId)
              }
              onBill={handleBill}
              onClear={handleClear}
              onRepeatLast={handleRepeatLast}
              hasLastOrder={hasLastOrder}
              locked={isBilling}
            />
          </div>
        )}
      </div>

      {/* ─── QUICK ACTION BAR ────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-3 py-2.5 flex items-center gap-2 safe-bottom">
        {/* Clear */}
        <button
          onClick={handleClear}
          disabled={!hasItems || isBilling}
          data-testid="button-quick-clear"
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground font-medium text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-danger/15 hover:text-danger min-w-[52px]"
        >
          <Trash2 size={18} />
          <span>Clear</span>
        </button>

        {/* Repeat Last */}
        <button
          onClick={handleRepeatLast}
          disabled={!hasLastOrder || isBilling}
          data-testid="button-quick-repeat"
          className="flex flex-col items-center justify-center gap-0.5 px-3 py-2 rounded-xl bg-secondary text-muted-foreground font-medium text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/15 hover:text-accent min-w-[52px]"
        >
          <RotateCcw size={18} />
          <span>Repeat</span>
        </button>

        {/* Order summary / cart view trigger (mobile) */}
        {isMobile ? (
          <button
            onClick={() => hasItems && setShowCart(true)}
            data-testid="button-view-order"
            className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
              hasItems
                ? 'bg-secondary/80 hover:bg-secondary cursor-pointer'
                : 'bg-secondary/40 cursor-default'
            }`}
          >
            <ShoppingBag size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {hasItems ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'No items'}
            </span>
            {hasItems && (
              <span className="ml-auto font-bold text-accent text-sm whitespace-nowrap">
                Rs. {runningTotal}
              </span>
            )}
          </button>
        ) : (
          /* Desktop: show total */
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/40">
            <ShoppingBag size={15} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {hasItems ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'No items added'}
            </span>
            {hasItems && (
              <span className="ml-auto font-bold text-accent text-sm">Rs. {runningTotal}</span>
            )}
          </div>
        )}

        {/* Proceed to Billing */}
        {isBilling ? (
          <button
            onClick={() => navigate(`/billing/${tableId}`)}
            data-testid="button-go-billing"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl bg-warning text-black font-bold text-xs transition-all active:scale-95 min-w-[72px]"
          >
            <Receipt size={18} />
            <span>Payment</span>
          </button>
        ) : (
          <button
            onClick={handleBill}
            disabled={!hasItems}
            data-testid="button-quick-bill"
            className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-xs transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_2px_12px_-4px_hsl(var(--accent)/0.5)] min-w-[72px]"
          >
            <Receipt size={18} />
            <span>Bill</span>
          </button>
        )}
      </div>

      {/* Mobile: Cart slide-up sheet */}
      {isMobile && showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div
            className="flex-1 bg-background/60 backdrop-blur-sm"
            onClick={() => setShowCart(false)}
          />
          <div className="bg-card border-t border-border rounded-t-2xl max-h-[82vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground">
                Table {table.number} — Order
              </h3>
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
                onUpdateQty={(menuItemId, delta) =>
                  !isBilling && order && updateItemQuantity(order.id, menuItemId, delta)
                }
                onRemove={(menuItemId) =>
                  !isBilling && order && removeItemFromOrder(order.id, menuItemId)
                }
                onBill={() => { setShowCart(false); handleBill(); }}
                onClear={() => { setShowCart(false); handleClear(); }}
                onRepeatLast={handleRepeatLast}
                hasLastOrder={hasLastOrder}
                locked={isBilling}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreen;
