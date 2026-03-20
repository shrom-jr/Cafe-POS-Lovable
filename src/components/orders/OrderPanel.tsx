import { Order, OrderItem } from '@/types/pos';
import { Minus, Plus, Trash2, ShoppingBag, RotateCcw, X, CreditCard, Receipt } from 'lucide-react';

interface OrderPanelProps {
  order: Order | null;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onPay: () => void;
  onViewBill?: () => void;
  onClear?: () => void;
  onRepeatLast?: () => void;
  hasLastOrder?: boolean;
  locked?: boolean;
}

const OrderPanel = ({ order, onUpdateQty, onRemove, onPay, onViewBill, onClear, onRepeatLast, hasLastOrder, locked }: OrderPanelProps) => {
  const items = order?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)] overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 bg-card/80">
        <ShoppingBag size={17} className="text-accent" />
        <h3 className="font-bold text-foreground text-sm">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {itemCount > 0 && (
          <span className="ml-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">
            {itemCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {hasLastOrder && onRepeatLast && !locked && (
            <button
              onClick={onRepeatLast}
              data-testid="button-repeat-last"
              title="Repeat Last Order"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">Repeat</span>
            </button>
          )}
          {items.length > 0 && onClear && !locked && (
            <button
              onClick={onClear}
              data-testid="button-clear-order"
              title="Clear Order"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <X size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10">
            <ShoppingBag size={38} className="mb-3 opacity-20" />
            <p className="text-sm font-medium text-center">No items yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1 text-center">Start adding from the menu</p>
            {hasLastOrder && onRepeatLast && (
              <button
                onClick={onRepeatLast}
                className="mt-3 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs font-medium hover:bg-accent/10 hover:text-accent transition-colors"
              >
                <RotateCcw size={12} />
                Repeat Last Order
              </button>
            )}
          </div>
        )}
        {items.map((item) => (
          <OrderItemRow key={item.menuItemId} item={item} onUpdateQty={onUpdateQty} onRemove={onRemove} />
        ))}
      </div>

      <div className="border-t border-border p-4 space-y-2.5 bg-card/80">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">Total</span>
          <span className="text-2xl font-black text-accent">Rs. {total}</span>
        </div>
        {!locked && (
          <div className="flex gap-2">
            {onViewBill && (
              <button
                onClick={onViewBill}
                disabled={items.length === 0}
                data-testid="button-view-bill"
                title="View Bill / Apply Discount"
                className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl border border-border bg-secondary text-muted-foreground font-semibold text-xs transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary/70 hover:text-foreground"
              >
                <Receipt size={15} />
                View Bill
              </button>
            )}
            <button
              onClick={onPay}
              disabled={items.length === 0}
              data-testid="button-proceed-to-bill"
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl bg-success text-white font-black text-base transition-all active:scale-[0.97] disabled:opacity-35 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_12px_-2px_hsl(var(--success)/0.4)]"
            >
              <CreditCard size={18} />
              💳 Pay Rs. {total}
            </button>
          </div>
        )}
        {locked && (
          <div className="text-center text-xs text-warning font-medium py-1">
            Table is being billed — editing disabled
          </div>
        )}
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
    className="flex items-center gap-2 bg-secondary/40 hover:bg-secondary/70 rounded-xl p-2.5 transition-colors"
    data-testid={`order-item-${item.menuItemId}`}
  >
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
      <p className="text-xs text-muted-foreground">Rs. {item.price}</p>
    </div>
    <div className="flex items-center gap-1">
      <button
        onClick={() => onUpdateQty(item.menuItemId, -1)}
        data-testid={`button-decrease-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center text-foreground hover:bg-danger/20 hover:text-danger transition-colors active:scale-90"
      >
        <Minus size={13} />
      </button>
      <span className="w-7 text-center font-black text-foreground text-sm">{item.quantity}</span>
      <button
        onClick={() => onUpdateQty(item.menuItemId, 1)}
        data-testid={`button-increase-${item.menuItemId}`}
        className="w-7 h-7 rounded-lg bg-primary/80 flex items-center justify-center text-foreground hover:bg-accent/20 hover:text-accent transition-colors active:scale-90"
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
