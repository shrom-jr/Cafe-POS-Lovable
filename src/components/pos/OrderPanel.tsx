import { Order, OrderItem } from '@/types/pos';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

interface Props {
  order: Order | null;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onBill: () => void;
}

const OrderPanel = ({ order, onUpdateQty, onRemove, onBill }: Props) => {
  const items = order?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border border-border">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ShoppingBag size={18} className="text-accent" />
        <h3 className="font-bold text-foreground">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        <span className="ml-auto text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <ShoppingBag size={40} className="mb-2 opacity-30" />
            <p className="text-sm">Tap items to add</p>
          </div>
        )}
        {items.map((item) => (
          <OrderItemRow
            key={item.menuItemId}
            item={item}
            onUpdateQty={onUpdateQty}
            onRemove={onRemove}
          />
        ))}
      </div>

      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="text-2xl font-bold text-accent">Rs. {total}</span>
        </div>
        <button
          onClick={onBill}
          disabled={items.length === 0}
          className="w-full py-3.5 rounded-xl bg-accent text-accent-foreground font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
        >
          Proceed to Bill
        </button>
      </div>
    </div>
  );
};

const OrderItemRow = ({
  item,
  onUpdateQty,
  onRemove,
}: {
  item: OrderItem;
  onUpdateQty: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
}) => (
  <div className="flex items-center gap-2 bg-secondary/50 rounded-lg p-2.5">
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
      <p className="text-xs text-muted-foreground">Rs. {item.price} each</p>
    </div>
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onUpdateQty(item.menuItemId, -1)}
        className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-foreground hover:bg-accent/20 transition-colors"
      >
        <Minus size={14} />
      </button>
      <span className="w-8 text-center font-bold text-foreground">{item.quantity}</span>
      <button
        onClick={() => onUpdateQty(item.menuItemId, 1)}
        className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-foreground hover:bg-accent/20 transition-colors"
      >
        <Plus size={14} />
      </button>
    </div>
    <p className="w-16 text-right text-sm font-bold text-foreground">Rs. {item.price * item.quantity}</p>
    <button
      onClick={() => onRemove(item.menuItemId)}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-danger hover:bg-danger/20 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  </div>
);

export default OrderPanel;
