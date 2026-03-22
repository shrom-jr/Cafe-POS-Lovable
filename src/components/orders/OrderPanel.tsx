import { useState } from 'react';
import { Order, OrderItem } from '@/types/pos';
import { Minus, Plus, Trash2, ShoppingBag, Users } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface OrderPanelProps {
  order: Order | null;
  onUpdateQty: (menuItemId: string, delta: number) => void;
  onRemove: (menuItemId: string) => void;
  onPay: () => void;
  onClear?: () => void;
  pax?: number;
  onPaxChange?: (pax: number) => void;
}

const OrderPanel = ({
  order,
  onUpdateQty,
  onRemove,
  onPay,
  onClear,
  pax = 1,
  onPaxChange,
}: OrderPanelProps) => {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const items = order?.items || [];
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  const handleClearConfirmed = () => {
    onClear?.();
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <ShoppingBag size={16} className="text-accent" />
        <h3 className="font-bold text-foreground text-sm flex-1">
          {order ? `Table ${order.tableNumber}` : 'Order'}
        </h3>
        {itemCount > 0 && (
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs font-bold">
              {itemCount} items
            </span>
            {onClear && (
              <button
                onClick={() => setShowClearConfirm(true)}
                data-testid="button-clear-order"
                className="px-2.5 py-1 rounded-lg text-xs font-semibold text-muted-foreground border border-border transition-all active:scale-95 hover:border-destructive/60 hover:text-destructive hover:bg-destructive/10 active:border-destructive active:text-destructive"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pax selector */}
      <div className="px-4 py-2.5 border-b border-border flex items-center gap-3 bg-background/20">
        <Users size={14} className="text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground flex-1">Guests (Pax)</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPaxChange?.(Math.max(1, pax - 1))}
            disabled={pax <= 1}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-accent/20 hover:text-accent transition-colors active:scale-90 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus size={12} />
          </button>
          <span className="w-6 text-center font-black text-foreground text-sm tabular-nums">{pax}</span>
          <button
            onClick={() => onPaxChange?.(pax + 1)}
            className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground hover:bg-accent/20 hover:text-accent transition-colors active:scale-90"
          >
            <Plus size={12} />
          </button>
        </div>
      </div>

      {/* Item list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-background/30">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <ShoppingBag size={40} className="mb-3 opacity-15" />
            <p className="text-base font-bold text-center">No items yet</p>
            <p className="text-xs opacity-70 mt-1.5 text-center">Tap items on the left to start building the order</p>
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

        {/* Primary Pay button */}
        <button
          onClick={onPay}
          disabled={items.length === 0}
          data-testid="button-proceed-to-bill"
          className="w-full py-4 rounded-xl bg-success text-white font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110 shadow-[0_4px_16px_-4px_hsl(var(--success)/0.45)]"
        >
          {items.length > 0 ? 'Review Order →' : 'Add items to order'}
        </button>
      </div>

      {/* Clear confirmation dialog */}
      <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all items?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items from the order.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
