import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePOS } from '@/context/POSContext';
import { TopBar } from '@/components/pos/Navigation';
import MenuItemCard from '@/components/pos/MenuItemCard';
import OrderPanel from '@/components/pos/OrderPanel';
import { Search } from 'lucide-react';

const OrderScreen = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const { tables, categories, menuItems, orders, getActiveOrder, createOrder, addItemToOrder, updateItemQuantity, removeItemFromOrder, updateTable, updateOrderStatus } = usePOS();

  const table = tables.find(t => t.id === tableId);
  const [activeCat, setActiveCat] = useState(categories[0]?.id || '');
  const [search, setSearch] = useState('');

  // Create or get order
  const order = useMemo(() => {
    if (!tableId || !table) return null;
    return getActiveOrder(tableId) || null;
  }, [tableId, table, getActiveOrder, orders]);

  useEffect(() => {
    if (tableId && table && !order) {
      createOrder(tableId, table.number);
    }
  }, [tableId, table]);

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
          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredItems.map(item => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onAdd={() => order && addItemToOrder(order.id, item)}
                />
              ))}
            </div>
            {filteredItems.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">No items found</p>
            )}
          </div>
        </div>

        {/* Right: Order Panel */}
        <div className="w-[340px] lg:w-[380px] flex-shrink-0 p-3">
          <OrderPanel
            order={order}
            onUpdateQty={(menuItemId, delta) => order && updateItemQuantity(order.id, menuItemId, delta)}
            onRemove={(menuItemId) => order && removeItemFromOrder(order.id, menuItemId)}
            onBill={handleBill}
          />
        </div>
      </div>
    </div>
  );
};

export default OrderScreen;
