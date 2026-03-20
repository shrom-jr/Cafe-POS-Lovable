import { Order, OrderItem } from '@/types/pos';
import { Minus, Plus, Trash2, ShoppingBag, RotateCcw, CreditCard } from 'lucide-react';

interface OrderPanelProps {
  order: Order | null;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onPay: () => void;
  onClear?: () => void;
  onRepeatLast?: () => void;
  hasLastOrder?: boolean;
}

const OrderPanel = ({
  order,
  onUpdateQty,
  onRemove,
  onPay,
  onClear,
  onRepeatLast,
  hasLastOrder,
}: OrderPanelProps) => {
  const items = order?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ShoppingBag size={16} className="text-accent" />
        <h3 className="font-bold text-foreground text-sm flex-1">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {itemCount > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">
            {itemCount} items
          </span>
        )}
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-background/30">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <ShoppingBag size={40} className="mb-3 opacity-15" />
            <p className="text-sm font-semibold text-center">No items yet</p>
            <p className="text-xs opacity-60 mt-1 text-center">Start adding from the menu</p>
            {hasLastOrder && onRepeatLast && (
              <button
                onClick={onRepeatLast}
                className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors active:scale-95"
              >
                <RotateCcw size={12} />
                Repeat Last Order
              </button>
            )}
          </div>
        ) : (
          items.map((item) => (
            <OrderItemRow key={item.menuItemId} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card p-4 space-y-3">
        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">Total</span>
          <span className="text-3xl font-black text-foreground">Rs. {total}</span>
        </div>

        {/* Secondary actions */}
        {items.length > 0 && (
          <div className="flex gap-2">
            {onClear && (
              <button
                onClick={onClear}
                data-testid="button-clear-order"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-danger/30 text-danger/70 text-xs font-semibold transition-all active:scale-95 hover:bg-danger/10 hover:border-danger hover:text-danger"
              >
                <Trash2 size={13} />
                Clear
              </button>
            )}
            {hasLastOrder && onRepeatLast && (
              <button
                onClick={onRepeatLast}
                data-testid="button-repeat-last"
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-muted-foreground text-xs font-semibold transition-all active:scale-95 hover:bg-secondary hover:text-foreground"
              >
                <RotateCcw size={13} />
                Repeat
              </button>
            )}
          </div>
        )}

        {/* Primary Pay button */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          data-testid="button-proceed-to-bill"
          className="w-full py-4 rounded-xl bg-success text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.45)]"
        >
          <CreditCard size={20} />
          {items.length > 0 ? `💳 Pay Rs. ${total}` : 'Add items to pay'}
        </button>
      </div>
    </div>
  );
};

interface OrderItemRowProps {
  item: OrderItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}

const OrderItemRow = ({ item, onUpdateQty, onRemove }: OrderItemRowProps) => (
  <div
    className="flex items-center gap-2 bg-card hover:bg-secondary/50 rounded-xl p-2.5 transition-colors border border-border/50"
    data-testid={`order-item-${item.menuItemId}`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
      <p className="text-xs text-muted-foreground">Rs. {item.price} each</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onUpdateQty(item.menuItemId, -1)}
        data-testid={`button-decrease-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-danger/20 hover:text-danger transition-colors active:scale-90"
      >
        <Minus size={13} />
      </button>
      <span className="w-7 text-center font-black text-foreground text-sm">{item.quantity}</span>
      <button
        onClick={() => onUpdateQty(item.menuItemId, 1)}
        data-testid={`button-increase-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-accent/20 hover:text-accent transition-colors active:scale-90"
      >
        <Plus size={13} />
      </button>
    </div>
    <p className="w-16 text-right text-sm font-bold text-foreground">Rs. {item.price * item.quantity}</p>
    <button
      onClick={() => onRemove(item.menuItemId)}
      data-testid={`button-remove-${item.menuItemId}`}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors active:scale-90"
    >
      <Trash2 size={13} />
    </button>
  </div>
);

export default OrderPanel;
