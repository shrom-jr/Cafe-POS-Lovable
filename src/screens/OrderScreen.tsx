import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOS } from '@/context/POSContext';
import { TopBar } from '@/components/pos/Navigation';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderPanel from '@/components/pos/OrderPanel';
import { Search, ShoppingBag, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const OrderScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tables, categories, menuItems, orders, getActiveOrder, createOrder, addItemToOrder, updateItemQuantity, removeItemFromOrder, updateTable, updateOrderStatus } = usePOS();

  const table = tables.find(t => t.id === tableId);
  const [activeCat, setActiveCat] = useState(categories[0]?.id || '');
  const [search, setSearch] = useState('');
  const [showCart, setShowCart] = useState(false);

  // Get existing order (don't auto-create — wait for first item)
  const order = useMemo(() => {
    if (!tableId || !table) return null;
    return getActiveOrder(tableId) || null;
  }, [tableId, table, getActiveOrder, orders]);

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q));
    } else {
      items = items.filter(i => i.categoryId === activeCat);
    }
    return items;
  }, [menuItems, activeCat, search]);

  if (!table || !tableId) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Table not found</div>;
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
  };

  const itemCount = order?.items.reduce((s, i) => s + i.quantity, 0) || 0;

  return (
    <div className="h-screen bg-background flex flex-col">
      <TopBar title={`Table ${table.number} — Order`} showBack onBack={() => navigate('/')} />
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Menu */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          {/* Search */}
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Categories */}
          {!search && (
            <div className="flex gap-2 p-3 overflow-x-auto border-b border-border">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    activeCat === cat.id
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Items grid */}
          <div className={`flex-1 overflow-y-auto p-3 ${isMobile ? 'pb-24' : ''}`}>
            <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'} gap-3`}>
              {filteredItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={() => handleAddItem(item)}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">No items found</p>
            )}
          </div>
        </div>

        {/* Right: Order Panel — desktop only */}
        {!isMobile && (
          <div className="w-[340px] lg:w-[380px] flex-shrink-0 p-3">
            <OrderPanel
              order={order}
              onUpdateQty={(menuItemId, delta) => order && updateItemQuantity(order.id, menuItemId, delta)}
              onRemove={(menuItemId) => order && removeItemFromOrder(order.id, menuItemId)}
              onBill={handleBill}
            />
          </div>
        )}
      </div>

      {/* Mobile: Floating cart button */}
      {isMobile && itemCount > 0 && !showCart && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-accent text-accent-foreground font-bold text-base shadow-lg active:scale-95 transition-all"
        >
          <ShoppingBag size={20} />
          <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span className="text-accent-foreground/80">·</span>
          <span>Rs. {order?.items.reduce((s, i) => s + i.price * i.quantity, 0) || 0}</span>
        </button>
      )}

      {/* Mobile: Cart slide-up panel */}
      {isMobile && showCart && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1 bg-background/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="bg-card border-t border-border rounded-t-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-bold text-foreground">Your Order</h3>
              <button onClick={() => setShowCart(false)} className="p-1 text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <OrderPanel
                order={order}
                onUpdateQty={(menuItemId, delta) => order && updateItemQuantity(order.id, menuItemId, delta)}
                onRemove={(menuItemId) => order && removeItemFromOrder(order.id, menuItemId)}
                onBill={() => { setShowCart(false); handleBill(); }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderScreen;
